import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { hasVideoAccess } from '@/lib/video-permissions'
import VideoLearningClient from './pageClient'
import VideoLoading from './loading'
import type { VideoFullResponseExtended } from '@/types/video'

interface PageProps {
  params: Promise<{ id: string }>
}

// 获取视频基本信息（快速返回）
async function getVideoBasicInfo(videoId: string) {
  const supabase = await createAdminClient()
  const { data: video, error } = await supabase
    .from('videos')
    .select('id, title, original_title, description, video_url, thumbnail_url, duration, language, difficulty, view_count, creator_id, creator_name')
    .eq('id', videoId)
    .single()

  if (error || !video) {
    return null
  }
  return video
}

/** 查询用户在该视频下的答题记录（服务端预取，避免客户端二次请求） */
async function fetchExerciseProgress(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  exercises: Array<{ id: string }>
): Promise<Array<{ exerciseId: string; isCorrect: boolean; attempts: number }>> {
  const exerciseIds = exercises.map(e => e.id)
  if (exerciseIds.length === 0) return []

  const { data } = await supabase
    .from('user_exercise_progress')
    .select('exercise_id, is_correct, attempts')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)

  return (data || []).map(row => ({
    exerciseId: row.exercise_id,
    isCorrect: row.is_correct,
    attempts: row.attempts,
  }))
}

