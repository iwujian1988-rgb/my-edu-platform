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
  let supabaseResponse = NextResponse.next({
    request,
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
          request.cookies.set({
            name,
            value,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          request.cookies.delete({
            name,
            ...options,
          })
          supabaseResponse = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          supabaseResponse.cookies.delete({
            name,
            ...options,
          })
        },
      },
    }
  )

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/server-side/nextjs#refresh-session
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

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

  // Redirect to login if trying to access protected route without session
  if (isProtectedRoute && !session) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // ========================================
  // Auth Routes - Redirect if Already Logged In
  // ========================================

  const authRoutes = ['/login', '/register']

  // Redirect to home if already logged in and trying to access auth routes
  if (authRoutes.includes(pathname) && session) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  // ========================================
  // Daily Quota Reset Check
  // ========================================
  
  // If user is logged in, check if daily quota needs to be reset
  if (session && pathname.startsWith('/api/')) {
    const today = new Date().toISOString().split('T')[0]
    
    // This will trigger the reset_daily_quota trigger if needed
    await supabase
      .from('user_quotas')
      .select('last_reset_date')
      .eq('user_id', session.user.id)
      .single()
  }

  return supabaseResponse
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
