import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI, hasPermission } from '@/lib/admin-auth'
import { MEDICAL_FEATURES } from '@/lib/medical-training'
import { logger } from '@/lib/logger'

const requestSchema = z.object({ features: z.array(z.enum(MEDICAL_FEATURES)).max(MEDICAL_FEATURES.length) })
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminForAPI()
  if (!auth.success) return NextResponse.json({ error: auth.error }, { status: auth.status })
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: '套餐编号无效' }, { status: 400 })
  try {
    const db = await createAdminClient()
    const { data, error } = await db.from('medical_package_features').select('feature').eq('package_id', id)
    if (error) throw error
    return NextResponse.json({ features: data.map(row => row.feature) }, { headers: { 'Cache-Control': 'no-store' } })
  } catch (error) { logger.error('[medical-features] read failed', error); return NextResponse.json({ error: '读取权限失败' }, { status: 500 }) }
}
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await checkAdminForAPI()
  if (!auth.success) return NextResponse.json({ error: auth.error }, { status: auth.status })
  if (!hasPermission(auth.admin, 'manage_invitation_codes')) return NextResponse.json({ error: '没有套餐管理权限' }, { status: 403 })
  const { id } = await params
  if (!z.uuid().safeParse(id).success) return NextResponse.json({ error: '套餐编号无效' }, { status: 400 })
  try {
    const body = requestSchema.safeParse(await request.json())
    if (!body.success) return NextResponse.json({ error: '功能配置无效' }, { status: 400 })
    const db = await createAdminClient()
    const { error } = await db.rpc('replace_medical_package_features', { p_package_id: id, p_features: [...new Set(body.data.features)] })
    if (error) throw error
    return NextResponse.json({ features: body.data.features })
  } catch (error) { logger.error('[medical-features] save failed', error); return NextResponse.json({ error: '保存权限失败，请重试' }, { status: 500 }) }
}
