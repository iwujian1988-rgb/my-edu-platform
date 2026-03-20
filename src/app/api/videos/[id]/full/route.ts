/**
 * 视频详情 + 字幕 + 高亮标记 API
 *
 * GET /api/videos/[id]/full
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.3
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { hasVideoAccess } from '@/lib/video-permissions'
import type { VideoFullResponse } from '@/types/video'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: videoId } = await params

    // 1. 检查用户登录
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }

    const supabase = await createClient()

    // 2. 获取视频基本信息
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError || !video) {
      return NextResponse.json(
        { success: false, error: '视频不存在', code: 'NOT_FOUND' },
        { status: 404 }
      )
    }

    // 3. 检查用户访问权限
    const hasAccess = await hasVideoAccess(user.id, videoId)

    // 即使没有权限，也返回基本信息（但字幕和卡片为空）
    if (!hasAccess) {
      return NextResponse.json({
        success: true,
        data: {
          video,
          subtitles: [],
          cards: {
            words: [],
            phrases: [],
            expressions: [],
          },
          exercises: [],
          difficulty_analysis: null,
          has_access: false,
        } as VideoFullResponse,
      })
    }

    // 4. 获取字幕（含高亮关联）
    const { data: subtitles, error: subtitlesError } = await supabase
      .from('video_subtitles')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true })

    if (subtitlesError) {
      console.error('[api/videos/[id]/full] Subtitles error:', subtitlesError)
    }

    // 5. 获取字幕-卡片高亮关联
    const subtitleIds = subtitles?.map(s => s.id) || []
    let highlightRelations: Array<{
      subtitle_id: string
      card_type: string
      card_id: string
      start_position: number
      end_position: number
    }> = []

    if (subtitleIds.length > 0) {
      const { data: relations } = await supabase
        .from('subtitle_card_relations')
        .select('subtitle_id, card_type, card_id, start_position, end_position')
        .in('subtitle_id', subtitleIds)

      highlightRelations = relations || []
    }

    // 6. 构建带高亮的字幕
    const subtitlesWithHighlights = (subtitles || []).map(subtitle => ({
      ...subtitle,
      highlights: highlightRelations
        .filter(r => r.subtitle_id === subtitle.id)
        .map(r => ({
          card_type: r.card_type,
          card_id: r.card_id,
          text: subtitle.original_text.substring(r.start_position, r.end_position),
          start_position: r.start_position,
          end_position: r.end_position,
        })),
    }))

    // 7. 获取卡片数据（只返回已审核的卡片）
    const [
      { data: wordCards },
      { data: phraseCards },
      { data: expressionCards },
    ] = await Promise.all([
      supabase
        .from('video_word_cards')
        .select('*')
        .eq('video_id', videoId)
        .eq('is_reviewed', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('video_phrase_cards')
        .select('*')
        .eq('video_id', videoId)
        .eq('is_reviewed', true)
        .order('display_order', { ascending: true }),
      supabase
        .from('video_expression_cards')
        .select('*')
        .eq('video_id', videoId)
        .eq('is_reviewed', true)
        .order('display_order', { ascending: true }),
    ])

    // 8. 获取填空练习
    const { data: exercises } = await supabase
      .from('video_exercises')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true })

    // 9. 获取难度分析
    const { data: difficultyAnalysis } = await supabase
      .from('video_difficulty_analysis')
      .select('*')
      .eq('video_id', videoId)
      .single()

    // 10. 获取用户观看进度
    const { data: userProgress } = await supabase
      .from('user_video_progress')
      .select('last_position, max_progress, is_completed')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .maybeSingle()

    // 11. 更新观看次数（使用直接更新，避免 RPC 依赖）
    await supabase
      .from('videos')
      .update({ view_count: (video.view_count || 0) + 1 })
      .eq('id', videoId)
      .catch(() => {
        // 忽略错误，不影响主流程
      })

    return NextResponse.json({
      success: true,
      data: {
        video,
        subtitles: subtitlesWithHighlights,
        cards: {
          words: wordCards || [],
          phrases: phraseCards || [],
          expressions: expressionCards || [],
        },
        exercises: exercises || [],
        difficulty_analysis: difficultyAnalysis || null,
        has_access: true,
        user_progress: userProgress ? {
          last_position: userProgress.last_position,
          max_progress: userProgress.max_progress,
          is_completed: userProgress.is_completed,
        } : null,
      } as VideoFullResponse,
    })
  } catch (error) {
    console.error('[api/videos/[id]/full] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
