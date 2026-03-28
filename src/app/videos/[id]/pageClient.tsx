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

import { useState, useCallback, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
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
  ExternalLink,
} from 'lucide-react'

import { VideoPlayer } from '@/components/video/VideoPlayer'
import { SubtitleList } from '@/components/video/SubtitleList'
import { CardPopover } from '@/components/video/CardPopover'
import { RecordingPanel } from '@/components/video/RecordingPanel'
import { FillBlankExercise } from '@/components/video/exercises/FillBlankExercise'
import { LearningCards } from '@/components/video/LearningCards'
import { LearningTabs } from '@/components/video/learning/LearningTabs'
import { LearningModal } from '@/components/video/learning/LearningModal'
import { AccessDenied } from '@/components/video/AccessDenied'
import { DraggablePIP } from '@/components/video/DraggablePIP'

import { useVideoProgress } from '@/hooks/useVideoProgress'
import { useCardProgress } from '@/hooks/useCardProgress'
import { useVideoFavorites } from '@/hooks/useVideoFavorites'

import type {
  VideoFullResponseExtended,
  VideoWordCard,
  VideoPhraseCard,
  VideoExpressionCard,
  CardType,
} from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, VIDEO_LANGUAGE_LABELS, CREATOR_PLATFORM_LABELS } from '@/types/video'

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
  const [isLearningModalOpen, setIsLearningModalOpen] = useState(false) // PC端学习弹层

  // PIP 模式状态（移动端学习模块）
  const [pipMode, setPipMode] = useState(false)
  const [isPipPlaying, setIsPipPlaying] = useState(false)
  const [isPipMuted, setIsPipMuted] = useState(false)
  const pipVideoRef = useRef<HTMLVideoElement>(null)
  const pipEnterTimeRef = useRef<number>(0)
  const mainVideoRef = useRef<HTMLVideoElement>(null)

  // PC端左侧高度 ref（用于右侧对齐）
  const leftColumnRef = useRef<HTMLDivElement>(null)
  const [rightContentHeight, setRightContentHeight] = useState<number>(500)

  // 监听左侧高度变化，更新右侧内容区高度
  useEffect(() => {
    if (!isLargeScreen || !leftColumnRef.current) return

    const updateHeight = () => {
      if (leftColumnRef.current) {
        // 左侧总高度 - 占位符(56px) - tab栏(48px) - 边框等 = 内容区高度
        const leftHeight = leftColumnRef.current.offsetHeight
        const contentHeight = leftHeight - 56 - 48 - 12 // 12px 边框+padding
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
  const { updateProgress, saveProgress } = useVideoProgress({
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

  const { getCardStatus, updateStatus } = useCardProgress({ videoId })
  const { isFavorited, toggleFavorite } = useVideoFavorites({ videoId })

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
    // 使用 seekToTime 状态通知 VideoPlayer 跳转
    // 同时增加 seekTrigger 确保每次点击都能触发跳转
    setSeekToTime(subtitle.start_time)
    setSeekTrigger(prev => prev + 1)
  }, [])

  // 播放片段
  const [segmentEndTime, setSegmentEndTime] = useState<number | undefined>(undefined)
  const pipSegmentEndRef = useRef<number | null>(null)
  const pipTimeUpdateHandlerRef = useRef<(() => void) | null>(null)

  const handlePlaySegment = useCallback((startTime: number, endTime: number) => {
    console.log('[handlePlaySegment] === START ===')
    console.log('[handlePlaySegment] startTime:', startTime, 'endTime:', endTime)
    console.log('[handlePlaySegment] pipMode:', pipMode, 'pipVideoRef.current:', !!pipVideoRef.current)

    if (pipMode && pipVideoRef.current) {
      // PIP 模式：直接操作 PIP video 元素
      const videoEl = pipVideoRef.current
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
  }, [pipMode])

  // ============================================
  // PIP 模式控制（移动端学习模块）
  // ============================================

  // 进入 PIP 模式
  const enterPipMode = useCallback(() => {
    console.log('[enterPipMode] Entering PIP mode, previous pipMode:', pipMode)
    // 记住主视频当前时间，PIP 视频将从此处继续
    pipEnterTimeRef.current = currentVideoTime
    setPipMode(true)
    // 暂停主视频（如果正在播放）
    setPauseMainVideo(true)
  }, [pipMode, currentVideoTime])

  // PIP 视频挂载后，同步到进入时的主视频时间并播放
  useEffect(() => {
    if (!pipMode) return
    const videoEl = pipVideoRef.current
    if (!videoEl) return

    videoEl.currentTime = pipEnterTimeRef.current
    videoEl.play().catch(() => {})
  }, [pipMode])

  // 退出 PIP 模式
  const exitPipMode = useCallback(() => {
    console.log('[exitPipMode] Exiting PIP mode, current pipMode:', pipMode)
    setPipMode(false)
    // 同步视频时间到主播放器
    if (pipVideoRef.current) {
      setSeekToTime(pipVideoRef.current.currentTime)
      setSeekTrigger(prev => prev + 1)
    }
    // PIP暂停则主视频也暂停，PIP播放则主视频也播放
    setPauseMainVideo(!isPipPlaying)
  }, [pipMode, isPipPlaying])

  // 切换 Tab 时处理 PIP 模式
  const handleTabChange = useCallback((tab: TabValue) => {
    const previousTab = currentTab
    console.log('[handleTabChange] previousTab:', previousTab, '-> newTab:', tab, 'pipMode:', pipMode)
    setCurrentTab(tab)

    if (tab === 'learn') {
      // 进入学习模块，总是启用 PIP 模式（即使之前已经在学习Tab）
      console.log('[handleTabChange] Entering learn tab, calling enterPipMode()')
      enterPipMode()
    } else {
      // 离开学习模块，退出 PIP 模式
      if (pipMode) {
        console.log('[handleTabChange] Leaving learn tab, calling exitPipMode()')
        exitPipMode()
      }
      setPauseMainVideo(false)
    }
  }, [currentTab, pipMode, enterPipMode, exitPipMode])

  // PIP 视频控制
  const togglePipPlay = useCallback(() => {
    const videoEl = pipVideoRef.current
    if (!videoEl) return

    if (isPipPlaying) {
      videoEl.pause()
    } else {
      videoEl.play()
    }
    setIsPipPlaying(!isPipPlaying)
  }, [isPipPlaying])

  const togglePipMute = useCallback(() => {
    const videoEl = pipVideoRef.current
    if (!videoEl) return

    videoEl.muted = !isPipMuted
    setIsPipMuted(!isPipMuted)
  }, [isPipMuted])

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

  const handleCardStatusChange = useCallback(
    async (status: 'known' | 'unknown' | 'learning') => {
      if (!selectedCard) return

      await updateStatus(selectedCard.type, selectedCard.card.id, status)
      setSelectedCard(null)
    },
    [selectedCard, updateStatus]
  )

  // 无权限
  if (!data.has_access) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Button
            variant="ghost"
            onClick={() => router.back()}
            className="mb-4 border-[2px] border-black dark:border-gray-600"
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

        {/* 视频区 - 吸顶（PIP 模式下隐藏） */}
        {!pipMode && (
          <div className="sticky top-0 z-40">
            {/* 视频播放器 + 半透明返回按钮 */}
            <div className="relative">
              {!isLargeScreen && (
                <VideoPlayer
                  video={video}
                  onTimeUpdate={handleTimeUpdate}
                  initialPosition={data.user_progress?.last_position || 0}
                  seekTo={seekToTime}
                  seekTrigger={seekTrigger}
                  segmentEndTime={segmentEndTime}
                  pause={pauseMainVideo}
                />
              )}
              <button
                onClick={() => router.back()}
                className="absolute top-2 left-3 z-10 flex items-center gap-1 px-2 py-1 text-xs font-bold text-white bg-black/40 backdrop-blur-sm rounded active:bg-black/60 transition-colors"
              >
                <ArrowLeft className="w-3 h-3" />
                返回
              </button>
            </div>

          {/* 功能按钮导航 */}
          <div className="bg-white dark:bg-gray-800 border-l-[3px] border-r-[3px] border-black dark:border-gray-600 px-3 py-2">
            {/* 视频标题 - 双语显示 */}
            <div className="mb-6">
              <h1 className="text-lg font-black text-black dark:text-white truncate">{video.title}</h1>
              {video.original_title && video.original_title !== video.title && (
                <p className="text-sm text-gray-500 dark:text-gray-400 truncate mt-0.5">{video.original_title}</p>
              )}
              {video.description && (
                <p className="text-sm text-gray-400 dark:text-gray-500 truncate mt-1">{video.description}</p>
              )}
            </div>

            {/* UP主信息 - 移动端紧凑显示 */}
            {data.creator && (
              <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200 dark:border-gray-700">
                {data.creator.avatar_url ? (
                  <img
                    src={data.creator.avatar_url}
                    alt={data.creator.name}
                    className="w-6 h-6 rounded-full border border-black object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full border border-black bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                    <Users className="w-3 h-3 text-gray-400" />
                  </div>
                )}
                <span className="text-xs font-bold text-black dark:text-white truncate flex-1">{data.creator.name}</span>
                {data.creator.follower_count > 0 && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {data.creator.follower_count >= 1000000
                      ? `${(data.creator.follower_count / 1000000).toFixed(1)}M`
                      : data.creator.follower_count >= 1000
                        ? `${(data.creator.follower_count / 1000).toFixed(1)}K`
                        : data.creator.follower_count
                    }
                  </span>
                )}
                {data.creator.channel_url && (
                  <a
                    href={data.creator.channel_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:text-blue-600"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}
            {/* 字幕模式居左，功能按钮居右，与PC布局一致 */}
            <div className="flex items-center justify-between gap-1">
              {/* 字幕模式下拉菜单 - 居左，只在听模式显示 */}
              <div className="w-[44px] flex-shrink-0">
                {currentTab === 'listen' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button className={cn("flex items-center gap-0.5 pb-0.5 text-xs font-bold transition-colors border-b-[3px] border-[#B4F416] text-[#B4F416]")}>
                        {displayMode === 'bilingual' ? '双' : displayMode === 'chinese' ? '汉' : '原'}
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

              {/* 5个功能按钮 - 图标+文字+绿色下划线 */}
              <div className="flex items-center gap-3">
                <button onClick={() => handleTabChange('listen')} className={cn("flex items-center gap-1 pb-0.5 text-xs font-bold transition-colors border-b-[3px]", currentTab === 'listen' ? "border-[#B4F416] text-black dark:text-white bg-[#B4F416]/10" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300")}>
                  <Headphones className="w-3.5 h-3.5" />
                  字幕
                </button>
                <button onClick={() => handleTabChange('speak')} className={cn("flex items-center gap-1 pb-0.5 text-xs font-bold transition-colors border-b-[3px]", currentTab === 'speak' ? "border-[#B4F416] text-black dark:text-white bg-[#B4F416]/10" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300")}>
                  <Mic className="w-3.5 h-3.5" />
                  跟读
                </button>
                <button onClick={() => handleTabChange('write')} className={cn("flex items-center gap-1 pb-0.5 text-xs font-bold transition-colors border-b-[3px]", currentTab === 'write' ? "border-[#B4F416] text-black dark:text-white bg-[#B4F416]/10" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300")}>
                  <Pen className="w-3.5 h-3.5" />
                  听写
                </button>
                <button onClick={() => handleTabChange('learn')} className={cn("flex items-center gap-1 pb-0.5 text-xs font-bold transition-colors border-b-[3px]", currentTab === 'learn' ? "border-[#B4F416] text-black dark:text-white bg-[#B4F416]/10" : "border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300")}>
                  <BookOpen className="w-3.5 h-3.5" />
                  知识点
                </button>
                <button onClick={() => setExportTrigger(prev => prev + 1)} className="flex items-center gap-1 pb-0.5 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors border-b-2 border-transparent">
                  <Download className="w-3.5 h-3.5" />
                  导出
                </button>
              </div>
            </div>
          </div>
        </div>
        )}

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
          {currentTab === 'speak' && (
            <RecordingPanel
              videoId={videoId}
              videoUrl={video.video_url}
              subtitles={subtitles}
              currentVideoTime={currentVideoTime}
              onPlaySegment={handlePlaySegment}
              onPauseMainVideo={() => setPauseMainVideo(true)}
              onDialogClose={() => setPauseMainVideo(false)}
              autoScroll={autoScroll}
            />
          )}
          {currentTab === 'write' && (
            <FillBlankExercise
              exercises={exercises}
              onCheckAnswer={() => {}}
              onPlaySegment={(startTime: number, endTime: number) => {
                setSegmentEndTime(endTime)
                setSeekToTime(startTime)
                setSeekTrigger(prev => prev + 1)
              }}
            />
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
                // PIP 模式下直接操作 PIP 视频，不切换 tab
                if (pipMode && pipVideoRef.current) {
                  pipVideoRef.current.currentTime = time
                  pipVideoRef.current.play()
                  setIsPipPlaying(true)
                } else {
                  handleTabChange('listen')
                  setSeekToTime(time)
                }
              }}
              onPlaySegment={(startTime, endTime) => {
                // PIP 模式下直接操作 PIP 视频，不切换 tab
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
        {pipMode && (
          <DraggablePIP
            video={video}
            videoRef={pipVideoRef}
            isPlaying={isPipPlaying}
            currentTime={currentVideoTime}
            duration={video.duration || 0}
            isMuted={isPipMuted}
            onTogglePlay={togglePipPlay}
            onToggleMute={togglePipMute}
            onExpand={exitPipMode}
            onTimeUpdate={(time) => {
              setCurrentVideoTime(time)
              if (video.duration) {
                updateProgress(time, video.duration)
              }
            }}
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
                <VideoPlayer
                  video={video}
                  onTimeUpdate={handleTimeUpdate}
                  initialPosition={data.user_progress?.last_position || 0}
                  seekTo={seekToTime}
                  seekTrigger={seekTrigger}
                  segmentEndTime={segmentEndTime}
                  pause={pauseMainVideo}
                />
              )}

              {/* 视频信息 */}
              <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] p-4 transition-colors duration-300">
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
                      {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
                    </div>
                  </div>

                  {/* UP主信息 */}
                  {data.creator && (
                    <div className="flex items-center gap-3 mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 border-[2px] border-gray-200 dark:border-gray-600">
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
                      </div>
                      {data.creator.channel_url && (
                        <a
                          href={data.creator.channel_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-blue-500 text-white border-[2px] border-black hover:bg-blue-600 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                          频道
                        </a>
                      )}
                    </div>
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

              <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden transition-colors duration-300">
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
                      <button onClick={() => setCurrentTab('speak')} className={cn("px-2.5 py-1.5 border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_#000] text-xs font-black", currentTab === 'speak' ? "bg-[#B4F416] text-black" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")}>
                        跟读
                      </button>
                      <button onClick={() => setCurrentTab('write')} className={cn("px-2.5 py-1.5 border-[2px] border-black transition-colors shadow-[2px_2px_0px_0px_#000] text-xs font-black", currentTab === 'write' ? "bg-[#B4F416] text-black" : "bg-white dark:bg-gray-600 text-gray-600 dark:text-gray-300")}>
                        听写
                      </button>
                      <button
                        onClick={() => {
                          setIsLearningModalOpen(true)
                          setPauseMainVideo(true) // 打开学习模块时暂停主视频
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

                  {currentTab === 'speak' && (
                    <div className="p-4">
                      <RecordingPanel
                        videoId={videoId}
                        videoUrl={video.video_url}
                        subtitles={subtitles}
                        currentVideoTime={currentVideoTime}
                        onPlaySegment={handlePlaySegment}
                        onPauseMainVideo={() => setPauseMainVideo(true)}
                        onDialogClose={() => setPauseMainVideo(false)}
                        autoScroll={autoScroll}
                        noScrollContainer={true}
                      />
                    </div>
                  )}

                  {currentTab === 'write' && (
                    <div className="p-4">
                      <FillBlankExercise
                        exercises={exercises}
                        onCheckAnswer={() => {}}
                        onPlaySegment={(startTime, endTime) => {
                          setSegmentEndTime(endTime)
                          setSeekToTime(startTime)
                          setSeekTrigger(prev => prev + 1)
                        }}
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
          videoId={videoId}
          onClose={() => setSelectedCard(null)}
          onStatusChange={handleCardStatusChange}
          currentStatus={getCardStatus(selectedCard.type, selectedCard.card.id)}
          position={selectedCard.position}
        />
      )}

      {/* PC端学习弹层 - 全屏模态框，包含 PiP 视频 */}
      <LearningModal
        open={isLearningModalOpen}
        onOpenChange={setIsLearningModalOpen}
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
          setSeekToTime(time)
        }}
        currentVideoTime={currentVideoTime}
        onVideoTimeUpdate={setCurrentVideoTime}
        initialVideoPosition={currentVideoTime}
      />
    </div>
  )
}
