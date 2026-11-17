import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function FrenchAtlasEntryPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login?redirect=%2Ffrench-atlas-entry')
  redirect('https://fr.maxnote.top/')
}
