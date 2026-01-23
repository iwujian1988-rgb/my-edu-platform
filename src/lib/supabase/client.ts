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
  // 🔧 Fix: 在 HTTPS 环境下必须设置 secure: true
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'

  // 🔍 Debug: 验证代码是否被执行
  if (typeof window !== 'undefined') {
    console.log('🔍 [createClient] Creating Supabase client with cookie options:', {
      isHttps,
      protocol: window.location.protocol,
      hostname: window.location.hostname,
      secure: isHttps
    })
  }

  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: {
        // 根据 HTTPS/HTTP 动态设置 secure 属性
        secure: isHttps,
        sameSite: 'lax',
        path: '/',
      },
      isSingleton: true,  // 🔧 FIX: 启用单例模式，避免多实例冲突
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
    // 🔧 Fix: 在 HTTPS 环境下必须设置 secure: true
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:'

    browserClientInstance = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookieOptions: {
          secure: isHttps,
        },
      }
    )
  }
  return browserClientInstance
}
