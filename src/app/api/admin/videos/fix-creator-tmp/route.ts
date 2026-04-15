/**
 * 临时修复 creator API（用完可删）
 *
 * POST /api/admin/videos/fix-creator-tmp
 * 鉴权: apikey header = SUPABASE_SERVICE_ROLE_KEY
 *
 * Body: {
 *   creator_name_pattern: string,  // 匹配 creator_name
 *   target_creator_id: string,     // 目标 creator_id
 *   new_creator_name?: string,     // 可选：同时更新 creator_name
 * }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  const apiKey = request.headers.get('apikey')
  if (apiKey !== process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json({ error: '未授权' }, { status: 401 })
  }

  const body = await request.json() as {
    creator_name_pattern: string
    target_creator_id: string
    new_creator_name?: string
  }

  if (!body.creator_name_pattern || !body.target_creator_id) {
    return NextResponse.json({ error: '缺少参数' }, { status: 400 })
  }

  const supabase = await createAdminClient()

  // 1. 验证目标 creator 存在
  const { data: targetCreator } = await supabase
    .from('upstream_creators')
    .select('id, name, avatar_url')
    .eq('id', body.target_creator_id)
    .single()

  if (!targetCreator) {
    return NextResponse.json({ error: '目标 creator 不存在' }, { status: 404 })
  }

  // 2. 查找所有匹配的视频（creator_name 模糊匹配且 creator_id 为 null）
  const { data: videos, error: queryError } = await supabase
    .from('videos')
    .select('id, title, creator_id, creator_name')
    .ilike('creator_name', `%${body.creator_name_pattern}%`)
    .is('creator_id', null)

  if (queryError) {
    return NextResponse.json({ error: queryError.message }, { status: 500 })
  }

  if (!videos || videos.length === 0) {
    return NextResponse.json({
      success: true,
      message: '没有需要修复的视频',
      updated: 0,
    })
  }

  // 3. 批量更新
  const updateData: Record<string, string | null> = {
    creator_id: body.target_creator_id,
    creator_name: body.new_creator_name || targetCreator.name,
  }

  // 如果目标 creator 有头像，也更新
  if (targetCreator.avatar_url) {
    updateData.creator_avatar_url = targetCreator.avatar_url
  }

  const videoIds = videos.map(v => v.id)
  const { error: updateError } = await supabase
    .from('videos')
    .update(updateData)
    .in('id', videoIds)

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 })
  }

  return NextResponse.json({
    success: true,
    updated: videos.length,
    target_creator: targetCreator.name,
    videos: videos.map(v => ({ id: v.id, title: v.title, old_creator_name: v.creator_name })),
  })
}
