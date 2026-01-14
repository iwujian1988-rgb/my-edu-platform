import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createClient()

  // Sign out from Supabase Auth
  await supabase.auth.signOut()

  // Redirect to login page
  redirect('/login')
}
