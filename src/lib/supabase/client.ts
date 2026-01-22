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
  return createBrowserClient<Database>(
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
          // Browser security policy blocks cookies with 'Secure' attribute in HTTP (non-localhost)
          // We force secure: false for HTTP IP addresses while preserving it for localhost/HTTPS

          const isLocal = typeof location !== 'undefined' && location.hostname === 'localhost'
          const isHttps = typeof location !== 'undefined' && location.protocol === 'https:'

          // Only allow secure: true for localhost or HTTPS environments
          const forceSecure = isLocal || isHttps

          const cookieOptions = {
            ...options,
            secure: forceSecure,
            sameSite: 'lax',
            path: '/',
          }

          // Manually construct cookie string to ensure complete control
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

          // Only add 'Secure' attribute when explicitly allowed
          if (cookieOptions.secure) {
            cookieString += `; Secure`
          }

          // Debug logging to track cookie behavior
          if (typeof window !== 'undefined' && name.includes('sb-')) {
            console.log('🍪 [Client Cookie Set]', {
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
            console.log('🗑️ [Client Cookie Remove]', { name })
          }
        },
      },
    }
  )
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
