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
 * - Session stored in localStorage
 * - Works independently of server-side cookies
 */

import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/**
 * Creates a Supabase client for browser/client component usage
 *
 * IMPORTANT: Uses @supabase/supabase-js with localStorage storage.
 * This avoids cookie format compatibility issues with @supabase/ssr.
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
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: window.localStorage,
      },
    }
  )
}

