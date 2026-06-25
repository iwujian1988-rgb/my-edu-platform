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
import type { SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { cache } from 'react'
import type { Database } from '@/types/database'

// 开发环境代理配置
let proxyFetch: typeof fetch | undefined

async function getProxyFetch(): Promise<typeof fetch | undefined> {
  if (process.env.NODE_ENV !== 'development') {
    return undefined
  }

  if (proxyFetch) {
    return proxyFetch
  }

  const proxyUrl = process.env.HTTPS_PROXY || process.env.HTTP_PROXY

  // 只有环境变量明确设置时才使用代理
  if (!proxyUrl) {
    return undefined
  }

  try {
    const { ProxyAgent, fetch: undiciFetch } = await import('undici')
    const proxyAgent = new ProxyAgent(proxyUrl)

    proxyFetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      // 处理 headers - 可能是 Headers 对象、对象或数组
      let headers: Record<string, string> = {}
      if (init?.headers) {
        if (init.headers instanceof Headers) {
          init.headers.forEach((value, key) => {
            headers[key] = value
          })
        } else if (Array.isArray(init.headers)) {
          init.headers.forEach(([key, value]) => {
            headers[key] = value
          })
        } else {
          headers = { ...init.headers as Record<string, string> }
        }
      }

      const url = typeof input === 'string' ? input : input instanceof URL ? input.href : (input as Request).url

      try {
        const response = await undiciFetch(url, {
          method: init?.method,
          headers: headers,
          body: init?.body as any,
          dispatcher: proxyAgent,
        })

        return response as any
      } catch (proxyError) {
        // 代理失败时，fallback 到普通 fetch
        console.warn('[Supabase] Proxy fetch failed, falling back to direct fetch:', proxyError)
        return fetch(input, init)
      }
    }

    return proxyFetch
  } catch (error) {
    console.error('[Supabase] Failed to configure proxy fetch:', error)
    return undefined
  }
}

/**
 * Creates a Supabase client for server-side usage
 *
 * @example
 * Example usage:
 * - Server Components: await createClient()
 * - Server Actions: await createClient()
 * - Route Handlers: await createClient()
 */
export async function createClient(): Promise<SupabaseClient<Database>> {
  const cookieStore = await cookies()

  // 🔧 Fix: 检测是否为 HTTPS 环境
  // 在 Next.js server component 中无法直接获取协议，使用环境变量判断
  const isHttps = process.env.NODE_ENV === 'production'

  // 🔍 Debug: 禁用开发环境日志以避免内存泄漏
  // const isDev = process.env.NODE_ENV === 'development'

  // 🔧 临时禁用以解决内存泄漏问题
  const isDev = false

  /* // 已禁用：日志输出导致内存泄漏
  if (isDev) {
    const allCookies = cookieStore.getAll()
    const sbCookies = allCookies.filter(c => c.name.includes('sb-'))

    console.log('🍪 [Server Client] Cookie info:', {
      total: allCookies.length,
      sbCookies: sbCookies.map(c => ({
        name: c.name,
        hasValue: !!c.value,
        valueLength: c.value?.length || 0,
      })),
      isHttps
    })
  }
  */

  // 开发环境使用代理 fetch
  const customFetch = await getProxyFetch()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        fetch: customFetch || undefined,
      },
      cookies: {
        get(name: string) {
          const value = cookieStore.get(name)?.value

          /* // 已禁用：日志输出导致内存泄漏
          if (isDev && name.includes('sb-')) {
            console.log(`🔍 [Server Client] Reading cookie: ${name}, found: ${!!value}`)
          }
          */

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

            /* // 已禁用：日志输出导致内存泄漏
            if (isDev) {
              console.log('[createClient] Set cookie:', name, 'secure:', isHttps)
            }
            */
          } catch (error) {
            console.error('[createClient] Failed to set cookie:', name, 'error:', error)
          }
        },
        remove(name: string, options: any) {
          try {
            /* // 已禁用：日志输出导致内存泄漏
            if (isDev && name.includes('sb-')) {
              console.log('🚨 [createClient] Attempting to remove cookie:', name)
            }
            */

            // 🔧 临时阻止删除 auth-token 相关的 cookies
            if (name.includes('auth-token')) {
              /* // 已禁用：日志输出导致内存泄漏
              if (isDev) {
                console.log('🛑 [createClient] BLOCKED removal of auth cookie:', name)
              }
              */
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
export async function createAdminClient(): Promise<SupabaseClient<Database>> {
  const { createClient: createDirectClient } = await import('@supabase/supabase-js')

  // 开发环境使用代理 fetch
  const customFetch = await getProxyFetch()

  return createDirectClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      ...(customFetch ? { global: { fetch: customFetch } } : {}),
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
 * 🚀 Performance: Uses React cache() to deduplicate auth requests within the same render pass
 * This prevents multiple auth API calls when getCurrentUser is called from different components
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
export const getCurrentUser = cache(async () => {
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
})

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
 * 🚀 Performance: Uses React cache() to deduplicate requests within the same render pass
 * This prevents multiple database queries when getUserProfile is called from different components
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
export const getUserProfile = cache(async () => {
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
})

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
