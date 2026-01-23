/**
 * Supabase Server Client for Server Components & Server Actions
 *
 * This file creates a Supabase client specifically for use in:
 * - Server Components (App Router)
 * - Server Actions ('use server')
 * - Route Handlers (app/api/*)
 * - Middleware
 *
 * Key differences from client.ts:
 * - Uses createServerClient (not createBrowserClient)
 * - Has access to server-side cookies
 * - Can be used in async server components
 * - Supports SSR with proper authentication
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for server-side usage
 *
 * @example
 * Example usage:
 * - Server Components: await createClient()
 * - Server Actions: await createClient()
 * - Route Handlers: await createClient()
 */
export async function createClient() {
  const cookieStore = await cookies()

  // 🔧 Fix: 检测是否为 HTTPS 环境
  // 在 Next.js server component 中无法直接获取协议，使用环境变量判断
  const isHttps = process.env.NODE_ENV === 'production'

  // 🔍 Debug: 记录所有Supabase相关的cookies
  const allCookies = cookieStore.getAll()
  const sbCookies = allCookies.filter(c => c.name.includes('sb-'))

  // 🔍 详细记录每个 cookie 的信息
  const authCookie = sbCookies.find(c => c.name.includes('auth-token') && !c.name.includes('.'))

  let decodedToken = null
  if (authCookie?.value) {
    try {
      // 移除 base64- 前缀并解码
      const base64Value = authCookie.value.replace('base64-', '')
      decodedToken = JSON.parse(Buffer.from(base64Value, 'base64').toString())
    } catch (e) {
      console.error('Failed to decode token:', e.message)
    }
  }

  console.log('🍪 [Server Client] Detailed cookie info:', {
    total: allCookies.length,
    sbCookies: sbCookies.map(c => ({
      name: c.name,
      hasValue: !!c.value,
      valueLength: c.value?.length || 0,
    })),
    authCookieFound: !!authCookie,
    authCookieValueLength: authCookie?.value?.length || 0,
    isHttps,
    decodedToken: decodedToken ? {
      hasAccessToken: !!decodedToken.access_token,
      hasRefreshToken: !!decodedToken.refresh_token,
      expiresAt: decodedToken.expires_at,
      tokenLength: decodedToken.access_token?.length
    } : null
  })

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          const value = cookieStore.get(name)?.value
          // 🔍 Debug: 记录每次读取cookie的请求
          if (name.includes('sb-')) {
            console.log(`🔍 [Server Client] Reading cookie: ${name}, found: ${!!value}`)
          }
          return value
        },
        set(name: string, value: string, options: any) {
          try {
            // 🔧 Fix: 根据环境动态设置 secure 属性
            cookieStore.set({
              name,
              value,
              ...options,
              secure: isHttps,  // HTTPS 环境必须为 true，HTTP 必须为 false
              sameSite: 'lax',
              httpOnly: true,
            })
            console.log('[createClient] Set cookie:', name, 'secure:', isHttps)
          } catch (error) {
            console.error('[createClient] Failed to set cookie:', name, 'error:', error)
          }
        },
        remove(name: string, options: any) {
          try {
            // 🔍 Debug: 记录所有 cookie 删除操作
            if (name.includes('sb-')) {
              console.log('🚨 [createClient] ATTEMPTING TO REMOVE COOKIE:', name)
              console.trace('🚨 Cookie removal call stack:')
            }

            // 🔧 临时阻止删除 auth-token 相关的 cookies
            if (name.includes('auth-token')) {
              console.log('🛑 [createClient] BLOCKED removal of auth cookie:', name)
              return  // 阻止删除
            }

            cookieStore.set({
              name,
              value: '',
              ...options,
              secure: isHttps,  // 使用相同的设置
            })
          } catch (error) {
            console.error('[createClient] Failed to remove cookie:', name, 'error:', error)
          }
        },
      },
    }
  )
}

/**
 * Create admin client that bypasses RLS using service role key
 * WARNING: Only use for admin operations that need to bypass RLS
 */
export async function createAdminClient() {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')

  return createDirectClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )
}

/**
 * Alias for createClient - use in Server Actions for better code clarity
 *
 * @example
 * ```ts
 * // app/actions/books.ts
 * 'use server'
 *
 * import { createClient as createSupabaseClient } from '@/lib/supabase/server'
 *
 * export async function getBooks() {
 *   const supabase = await createSupabaseClient()
 *   const { data, error } = await supabase.from('books').select('*')
 *   return { data, error }
 * }
 * ```
 */
export { createClient as createClientForActions }

/**
 * Get the currently logged-in user from Supabase Auth
 *
 * @returns {Promise<User | null>} The user object if logged in, null otherwise
 *
 * @example
 * ```ts
 * import { getCurrentUser } from '@/lib/supabase/server'
 *
 * const user = await getCurrentUser()
 * if (!user) {
 *   redirect('/login')
 * }
 * ```
 */
export async function getCurrentUser() {
  console.log('🔍 [getCurrentUser] Starting...')

  const supabase = await createClient()

  console.log('🔍 [getCurrentUser] supabase client created, calling getUser()...')

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  console.log('👤 [getCurrentUser] Result:', {
    hasUser: !!user,
    userId: user?.id,
    error: error?.message,
    errorName: error?.name,
    errorStack: error?.stack
  })

  if (error || !user) {
    console.log('❌ [getCurrentUser] Returning null due to error or no user')
    return null
  }

  console.log('✅ [getCurrentUser] Returning user:', user.id)
  return user
}

/**
 * Check if user is authenticated
 *
 * @returns {Promise<boolean>} True if user is logged in
 *
 * @example
 * ```ts
 * import { isAuthenticated } from '@/lib/supabase/server'
 *
 * if (!(await isAuthenticated())) {
 *   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
 * }
 * ```
 */
export async function isAuthenticated() {
  const user = await getCurrentUser()
  return !!user
}

/**
 * Get user profile from the users table (includes custom fields)
 *
 * @returns {Promise<any>} User profile if logged in, null otherwise
 *
 * @example
 * ```ts
 * import { getUserProfile } from '@/lib/supabase/server'
 *
 * const profile = await getUserProfile()
 * if (profile) {
 *   console.log('Phone:', profile.phone_number)
 * }
 * ```
 */
export async function getUserProfile() {
  const user = await getCurrentUser()

  if (!user) {
    return null
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Failed to fetch user profile:', error)
    return null
  }

  return data
}

/**
 * Require authentication - throws error if user is not logged in
 *
 * @returns {Promise<User>} The authenticated user
 * @throws {Error} If user is not authenticated
 *
 * @example
 * ```ts
 * import { requireAuth } from '@/lib/supabase/server'
 *
 * export default async function ProtectedPage() {
 *   const user = await requireAuth()
 *   // User is guaranteed to be logged in here
 * }
 * ```
 */
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    throw new Error('Authentication required')
  }

  return user
}
