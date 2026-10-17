import 'server-only'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { WORK_ENGLISH_PERMISSION } from './constants'
import { hasWorkEnglishAccess, type AccessProfile } from './access-policy'
import { lessonStateSchema, type WorkEnglishDatabase } from './schema'

export async function getWorkEnglishSession() {
  const supabase = await createClient()
  const {data: {user}, error} = await supabase.auth.getUser()
  const progress = supabase as unknown as SupabaseClient<WorkEnglishDatabase>
  if (error || !user) return {user: null, hasAccess: false, progress, supabase}
  // Package metadata is private; resolve active product packages on the trusted server.
  const admin = await createAdminClient()
  const [profileResult, packageResult] = await Promise.all([
    supabase.from('users').select('package_ids, permission_expires_at, is_banned').eq('id', user.id).maybeSingle(),
    admin.from('invitation_packages').select('id').eq('is_active', true).contains('feature_permissions', [WORK_ENGLISH_PERMISSION]),
  ])
  if (profileResult.error || packageResult.error) throw new Error('WORK_ENGLISH_ACCESS_UNAVAILABLE')
  return {user, hasAccess: hasWorkEnglishAccess(profileResult.data as unknown as AccessProfile | null, (packageResult.data ?? []).map(row => row.id)), progress, supabase}
}

export async function getLessonProgress(session: Awaited<ReturnType<typeof getWorkEnglishSession>>, lessonId: string, version: number) {
  if (!session.user || !session.hasAccess) throw new Error('WORK_ENGLISH_ACCESS_REQUIRED')
  const {data, error} = await session.progress.from('work_english_progress').select('*')
    .eq('user_id', session.user.id).eq('lesson_id', lessonId).eq('lesson_version', version).maybeSingle()
  if (error) throw new Error('WORK_ENGLISH_PROGRESS_UNAVAILABLE')
  return {state: lessonStateSchema.parse(data?.state ?? {}), revision: data?.revision ?? 0}
}