// 获取完整数据（流式加载）
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
      exerciseProgress: [],
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
    creatorResult,
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
    // UP主信息（如果视频关联了 creator_id）
    video.creator_id
      ? supabase
          .from('upstream_creators')
          .select('*')
          .eq('id', video.creator_id)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
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

  // 4.5 如果没有预计算的高亮关联，动态从 cards 中匹配
  if (highlightRelations.length === 0) {
    const allCards = [
      ...(wordCardsResult.data || []).map(c => ({ ...c, card_type: 'word' as const })),
      ...(phraseCardsResult.data || []).map(c => ({ ...c, card_type: 'phrase' as const })),
      ...(expressionCardsResult.data || []).map(c => ({ ...c, card_type: 'expression' as const })),
    ]

    // 为每个字幕动态匹配卡片
    subtitles.forEach(subtitle => {
      if (!subtitle.original_text) return

      allCards.forEach(card => {
        // 获取要匹配的文本
        const textToMatch = card.word || card.phrase || card.expression
        if (!textToMatch) return

        // 在字幕中查找所有匹配位置
        let searchPos = 0
        while (true) {
          const pos = subtitle.original_text!.toLowerCase().indexOf(textToMatch.toLowerCase(), searchPos)
          if (pos === -1) break

          // 检查是否是完整单词（避免部分匹配）
          const beforeChar = subtitle.original_text![pos - 1]
          const afterChar = subtitle.original_text![pos + textToMatch.length]
          const isWordBoundary = (!beforeChar || /[\s\p{P}]/u.test(beforeChar)) &&
                                 (!afterChar || /[\s\p{P}]/u.test(afterChar))

          if (isWordBoundary) {
            highlightRelations.push({
              subtitle_id: subtitle.id,
              card_type: card.card_type,
              card_id: card.id,
              start_position: pos,
              end_position: pos + textToMatch.length,
            })
          }
          searchPos = pos + 1
        }
      })
    })
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

  // 7. 创建或更新学习进度记录（标记为"已学习"）
  // 使用 upsert，如果已存在则更新时间，不存在则创建
  supabase
    .from('user_video_progress')
    .upsert(
      {
        user_id: userId,
        video_id: videoId,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: 'user_id,video_id',
        ignoreDuplicates: false,
      }
    )
    .then(() => {}) // 忽略结果

  // 8. 更新学习日历（记录观看视频）
  const { updateLearningCalendar } = await import('@/lib/learning-calendar')
  updateLearningCalendar(supabase, userId, { videoId })
    .then(result => {
      if (!result.success) {
        console.error('[VideoLearningPage] Calendar update failed:', result.error)
      }
    })

  // 5.5 转换练习数据格式（供 FillBlankExercise 组件使用）
  const subtitleMap = new Map(subtitles.map(s => [s.id, s]))

  const transformedExercises = (exercisesResult.data || []).map((exercise) => {
    // 从 blank_positions 构建 text_with_blanks 和 answers
    const blankPositions = exercise.blank_positions as Array<{ start: number; end: number; word: string; hint?: string }> || []
    const originalText = exercise.original_text || ''

    let textWithBlanks = originalText
    const answers: string[] = []

    // 检测数据格式：如果 original_text 包含下划线，说明是新格式（位置正确）
    // 如果 original_text 不包含下划线但有 blank_positions，说明是旧格式（需要重建）
    const hasUnderscores = /_+/.test(originalText)

    if (hasUnderscores && blankPositions.length > 0) {
      // 新格式：original_text 包含 _____，blank_positions 是相对于它的位置
      // 从后往前替换，避免位置偏移
      const sortedPositions = [...blankPositions].sort((a, b) => b.start - a.start)
      sortedPositions.forEach((pos) => {
        textWithBlanks = textWithBlanks.slice(0, pos.start) + '[blank]' + textWithBlanks.slice(pos.end)
        answers.unshift(pos.word)
      })
    } else if (blankPositions.length > 0) {
      // 旧格式兼容：original_text 已填充答案，需要用 answer_text 重建
      // 使用正则表达式将答案替换为 [blank]
      blankPositions.forEach((pos) => {
        answers.push(pos.word)
      })
      // 按答案长度降序排列，避免短答案误替换长答案的一部分
      const sortedAnswers = [...answers].sort((a, b) => b.length - a.length)
      textWithBlanks = originalText
      sortedAnswers.forEach((answer) => {
        const regex = new RegExp(`\\b${answer}\\b`, 'gi')
        textWithBlanks = textWithBlanks.replace(regex, '[blank]')
      })
    }

    // 关联字幕的播放时间和中文翻译
    // 优先通过 subtitle_id 查找
    let subtitle = exercise.subtitle_id ? subtitleMap.get(exercise.subtitle_id) : null

    if (!subtitle && subtitles.length > 0) {
      // 策略1: 用 answer_text 填充空位后，在字幕中查找包含关系
      const answerText = (exercise as Record<string, unknown>).answer_text as string || ''
      if (answerText && hasUnderscores) {
        const filled = originalText.replace(/_+/g, answerText).toLowerCase().trim()
        subtitle = subtitles.find(s => {
          const subText = s.original_text?.toLowerCase().trim() || ''
          return subText.includes(filled) || filled.includes(subText)
        }) || null
      }

      // 策略2: 用时间匹配（exercise 表可能直接存了 subtitle_start_time）
      if (!subtitle) {
        const exStartTime = (exercise as Record<string, unknown>).subtitle_start_time as number | null
        if (exStartTime != null) {
          const TOLERANCE = 0.5
          subtitle = subtitles.find(s =>
            Math.abs(s.start_time - exStartTime) < TOLERANCE
          ) || null
        }
      }
    }

    // 播放时间：优先用 exercise 自身的，其次用匹配到的字幕
    const startTime = (exercise as Record<string, unknown>).subtitle_start_time as number | null
      ?? subtitle?.start_time
    const endTime = (exercise as Record<string, unknown>).subtitle_end_time as number | null
      ?? subtitle?.end_time

    return {
      ...exercise,
      text_with_blanks: textWithBlanks,
      answers,
      // hint 作为中文语境提示（如"指一个地理区域"、"国家名称"）
      explanation: blankPositions[0]?.hint || null,
      subtitle_start_time: startTime,
      subtitle_end_time: endTime,
      // 优先用字幕翻译，没有则用 hint 兜底
      translation: subtitle?.chinese_text || blankPositions[0]?.hint || null,
    }
  })

  return {
    video,
    subtitles: subtitlesWithHighlights,
    cards: {
      words: wordCardsResult.data || [],
      phrases: phraseCardsResult.data || [],
      expressions: expressionCardsResult.data || [],
    },
    exercises: transformedExercises,
    difficulty_analysis: difficultyResult.data || null,
    has_access: true,
    user_progress: progressResult.data ? {
      last_position: progressResult.data.last_position,
      max_progress: progressResult.data.max_progress,
      is_completed: progressResult.data.is_completed,
    } : null,
    grammar_points: grammarPointsResult.data || [],
    pronunciation_tips: pronunciationTipsResult.data || [],
    vocabulary_network: (() => {
      console.log('[vocab-network-debug] result:', JSON.stringify({ data: vocabularyNetworkResult.data?.id, error: vocabularyNetworkResult.error?.message }))
      return vocabularyNetworkResult.data || null
    })(),
    creator: creatorResult.data || null,
    exerciseProgress: await fetchExerciseProgress(supabase, userId, transformedExercises),
  }
}

// 数据加载组件（用于流式渲染）
async function VideoDataLoader({ videoId, userId }: { videoId: string; userId: string }) {
  const data = await getVideoFullData(videoId, userId)

  if (!data) {
    notFound()
  }

  return <VideoLearningClient videoId={videoId} initialData={data} />
}

export default async function VideoLearningPage({ params }: PageProps) {
  // 1. 验证用户登录
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent('/videos/' + (await params).id)}`)
  }

  // 2. 获取视频ID
  const { id: videoId } = await params

  // 3. 快速获取视频基本信息（用于 SEO 和快速响应）
  const video = await getVideoBasicInfo(videoId)
  if (!video) {
    notFound()
  }

  // 4. 使用流式渲染：先显示加载状态，数据准备好后自动更新
  return (
    <Suspense fallback={<VideoLoading video={video} />}>
      <VideoDataLoader videoId={videoId} userId={user.id} />
    </Suspense>
  )
}
