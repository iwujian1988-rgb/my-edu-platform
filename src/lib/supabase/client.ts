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
  // 🔧 混合方案：使用 @supabase/supabase-js + 手动同步cookies
  const client = createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage, // 使用localStorage存储session
      },
    }
  )

  // 🔧 关键：监听session变化，同步到cookies
  if (typeof window !== 'undefined') {
    client.auth.onAuthStateChange((event, session) => {
      console.log('🔔 [Auth Event]', {
        event,
        hasAccessToken: !!session?.access_token,
        hasRefreshToken: !!session?.refresh_token,
      })

      // 同步到cookies（供服务端API使用）
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.access_token) {
          // 设置access_token cookie
          document.cookie = `sb-snnrjnpcmdsdlyldvvps-auth-token=${session.access_token}; path=/; secure=true; samesite=lax`
          console.log('✅ [Cookie Sync] access_token synced to cookie')
        }
      } else if (event === 'SIGNED_OUT') {
        // 清除cookies
        document.cookie = 'sb-snnrjnpcmdsdlyldvvps-auth-token=; path=/; max-age=0'
        console.log('🗑️ [Cookie Sync] cookies cleared')
      }
    })
  }

  return client
}

/**
 * Singleton instance for browser client
 * Use this if you need to reference the same client instance across multiple components
 */
let browserClientInstance: ReturnType<typeof createSupabaseClient<Database>> | null = null

export function getBrowserClient() {
  if (!browserClientInstance) {
    browserClientInstance = createSupabaseClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
        },
      }
    )
  }
  return browserClientInstance
}
