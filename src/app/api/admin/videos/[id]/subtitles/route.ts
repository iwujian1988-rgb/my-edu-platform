/**
 * 视频字幕上传 API
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md Section 5.1
 * - "上传 JSON 字幕文件"
 * - "系统自动处理：AI 提取关键词、生成高亮位置"
 *
 * 字幕格式（PRD 5.9）：
 * {
 *   "sentences": [
 *     { "id": 1, "text": "...", "start_time": 0.123, "end_time": 2.456 }
 *   ]
 * }
 */

import { createAdminClient } from '@/lib/supabase/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'
import { completeStep } from '@/lib/workflow-helper'

interface SubtitleSentence {
  id: number
  text: string
  start_time: number
  end_time: number
}

interface SubtitleUploadBody {
  sentences: SubtitleSentence[]
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    const body: SubtitleUploadBody = await request.json()

    if (!body.sentences || !Array.isArray(body.sentences)) {
      return NextResponse.json(
        { error: '缺少字幕数据，格式需要 { sentences: [...] }' },
        { status: 400 }
      )
    }

    // 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    // 验证视频是否存在
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('id, language')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json({ error: '视频不存在' }, { status: 404 })
    }

    // 删除现有字幕
    await supabase
      .from('video_subtitles')
      .delete()
      .eq('video_id', videoId)

    // 准备字幕数据（容错处理：start_time/end_time 为 null 时设置默认值）
    const subtitlesToInsert = body.sentences.map((sentence, index, arr) => {
      // 容错：start_time 为 null 时设为 0 或上一条的 end_time
      let startTime = sentence.start_time
      if (startTime === null || startTime === undefined) {
        startTime = index > 0 ? (arr[index - 1]?.end_time || 0) : 0
      }

      // 容错：end_time 为 null 时设为 start_time + 3 秒
      let endTime = sentence.end_time
      if (endTime === null || endTime === undefined) {
        endTime = startTime + 3
      }

      return {
        video_id: videoId,
        start_time: startTime,
        end_time: endTime,
        original_text: sentence.text || '',
        chinese_text: null, // 稍后由 AI 翻译
        word_count: (sentence.text || '').split(/\s+/).filter(Boolean).length,
        display_order: index,
      }
    })

    // 批量插入字幕
    const { error: insertError } = await supabase
      .from('video_subtitles')
      .insert(subtitlesToInsert)

    if (insertError) {
      console.error('[字幕上传] 插入失败:', insertError)
      return NextResponse.json(
        { error: '字幕保存失败', details: insertError.message },
        { status: 500 }
      )
    }

    // 更新工作流进度：字幕上传完成
    await completeStep(supabase, videoId, 'subtitles')

    // 返回成功结果
    return NextResponse.json({
      success: true,
      message: `成功上传 ${subtitlesToInsert.length} 条字幕`,
      data: {
        video_id: videoId,
        subtitle_count: subtitlesToInsert.length,
        language: video.language,
      }
    })
  } catch (error) {
    console.error('[字幕上传] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}

/**
 * 获取视频字幕列表
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params
    // 验证管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error || '未授权' },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient()

    // 获取字幕列表
    const { data: subtitles, error } = await supabase
      .from('video_subtitles')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: '获取字幕失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: subtitles
    })
  } catch (error) {
    console.error('[获取字幕] 错误:', error)
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    )
  }
}
