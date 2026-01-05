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
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
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
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  }
  return browserClientInstance
}
