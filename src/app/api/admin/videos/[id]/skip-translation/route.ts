/**
 * 跳过字幕翻译 API
 *
 * POST /api/admin/videos/[id]/skip-translation
 *
 * 工作流 Step 3 可跳过: 标记翻译步骤为 skipped
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/server'
import { skipStep } from '@/lib/workflow-helper'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 1. 权限检查
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error },
        { status: adminCheck.status }
      )
    }

    const { id: videoId } = await params
    const supabase = await createAdminClient()

    // 2. 获取当前视频信息
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, title')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 })
    }

    // 3. 更新工作流状态 - 标记翻译步骤为 skipped
    const result = await skipStep(supabase, videoId, 'translation')

    if (!result.success) {
      console.error('[skip-translation] Update error:', result.error)
      return NextResponse.json({ error: result.error || '更新失败' }, { status: 500 })
    }

    // 4. 返回结果
    return NextResponse.json({
      success: true,
      message: '已跳过字幕翻译',
      data: {
        video_id: videoId,
        video_title: video.title,
        workflow_progress: result.progress,
      },
    })
  } catch (error) {
    console.error('[skip-translation] Error:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
