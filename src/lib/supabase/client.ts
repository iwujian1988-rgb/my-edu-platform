/**
 * Supabase Client for Browser/Client Components
 *
 * This file creates a Supabase client specifically for use in:
 * - Client Components ('use client' directive)
 * - Browser environments
 * - Client-side data fetching and real-time subscriptions
 *
 * Key differences from server.ts:
 * - Uses createBrowserClient (not createServerClient)
 * - Can be used in Client Components and useEffect hooks
 * - Supports real-time subscriptions
 * - Does NOT have access to server-side cookies
 */

import { createBrowserClient } from '@supabase/ssr'
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
  // 🔧 最小化自定义cookies配置，确保token能被正确存储
  const client = createBrowserClient<Database>(
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
          // 🔍 Debug日志
          if (typeof window !== 'undefined' && name.includes('sb-')) {
            console.log('🍪 [Set]', {
              name,
              value: value.substring(0, 20) + '...',
              hasRefreshToken: name.includes('refresh-token'),
            })
          }

          // 直接使用document.cookie，保持所有原始options
          let cookieString = `${name}=${value}`

          // 处理所有可能的options属性
          if (options) {
            if (options.maxAge !== undefined) cookieString += `; Max-Age=${options.maxAge}`
            if (options.domain) cookieString += `; Domain=${options.domain}`
            if (options.path) cookieString += `; Path=${options.path}`
            if (options.expires) cookieString += `; Expires=${options.expires.toUTCString()}`
            if (options.sameSite) cookieString += `; SameSite=${options.sameSite}`
            if (options.secure) cookieString += `; Secure`
            if (options.httpOnly) cookieString += `; HttpOnly`
          }

          document.cookie = cookieString

          // 验证是否设置成功
          if (typeof window !== 'undefined' && name.includes('sb-')) {
            const verify = document.cookie.includes(`${name}=`)
            console.log('✅ [Verify]', {
              name,
              setSuccessfully: verify,
            })
          }
        },
        remove(name: string, options: any) {
          document.cookie = `${name}=; Max-Age=0; ${options?.path ? `Path=${options.path}` : 'Path=/'}`
        },
      },
    }
  )

  // 🔍 Debug: 监听session变化
  if (typeof window !== 'undefined') {
    client.auth.onAuthStateChange((event, session) => {
      console.log('🔔 [Auth State]', {
        event,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token,
      })
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
