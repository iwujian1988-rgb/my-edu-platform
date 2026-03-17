import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl

  // 1. 初始 Response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const clientStart = Date.now()
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          // 更新 Request 中的 Cookie
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          // 重置 Response 以确保 Header 干净
          response = NextResponse.next({
            request,
          })

          // 🚨【关键修复】强制覆盖 Cookie 属性 🚨
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              // 无论 SDK 怎么判断，生产环境强制为 true
              secure: process.env.NODE_ENV === 'production',
              // 强制 SameSite 为 Lax
              sameSite: 'lax',
              // 确保路径是根目录
              path: '/',
              // 确保域名不被错误设置
              domain: undefined
            })
          })
        },
      },
    }
  )
  const clientTime = Date.now() - clientStart

  // 2. 触发刷新逻辑
  const authStart = Date.now()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authTime = Date.now() - authStart

  // Debug log for library routes
  if (pathname.startsWith('/library') || pathname.startsWith('/study')) {
    const totalTime = Date.now() - startTime
    console.log('🔍 [Middleware]', {
      pathname,
      hasUser: !!user,
      userId: user?.id,
      timing: { clientCreate: `${clientTime}ms`, authCall: `${authTime}ms`, total: `${totalTime}ms` }
    })
  }

  // 3. 路由保护逻辑
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

  const isProtectedRoute = protectedRoutes.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  if (isProtectedRoute && !user) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  const authRoutes = ['/login', '/register']

  if (user && authRoutes.includes(pathname)) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/login')) {
      return response
    }

    if (!user) {
      const redirectUrl = new URL('/admin/login', request.url)
      redirectUrl.searchParams.set('redirect', pathname)
      return NextResponse.redirect(redirectUrl)
    }

    const { data: admin } = await supabase
      .from('administrators')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .maybeSingle()

    if (!admin) {
      const redirectUrl = new URL('/admin/login', request.url)
      redirectUrl.searchParams.set('error', 'not_admin')
      return NextResponse.redirect(redirectUrl)
    }
  }

  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
