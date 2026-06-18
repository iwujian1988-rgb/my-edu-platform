'use client'

/**
 * 视频学习页 - 客户端组件
 *
 * 优化版本：接收服务器端预取的数据，无需客户端再次请求
 *
 * 交互特性：
 * - PC端：滚动时左侧视频区、右侧学习区各自吸顶
 * - 移动端：滚动时视频区吸顶，Tab栏紧贴视频底部
 */

import { useState, useCallback, useEffect, useRef, useMemo } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Headphones,
  Mic,
  Pen,
  BookOpen,
  ArrowLeft,
  ChevronDown,
  Download,
  Eye,
  Pin,
  PinOff,
  Users,
  Brain,
  ExternalLink,
  ChevronRight,
} from 'lucide-react'

import { VideoPlayer } from '@/components/video/VideoPlayer'
import { AudioPlayer } from '@/components/video/AudioPlayer'
import { SubtitleList } from '@/components/video/SubtitleList'
import { CardPopover } from '@/components/video/CardPopover'
import { ShadowReadingPanel } from '@/components/video/ShadowReadingPanel'
import { FillBlankExercise } from '@/components/video/exercises/FillBlankExercise'
import { MultipleChoiceExercise } from '@/components/video/exercises/MultipleChoiceExercise'
import { TranslationExercise } from '@/components/video/exercises/TranslationExercise'
import { GrammarDrillExercise } from '@/components/video/exercises/GrammarDrillExercise'
import { SentencePatternCards } from '@/components/video/exercises/SentencePatternCards'
import { ScenarioCard } from '@/components/video/exercises/ScenarioCard'
import { LearningCards } from '@/components/video/LearningCards'
import { LearningTabs } from '@/components/video/learning/LearningTabs'
import { LearningModal } from '@/components/video/learning/LearningModal'
import { PracticeSheet } from '@/components/video/learning/PracticeSheet'
import { AccessDenied } from '@/components/video/AccessDenied'
import { DraggableAudioPIP } from '@/components/video/DraggableAudioPIP'
import { ContinuousPlayPanel, getStoredContinuousPlay, setStoredContinuousPlay } from '@/components/video/ContinuousPlayPanel'
import { ImmersiveOverlay } from '@/components/video/immersive/ImmersiveOverlay'

import { useVideoProgress } from '@/hooks/useVideoProgress'
import { useCardProgress } from '@/hooks/useCardProgress'
import { useVideoFavorites } from '@/hooks/useVideoFavorites'
import { useExerciseProgress } from '@/hooks/useExerciseProgress'

import type {
  VideoFullResponseExtended,
  VideoListItem,
  VideoWordCard,
  VideoPhraseCard,
  VideoExpressionCard,
  CardType,
} from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, CEFR_LEVEL_LABELS, VIDEO_LANGUAGE_LABELS, CREATOR_PLATFORM_LABELS } from '@/types/video'
import type { CefrLevel } from '@/types/video'

interface Props {
  videoId: string
  initialData: VideoFullResponseExtended
}

type TabValue = 'listen' | 'speak' | 'write' | 'learn'

