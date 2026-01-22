/**
 * Supabase Client for Browser/Client Components
 *
 * This file creates a Supabase client specifically for use in:
 * - Client Components ('use client' directive)
 * - Browser environments
 * - Client-side data fetching and real-time subscriptions
 *
 * Key differences from server.ts:
 * - Uses @supabase/supabase-js (not @supabase/ssr)
 * - Can be used in Client Components and useEffect hooks
 * - Supports real-time subscriptions
 * - Properly stores refresh tokens in browser cookies
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for browser/client component usage
 *
 * @example
 * ```tsx
 * 'use client'
 * import { createClient } from '@/lib/supabase/client'
 *
 * export function MyComponent() {
 *   const supabase = createClient()
 *
 *   useEffect(() => {
 *     supabase.from('books').select('*').then(...)
 *   }, [])
 * }
 * ```
 */
export function createClient() {
  // 🔧 使用 @supabase/supabase-js 而不是 @supabase/ssr
  // 原因：@supabase/ssr 的 createBrowserClient 在浏览器端不会存储 refresh-token
  // @supabase/supabase-js 的 createClient 会正确存储 refresh-token
  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      // 🔍 Debug: 监听所有auth事件
      auth: {
        debug: true, // 开启详细日志
        persistSession: true, // 持久化session
        storage: window.localStorage, // 使用localStorage作为辅助存储
        autoRefreshToken: true, // 自动刷新token
        detectSessionInUrl: true, // 从URL检测session
        flowType: 'pkce', // 使用PKCE流程（更安全）
      },
    }
  )

  // 🔍 Debug: 监听session变化和token刷新
  if (typeof window !== 'undefined') {
    client.auth.onAuthStateChange((event, session) => {
      console.log('🔔 [Auth Event]', {
        event,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token,
        expiresAt: session?.expires_at,
      })
    })

    // 监听token刷新事件
    client.auth.onTokenRefreshed(() => {
      console.log('🔄 [Token Refreshed] Token has been refreshed')
    })
  }

  return client
}

/**
 * Singleton instance for browser client
 * Use this if you need to reference the same client instance across multiple components
 */
let browserClientInstance: ReturnType<typeof createBrowserClient<Database>> | null = null

export function getBrowserClient() {
  if (!browserClientInstance) {
    browserClientInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            if (typeof document === 'undefined') return ''
            const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
            if (match) return match[2]
            return ''
          },
          set(name: string, value: string, options: any) {
            // 🔧 Critical fix for HTTP environments
            const isLocal = typeof location !== 'undefined' && location.hostname === 'localhost'
            const isHttps = typeof location !== 'undefined' && location.protocol === 'https:'
            const forceSecure = isLocal || isHttps

            const cookieOptions = {
              ...options,
              secure: forceSecure,
              sameSite: 'lax',
              path: '/',
            }

            let cookieString = `${name}=${encodeURIComponent(value)}`

            if (cookieOptions.maxAge) {
              cookieString += `; Max-Age=${cookieOptions.maxAge}`
            }

            if (cookieOptions.domain) {
              cookieString += `; Domain=${cookieOptions.domain}`
            }

            if (cookieOptions.path) {
              cookieString += `; Path=${cookieOptions.path}`
            }

            if (cookieOptions.expires) {
              cookieString += `; Expires=${cookieOptions.expires.toUTCString()}`
            }

            if (cookieOptions.sameSite) {
              cookieString += `; SameSite=${cookieOptions.sameSite}`
            }

            if (cookieOptions.secure) {
              cookieString += `; Secure`
            }

            if (typeof window !== 'undefined' && name.includes('sb-')) {
              console.log('🍪 [Singleton Cookie Set]', {
                name,
                secure: forceSecure,
                isLocal,
                isHttps,
                hostname: typeof location !== 'undefined' ? location.hostname : 'unknown'
              })
            }

            document.cookie = cookieString
          },
          remove(name: string, options: any) {
            document.cookie = `${name}=; Max-Age=0; Path=/`

            if (typeof window !== 'undefined' && name.includes('sb-')) {
              console.log('🗑️ [Singleton Cookie Remove]', { name })
            }
          },
        },
      }
    )
  }
  return browserClientInstance
}
