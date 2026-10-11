import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient, getCurrentUser } from '@/lib/supabase/server'
import { logger } from '@/lib/logger'
import { assessMedicalSubmission, filterMedicalMaterial, medicalMaterialSchema, medicalSubmissionSchema, resolveMedicalFeatures } from '@/lib/medical-training'
import type { MedicalPackageGrant } from '@/lib/medical-training'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

type MedicalDatabase = Database & { public: { Tables: {
  videos: { Row: { id: string; language: string; status: string; package_ids: string[] }; Insert: { id: string }; Update: { status?: string }; Relationships: [] }
} } }

export const dynamic = 'force-dynamic'
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store' }
async function context(videoId: string) {
  const user = await getCurrentUser()
  if (!user) return { error: '请先登录', status: 401 } as const
  if (!UUID.test(videoId)) return { error: '视频编号无效', status: 400 } as const
  const db = await createAdminClient() as unknown as SupabaseClient<MedicalDatabase>
  const [videoResult, profileResult] = await Promise.all([
    db.from('videos').select('id,language,status,package_ids').eq('id', videoId).maybeSingle(),
    db.from('users').select('package_ids').eq('id', user.id).maybeSingle(),
  ])
  if (videoResult.error || profileResult.error) throw new Error('无法检查套餐权限')
  const video = videoResult.data
  if (!video || video.status !== 'published') return { error: '视频不存在', status: 404 } as const
  const packageIds = (profileResult.data?.package_ids ?? []) as string[]
  const matching = packageIds.filter(id => (video.package_ids ?? []).includes(id))
  if (video.language !== 'en' || !matching.length) return { error: '需要本视频的临床英语套餐', status: 403 } as const
  const activePackages = await db.from('invitation_packages').select('id').in('id', matching).eq('is_active', true)
  if (activePackages.error) throw new Error('无法检查套餐状态')
  const activeIds = (activePackages.data ?? []).map(pkg => pkg.id)
  if (!activeIds.length) return { error: '临床英语套餐暂未开放', status: 403 } as const
  const grantResult = await db.from('medical_package_features').select('package_id,feature').in('package_id', activeIds)
  if (grantResult.error) throw new Error('无法读取功能权限')
  const features = resolveMedicalFeatures(packageIds, video.package_ids ?? [], grantResult.data as MedicalPackageGrant[], video)
  if (!features.length) return { error: '当前套餐尚未开放临床专属训练', status: 403 } as const
  return { db, userId: user.id, features } as const
}
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await context(id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status, headers: PRIVATE_HEADERS })
    const { data, error } = await access.db.from('medical_video_learning').select('material,version').eq('video_id', id).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ features: access.features, material: null, progress: [] }, { headers: PRIVATE_HEADERS })
    const material = medicalMaterialSchema.parse(data.material)
    const progressResult = await access.db.from('medical_training_progress').select('feature,submission,result,updated_at').eq('user_id', access.userId).eq('video_id', id).eq('version', data.version).in('feature', access.features)
    if (progressResult.error) throw progressResult.error
    return NextResponse.json({ features: access.features, material: filterMedicalMaterial(material, access.features), progress: progressResult.data }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    logger.error('[medical-training] read failed', error)
    return NextResponse.json({ error: '临床资料暂时无法读取，请重试' }, { status: 500, headers: PRIVATE_HEADERS })
  }
}
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const access = await context(id)
    if ('error' in access) return NextResponse.json({ error: access.error }, { status: access.status, headers: PRIVATE_HEADERS })
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: '提交格式无效' }, { status: 400 }) }
    const parsed = medicalSubmissionSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: '请检查填写内容' }, { status: 400 })
    if (!access.features.includes(parsed.data.feature)) return NextResponse.json({ error: '当前套餐未开放这项训练' }, { status: 403 })
    const { data, error } = await access.db.from('medical_video_learning').select('material').eq('video_id', id).maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: '本集资料尚未开放' }, { status: 404 })
    const material = medicalMaterialSchema.parse(data.material)
    let result: ReturnType<typeof assessMedicalSubmission>
    try { result = assessMedicalSubmission(material, parsed.data) }
    catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : '提交无效' }, { status: 400 }) }
    const saved = await access.db.from('medical_training_progress').upsert({ user_id: access.userId, video_id: id, feature: parsed.data.feature, version: material.version, submission: parsed.data, result, updated_at: new Date().toISOString() }, { onConflict: 'user_id,video_id,feature,version' })
    if (saved.error) throw saved.error
    return NextResponse.json({ result }, { headers: PRIVATE_HEADERS })
  } catch (error) {
    logger.error('[medical-training] save failed', error)
    return NextResponse.json({ error: '保存失败，已填写内容仍保留，请重试' }, { status: 500, headers: PRIVATE_HEADERS })
  }
}