export default function VideoLearningClient({ videoId, initialData }: Props) {
  const router = useRouter()
  const data = initialData

  // 检测屏幕尺寸，只渲染对应的一个视频播放器
  const [isLargeScreen, setIsLargeScreen] = useState(false)

  useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024) // lg breakpoint
    }
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // 状态
  const [currentTab, setCurrentTab] = useState<TabValue>('listen')
  const [currentVideoTime, setCurrentVideoTime] = useState(0)
  const [displayMode, setDisplayMode] = useState<'bilingual' | 'original' | 'chinese'>('bilingual')
  const [selectedCard, setSelectedCard] = useState<{
    card: VideoWordCard | VideoPhraseCard | VideoExpressionCard
    type: CardType
    position: { x: number; y: number } | null // 点击位置
  } | null>(null)
  const [seekToTime, setSeekToTime] = useState<number | undefined>(undefined)
  const [seekTrigger, setSeekTrigger] = useState(0) // 用于强制触发跳转
  const [pauseMainVideo, setPauseMainVideo] = useState(false) // 暂停主视频（打开弹层时）
  const [wasMainVideoPlaying, setWasMainVideoPlaying] = useState(false) // 记录打开弹层前主视频的播放状态
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false) // PC端学习弹层
  const [isPracticeSheetOpen, setIsPracticeSheetOpen] = useState(false) // 移动端练习抽屉
  const [isShadowReadingOpen, setIsShadowReadingOpen] = useState(false) // 跟读浮层
  const [isImmersiveMode, setIsImmersiveMode] = useState(false) // 沉浸模式

  // PIP 模式状态（移动端学习模块）
  const [pipMode, setPipMode] = useState(false)
  const [isPipPlaying, setIsPipPlaying] = useState(false)
  const [isPipMuted, setIsPipMuted] = useState(false)
  const mainVideoRef = useRef<HTMLVideoElement>(null)
  const mainAudioRef = useRef<HTMLAudioElement>(null)


  const isAudioContent = data.video.content_type === 'audio'
    || /\.(mp3|m4a|wav|ogg|aac|flac|wma)(\?|$)/i.test(data.video.video_url || '')

  // 音频内容兜底封面：cover_url → thumbnail_url → creator 头像
  if (isAudioContent && !data.video.cover_url && !data.video.thumbnail_url && data.creator?.avatar_url) {
    data.video.cover_url = data.creator.avatar_url
  }

  // PC端左侧高度 ref（用于右侧对齐）
  const leftColumnRef = useRef<HTMLDivElement>(null)
  const [rightContentHeight, setRightContentHeight] = useState<number>(500)

  // 监听左侧高度变化，更新右侧内容区高度
  useEffect(() => {
    if (!isLargeScreen || !leftColumnRef.current) return

    const updateHeight = () => {
      if (leftColumnRef.current) {
        // 左侧总高度 = 右侧内容区应该的高度
        // 右侧包括：占位符(56px = h-10 + mb-4) + tab栏(约52px = p-2*2 + 按钮 + border) + 内容区
        const leftHeight = leftColumnRef.current.offsetHeight
        const contentHeight = leftHeight - 56 - 52 - 4 // 增加2px修正，让右侧内容区上移2px
        setRightContentHeight(Math.max(300, contentHeight))
      }
    }

    updateHeight()
    window.addEventListener('resize', updateHeight)
    return () => window.removeEventListener('resize', updateHeight)
  }, [isLargeScreen])

  // 字幕滚动控制
  const [autoScroll, setAutoScroll] = useState(true)
  const [exportTrigger, setExportTrigger] = useState(0) // 导出弹窗触发器

  // Hooks
  const { updateProgress, markCompleted, saveProgress } = useVideoProgress({
    videoId,
    initialProgress: data?.user_progress,
    onSave: async (progress) => {
      await fetch(`/api/user/video-progress/${videoId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(progress),
      })
    },
  })

  // 连续播放
  const searchParams = useSearchParams()
  const shouldAutoEnable = searchParams.get('continuous') === '1'
  const [continuousPlayEnabled, setContinuousPlayEnabled] = useState(() => {
    if (data.canContinuousPlay && shouldAutoEnable) return true
    return data.canContinuousPlay ? getStoredContinuousPlay() : false
  })
  const [countdown, setCountdown] = useState<number | null>(null)
  const [countdownInfo, setCountdownInfo] = useState<{ title: string; isNextGroup: boolean } | null>(null)
  const countdownTimerRef = useRef<{ interval: NodeJS.Timeout; timeout: NodeJS.Timeout } | null>(null)
  const nextGroupRef = useRef<{ video_id: string; title: string } | null>(null)

  const handleContinuousPlayToggle = useCallback((enabled: boolean) => {
    setContinuousPlayEnabled(enabled)
    setStoredContinuousPlay(enabled)
  }, [])

  const startCountdown = useCallback((title: string, isNextGroup: boolean, targetUrl: string) => {
    setCountdownInfo({ title, isNextGroup })
    setCountdown(3)
    const interval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) return null
        return prev - 1
      })
    }, 1000)
    const timeout = setTimeout(() => {
      router.push(targetUrl)
    }, 3000)
    countdownTimerRef.current = { interval, timeout }
  }, [router])

  // 预取下一组信息：当播放到同组最后一集时提前 fetch，避免视频结束时才请求导致延迟
  useEffect(() => {
    if (!continuousPlayEnabled || !data.playlist || !data.source_video_id) return
    const isLast = data.playlist[data.playlist.length - 1]?.id === videoId
    if (!isLast) return

    const lang = (data.video as VideoListItem)?.language || ''
    const queryParam = lang ? `&language=${lang}` : ''
    fetch(`/api/videos/next-group?current_source_video_id=${data.source_video_id}${queryParam}`)
      .then(res => res.json())
      .then(json => {
        if (json.data?.video_id) nextGroupRef.current = json.data
      })
      .catch(() => {})
  }, [continuousPlayEnabled, data.playlist, data.source_video_id, data.video, videoId])

  const handleVideoEnded = useCallback(() => {
    if (!continuousPlayEnabled || !data.playlist || data.playlist.length <= 1) return

    const currentIndex = data.playlist.findIndex(v => v.id === videoId)
    const nextVideo = data.playlist[currentIndex + 1]

    markCompleted()
    saveProgress()

    if (nextVideo) {
      startCountdown(nextVideo.title, false, `/videos/${nextVideo.id}?continuous=1`)
    } else if (nextGroupRef.current) {
      // 下一组已预取，直接导航
      startCountdown(nextGroupRef.current.title, true, `/videos/${nextGroupRef.current.video_id}?continuous=1`)
    }
  }, [continuousPlayEnabled, data.playlist, videoId, markCompleted, saveProgress, startCountdown])

  const cancelCountdown = useCallback(() => {
    setCountdown(null)
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current.interval)
      clearTimeout(countdownTimerRef.current.timeout)
      countdownTimerRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => {
      if (countdownTimerRef.current) {
        clearInterval(countdownTimerRef.current.interval)
        clearTimeout(countdownTimerRef.current.timeout)
      }
    }
  }, [])

  const { getCardStatus, updateStatus } = useCardProgress({ videoId })
  const { isFavorited, toggleFavorite } = useVideoFavorites({ videoId })
  const { progressMap: exerciseProgressMap, recordAnswer: recordExerciseAnswer } = useExerciseProgress({
    videoId,
    initialData: data.exerciseProgress,
  })

  // 视频时间更新
  const handleTimeUpdate = useCallback(
    (time: number) => {
      setCurrentVideoTime(time)
      if (data?.video.duration) {
        updateProgress(time, data.video.duration)
      }
    },
    [data?.video.duration, updateProgress]
  )

  // 字幕点击 - 跳转到对应时间
  const handleSubtitleClick = useCallback((subtitle: { start_time: number }) => {
    setSeekToTime(subtitle.start_time)
    setSeekTrigger(prev => prev + 1)
    setSegmentEndTime(undefined)
    // 仅 iOS：在用户手势内直接 seek + play，绕过自动播放限制
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
      || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isIOS) {
      const el = isAudioContent ? mainAudioRef.current : mainVideoRef.current
      if (el) {
        el.currentTime = subtitle.start_time
        if (el.paused) el.play().catch(() => {})
      }
    }
  }, [isAudioContent])

  // 播放片段
  const [segmentEndTime, setSegmentEndTime] = useState<number | undefined>(undefined)
  const pipSegmentEndRef = useRef<number | null>(null)
  const pipTimeUpdateHandlerRef = useRef<(() => void) | null>(null)

  const handlePlaySegment = useCallback((startTime: number, endTime: number) => {
    console.log('[handlePlaySegment] === START ===')
    console.log('[handlePlaySegment] startTime:', startTime, 'endTime:', endTime)
    console.log('[handlePlaySegment] pipMode:', pipMode, 'mainVideoRef.current:', !!mainVideoRef.current)

    // 音频内容使用 audio 元素，视频内容使用 video 元素
    const mediaEl = isAudioContent ? mainAudioRef.current : mainVideoRef.current

    if (pipMode && mediaEl) {
      // PIP 模式：直接操作 PIP media 元素
      const videoEl = mediaEl
      console.log('[handlePlaySegment] video element readyState:', videoEl.readyState)
      console.log('[handlePlaySegment] video current src:', videoEl.src?.substring(0, 50))

      // 先移除旧的监听器（如果存在）
      if (pipTimeUpdateHandlerRef.current) {
        console.log('[handlePlaySegment] Removing old timeupdate listener')
        videoEl.removeEventListener('timeupdate', pipTimeUpdateHandlerRef.current)
        pipTimeUpdateHandlerRef.current = null
      }

      // 设置片段结束时间
      pipSegmentEndRef.current = endTime
      console.log('[handlePlaySegment] Set segment end time:', endTime)

      // 检查视频是否已加载足够数据
      const tryPlaySegment = () => {
        console.log('[handlePlaySegment] tryPlaySegment - setting currentTime to:', startTime)
        // 跳转到开始时间
        videoEl.currentTime = startTime

        console.log('[handlePlaySegment] Calling videoEl.play()')
        // 播放视频
        const playPromise = videoEl.play()
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              setIsPipPlaying(true)
              console.log('[handlePlaySegment] ✅ PIP video started playing successfully')
            })
            .catch((err) => {
              console.warn('[handlePlaySegment] ❌ PIP video play failed:', err)
              // 如果播放失败，可能是浏览器限制，尝试静音后播放
              videoEl.muted = true
              setIsPipMuted(true)
              videoEl.play().then(() => {
                setIsPipPlaying(true)
                console.log('[handlePlaySegment] ✅ PIP video started playing (muted)')
              }).catch((err2) => {
                console.error('[handlePlaySegment] ❌ PIP video play failed even muted:', err2)
              })
            })
        }
      }

      // 如果视频还没加载，等待 loadeddata 事件
      if (videoEl.readyState < 1) {
        console.log('[handlePlaySegment] Video not loaded, waiting for loadeddata...')
        const handleLoaded = () => {
          console.log('[handlePlaySegment] loadeddata event fired, now trying to play')
          videoEl.removeEventListener('loadeddata', handleLoaded)
          tryPlaySegment()
        }
        videoEl.addEventListener('loadeddata', handleLoaded)
        // 触发加载
        videoEl.load()
      } else {
        console.log('[handlePlaySegment] Video already loaded (readyState:', videoEl.readyState, '), playing directly')
        tryPlaySegment()
      }

      // 创建新的监听器
      const handleTimeUpdate = () => {
        const currentSegmentEnd = pipSegmentEndRef.current
        if (currentSegmentEnd && videoEl.currentTime >= currentSegmentEnd - 0.1) {
          console.log('[handlePlaySegment] Segment ended! currentTime:', videoEl.currentTime, '>= endTime:', currentSegmentEnd)
          videoEl.pause()
          setIsPipPlaying(false)
          pipSegmentEndRef.current = null
          // 移除监听器
          videoEl.removeEventListener('timeupdate', handleTimeUpdate)
          pipTimeUpdateHandlerRef.current = null
        }
      }

      // 保存监听器引用并添加
      pipTimeUpdateHandlerRef.current = handleTimeUpdate
      videoEl.addEventListener('timeupdate', handleTimeUpdate)
      console.log('[handlePlaySegment] Added timeupdate listener')
    } else {
      console.log('[handlePlaySegment] Non-PIP mode, operating main video')
      // 非PIP模式：操作主视频
      setSegmentEndTime(endTime)
      setSeekToTime(startTime)
      setSeekTrigger(prev => prev + 1)
    }
    console.log('[handlePlaySegment] === END ===')
  }, [pipMode, isAudioContent])

  // ============================================
  // PIP 模式控制（移动端学习模块）
  // ============================================

  // 进入 PIP 模式 — 复用主视频元素，零缓冲延迟
  const enterPipMode = useCallback(() => {
    console.log('[enterPipMode] Entering PIP mode, previous pipMode:', pipMode)
    // 不暂停视频，PIP 组件会把同一个 <video> DOM 元素移入浮动容器
    // 检查当前实际播放状态并同步到 isPipPlaying
    const mediaEl = isAudioContent ? mainAudioRef.current : mainVideoRef.current
    const isActuallyPlaying = mediaEl ? !mediaEl.paused : false
    setPipMode(true)
    setIsPipPlaying(isActuallyPlaying) // 使用实际播放状态而非硬编码 true
  }, [pipMode, isAudioContent])

  // 退出 PIP 模式 — 清除 fixed 定位，视频回原位
  const exitPipMode = useCallback(() => {
    // 读取视频实际播放位置（比 React 状态更准确）
    const mediaEl = isAudioContent ? mainAudioRef.current : mainVideoRef.current
    const actualTime = mediaEl?.currentTime ?? currentVideoTime

    setPipMode(false)
    setPauseMainVideo(false)
    // 确保 VideoPlayer 恢复后 seek 到正确位置
    setSeekToTime(actualTime)
    setSeekTrigger(prev => prev + 1)
  }, [isAudioContent, currentVideoTime])

  // 切换 Tab 时处理 PIP 模式
  const handleTabChange = useCallback((tab: TabValue) => {
    setCurrentTab(tab)

    if (tab === 'learn') {
      enterPipMode()
    } else if (pipMode) {
      exitPipMode()
    }
  }, [pipMode, enterPipMode, exitPipMode])

  // PIP 控制（直接操作主视频/音频元素）
  const togglePipPlay = useCallback(() => {
    const mediaEl = isAudioContent ? mainAudioRef.current : mainVideoRef.current
    if (!mediaEl) return

    if (isPipPlaying) {
      mediaEl.pause()
    } else {
      mediaEl.play()
    }
    setIsPipPlaying(!isPipPlaying)
  }, [isPipPlaying, isAudioContent])

  const togglePipMute = useCallback(() => {
    const mediaEl = isAudioContent ? mainAudioRef.current : mainVideoRef.current
    if (!mediaEl) return

    mediaEl.muted = !isPipMuted
    setIsPipMuted(!isPipMuted)
  }, [isPipMuted, isAudioContent])

  // 卡片跳转字幕映射
  const cardToSubtitleMap = useCallback(() => {
    const map = new Map<string, { subtitleId: string; startTime: number }>()
    if (!data?.subtitles) return map

    data.subtitles.forEach((subtitle) => {
      subtitle.highlights?.forEach((highlight) => {
        const key = `${highlight.card_type}_${highlight.card_id}`
        if (!map.has(key)) {
          map.set(key, { subtitleId: subtitle.id, startTime: subtitle.start_time })
        }
      })
    })
    return map
  }, [data?.subtitles])

  const handleJumpToSubtitle = useCallback(
    (cardType: CardType, cardId: string) => {
      const map = cardToSubtitleMap()
      const key = `${cardType}_${cardId}`
      const subtitleInfo = map.get(key)

      if (subtitleInfo) {
        setCurrentTab('listen')
        const videoEl = document.querySelector('video')
        if (videoEl) {
          videoEl.currentTime = subtitleInfo.startTime
        }
      }
    },
    [cardToSubtitleMap]
  )

  const handleHighlightClick = useCallback(
    async (cardType: CardType, cardId: string, event?: React.MouseEvent) => {
      let card: VideoWordCard | VideoPhraseCard | VideoExpressionCard | undefined

      if (cardType === 'word') {
        card = data?.cards.words.find((c) => c.id === cardId)
      } else if (cardType === 'phrase') {
        card = data?.cards.phrases.find((c) => c.id === cardId)
      } else if (cardType === 'expression') {
        card = data?.cards.expressions.find((c) => c.id === cardId)
      }

      if (card) {
        // 获取点击位置
        const position = event ? { x: event.clientX, y: event.clientY } : null
        setSelectedCard({ card, type: cardType, position })
      }
    },
    [data?.cards]
  )

  // 无权限
  if (!data.has_access) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 rounded border-[2px] border-black dark:border-gray-600"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            返回
          </Button>
          <AccessDenied packages={[]} videoTitle={data.video.title} />
        </div>
      </div>
    )
  }

  const { video, subtitles, cards, exercises, grammar_points, pronunciation_tips, vocabulary_network } = data

  // 影子跟读精选句：有 shadow_reading 数据时用它，否则回退全部字幕
  const shadowReadingSubtitles = useMemo(() => {
    if (!video.shadow_reading?.length) return subtitles
    const parseTime = (t: string): number => {
      const parts = t.split(':').map(Number)
      if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2]
      if (parts.length === 2) return parts[0] * 60 + parts[1]
      return parts[0] || 0
    }
    return video.shadow_reading.map((sr, idx) => ({
      id: `sr-${idx}`,
      video_id: video.id,
      start_time: parseTime(sr.start_time),
      end_time: parseTime(sr.end_time),
      original_text: sr.spanish || sr.french || '',
      chinese_text: sr.chinese || null,
      word_count: sr.words?.length || 0,
      display_order: idx,
      created_at: '',
      highlights: [],
      // 逐词时间戳，供 ShadowReadingPlayer 做词级 KTV
      words: (sr.words || []).map(w => ({
        text: w.text,
        start: w.start,
        end: w.end,
      })),
    }))
  }, [video.shadow_reading, video.id, subtitles])

  // 按类型过滤练习
  const fillBlankExercises = exercises.filter(e => e.exercise_type === 'fill_blank')
  const multipleChoiceExercises = exercises.filter(e => e.exercise_type === 'multiple_choice')
  const translationExercises = exercises.filter(e => e.exercise_type === 'translation')
  const grammarDrillExercises = exercises.filter(e => e.exercise_type === 'grammar_drill')
  const sentencePatternExercises = exercises.filter(e => e.exercise_type === 'sentence_pattern')
  const scenarioExercises = exercises.filter(e => e.exercise_type === 'scenario')

  // 沉浸模式：替换整个布局
  if (isImmersiveMode) {
    return (
      <ImmersiveOverlay
        data={data}
        videoId={videoId}
        isLargeScreen={isLargeScreen}
        isAudioContent={isAudioContent}
        currentVideoTime={currentVideoTime}
        seekToTime={seekToTime}
        seekTrigger={seekTrigger}
        segmentEndTime={segmentEndTime}
        pauseMainVideo={pauseMainVideo}
        mainVideoRef={mainVideoRef}
        mainAudioRef={mainAudioRef}
        onTimeUpdate={handleTimeUpdate}
        onSeekTo={(time) => setSeekToTime(time)}
        onSeekTrigger={() => setSeekTrigger(prev => prev + 1)}
        onSubtitleClick={(startTime) => handleSubtitleClick({ start_time: startTime })}
        onPlaySegment={handlePlaySegment}
        onHighlightClick={handleHighlightClick}
        onPauseMainVideo={() => setPauseMainVideo(true)}
        onResumeMainVideo={() => setPauseMainVideo(false)}
        onExit={() => setIsImmersiveMode(false)}
        displayMode={displayMode}
        selectedCard={selectedCard}
        onSelectedCardClose={() => setSelectedCard(null)}
        exerciseProgressMap={exerciseProgressMap}
        onRecordExerciseAnswer={recordExerciseAnswer}
        getCardStatus={getCardStatus}
        onCardStatusChange={updateStatus}
        shouldAutoEnable={shouldAutoEnable}
        onVideoEnded={handleVideoEnded}
        creatorAvatarUrl={data.creator?.avatar_url || undefined}
        shadowReadingSubtitles={shadowReadingSubtitles}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 transition-colors duration-300">
      {/* ===== 移动端布局 ===== */}
      <div className="lg:hidden">
        {/* PIP 模式下的简洁顶部栏 */}
        {pipMode && (
          <div className="sticky top-0 z-40 bg-gray-50 dark:bg-gray-900 border-b-[3px] border-black dark:border-gray-600 px-3 py-2">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.back()}
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666]"
              >
                <ArrowLeft className="w-3 h-3" />
                返回
              </button>
              <span className="text-sm font-black text-black dark:text-white truncate max-w-[60%]">
                {video.title}
              </span>
              <button
                onClick={exitPipMode}
                className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-[#B4F416] text-black border-[2px] border-black shadow-[2px_2px_0px_0px_#000]"
              >
                恢复
              </button>
            </div>
          </div>
        )}

        {/* 移动端标题栏 - 返回按钮 + 标题 */}
        {!pipMode && (
          <div className="flex items-center gap-2 px-3 pt-3 pb-1 bg-gray-50 dark:bg-gray-900">
            <button
              onClick={() => router.back()}
              className="flex-shrink-0 text-gray-400 dark:text-gray-500 active:text-gray-600 dark:active:text-gray-300 transition-colors p-1"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="flex-1 min-w-0 text-base font-black text-black dark:text-white line-clamp-1">{video.title}</h1>
            <button
              onClick={() => setIsImmersiveMode(true)}
              className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 text-xs font-black bg-[#B4F416] dark:bg-[#B4F416]/80 text-black border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] active:shadow-[1px_1px_0px_0px_#000] active:-translate-y-0.5 transition-all"
            >
              <Brain className="w-3.5 h-3.5" />
              沉浸学习
            </button>
          </div>
        )}

        {/* 视频区 - 吸顶（PIP 模式下收缩，fixed 定位的 video 不受影响） */}
        <div className={cn("sticky top-0 z-40", isPracticeSheetOpen && "z-10", pipMode && "h-0 overflow-hidden")}>
            {/* 视频播放器 + 半透明返回按钮 */}
            <div className="relative">
              {!isLargeScreen && (
                isAudioContent ? (
                  <AudioPlayer
                    video={video}
                    onTimeUpdate={handleTimeUpdate}
                    initialPosition={shouldAutoEnable ? 0 : (data.user_progress?.last_position || 0)}
                    seekTo={seekToTime}
                    seekTrigger={seekTrigger}
                    segmentEndTime={segmentEndTime}
                    pause={pauseMainVideo}
                    audioRefOut={mainAudioRef}
                    fallbackImageUrl={data.creator?.avatar_url || undefined}
                    onEnded={handleVideoEnded}
                    autoPlay={shouldAutoEnable}
                  />
                ) : (
                  <VideoPlayer
                    video={video}
                    onTimeUpdate={handleTimeUpdate}
                    initialPosition={shouldAutoEnable ? 0 : (data.user_progress?.last_position || 0)}
                    seekTo={seekToTime}
                    seekTrigger={seekTrigger}
                    segmentEndTime={segmentEndTime}
                    pause={pauseMainVideo}
                    videoRefOut={mainVideoRef}
                    onEnded={handleVideoEnded}
                    autoPlay={shouldAutoEnable}
                  />
                )
              )}
              {/* 返回按钮已移至顶部标题栏 */}
            </div>

          {/* 功能按钮导航 */}
          <div className="bg-white dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 h-12 flex items-center px-2 lg:border-l-[3px] lg:border-r-[3px] lg:border-black lg:dark:border-gray-600 lg:px-3 lg:py-2 lg:h-auto lg:border-b-0">
            <div className="flex items-center w-full lg:justify-between lg:gap-1 lg:w-auto">
              {/* 字幕模式下拉 - 小圆角按钮，低存在感 */}
              {currentTab === 'listen' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-0.5 px-2 py-1 text-[11px] font-medium rounded-full bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors whitespace-nowrap flex-shrink-0 border border-gray-100 dark:border-gray-600 lg:text-sm lg:font-bold lg:bg-[#F0FFC2] lg:text-gray-800 lg:border-0">
                      {displayMode === 'bilingual' ? '双语' : displayMode === 'chinese' ? '中文' : '原文'}
                      <ChevronDown className="w-2.5 h-2.5 lg:w-3 lg:h-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="border-[2px] border-black shadow-[3px_3px_0px_0px_#000] bg-white dark:bg-gray-800">
                    <DropdownMenuItem
                      onClick={() => setDisplayMode('original')}
                      className={cn("cursor-pointer font-bold", displayMode === 'original' && "bg-[#B4F416]")}
                    >
                      原文
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDisplayMode('chinese')}
                      className={cn("cursor-pointer font-bold", displayMode === 'chinese' && "bg-[#B4F416]")}
                    >
                      中文
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => setDisplayMode('bilingual')}
                      className={cn("cursor-pointer font-bold", displayMode === 'bilingual' && "bg-[#B4F416]")}
                    >
                      双语
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}

              {/* 功能Tab - 纯文字，单行 */}
              <div className="flex items-center flex-1 justify-around ml-1 lg:gap-2 lg:flex-none lg:justify-start lg:ml-2">
                <button onClick={() => handleTabChange('listen')} className={cn(
                  "text-[13px] font-semibold whitespace-nowrap px-3 py-1 rounded-full transition-all lg:px-2.5 lg:text-sm",
                  currentTab === 'listen'
                    ? "bg-[#EEFFA8] text-gray-900 dark:bg-[#F0FFC2] dark:text-gray-950"
                    : "text-[#4B5563] dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}>
                  字幕
                </button>
                <button onClick={() => setIsShadowReadingOpen(true)} className={cn(
                  "text-[13px] font-semibold whitespace-nowrap px-3 py-1 rounded-full transition-all lg:px-2.5 lg:text-sm",
                  isShadowReadingOpen
                    ? "bg-[#EEFFA8] text-gray-900 dark:bg-[#F0FFC2] dark:text-gray-950"
                    : "text-[#4B5563] dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}>
                  跟读
                </button>
                <button onClick={() => !isLargeScreen ? setIsPracticeSheetOpen(true) : handleTabChange('write')} className={cn(
                  "text-[13px] font-semibold whitespace-nowrap px-3 py-1 rounded-full transition-all lg:px-2.5 lg:text-sm",
                  (currentTab === 'write' || isPracticeSheetOpen)
                    ? "bg-[#EEFFA8] text-gray-900 dark:bg-[#F0FFC2] dark:text-gray-950"
                    : "text-[#4B5563] dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}>
                  练习
                </button>
                <button onClick={() => handleTabChange('learn')} className={cn(
                  "text-[13px] font-semibold whitespace-nowrap px-3 py-1 rounded-full transition-all lg:px-2.5 lg:text-sm",
                  currentTab === 'learn'
                    ? "bg-[#EEFFA8] text-gray-900 dark:bg-[#F0FFC2] dark:text-gray-950"
                    : "text-[#4B5563] dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}>
                  知识点
                </button>
                <button onClick={() => setExportTrigger(prev => prev + 1)} className={cn(
                  "text-[13px] font-semibold whitespace-nowrap px-3 py-1 rounded-full transition-all lg:px-2.5 lg:text-sm",
                  "text-[#4B5563] dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                )}>
                  导出
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 内容区 - PIP 模式下全屏，否则 60vh */}
        {/* listen/speak/write 有内部滚动，learn 需要容器滚动 */}
        <div className={cn(
          "bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600",
          pipMode ? "border-t-0 h-[calc(100dvh-48px)]" : "border-t-0 h-[60vh]",
          currentTab === 'learn' ? "overflow-y-auto" : "overflow-hidden"
        )}>
          {currentTab === 'listen' && (
            <SubtitleList
              subtitles={subtitles}
              currentVideoTime={currentVideoTime}
              onSubtitleClick={handleSubtitleClick}
              onHighlightClick={handleHighlightClick}
              displayMode={displayMode}
              autoScroll={autoScroll}
              externalExportTrigger={exportTrigger}
            />
          )}
          {/* 隐藏渲染 SubtitleList 以保证导出弹窗在任何 Tab 下都能弹出 */}
          {currentTab !== 'listen' && (
            <div className="hidden">
              <SubtitleList
                subtitles={subtitles}
                currentVideoTime={currentVideoTime}
                onSubtitleClick={handleSubtitleClick}
                onHighlightClick={handleHighlightClick}
                displayMode={displayMode}
                autoScroll={autoScroll}
                externalExportTrigger={exportTrigger}
              />
            </div>
          )}
          {currentTab === 'write' && (
            <div className="space-y-6">
              <FillBlankExercise
                exercises={fillBlankExercises}
                progressMap={exerciseProgressMap}
                onRecordAnswer={recordExerciseAnswer}
                onPlaySegment={(startTime: number, endTime: number) => {
                  setSegmentEndTime(endTime)
                  setSeekToTime(startTime)
                  setSeekTrigger(prev => prev + 1)
                }}
              />
              <MultipleChoiceExercise
                exercises={multipleChoiceExercises}
                progressMap={exerciseProgressMap}
                onRecordAnswer={recordExerciseAnswer}
              />
              <TranslationExercise
                exercises={translationExercises}
                progressMap={exerciseProgressMap}
                onRecordAnswer={recordExerciseAnswer}
              />
              <GrammarDrillExercise
                exercises={grammarDrillExercises}
                progressMap={exerciseProgressMap}
                onRecordAnswer={recordExerciseAnswer}
              />
              <SentencePatternCards
                patterns={sentencePatternExercises}
              />
              <ScenarioCard
                scenarios={scenarioExercises}
              />
            </div>
          )}
          {currentTab === 'learn' && (
            <LearningTabs
              words={data.cards.words}
              expressions={data.cards.expressions}
              grammarPoints={data.grammar_points}
              pronunciationTips={data.pronunciation_tips}
              vocabularyNetwork={data.vocabulary_network}
              videoLanguage={data.video.language}
              onJumpToSubtitle={(time) => {
                // PIP 模式下直接操作 PIP media，不切换 tab
                const mediaEl = isAudioContent ? mainAudioRef.current : mainVideoRef.current
                if (pipMode && mediaEl) {
                  mediaEl.currentTime = time
                  mediaEl.play()
                  setIsPipPlaying(true)
                } else {
                  handleTabChange('listen')
                  setSeekToTime(time)
                }
              }}
              onPlaySegment={(startTime, endTime) => {
                // PIP 模式下直接操作 PIP media，不切换 tab
                if (pipMode) {
                  handlePlaySegment(startTime, endTime)
                } else {
                  handleTabChange('listen')
                  handlePlaySegment(startTime, endTime)
                }
              }}
              getCardStatus={getCardStatus}
              onStatusChange={updateStatus}
            />
          )}
        </div>

        {/* PIP 小窗 - 移动端学习模块 */}
        {/* 音频：移入 PIP 容器管理；视频：不动 DOM，仅控制栏 UI + 回调控制 */}
        {pipMode && (
          <DraggableAudioPIP
            video={video}
            isPlaying={isPipPlaying}
            currentTime={currentVideoTime}
            duration={video.duration || 0}
            onTogglePlay={togglePipPlay}
            onSeek={(time) => {
              const el = isAudioContent ? mainAudioRef.current : mainVideoRef.current
              if (el) el.currentTime = time
            }}
            onExpand={exitPipMode}
            fallbackImageUrl={data.creator?.avatar_url || undefined}
          />
        )}
      </div>

      {/* ===== PC端布局 ===== */}
      <div className="hidden lg:block w-full mx-auto px-2 lg:px-4 py-2">
        <div className="grid grid-cols-12 gap-3">
          {/* 左侧：视频区 - 吸顶 */}
          <div className="col-span-8">
            <div ref={leftColumnRef} className="sticky top-2 z-30 space-y-3">
              {/* 返回按钮 */}
              <Button
                variant="ghost"
                onClick={() => router.back()}
                className="border-[2px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                返回列表
              </Button>

              {/* 视频播放器 - 只在PC端渲染 */}
              {isLargeScreen && (
                isAudioContent ? (
                  <AudioPlayer
                    video={video}
                    onTimeUpdate={handleTimeUpdate}
                    initialPosition={shouldAutoEnable ? 0 : (data.user_progress?.last_position || 0)}
                    seekTo={seekToTime}
                    seekTrigger={seekTrigger}
                    segmentEndTime={segmentEndTime}
                    pause={pauseMainVideo}
                    fallbackImageUrl={data.creator?.avatar_url || undefined}
                    onEnded={handleVideoEnded}
                    autoPlay={shouldAutoEnable}
                  />
                ) : (
                  <VideoPlayer
                    video={video}
                    onTimeUpdate={handleTimeUpdate}
                    initialPosition={shouldAutoEnable ? 0 : (data.user_progress?.last_position || 0)}
                    seekTo={seekToTime}
                    seekTrigger={seekTrigger}
                    segmentEndTime={segmentEndTime}
                    pause={pauseMainVideo}
                    onEnded={handleVideoEnded}
                    autoPlay={shouldAutoEnable}
                  />
                )
              )}

              {/* 视频信息 */}
              <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] rounded-lg p-4 transition-colors duration-300">
                <div>
                  <h1 className="text-xl font-black text-black dark:text-white">{video.title}</h1>
                  {video.original_title && video.original_title !== video.title && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{video.original_title}</p>
                  )}
                  {video.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      {video.description}
                    </p>
                  )}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="px-2 py-1 bg-[#B4F416] border-[2px] border-black text-xs font-bold">
                      {VIDEO_LANGUAGE_LABELS[video.language]}
                    </div>
                    <div className="px-2 py-1 bg-white dark:bg-gray-700 border-[2px] border-black dark:border-gray-500 text-xs font-bold text-black dark:text-white">
                      {video.cefr_level ? CEFR_LEVEL_LABELS[video.cefr_level as CefrLevel] : VIDEO_DIFFICULTY_LABELS[video.difficulty]}
                    </div>
                  </div>

                  {/* UP主信息 */}
                  {data.creator && (
                    <a href={`/videos/creators/${data.creator.id}`} className="flex items-center gap-3 mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 border-[2px] border-gray-200 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 hover:border-[#B4F416] dark:hover:border-[#B4F416] transition-colors cursor-pointer group/creator">
                      {data.creator.avatar_url ? (
                        <img
                          src={data.creator.avatar_url}
                          alt={data.creator.name}
                          className="w-10 h-10 rounded-full border-2 border-black object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full border-2 border-black bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <Users className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-black dark:text-white truncate">{data.creator.name}</span>
                          {data.creator.platform && (
                            <span className="px-1.5 py-0.5 text-xs font-bold bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 border border-purple-300 dark:border-purple-700">
                              {CREATOR_PLATFORM_LABELS[data.creator.platform] || data.creator.platform}
                            </span>
                          )}
                        </div>
                        {data.creator.follower_count > 0 && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5">
                            <Users className="w-3 h-3" />
                            {data.creator.follower_count >= 1000000
                              ? `${(data.creator.follower_count / 1000000).toFixed(1)}M`
                              : data.creator.follower_count >= 1000
                                ? `${(data.creator.follower_count / 1000).toFixed(1)}K`
                                : data.creator.follower_count
                            } 粉丝
                          </div>
                        )}
                        {data.creator.description && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-2 mt-1">{data.creator.description}</p>
                        )}
                      </div>
                      <ChevronRight className="w-4 h-4 text-gray-300 dark:text-gray-500 group-hover/creator:text-[#B4F416] transition-colors flex-shrink-0" />
                    </a>
                  )}

                  {/* 兼容旧数据：只有 creator_name 没有 creator 关联 */}
                  {!data.creator && video.creator_name && (
                    <span className="text-sm text-gray-500 dark:text-gray-400 mt-2 block">
                      UP主: {video.creator_name}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 右侧：学习区 - 吸顶 */}
          <div className="col-span-4">
            <div className="sticky top-2 z-30">
              {/* 占位符：与左侧返回按钮高度对齐 */}
              <div className="h-10 mb-4" />

              <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] rounded-lg overflow-hidden transition-colors duration-300">
                {/* 功能按钮导航 - 5个图标按钮 + 字幕模式下拉菜单 */}
                <div className="bg-gray-50 dark:bg-gray-700 border-b-[3px] border-black dark:border-gray-600 p-2">
                  <div className="flex items-center justify-between gap-1">
                    {/* 字幕模式下拉菜单 - 固定占据位置，避免切换时按钮跳动 */}
                    <div className="w-[52px] flex-shrink-0">
                      {currentTab === 'listen' && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="flex items-center gap-1 px-2 py-1.5 text-xs font-black bg-white dark:bg-gray-600 text-black dark:text-white border-[2px] border-black shadow-[2px_2px_0px_0px_#000]">
                              {displayMode === 'bilingual' ? '双语' : displayMode === 'chinese' ? '中文' : '原文'}
                              <ChevronDown className="w-3 h-3" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="border-[2px] border-black shadow-[3px_3px_0px_0px_#000] bg-white dark:bg-gray-800">
                            <DropdownMenuItem
                              onClick={() => setDisplayMode('original')}
                              className={cn("cursor-pointer font-bold", displayMode === 'original' && "bg-[#B4F416]")}
                            >
                              原文
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDisplayMode('chinese')}
                              className={cn("cursor-pointer font-bold", displayMode === 'chinese' && "bg-[#B4F416]")}
                            >
                              中文
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => setDisplayMode('bilingual')}
                              className={cn("cursor-pointer font-bold", displayMode === 'bilingual' && "bg-[#B4F416]")}
                            >
                              双语
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    {/* 5个功能按钮 */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => setCurrentTab('listen')} className={cn("px-2.5 py-1.5 border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_#000] text-xs font-black", currentTab === 'listen' ? "bg-[#B4F416] text-black" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")}>
                        字幕
                      </button>
                      <button onClick={() => setIsShadowReadingOpen(true)} className={cn("px-2.5 py-1.5 border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_#000] text-xs font-black", isShadowReadingOpen ? "bg-[#B4F416] text-black" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")}>
                        跟读
                      </button>
                      <button onClick={() => setCurrentTab('write')} className={cn("px-2.5 py-1.5 border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_#000] text-xs font-black", currentTab === 'write' ? "bg-[#B4F416] text-black" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")}>
                        练习
                      </button>
                      <button
                        onClick={() => {
                          // 记录当前播放状态
                          const mediaEl = isAudioContent ? mainAudioRef.current : mainVideoRef.current
                          const isPlaying = mediaEl ? !mediaEl.paused : false
                          console.log('[知识点按钮] 主视频播放状态:', isPlaying, '媒体元素:', mediaEl?.paused)
                          setWasMainVideoPlaying(isPlaying)

                          // 暂停主视频（因为modal会有独立的播放器）
                          setPauseMainVideo(true)
                          setIsLearningModalOpen(true)
                        }}
                        className={cn("px-2.5 py-1.5 border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_#000] text-xs font-black", isLearningModalOpen ? "bg-[#B4F416] text-black" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")}
                      >
                        知识点
                      </button>
                      <button
                        onClick={() => setExportTrigger(prev => prev + 1)}
                        className="px-2.5 py-1.5 border-[2px] border-black bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-500 transition-colors shadow-[2px_2px_0px_0px_#000] text-xs font-black"
                      >
                        导出
                      </button>
                      <button
                        onClick={() => setIsImmersiveMode(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 border-[2px] border-black bg-[#B4F416] dark:bg-[#B4F416]/80 text-black hover:bg-[#a3e014] transition-colors shadow-[2px_2px_0px_0px_#000] text-xs font-black"
                      >
                        <Brain className="w-3.5 h-3.5" />
                        沉浸学习
                      </button>
                    </div>
                  </div>
                </div>

                {/* 内容区 - PC端使用单一滚动容器，高度与左侧视频区对齐 */}
                <div
                  className="pc-subtitle-container relative overflow-y-auto"
                  style={{ height: `${rightContentHeight}px` }}
                >
                  {currentTab === 'listen' && (
                    <SubtitleList
                      subtitles={subtitles}
                      currentVideoTime={currentVideoTime}
                      onSubtitleClick={handleSubtitleClick}
                      onHighlightClick={handleHighlightClick}
                      displayMode={displayMode}
                      autoScroll={autoScroll}
                      externalExportTrigger={exportTrigger}
                      noScrollContainer={true}
                    />
                  )}

                  {currentTab === 'write' && (
                    <div className="p-4 space-y-6">
                      <FillBlankExercise
                        exercises={fillBlankExercises}
                        progressMap={exerciseProgressMap}
                        onRecordAnswer={recordExerciseAnswer}
                        onPlaySegment={(startTime, endTime) => {
                          setSegmentEndTime(endTime)
                          setSeekToTime(startTime)
                          setSeekTrigger(prev => prev + 1)
                        }}
                      />
                      <MultipleChoiceExercise
                        exercises={multipleChoiceExercises}
                        progressMap={exerciseProgressMap}
                        onRecordAnswer={recordExerciseAnswer}
                      />
                      <TranslationExercise
                        exercises={translationExercises}
                        progressMap={exerciseProgressMap}
                        onRecordAnswer={recordExerciseAnswer}
                      />
                      <GrammarDrillExercise
                        exercises={grammarDrillExercises}
                        progressMap={exerciseProgressMap}
                        onRecordAnswer={recordExerciseAnswer}
                      />
                      <SentencePatternCards
                        patterns={sentencePatternExercises}
                      />
                      <ScenarioCard
                        scenarios={scenarioExercises}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 浮动滚动控制按钮 - 仅PC端显示，在字幕列表区域 */}
      {currentTab === 'listen' && (
        <div
          className="hidden lg:flex fixed z-[100] items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 border-[2px] border-black shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]"
          style={{
            right: '24px',
            bottom: '24px',
          }}
        >
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 text-xs font-bold border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transition-colors",
              autoScroll
                ? "bg-[#B4F416] text-black"
                : "bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-300"
            )}
            title={autoScroll ? '点击固定字幕位置' : '点击跟随视频滚动'}
          >
            {autoScroll ? (
              <>
                <PinOff className="w-4 h-4" />
                <span>跟随中</span>
              </>
            ) : (
              <>
                <Pin className="w-4 h-4" />
                <span>已固定</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* 卡片弹窗 */}
      {selectedCard && (
        <CardPopover
          card={selectedCard.card}
          cardType={selectedCard.type}
          videoLanguage={video.language}
          onClose={() => setSelectedCard(null)}
          position={selectedCard.position}
        />
      )}

      {/* PC端学习弹层 - 全屏模态框，包含 PiP 视频 */}
      <LearningModal
        open={isLearningModalOpen}
        onOpenChange={(open) => {
          setIsLearningModalOpen(open)
          if (!open) {
            // 关闭弹层：恢复主视频，从弹层视频最后位置继续
            setPauseMainVideo(false)
            setSeekToTime(currentVideoTime)
            setSeekTrigger(prev => prev + 1)
          }
        }}
        video={video}
        words={data.cards.words}
        expressions={data.cards.expressions}
        grammarPoints={data.grammar_points}
        pronunciationTips={data.pronunciation_tips}
        vocabularyNetwork={data.vocabulary_network}
        getCardStatus={getCardStatus}
        onStatusChange={updateStatus}
        onJumpToSubtitle={(time) => {
          setIsLearningModalOpen(false)
          setPauseMainVideo(false)
          setSeekToTime(time)
          setSeekTrigger(prev => prev + 1)
        }}
        currentVideoTime={currentVideoTime}
        onVideoTimeUpdate={setCurrentVideoTime}
        initialVideoPosition={currentVideoTime}
        initialPlayingState={wasMainVideoPlaying}
      />

      {/* 移动端练习抽屉 - 底部滑出式 */}
      {!isLargeScreen && (
        <PracticeSheet
          open={isPracticeSheetOpen}
          onOpenChange={setIsPracticeSheetOpen}
          video={video}
          exercises={data.exercises}
          progressMap={exerciseProgressMap}
          onRecordAnswer={recordExerciseAnswer}
          onPlaySegment={handlePlaySegment}
        />
      )}

      {/* 连续播放控件 — 右下角固定 */}
      <ContinuousPlayPanel
        playlist={data.playlist || []}
        currentVideoId={videoId}
        canContinuousPlay={data.canContinuousPlay}
        enabled={continuousPlayEnabled}
        onToggle={handleContinuousPlayToggle}
        onNavigate={id => router.push(`/videos/${id}${continuousPlayEnabled ? '?continuous=1' : ''}`)}
      />

      {/* 跟读浮层 — 全屏 */}
      <ShadowReadingPanel
        open={isShadowReadingOpen}
        onOpenChange={setIsShadowReadingOpen}
        videoId={videoId}
        videoUrl={video.video_url}
        subtitles={shadowReadingSubtitles}
        currentVideoTime={currentVideoTime}
        onPlaySegment={handlePlaySegment}
        onPauseMainVideo={() => setPauseMainVideo(true)}
        onResumeMainVideo={() => setPauseMainVideo(false)}
        isAudio={isAudioContent}
        videoInfo={{
          title: video.title,
          description: video.description,
          wordCount: cards.words.length,
          expressionCount: cards.expressions.length,
          grammarPointCount: grammar_points.length,
          exerciseCount: exercises.length,
          exerciseTypes: [...new Set(exercises.map(e => e.exercise_type))],
        }}
        onNavigateTo={(target) => {
          setIsShadowReadingOpen(false)
          if (target === 'words' || target === 'expressions' || target === 'grammar') {
            setCurrentTab('learn')
          } else if (target === 'exercises') {
            setIsPracticeSheetOpen(true)
          }
        }}
      />

      {/* 连续播放倒计时浮层 */}
      {countdown !== null && countdownInfo && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000] rounded-2xl p-8 text-center max-w-sm mx-4">
            <p className="text-sm font-bold text-gray-500 mb-1">
              {countdownInfo.isNextGroup ? '本组已播完，切换下一组' : '连续播放中'}
            </p>
            <p className="text-3xl font-black text-black mb-2">
              即将播放 ({countdown})
            </p>
            <p className="text-sm text-gray-600 mb-5 truncate">
              {countdownInfo.title}
            </p>
            <button
              onClick={cancelCountdown}
              className="px-6 py-2 bg-white border-[2px] border-black rounded-lg text-sm font-bold shadow-[2px_2px_0px_0px_#000] hover:bg-gray-50 active:shadow-none active:translate-x-[2px] active:translate-y-[2px] transition-all"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
