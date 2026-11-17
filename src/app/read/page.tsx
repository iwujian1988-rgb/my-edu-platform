import { notFound, redirect } from 'next/navigation'
import { ProductEntryPicker } from '@/components/ProductEntryPicker'
import { buildProductEntries } from '@/lib/product-entries'
import { createAdminClient, createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export default async function NovelSelectionPage() {
  const client = await createClient()
  const { data: { user } } = await client.auth.getUser()
  if (!user) redirect(`/login?redirect=${encodeURIComponent('/read')}`)

  const admin = await createAdminClient()
  const { data: profile, error: profileError } = await admin.from('users')
    .select('package_ids, permission_expires_at, is_banned').eq('id', user.id).maybeSingle()
  if (profileError) throw profileError
  if (!profile || profile.is_banned || (profile.permission_expires_at && new Date(profile.permission_expires_at) <= new Date())) notFound()
  const packageIds = (profile.package_ids as string[] | null) || []
  if (!packageIds.length) notFound()

  const { data: novels, error } = await admin.from('books').select('id, title, cover_url')
    .eq('is_novel', true).eq('is_published', true).overlaps('package_ids', packageIds)
    .order('created_at', { ascending: true }).order('id', { ascending: true })
  if (error) throw error
  if (!novels?.length) notFound()
  if (novels.length === 1) redirect(`/read/${encodeURIComponent(novels[0].id)}`)

  const entries = buildProductEntries({ has_maxnote: false, has_video: false, has_work_english: false, novels })
  return <main className="min-h-screen bg-[#f8f7f4]"><ProductEntryPicker entries={entries} /></main>
}
