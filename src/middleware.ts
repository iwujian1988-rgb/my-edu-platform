import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

/** 完全公开的页面 — 不需要任何 auth 检查 */
const PUBLIC_ROUTES = ['/privacy', '/clear-cache']

/** 需要登录才能访问的受保护路由前缀 */
const PROTECTED_ROUTES = [
  '/dashboard',
  '/study',
  '/books',
  '/practice',
  '/mistakes',
  '/calendar',
  '/profile',
  '/custom',
  '/learning-plan',
  '/typing',
  '/speaker',
  '/video-favorites',
  '/video-flashcards',
  '/video-stats',
  '/settings',
  '/videos',
]

export async function middleware(request: NextRequest) {
  const startTime = Date.now()
  const { pathname } = request.nextUrl

  // 快速跳过：完全公开的页面，不需要 Supabase auth 调用（省 ~500ms）
  const isPublicRoute = PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  )
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // 1. 初始 Response
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 快速判断：如果没有 Supabase auth cookies，用户未登录
  // 避免在未登录用户上浪费 ~500ms 的 auth 网络调用
  const hasSbCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )

  // 未登录 + 受保护路由 → 直接跳转登录，不需要调用 auth
  if (!hasSbCookies && isProtectedRoute) {
    const redirectUrl = new URL('/login', request.url)
    redirectUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  // 未登录 + 非受保护路由（如首页、API）→ 不需要 auth，直接放行
  // 注意：API 路由内部会自行处理 auth
  if (!hasSbCookies && !pathname.startsWith('/admin') && !pathname.startsWith('/login') && !pathname.startsWith('/register')) {
    return NextResponse.next()
  }

  // 以下情况需要 Supabase auth 调用：
  // 1. 有 cookies 的用户（需要刷新 token）
  // 2. admin 路由（需要验证管理员身份）
  // 3. login/register（需要判断是否已登录以决定重定向）
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
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))

          response = NextResponse.next({
            request,
          })

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, {
              ...options,
              secure: process.env.NODE_ENV === 'production',
              sameSite: 'lax',
              path: '/',
              domain: undefined
            })
          })
        },
      },
    }
  )
  const clientTime = Date.now() - clientStart

  // 触发刷新逻辑
  const authStart = Date.now()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const authTime = Date.now() - authStart

  // Debug log for library/study routes
  if (pathname.startsWith('/library') || pathname.startsWith('/study')) {
    const totalTime = Date.now() - startTime
    console.log('[Middleware]', {
      pathname,
      hasUser: !!user,
      userId: user?.id,
      timing: { clientCreate: `${clientTime}ms`, authCall: `${authTime}ms`, total: `${totalTime}ms` }
    })
  }

  // 路由保护逻辑
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
