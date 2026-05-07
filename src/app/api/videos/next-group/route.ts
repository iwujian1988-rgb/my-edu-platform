/**
 * 下一组 API — 联播模式用
 *
 * GET /api/videos/next-group?current_source_video_id=xxx&language=fr
 *
 * 查找比当前 source_video_id 更新的下一个分组（按 created_at 降序），
 * 返回该组第一个视频的 ID 和标题。
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const authUser = await getCurrentUser()
    if (!authUser) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const currentSourceVideoId = request.nextUrl.searchParams.get('current_source_video_id')
    if (!currentSourceVideoId) {
      return NextResponse.json({ error: '缺少 current_source_video_id' }, { status: 400 })
    }

    const language = request.nextUrl.searchParams.get('language')

    const supabase = await createAdminClient()

    // 获取当前视频的创建时间，作为"更旧"的分界点
    const { data: currentVideo } = await supabase
      .from('videos')
      .select('created_at')
      .eq('source_video_id', currentSourceVideoId)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const currentVideoRow = currentVideo as any
    if (!currentVideoRow) {
      return NextResponse.json({ success: true, data: null })
    }

    // 查找比当前组更新的下一组（按 created_at 降序取第一个不同 source_video_id）
    let query = supabase
      .from('videos')
      .select('source_video_id')
      .eq('status', 'published')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .lt('created_at', currentVideoRow.created_at as string)
      .neq('source_video_id', currentSourceVideoId)
      .not('source_video_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    if (language) {
      query = query.eq('language', language)
    }

    const { data: nextGroup } = await query

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nextGroupRow = (nextGroup as any[])?.[0]
    if (!nextGroupRow?.source_video_id) {
      return NextResponse.json({ success: true, data: null })
    }

    const nextSourceVideoId = nextGroupRow.source_video_id

    // 获取该组第一个已发布的视频
    const { data: firstVideo } = await supabase
      .from('videos')
      .select('id, title, package_ids')
      .eq('source_video_id', nextSourceVideoId)
      .eq('status', 'published')
      .order('display_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const firstVideoRow = firstVideo as any
    if (!firstVideoRow) {
      return NextResponse.json({ success: true, data: null })
    }

    // 权限检查
    const { data: user } = await supabase
      .from('users')
      .select('package_ids, feature_permissions, permission_expires_at')
      .eq('id', authUser.id)
      .single()

    if (!user) {
      return NextResponse.json({ success: true, data: null })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const u = user as any
    const userPackageIds: string[] = u.package_ids || []
    const videoPackageIds: string[] = firstVideoRow.package_ids || []

    let hasAccess = false
    if (userPackageIds.length > 0) {
      hasAccess = userPackageIds.some((id: string) => videoPackageIds.includes(id))
    } else if (u.feature_permissions?.includes('video')) {
      hasAccess = !u.permission_expires_at || new Date(u.permission_expires_at) > new Date()
    }

    if (!hasAccess) {
      return NextResponse.json({ success: true, data: null })
    }

    return NextResponse.json({
      success: true,
      data: {
        video_id: firstVideoRow.id,
        title: firstVideoRow.title,
        source_video_id: nextSourceVideoId,
      },
    })
  } catch (error) {
    console.error('[api/videos/next-group] Error:', error)
    return NextResponse.json({ success: true, data: null })
  }
}
