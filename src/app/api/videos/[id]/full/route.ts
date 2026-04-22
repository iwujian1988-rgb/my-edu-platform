/**
 * 视频详情 + 字幕 + 高亮标记 API
 *
 * GET /api/videos/[id]/full
 */

import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, createClient, createAdminClient } from '@/lib/supabase/server'
import { hasVideoAccess } from '@/lib/video-permissions'
import type { VideoFullResponseExtended } from '@/types/video'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const logs: string[] = []
  const log = (msg: string) => {
    console.log('[api/videos/[id]/full]', msg)
    logs.push(msg)
  }

  try {
    log('Start')
    const { id: videoId } = await params
    log(`videoId: ${videoId}`)

    // 1. 获取用户
    log('Getting user...')
    const user = await getCurrentUser()
    if (!user) {
      log('No user found')
      return NextResponse.json(
        { success: false, error: '未登录', code: 'UNAUTHORIZED' },
        { status: 401 }
      )
    }
    log(`User found: ${user.id}`)

    // 2. 创建客户端
    log('Creating supabase client...')
    const supabase = await createClient()
    log('Client created')

    // 3. 获取视频
    log('Querying video...')
    const { data: video, error: videoError } = await supabase
      .from('videos')
      .select('*')
      .eq('id', videoId)
      .single()

    if (videoError) {
      log(`Video error: ${JSON.stringify(videoError)}`)
      return NextResponse.json(
        { success: false, error: '视频不存在', code: 'NOT_FOUND', logs },
        { status: 404 }
      )
    }
    log(`Video found: ${video.id}, status: ${video.status}`)

    // 4. 检查权限
    log('Checking access...')
    const hasAccess = await hasVideoAccess(user.id, videoId)
    log(`hasVideoAccess result: ${hasAccess}`)

    // 无权限时返回基本信息
    if (!hasAccess) {
      log('No access, returning basic info')
      return NextResponse.json({
        success: true,
        data: {
          video,
          subtitles: [],
          cards: { words: [], phrases: [], expressions: [] },
          exercises: [],
          difficulty_analysis: null,
          has_access: false,
          user_progress: null,
          grammar_points: [],
          pronunciation_tips: [],
          vocabulary_network: null,
        } as VideoFullResponseExtended,
      })
    }

    // 5. 获取字幕
    log('Querying subtitles...')
    const { data: subtitles, error: subError } = await supabase
      .from('video_subtitles')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true })

    if (subError) {
      log(`Subtitles error: ${JSON.stringify(subError)}`)
    } else {
      log(`Subtitles count: ${subtitles?.length || 0}`)
    }

    // 6. 获取高亮关联
    const subtitleIds = subtitles?.map(s => s.id) || []
    let highlightRelations: any[] = []

    if (subtitleIds.length > 0) {
      log('Querying subtitle-card relations...')
      const { data: relations } = await supabase
        .from('subtitle_card_relations')
        .select('subtitle_id, card_type, card_id, start_position, end_position')
        .in('subtitle_id', subtitleIds)
      highlightRelations = relations || []
      log(`Relations count: ${highlightRelations.length}`)
    }

    // 7. 构建带高亮的字幕
    const subtitlesWithHighlights = (subtitles || []).map(subtitle => ({
      ...subtitle,
      highlights: highlightRelations
        .filter(r => r.subtitle_id === subtitle.id)
        .map(r => ({
          card_type: r.card_type,
          card_id: r.card_id,
          text: subtitle.original_text?.substring(r.start_position, r.end_position) || '',
          start_position: r.start_position,
          end_position: r.end_position,
        })),
    }))

    // 8. 获取卡片数据
    log('Querying cards...')
    const [
      { data: wordCards },
      { data: phraseCards },
      { data: expressionCards },
    ] = await Promise.all([
      supabase.from('video_word_cards').select('*').eq('video_id', videoId).eq('is_reviewed', true).order('display_order'),
      supabase.from('video_phrase_cards').select('*').eq('video_id', videoId).eq('is_reviewed', true).order('display_order'),
      supabase.from('video_expression_cards').select('*').eq('video_id', videoId).eq('is_reviewed', true).order('display_order'),
    ])
    log(`Word cards: ${wordCards?.length || 0}, Phrases: ${phraseCards?.length || 0}, Expressions: ${expressionCards?.length || 0}`)

    // 9. 获取练习
    log('Querying exercises...')
    const { data: exercises } = await supabase
      .from('video_exercises')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order')
    log(`Exercises: ${exercises?.length || 0}`)

    // 9.5 获取新增学习内容（使用 Admin 客户端绕过 RLS）
    log('Querying learning content with admin client...')

    // 创建 admin 客户端用于学习内容查询（绕过 RLS）
    const adminClient = await createAdminClient()

    const [
      { data: grammarPoints },
      { data: pronunciationTips },
      { data: vocabularyNetwork },
    ] = await Promise.all([
      adminClient.from('video_grammar_points').select('*').eq('video_id', videoId).order('display_order'),
      adminClient.from('video_pronunciation_tips').select('*').eq('video_id', videoId).order('display_order'),
      adminClient.from('video_vocabulary_networks').select('*').eq('video_id', videoId).maybeSingle(),
    ])
    log(`Grammar: ${grammarPoints?.length || 0}, Pronunciation: ${pronunciationTips?.length || 0}, Network: ${vocabularyNetwork ? 'found' : 'not found'}`)

    // 10. 获取难度分析
    log('Querying difficulty analysis...')
    const { data: difficultyAnalysis } = await supabase
      .from('video_difficulty_analysis')
      .select('*')
      .eq('video_id', videoId)
      .maybeSingle()
    log(`Difficulty: ${difficultyAnalysis ? 'found' : 'not found'}`)

    // 11. 获取用户进度
    log('Querying user progress...')
    const { data: userProgress } = await supabase
      .from('user_video_progress')
      .select('last_position, max_progress, is_completed')
      .eq('user_id', user.id)
      .eq('video_id', videoId)
      .maybeSingle()
    log(`Progress: ${userProgress ? 'found' : 'not found'}`)

    // 12. 更新观看次数（忽略错误）
    log('Updating view count...')
    try {
      await supabase
        .from('videos')
        .update({ view_count: (video.view_count || 0) + 1 })
        .eq('id', videoId)
    } catch {
      // 忽略更新错误
    }
    log('Done')

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
        grammar_points: grammarPoints || [],
        pronunciation_tips: pronunciationTips || [],
        vocabulary_network: vocabularyNetwork || null,
      } as VideoFullResponseExtended,
    })

  } catch (error) {
    log(`Unexpected error: ${error}`)
    console.error('[api/videos/[id]/full] Error:', error)
    return NextResponse.json(
      {
        success: false,
        error: '服务器错误',
        code: 'INTERNAL_ERROR',
        details: error instanceof Error ? error.message : String(error),
        logs
      },
      { status: 500 }
    )
  }
}
