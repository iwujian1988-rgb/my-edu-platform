/**
 * Next.js Middleware for Supabase Auth
 *
 * This middleware:
 * - Refreshes Supabase auth session
 * - Maintains user authentication across requests
 * - Handles protected routes
 * - Redirects unauthenticated users
 *
 * Reference: https://supabase.com/docs/guides/auth/server-side/nextjs
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/**
 * Main middleware function for auth handling
 *
 * @param request - NextRequest object
 * @returns NextResponse with updated auth cookies
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  try {
    // 🔧 Fix: 检测协议（HTTPS或HTTP）
    const protocol = request.headers.get('x-forwarded-proto') || request.url.split('://')[0]
    const isHttps = protocol === 'https'

    // 🔧 Fix: Create response first so we can set cookies on it
    const response = NextResponse.next({
      request: { headers: request.headers }
    })

    const supabase = createServerClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            // 🔧 Fix: 根据协议设置secure属性（HTTPS必须为true，HTTP必须为false）
            const cookieOptions = {
              ...options,
              secure: isHttps,  // HTTPS环境下必须为true
              sameSite: 'lax',
            }

            // Set on request for subsequent reads
            request.cookies.set({
              name,
              value,
              ...cookieOptions,
            })
            // IMPORTANT: Also set on response so cookies are sent to browser
            response.cookies.set({
              name,
              value,
              ...cookieOptions,
            })
          },
          remove(name: string, options: any) {
            const cookieOptions = {
              ...options,
              secure: isHttps,  // 使用相同的协议检测
            }

            request.cookies.delete({
              name,
              ...cookieOptions,
            })
            // Also remove from response
            response.cookies.set({
              name,
              value: '',
              ...cookieOptions,
              maxAge: 0,
            })
          },
        },
      }
    )

    // 🔍 Debug: Log user authentication status
    const {
      data: { user },
      error: getUserError,
    } = await supabase.auth.getUser()

    // Debug log for protected routes
    if (pathname.startsWith('/library') || pathname.startsWith('/study')) {
      const allCookies = request.cookies.getAll()
      const authCookies = allCookies.filter(c => c.name.includes('sb-'))
      console.log('🔍 [Middleware Debug]', {
        pathname,
        hasUser: !!user,
        userId: user?.id,
        authCookiesCount: authCookies.length,
        error: getUserError?.message
      })
    }

    // ========================================
    // Protected Routes - Require Authentication
    // ========================================

    const protectedRoutes = [
      '/dashboard',
      '/study',
      '/books',
      '/practice',
      '/mistakes',
      '/calendar',
      '/profile',
      '/custom',
    ]

    // Check if current path is a protected route
    const isProtectedRoute = protectedRoutes.some(route =>
      pathname === route || pathname.startsWith(`${route}/`)
    )

    // Redirect to login if trying to access protected route without user
    if (isProtectedRoute && !user) {
      const redirectUrl = new URL('/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    // ========================================
    // Auth Routes - Redirect if Already Logged In
    // ========================================

    const authRoutes = ['/login', '/register']

    // If user is already logged in and trying to access auth routes, redirect to home
    if (user && authRoutes.includes(pathname)) {
      return NextResponse.redirect(new URL('/', request.url))
    }

    // ========================================
    // Admin Routes - Require Admin Authentication
    // ========================================

    if (pathname.startsWith('/admin')) {
      // /admin/login doesn't require authentication
      if (pathname.startsWith('/admin/login')) {
        // Return the response with cookies (for any session updates)
        return response
      }

      // All other /admin routes require admin authentication
      if (!user) {
        const redirectUrl = new URL('/admin/login', request.url)
        redirectUrl.searchParams.set('redirect', pathname)
        return NextResponse.redirect(redirectUrl)
      }

      // Check if user is an administrator
      // Use maybeSingle() instead of single() to avoid error when no rows returned
      const { data: admin, error } = await supabase
        .from('administrators')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .maybeSingle()

      if (error || !admin) {
        // User is logged in but not an admin
        const redirectUrl = new URL('/admin/login', request.url)
        redirectUrl.searchParams.set('error', 'not_admin')
        return NextResponse.redirect(redirectUrl)
      }
    }

    // ========================================
    // Daily Quota Reset Check
    // ========================================

    // If user is logged in, check if daily quota needs to be reset
    if (user && pathname.startsWith('/api/')) {
      const today = new Date().toISOString().split('T')[0]

      // This will trigger the reset_daily_quota trigger if needed
      await supabase
        .from('user_quotas')
        .select('last_reset_date')
        .eq('user_id', user.id)
        .maybeSingle()
    }

    // Return response with cookies already set by the set() callback above
    return response
  } catch (error) {
    // Log error for debugging
    console.error('Middleware error:', error)

    // Create a basic response for error cases
    const errorResponse = NextResponse.next({
      request: { headers: request.headers }
    })

    // For admin login, allow access even if middleware fails
    if (pathname.startsWith('/admin/login')) {
      return errorResponse
    }

    // For other routes, return the response as-is
    return errorResponse
  }
}

/**
 * Matcher configuration
 *
 * Defines which routes the middleware should run on.
 *
 * Skip:
 * - _next/static (static files)
 * - _next/image (image optimization files)
 * - favicon.ico (favicons)
 * - public folder (public assets)
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder (public files)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
