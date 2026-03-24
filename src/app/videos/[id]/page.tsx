import { notFound, redirect } from 'next/navigation'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { hasVideoAccess } from '@/lib/video-permissions'
import VideoLearningClient from './pageClient'
import type { VideoFullResponseExtended } from '@/types/video'

interface PageProps {
  params: Promise<{ id: string }>
}

// 服务器端预取所有数据
async function getVideoFullData(videoId: string, userId: string): Promise<VideoFullResponseExtended | null> {
  const supabase = await createAdminClient()

  // 1. 获取视频基本信息
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single()

  if (videoError || !video) {
    return null
  }

  // 2. 检查权限
  const hasAccess = await hasVideoAccess(userId, videoId)

  // 无权限时返回基本信息
  if (!hasAccess) {
    return {
      video,
      subtitles: [],
      cards: { words: [], phrases: [], expressions: [] },
      exercises: [],
      difficulty_analysis: null,
      has_access: false,
      user_progress: null,
    }
  }

  // 3. 并行获取所有数据
  const [
    subtitlesResult,
    wordCardsResult,
    phraseCardsResult,
    expressionCardsResult,
    exercisesResult,
    difficultyResult,
    progressResult,
    grammarPointsResult,
    pronunciationTipsResult,
    vocabularyNetworkResult,
  ] = await Promise.all([
    // 字幕
    supabase
      .from('video_subtitles')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order', { ascending: true }),
    // 单词卡片
    supabase
      .from('video_word_cards')
      .select('*')
      .eq('video_id', videoId)
      .eq('is_reviewed', true)
      .order('display_order'),
    // 短语卡片
    supabase
      .from('video_phrase_cards')
      .select('*')
      .eq('video_id', videoId)
      .eq('is_reviewed', true)
      .order('display_order'),
    // 表达卡片
    supabase
      .from('video_expression_cards')
      .select('*')
      .eq('video_id', videoId)
      .eq('is_reviewed', true)
      .order('display_order'),
    // 练习
    supabase
      .from('video_exercises')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order'),
    // 难度分析
    supabase
      .from('video_difficulty_analysis')
      .select('*')
      .eq('video_id', videoId)
      .maybeSingle(),
    // 用户进度
    supabase
      .from('user_video_progress')
      .select('last_position, max_progress, is_completed')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle(),
    // 语法点
    supabase
      .from('video_grammar_points')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order'),
    // 发音要点
    supabase
      .from('video_pronunciation_tips')
      .select('*')
      .eq('video_id', videoId)
      .order('display_order'),
    // 词汇网络
    supabase
      .from('video_vocabulary_networks')
      .select('*')
      .eq('video_id', videoId)
      .maybeSingle(),
  ])

  const subtitles = subtitlesResult.data || []
  const subtitleIds = subtitles.map(s => s.id)

  // 4. 获取高亮关联（需要字幕ID）
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

  // 5. 构建带高亮的字幕
  const subtitlesWithHighlights = subtitles.map(subtitle => ({
    ...subtitle,
    highlights: highlightRelations
      .filter(r => r.subtitle_id === subtitle.id)
      .map(r => ({
        card_type: r.card_type as 'word' | 'phrase' | 'expression',
        card_id: r.card_id,
        text: subtitle.original_text?.substring(r.start_position, r.end_position) || '',
        start_position: r.start_position,
        end_position: r.end_position,
      })),
  }))

  // 6. 异步更新观看次数（不阻塞响应）
  supabase
    .from('videos')
    .update({ view_count: (video.view_count || 0) + 1 })
    .eq('id', videoId)
    .then(() => {}) // 忽略结果

  return {
    video,
    subtitles: subtitlesWithHighlights,
    cards: {
      words: wordCardsResult.data || [],
      phrases: phraseCardsResult.data || [],
      expressions: expressionCardsResult.data || [],
    },
    exercises: exercisesResult.data || [],
    difficulty_analysis: difficultyResult.data || null,
    has_access: true,
    user_progress: progressResult.data ? {
      last_position: progressResult.data.last_position,
      max_progress: progressResult.data.max_progress,
      is_completed: progressResult.data.is_completed,
    } : null,
    grammar_points: grammarPointsResult.data || [],
    pronunciation_tips: pronunciationTipsResult.data || [],
    vocabulary_network: vocabularyNetworkResult.data || null,
  }
}

export default async function VideoLearningPage({ params }: PageProps) {
  // 1. 验证用户登录
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent('/videos/' + (await params).id)}`)
  }

  // 2. 获取视频ID
  const { id: videoId } = await params

  // 3. 服务器端预取所有数据
  const data = await getVideoFullData(videoId, user.id)

  if (!data) {
    notFound()
  }

  // 4. 直接传递数据给客户端组件（无需客户端再请求）
  return <VideoLearningClient videoId={videoId} initialData={data} />
}
