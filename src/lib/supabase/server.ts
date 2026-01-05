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
 * ```tsx
 * // In a Server Component
 * import { createClient } from '@/lib/supabase/server'
 *
 * export default async function Page() {
 *   const supabase = await createClient()
 *   const { data: books } = await supabase.from('books').select('*')
 *   return <div>{/* render books */}</div>
 * }
 * ```
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch {
            // set() can fail in Server Components but that's okay
            // The cookie will be set in the middleware instead
          }
        },
        remove(name: string, options: any) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch {
            // remove() can fail in Server Components but that's okay
          }
        },
      },
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
  const supabase = await createClient()

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

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
