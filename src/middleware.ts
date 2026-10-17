import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { safeReturnPath } from '@/lib/auth-return-path'
import { requestOrigin } from '@/lib/request-origin'

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
  const { pathname } = request.nextUrl

  // 快速跳过：完全公开的页面（0ms）
  const isPublicRoute = PUBLIC_ROUTES.some(
    route => pathname === route || pathname.startsWith(`${route}/`)
  )
  if (isPublicRoute) {
    return NextResponse.next()
  }

  // 纯 cookie 存在性检查（0ms，无网络调用）
  const hasSbCookies = request.cookies.getAll().some(c => c.name.startsWith('sb-'))

  const isProtectedRoute = PROTECTED_ROUTES.some(route =>
    pathname === route || pathname.startsWith(`${route}/`)
  )
  const needsFullAuth = pathname.startsWith('/admin') || pathname === '/login' || pathname === '/register'

  // 未登录 + 受保护路由 → 跳转登录（0ms）
  if (!hasSbCookies && isProtectedRoute) {
    const redirectUrl = new URL('/login', requestOrigin(request))
    redirectUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
    return NextResponse.redirect(redirectUrl)
  }

  // 已登录 + 非 admin/login/register → 直接放行（省 200ms，API 层自行验证 auth）
  if (hasSbCookies && !needsFullAuth) {
    return NextResponse.next()
  }

  // 未登录 + 非受保护路由 → 放行
  if (!hasSbCookies && !needsFullAuth) {
    return NextResponse.next()
  }

  // ── 以下只有 /admin、/login、/register 会走到 ──
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

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

  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 产品入口携带返回地址时，已登录用户也应回到该产品，保留刷新后的 cookie。
  if (user && (pathname === '/login' || pathname === '/register')) {
    const destination = safeReturnPath(request.nextUrl.searchParams.get('redirect')) || '/'
    const redirectResponse = NextResponse.redirect(new URL(destination, requestOrigin(request)))
    response.cookies.getAll().forEach(cookie => redirectResponse.cookies.set(cookie))
    return redirectResponse
  }

  // Admin 路由保护
  if (pathname.startsWith('/admin')) {
    if (pathname.startsWith('/admin/login')) {
      return response
    }

    if (!user) {
      const redirectUrl = new URL('/admin/login', requestOrigin(request))
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
      const redirectUrl = new URL('/admin/login', requestOrigin(request))
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
