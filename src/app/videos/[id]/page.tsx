import { notFound, redirect } from 'next/navigation'
import { Suspense } from 'react'
import { getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { getCached, setCache } from '@/lib/cache/api-cache'
import VideoLearningClient from './pageClient'
import VideoLoading from './loading'
import type { PlaylistItem, VideoFullResponseExtended } from '@/types/video'

interface PageProps {
  params: Promise<{ id: string }>
}

/** 视频静态数据缓存 TTL（秒） */
const VIDEO_STATIC_CACHE_TTL = 300 // 5 分钟

/** JSON 序列化后的静态数据结构（缓存用） */
interface VideoStaticCache {
  subtitles: unknown[]
  cards: { words: unknown[]; phrases: unknown[]; expressions: unknown[] }
  rawExercises: unknown[]
  difficultyAnalysis: unknown | null
  grammarPoints: unknown[]
  pronunciationTips: unknown[]
  vocabularyNetwork: unknown | null
  creator: unknown | null
  highlightRelations: Array<{
    subtitle_id: string
    card_type: string
    card_id: string
    start_position: number
    end_position: number
  }>
}

/**
 * 获取视频静态数据（带缓存）
 * 视频的字幕、卡片、练习等数据不随用户变化，可全局缓存
 */
async function getVideoStaticData(videoId: string, creatorId: string | null): Promise<VideoStaticCache> {
  const cacheKey = `video:static:${videoId}`

  const cached = await getCached<VideoStaticCache>(cacheKey)
  if (cached) {
    return cached
  }

  const supabase = await createAdminClient()

  const [
    subtitlesResult,
    wordCardsResult,
    phraseCardsResult,
    expressionCardsResult,
    exercisesResult,
    difficultyResult,
    grammarPointsResult,
    pronunciationTipsResult,
    vocabularyNetworkResult,
    creatorResult,
  ] = await Promise.all([
    supabase.from('video_subtitles').select('*').eq('video_id', videoId).order('display_order', { ascending: true }),
    supabase.from('video_word_cards').select('*').eq('video_id', videoId).eq('is_reviewed', true).order('display_order'),
    supabase.from('video_phrase_cards').select('*').eq('video_id', videoId).eq('is_reviewed', true).order('display_order'),
    supabase.from('video_expression_cards').select('*').eq('video_id', videoId).eq('is_reviewed', true).order('display_order'),
    supabase.from('video_exercises').select('*').eq('video_id', videoId).order('display_order'),
    supabase.from('video_difficulty_analysis').select('*').eq('video_id', videoId).maybeSingle(),
    supabase.from('video_grammar_points').select('*').eq('video_id', videoId).order('display_order'),
    supabase.from('video_pronunciation_tips').select('*').eq('video_id', videoId).order('display_order'),
    supabase.from('video_vocabulary_networks').select('*').eq('video_id', videoId).maybeSingle(),
    creatorId
      ? supabase.from('upstream_creators').select('*').eq('id', creatorId).maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ])

  const subtitles = subtitlesResult.data || []
  const subtitleIds = subtitles.map(s => s.id)

  let highlightRelations: VideoStaticCache['highlightRelations'] = []

  if (subtitleIds.length > 0) {
    const { data: relations } = await supabase
      .from('subtitle_card_relations')
      .select('subtitle_id, card_type, card_id, start_position, end_position')
      .in('subtitle_id', subtitleIds)
    highlightRelations = relations || []
  }

  if (highlightRelations.length === 0) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const allCards = [
      ...(wordCardsResult.data || []).map(c => ({ ...c, card_type: 'word' as const })),
      ...(phraseCardsResult.data || []).map(c => ({ ...c, card_type: 'phrase' as const })),
      ...(expressionCardsResult.data || []).map(c => ({ ...c, card_type: 'expression' as const })),
    ]

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    subtitles.forEach((subtitle: any) => {
      if (!subtitle.original_text) return
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      allCards.forEach((card: any) => {
        const textToMatch = card.word || card.phrase || card.expression
        if (!textToMatch) return

        let searchPos = 0
        while (true) {
          const pos = subtitle.original_text.toLowerCase().indexOf(textToMatch.toLowerCase(), searchPos)
          if (pos === -1) break

          const beforeChar = subtitle.original_text[pos - 1]
          const afterChar = subtitle.original_text[pos + textToMatch.length]
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

  const staticData: VideoStaticCache = {
    subtitles,
    cards: {
      words: wordCardsResult.data || [],
      phrases: phraseCardsResult.data || [],
      expressions: expressionCardsResult.data || [],
    },
    rawExercises: exercisesResult.data || [],
    difficultyAnalysis: difficultyResult.data || null,
    grammarPoints: grammarPointsResult.data || [],
    pronunciationTips: pronunciationTipsResult.data || [],
    vocabularyNetwork: vocabularyNetworkResult.data || null,
    creator: creatorResult.data || null,
    highlightRelations,
  }

  setCache(cacheKey, staticData, VIDEO_STATIC_CACHE_TTL).catch(() => {})

  return staticData
}

/** 查询用户答题记录 */
async function fetchExerciseProgress(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  exercises: unknown[],
): Promise<Array<{ exerciseId: string; isCorrect: boolean; attempts: number }>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const exerciseIds = exercises.map((e: any) => e.id as string)
  if (exerciseIds.length === 0) return []

  const { data } = await supabase
    .from('user_exercise_progress')
    .select('exercise_id, is_correct, attempts')
    .eq('user_id', userId)
    .in('exercise_id', exerciseIds)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data || []).map((row: any) => ({
    exerciseId: row.exercise_id,
    isCorrect: row.is_correct,
    attempts: row.attempts,
  }))
}

/** 转换练习数据格式 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function transformExercises(rawExercises: any[], subtitles: any[]) {
  const subtitleMap = new Map(subtitles.map((s: any) => [s.id as string, s]))

  return rawExercises.map((exercise: any) => {
    const blankPositions: Array<{ start: number; end: number; word: string; hint?: string }> = exercise.blank_positions || []
    const originalText: string = exercise.original_text || ''

    let textWithBlanks = originalText
    const answers: string[] = []

    const hasUnderscores = /_+/.test(originalText)

    if (hasUnderscores && blankPositions.length > 0) {
      const sortedPositions = [...blankPositions].sort((a, b) => b.start - a.start)
      sortedPositions.forEach((pos) => {
        textWithBlanks = textWithBlanks.slice(0, pos.start) + '[blank]' + textWithBlanks.slice(pos.end)
        answers.unshift(pos.word)
      })
    } else if (blankPositions.length > 0) {
      blankPositions.forEach((pos) => {
        answers.push(pos.word)
      })
      const sortedAnswers = [...answers].sort((a, b) => b.length - a.length)
      textWithBlanks = originalText
      sortedAnswers.forEach((answer) => {
        const regex = new RegExp(`\\b${answer}\\b`, 'gi')
        textWithBlanks = textWithBlanks.replace(regex, '[blank]')
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let subtitle: any = exercise.subtitle_id ? subtitleMap.get(exercise.subtitle_id) : null

    if (!subtitle && subtitles.length > 0) {
      const answerText: string = exercise.answer_text || ''
      if (answerText && hasUnderscores) {
        const filled = originalText.replace(/_+/g, answerText).toLowerCase().trim()
        subtitle = subtitles.find((s: any) => {
          const subText: string = s.original_text?.toLowerCase().trim() || ''
          return subText.includes(filled) || filled.includes(subText)
        }) || null
      }

      if (!subtitle) {
        const exStartTime: number | null = exercise.subtitle_start_time
        if (exStartTime != null) {
          const TOLERANCE = 0.5
          subtitle = subtitles.find((s: any) =>
            Math.abs(s.start_time - exStartTime) < TOLERANCE
          ) || null
        }
      }
    }

    const startTime: number | null = exercise.subtitle_start_time ?? subtitle?.start_time
    const endTime: number | null = exercise.subtitle_end_time ?? subtitle?.end_time

    return {
      ...exercise,
      text_with_blanks: textWithBlanks,
      answers,
      explanation: blankPositions[0]?.hint || null,
      subtitle_start_time: startTime,
      subtitle_end_time: endTime,
      translation: subtitle?.chinese_text || blankPositions[0]?.hint || null,
    }
  })
}

/**
 * 内联权限检查：用已有的 video 数据 + 单次 users 查询判断权限
 * 避免 hasVideoAccess() 的 2 次额外 DB 查询（它会重新查 videos 表）
 */
async function checkAccess(
  supabase: Awaited<ReturnType<typeof createAdminClient>>,
  userId: string,
  videoPackageIds: string[] | null,
  videoStatus: string,
): Promise<{ hasAccess: boolean; canContinuousPlay: boolean }> {
  if (videoStatus !== 'published') return { hasAccess: false, canContinuousPlay: false }
  if (!videoPackageIds || videoPackageIds.length === 0) return { hasAccess: false, canContinuousPlay: false }

  const { data: user } = await supabase
    .from('users')
    .select('package_ids, feature_permissions, permission_expires_at')
    .eq('id', userId)
    .single()

  if (!user) return { hasAccess: false, canContinuousPlay: false }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const u = user as any
  const featurePermissions: string[] | null = u.feature_permissions
  const permissionExpiresAt: string | null = u.permission_expires_at
  const userPackageIds: string[] = u.package_ids || []

  const canContinuousPlay = !!(
    featurePermissions?.includes('continuous_play') &&
    (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date())
  )

  // 有套餐时必须走套餐匹配，不靠 feature_permissions 越权
  if (userPackageIds.length > 0) {
    return {
      hasAccess: userPackageIds.some((id: string) => videoPackageIds.includes(id)),
      canContinuousPlay,
    }
  }

  // 无套餐但 feature_permissions 包含 'video' 且未过期
  if (featurePermissions?.includes('video')) {
    if (!permissionExpiresAt || new Date(permissionExpiresAt) > new Date()) {
      return { hasAccess: true, canContinuousPlay }
    }
  }

  return { hasAccess: false, canContinuousPlay: false }
}

// 核心数据加载：消除重复查询，最大化并行
async function getVideoFullData(videoId: string, userId: string): Promise<VideoFullResponseExtended | null> {
  const supabase = await createAdminClient()

  // 1. 唯一的视频查询（不再重复查 3 次）
  const { data: video, error: videoError } = await supabase
    .from('videos')
    .select('*')
    .eq('id', videoId)
    .single()

  if (videoError || !video) {
    return null
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const v = video as any

  // 2. 并行：权限检查 + 静态数据 + 用户进度 + 播放列表（关键优化：原来串行，现在并行）
  const [accessResult, staticData, progressResult, playlistResult] = await Promise.all([
    checkAccess(supabase, userId, v.package_ids, v.status),
    getVideoStaticData(videoId, v.creator_id),
    supabase
      .from('user_video_progress')
      .select('last_position, max_progress, is_completed')
      .eq('user_id', userId)
      .eq('video_id', videoId)
      .maybeSingle(),
    v.source_video_id
      ? supabase
          .from('videos')
          .select('id, title, duration, display_order, thumbnail_url, cover_url')
          .eq('source_video_id', v.source_video_id)
          .eq('status', 'published')
          .order('display_order', { ascending: true })
      : Promise.resolve({ data: null, error: null }),
  ])

  const { hasAccess, canContinuousPlay } = accessResult

  if (!hasAccess) {
    return {
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
      creator: null,
      exerciseProgress: [],
      source_video_id: v.source_video_id || null,
      playlist: null,
      canContinuousPlay: false,
    }
  }

  // 3. 答题记录（需要 staticData.rawExercises，但在上面已并行完成）
  const exerciseProgressData = await fetchExerciseProgress(supabase, userId, staticData.rawExercises)

  // 4. 构建带高亮的字幕
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subtitlesWithHighlights = (staticData.subtitles as any[]).map((subtitle: any) => ({
    ...subtitle,
    highlights: staticData.highlightRelations
      .filter(r => r.subtitle_id === subtitle.id)
      .map(r => ({
        card_type: r.card_type as 'word' | 'phrase' | 'expression',
        card_id: r.card_id,
        text: subtitle.original_text?.substring(r.start_position, r.end_position) || '',
        start_position: r.start_position,
        end_position: r.end_position,
      })),
  }))

  // 5. 转换练习数据
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const transformedExercises = transformExercises(staticData.rawExercises as any[], staticData.subtitles as any[])

  // 6. 异步非阻塞更新（不 await）
  supabase.from('videos').update({ view_count: (v.view_count || 0) + 1 }).eq('id', videoId).then(() => {})
  supabase.from('user_video_progress').upsert(
    { user_id: userId, video_id: videoId, updated_at: new Date().toISOString() },
    { onConflict: 'user_id,video_id', ignoreDuplicates: false },
  ).then(() => {})

  // 学习日历也异步（用顶层 import 避免动态导入开销）
  import('@/lib/learning-calendar').then(({ updateLearningCalendar }) => {
    updateLearningCalendar(supabase, userId, { videoId })
      .then(result => { if (!result.success) console.error('[VideoDetail] Calendar update failed:', result.error) })
  })

  return {
    video,
    subtitles: subtitlesWithHighlights,
    cards: staticData.cards as VideoFullResponseExtended['cards'],
    exercises: transformedExercises,
    difficulty_analysis: staticData.difficultyAnalysis as VideoFullResponseExtended['difficulty_analysis'],
    has_access: true,
    user_progress: progressResult.data ? {
      last_position: progressResult.data.last_position,
      max_progress: progressResult.data.max_progress,
      is_completed: progressResult.data.is_completed,
    } : null,
    grammar_points: staticData.grammarPoints as VideoFullResponseExtended['grammar_points'],
    pronunciation_tips: staticData.pronunciationTips as VideoFullResponseExtended['pronunciation_tips'],
    vocabulary_network: staticData.vocabularyNetwork as VideoFullResponseExtended['vocabulary_network'],
    creator: staticData.creator as VideoFullResponseExtended['creator'],
    exerciseProgress: exerciseProgressData,
    source_video_id: v.source_video_id || null,
    playlist: playlistResult.data || null,
    canContinuousPlay,
  }
}

// 数据加载组件
async function VideoDataLoader({ videoId, userId }: { videoId: string; userId: string }) {
  const data = await getVideoFullData(videoId, userId)

  if (!data) {
    notFound()
  }

  return <VideoLearningClient videoId={videoId} initialData={data} />
}

export default async function VideoLearningPage({ params }: PageProps) {
  const user = await getCurrentUser()
  if (!user) {
    redirect(`/login?redirect=${encodeURIComponent('/videos/' + (await params).id)}`)
  }

  const { id: videoId } = await params

  // 不再单独查 getVideoBasicInfo，统一在 getVideoFullData 中处理
  // Suspense 只显示通用加载态
  return (
    <Suspense fallback={<VideoLoading video={null} />}>
      <VideoDataLoader videoId={videoId} userId={user.id} />
    </Suspense>
  )
}
