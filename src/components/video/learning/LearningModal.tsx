'use client'

/**
 * 学习模块弹层组件 (PC端)
 *
 * 布局:
 * - 左上角：视频播放器 (1/4 屏幕大小)
 * - 左下角：地道表达
 * - 右侧：单词、语法点、发音要点、词汇网络 (可滚动)
 *
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 */

import { useState, useCallback, useEffect, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { VisuallyHidden } from '@radix-ui/react-visually-hidden'
import {
  X,
  BookOpen,
  MessageSquare,
  BookMarked,
  Volume2,
  Network,
  Play,
  Pause,
  MapPin,
  ChevronDown,
  ChevronUp,
  Loader2,
  Headphones,
} from 'lucide-react'
import type {
  Video,
  VideoWordCard,
  VideoExpressionCard,
  VideoGrammarPoint,
  VideoPronunciationTip,
  VideoVocabularyNetwork,
  CardStatus,
} from '@/types/video'
import { GrammarPointsTab } from './GrammarPointsTab'
import { PronunciationTipsTab } from './PronunciationTipsTab'
import { VocabularyNetworkTab, hasVocabularyNetworkContent } from './VocabularyNetworkTab'
import { WordsTab } from './LearningTabs'
import { useTTSPreload } from '@/hooks/useTTSPreload'
import type { TTSPreloadInstance } from '@/hooks/useTTSPreload'

// ============================================
// 类型定义
// ============================================

export interface LearningModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  video: Video
  words: VideoWordCard[]
  expressions: VideoExpressionCard[]
  grammarPoints: VideoGrammarPoint[]
  pronunciationTips: VideoPronunciationTip[]
  vocabularyNetwork: VideoVocabularyNetwork | null
  getCardStatus?: (cardType: 'word' | 'expression', cardId: string) => CardStatus | undefined
  onStatusChange?: (cardType: 'word' | 'expression', cardId: string, status: CardStatus) => Promise<void>
  onJumpToSubtitle?: (time: number) => void
  currentVideoTime?: number
  onVideoTimeUpdate?: (time: number) => void
  initialVideoPosition?: number
  initialPlayingState?: boolean // 主视频打开弹层前的播放状态
}

// ============================================
// 常量 - Speaker 风格
// ============================================

const STATUS_CONFIG: Record<CardStatus, { label: string; activeClass: string }> = {
  unknown: { label: '不认识', activeClass: 'bg-red-400 text-black border-black shadow-[2px_2px_0px_0px_#000]' },
  learning: { label: '模糊', activeClass: 'bg-yellow-400 text-black border-black shadow-[2px_2px_0px_0px_#000]' },
  known: { label: '认识', activeClass: 'bg-[#B4F416] text-black border-black shadow-[2px_2px_0px_0px_#000]' },
}

// ============================================
// 主组件
// ============================================

export function LearningModal({
  open,
  onOpenChange,
  video,
  words = [],
  expressions = [],
  grammarPoints = [],
  pronunciationTips = [],
  vocabularyNetwork = null,
  getCardStatus,
  onStatusChange,
  onJumpToSubtitle,
  currentVideoTime = 0,
  onVideoTimeUpdate,
  initialVideoPosition = 0,
  initialPlayingState = false,
}: LearningModalProps) {
  const [localStatusMap, setLocalStatusMap] = useState<Map<string, CardStatus>>(new Map())

  // 共享 TTS 预加载实例
  const ttsPreload = useTTSPreload(video.language)

  // 模块折叠状态 - 默认全部展开
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['words', 'expressions', 'grammar', 'pronunciation', 'network'])
  )

  // 单词展开更多状态 - 默认只展示 3 行（3 列 × 3 行 = 9 个单词）
  const WORDS_PREVIEW_COUNT = 9
  const [showAllWords, setShowAllWords] = useState(false)

  // 视频状态
  const videoRef = useRef<HTMLVideoElement>(null)
  const audioRef = useRef<HTMLAudioElement>(null)
  const isAudioContent = video.content_type === 'audio'
    || /\.(mp3|m4a|wav|ogg|aac|flac|wma)(\?|$)/i.test(video.video_url || '')
  // 统一的 media 元素 ref，根据内容类型指向 video 或 audio
  const mediaRef = isAudioContent
    ? audioRef as React.MutableRefObject<HTMLVideoElement | HTMLAudioElement | null>
    : videoRef as React.MutableRefObject<HTMLVideoElement | HTMLAudioElement | null>
  const timeUpdateHandlerRef = useRef<(() => void) | null>(null)
  const [isVideoPlaying, setIsVideoPlaying] = useState(false)
  const [videoCurrentTime, setVideoCurrentTime] = useState(0)
  const [videoDuration, setVideoDuration] = useState(0)

  // 清理资源 - 防止内存泄漏
  useEffect(() => {
    return () => {
      // 清理 timeupdate 监听器
      if (timeUpdateHandlerRef.current && mediaRef.current) {
        mediaRef.current.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
        timeUpdateHandlerRef.current = null
      }
      // 暂停视频
      if (mediaRef.current) {
        mediaRef.current.pause()
      }
    }
  }, [])

  // 弹窗关闭时也清理资源
  useEffect(() => {
    if (!open) {
      // 清理 timeupdate 监听器
      if (timeUpdateHandlerRef.current && mediaRef.current) {
        mediaRef.current.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
        timeUpdateHandlerRef.current = null
      }
      // 暂停视频
      if (mediaRef.current) {
        mediaRef.current.pause()
        setIsVideoPlaying(false)
      }
    }
  }, [open])

  // 切换模块折叠
  const toggleSection = useCallback((section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(section)) {
        next.delete(section)
      } else {
        next.add(section)
      }
      return next
    })
  }, [])

  // 获取卡片状态
  const getCardStatusLocal = useCallback(
    (cardType: 'word' | 'expression', cardId: string): CardStatus | undefined => {
      const key = `${cardType}:${cardId}`
      if (localStatusMap.has(key)) {
        return localStatusMap.get(key)
      }
      return getCardStatus?.(cardType, cardId)
    },
    [getCardStatus, localStatusMap]
  )

  // 更新卡片状态
  const handleStatusChange = useCallback(
    async (cardType: 'word' | 'expression', cardId: string, status: CardStatus) => {
      const key = `${cardType}:${cardId}`
      setLocalStatusMap(prev => new Map(prev).set(key, status))

      if (onStatusChange) {
        try {
          await onStatusChange(cardType, cardId, status)
        } catch (error) {
          console.error('[LearningModal] Update error:', error)
        }
      }
    },
    [onStatusChange]
  )

  // 视频/音频控制
  const toggleVideoPlay = useCallback(() => {
    const mediaEl = mediaRef.current
    if (!mediaEl) return

    if (isVideoPlaying) {
      mediaEl.pause()
    } else {
      mediaEl.play()
    }
  }, [isVideoPlaying])

  // 视频/音频时间更新
  const handleVideoTimeUpdate = useCallback(() => {
    const mediaEl = mediaRef.current
    if (!mediaEl) return
    setVideoCurrentTime(mediaEl.currentTime)
    onVideoTimeUpdate?.(mediaEl.currentTime)
  }, [onVideoTimeUpdate])

  // 跳转视频/音频并播放指定片段
  const handleJumpToTime = useCallback((startTime: number, endTime?: number) => {
    const mediaEl = mediaRef.current
    if (!mediaEl) return

    // 清理之前的监听器
    if (timeUpdateHandlerRef.current) {
      mediaEl.removeEventListener('timeupdate', timeUpdateHandlerRef.current)
      timeUpdateHandlerRef.current = null
    }

    // 跳转并播放
    mediaEl.currentTime = startTime
    mediaEl.play()

    // 如果有结束时间，到达后暂停
    if (endTime && endTime > startTime) {
      const handleTimeUpdate = () => {
        if (mediaEl.currentTime >= endTime) {
          mediaEl.pause()
          mediaEl.removeEventListener('timeupdate', handleTimeUpdate)
          timeUpdateHandlerRef.current = null
        }
      }
      timeUpdateHandlerRef.current = handleTimeUpdate
      mediaEl.addEventListener('timeupdate', handleTimeUpdate)
    }
  }, [])

  // 组件挂载时预加载所有单词
  useEffect(() => {
    if (words.length === 0) return
    const timer = setTimeout(() => {
      ttsPreload.preloadWords(words.map((w) => w.word))
    }, 500)
    return () => clearTimeout(timer)
  }, [words, ttsPreload])

  // 当modal打开时，如果主视频之前在播放，则自动播放modal中的视频
  useEffect(() => {
    console.log('[LearningModal] Modal打开状态:', open, '初始播放状态:', initialPlayingState)
    if (!open || !initialPlayingState) return

    const timer = setTimeout(() => {
      const mediaEl = mediaRef.current
      console.log('[LearningModal] 尝试自动播放，mediaEl:', !!mediaEl, 'paused:', mediaEl?.paused)
      if (mediaEl && mediaEl.paused) {
        mediaEl.play().catch((err) => {
          // Auto-play was blocked, which is fine
          console.log('[LearningModal] Auto-play blocked:', err)
        })
      }
    }, 100) // Small delay to ensure the video is ready

    return () => clearTimeout(timer)
  }, [open, initialPlayingState])

  // 播放单词发音
  const playWord = useCallback(async (word: string) => {
    await ttsPreload.play(word)
  }, [ttsPreload])

  // 计算学习进度
  const wordsLearned = words.filter(word => {
    const status = getCardStatusLocal('word', word.id)
    return status === 'known' || status === 'learning'
  }).length

  const expressionsLearned = expressions.filter(expr => {
    const status = getCardStatusLocal('expression', expr.id)
    return status === 'known' || status === 'learning'
  }).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[98vw] w-[1600px] h-[95vh] p-0 gap-0 bg-gray-100 dark:bg-gray-900 border-[3px] border-black dark:border-gray-600 shadow-[8px_8px_0px_0px_#000] dark:shadow-[8px_8px_0px_0px_#666] rounded-sm overflow-hidden flex flex-col"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest('[data-word-tooltip-overlay]')) {
            e.preventDefault()
          }
        }}
      >
        <VisuallyHidden>
          <DialogTitle>学习模块</DialogTitle>
          <DialogDescription>单词、地道表达、语法点等学习内容</DialogDescription>
        </VisuallyHidden>

        {/* 主内容区域 */}
        <div className="flex flex-1 min-h-0 overflow-hidden">
          {/* 左侧：视频 + 地道表达 */}
          <div className="w-[45%] flex flex-col shrink-0 border-r-[3px] border-black dark:border-gray-600">
            {/* 视频/音频区域 */}
            <div className="relative bg-gray-900 aspect-video shrink-0 overflow-hidden">
              {isAudioContent ? (
                <>
                  {/* 音频：隐藏 audio 元素 + 封面视觉 */}
                  <audio
                    ref={audioRef as React.RefObject<HTMLAudioElement>}
                    src={video.video_url}
                    onTimeUpdate={handleVideoTimeUpdate}
                    onPlay={() => setIsVideoPlaying(true)}
                    onPause={() => setIsVideoPlaying(false)}
                    onLoadedMetadata={(e) => {
                      const el = e.currentTarget
                      setVideoDuration(el.duration)
                      if (initialVideoPosition > 0) {
                        el.currentTime = initialVideoPosition
                      }
                    }}
                  />
                  {/* Apple Music 风格封面背景 */}
                  {(() => {
                    const coverSrc = video.cover_url || video.thumbnail_url
                    return coverSrc ? (
                      <div className="absolute inset-0">
                        <img src={coverSrc} alt="" className="absolute inset-0 w-full h-full object-cover"
                          style={{ transform: 'scale(1.6)', filter: 'blur(60px) saturate(2.5) brightness(0.7) contrast(1.1)' }} />
                        <div className="absolute inset-0 backdrop-blur-[20px]" style={{ backgroundColor: 'rgba(0,0,0,0.15)' }} />
                        <div className="absolute inset-0" style={{
                          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.3) 70%, rgba(0,0,0,0.5) 100%)',
                        }} />
                        <div className="absolute inset-0" style={{
                          background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.6) 100%)',
                        }} />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="rounded-xl overflow-hidden border border-white/10 w-28 h-28 shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                            style={{ backgroundImage: `url(${coverSrc})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
                        </div>
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-gray-900 via-gray-950 to-black">
                        <Headphones className="w-16 h-16 text-white/20" />
                      </div>
                    )
                  })()}
                </>
              ) : video.video_url ? (
                <video
                  ref={videoRef}
                  src={video.video_url}
                  poster={video.thumbnail_url || undefined}
                  className="w-full h-full object-contain"
                  onTimeUpdate={handleVideoTimeUpdate}
                  onPlay={() => setIsVideoPlaying(true)}
                  onPause={() => setIsVideoPlaying(false)}
                  onLoadedMetadata={(e) => {
                    const el = e.currentTarget
                    setVideoDuration(el.duration)
                    if (initialVideoPosition > 0) {
                      el.currentTime = initialVideoPosition
                    }
                  }}
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white">
                  <span className="font-bold">暂无视频</span>
                </div>
              )}

              {/* 视频控制条 */}
              <div className="absolute bottom-0 left-0 right-0 bg-black/80 p-2 flex items-center gap-2">
                <button onClick={toggleVideoPlay} className="p-1 text-white hover:text-[#B4F416] transition-colors">
                  {isVideoPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                </button>
                <div
                  className="flex-1 h-3 bg-white/20 rounded-sm overflow-hidden cursor-pointer hover:h-4 transition-all"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect()
                    const ratio = (e.clientX - rect.left) / rect.width
                    const mediaEl = mediaRef.current
                    if (mediaEl && videoDuration) {
                      mediaEl.currentTime = ratio * videoDuration
                    }
                  }}
                  onMouseDown={(e) => {
                    if (e.button !== 0) return
                    const bar = e.currentTarget
                    const seek = (clientX: number) => {
                      const rect = bar.getBoundingClientRect()
                      const ratio = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
                      const mediaEl = mediaRef.current
                      if (mediaEl && videoDuration) {
                        mediaEl.currentTime = ratio * videoDuration
                      }
                    }
                    seek(e.clientX)
                    const onMove = (ev: MouseEvent) => seek(ev.clientX)
                    const onUp = () => {
                      document.removeEventListener('mousemove', onMove)
                      document.removeEventListener('mouseup', onUp)
                    }
                    document.addEventListener('mousemove', onMove)
                    document.addEventListener('mouseup', onUp)
                  }}
                >
                  <div
                    className="h-full bg-[#B4F416] pointer-events-none"
                    style={{ width: videoDuration > 0 ? `${(videoCurrentTime / videoDuration) * 100}%` : '0%' }}
                  />
                </div>
                <span className="text-xs text-white font-mono">
                  {formatTime(videoCurrentTime)} / {formatTime(videoDuration)}
                </span>
              </div>
            </div>

            {/* 单词区域 */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white dark:bg-gray-800">
              {/* 单词标题栏 */}
              <div className="sticky top-0 bg-indigo-200 dark:bg-indigo-900/40 px-3 py-2 border-b-[2px] border-black dark:border-gray-600 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">单词</span>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 bg-indigo-300 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 border-[2px] border-black">
                    {words.length} 个
                  </span>
                </div>
              </div>
              <WordsTab
                words={words}
                videoLanguage={video.language}
                ttsPreload={ttsPreload}
                onJumpToSubtitle={handleJumpToTime}
                getCardStatus={getCardStatusLocal}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>

          {/* 右侧：地道表达、单词、语法、发音、词汇网络 - 整体可滚动 */}
          <div className="w-[55%] flex flex-col min-h-0 overflow-y-auto bg-gray-50 dark:bg-gray-900">
            {/* 地道表达模块 */}
            {expressions.length > 0 && (
              <div className="border-b-[2px] border-black dark:border-gray-600">
                <div className="sticky top-0 bg-purple-200 dark:bg-purple-900/40 px-3 py-2 cursor-pointer z-10">
                  <div
                    className="flex items-center gap-2 cursor-pointer"
                    onClick={() => toggleSection('expressions')}
                  >
                    <MessageSquare className="w-4 h-4 text-purple-700 dark:text-purple-300" />
                    <span className="text-sm font-black text-purple-700 dark:text-purple-300">地道表达</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-purple-300 dark:bg-purple-800 text-purple-800 dark:text-purple-200 border-[2px] border-black">
                      {expressionsLearned}/{expressions.length}
                    </span>
                    {expandedSections.has('expressions') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>

                {expandedSections.has('expressions') && (
                  <div className="p-2 space-y-2 bg-white dark:bg-gray-800">
                    {expressions.map((expr) => (
                      <ExpressionCard
                        key={expr.id}
                        expression={expr}
                        status={getCardStatusLocal('expression', expr.id)}
                        onStatusChange={(status) => handleStatusChange('expression', expr.id, status)}
                        onJumpToSubtitle={handleJumpToTime}
                        onPlayWord={playWord}
                        videoLanguage={video.language}
                        ttsPreload={ttsPreload}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 单词模块 - 从右侧移除，已放到左侧 */}

            {/* 语法点 */}
            {grammarPoints.length > 0 && (
              <div className="border-b-[2px] border-black dark:border-gray-600">
                <div
                  className="bg-amber-200 dark:bg-amber-900/40 px-3 py-2 cursor-pointer sticky top-0 z-10"
                  onClick={() => toggleSection('grammar')}
                >
                  <div className="flex items-center gap-2">
                    <BookMarked className="w-4 h-4 text-amber-700 dark:text-amber-300" />
                    <span className="text-sm font-black text-amber-700 dark:text-amber-300">语法点</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-300 dark:bg-amber-800 text-amber-800 dark:text-amber-200 border-[2px] border-black">
                      {grammarPoints.length}
                    </span>
                    {expandedSections.has('grammar') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>
                {expandedSections.has('grammar') && (
                  <div className="p-3 bg-white dark:bg-gray-800">
                    <GrammarPointsTab grammarPoints={grammarPoints} />
                  </div>
                )}
              </div>
            )}

            {/* 发音要点 */}
            {pronunciationTips.length > 0 && (
              <div className="border-b-[2px] border-black dark:border-gray-600">
                <div
                  className="bg-teal-200 dark:bg-teal-900/40 px-3 py-2 cursor-pointer sticky top-0 z-10"
                  onClick={() => toggleSection('pronunciation')}
                >
                  <div className="flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-teal-700 dark:text-teal-300" />
                    <span className="text-sm font-black text-teal-700 dark:text-teal-300">发音要点</span>
                    <span className="text-xs font-bold px-2 py-0.5 bg-teal-300 dark:bg-teal-800 text-teal-800 dark:text-teal-200 border-[2px] border-black">
                      {pronunciationTips.length}
                    </span>
                    {expandedSections.has('pronunciation') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>
                {expandedSections.has('pronunciation') && (
                  <div className="p-3 bg-white dark:bg-gray-800">
                    <PronunciationTipsTab tips={pronunciationTips} ttsPreload={ttsPreload} />
                  </div>
                )}
              </div>
            )}

            {/* 词汇网络 */}
            {hasVocabularyNetworkContent(vocabularyNetwork) && (
              <div>
                <div
                  className="bg-indigo-200 dark:bg-indigo-900/40 px-3 py-2 cursor-pointer sticky top-0 z-10"
                  onClick={() => toggleSection('network')}
                >
                  <div className="flex items-center gap-2">
                    <Network className="w-4 h-4 text-indigo-700 dark:text-indigo-300" />
                    <span className="text-sm font-black text-indigo-700 dark:text-indigo-300">词汇网络</span>
                    {expandedSections.has('network') ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                  </div>
                </div>
                {expandedSections.has('network') && (
                  <div className="p-3 bg-white dark:bg-gray-800">
                    <VocabularyNetworkTab network={vocabularyNetwork} wordCards={words} videoLanguage={video.language} ttsPreload={ttsPreload} />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ============================================
// 工具函数
// ============================================

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

// ============================================
// 单词卡片 - Neo-brutalism
// ============================================

interface WordCardProps {
  word: VideoWordCard
  status?: CardStatus
  onStatusChange: (status: CardStatus) => void
  onJumpToSubtitle?: (startTime: number, endTime?: number) => void
  onPlayWord?: (word: string) => void
  videoLanguage?: string
  ttsPreload: TTSPreloadInstance
}

function WordCard({ word, status, onStatusChange, onJumpToSubtitle, onPlayWord, ttsPreload }: WordCardProps) {
  return (
    <div className={cn(
      "p-2 border-[2px] border-black dark:border-gray-600 rounded-sm transition-all duration-150 hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5",
      status === 'known' ? 'bg-green-100 dark:bg-green-900/20' :
      status === 'learning' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
      status === 'unknown' ? 'bg-red-100 dark:bg-red-900/20' :
      'bg-white dark:bg-gray-800'
    )}>
      {/* 单词头部 */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1 flex-wrap">
          <span className="font-black text-sm text-black dark:text-white">{word.word}</span>
          {/* 音标 - 多语言兼容：法语/英语用 phonetic，日语未来可扩展 kana/romaji */}
          {word.phonetic && (
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-serif">
              [{word.phonetic}]
            </span>
          )}
          {word.part_of_speech && (
            <span className="px-1 py-0.5 bg-blue-100 dark:bg-blue-800 text-blue-700 dark:text-blue-300 text-[10px] font-bold border border-blue-300 dark:border-blue-700 rounded">
              {word.part_of_speech}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          {onPlayWord && ttsPreload.isAvailable(word.word) && (
            <button
              onClick={() => onPlayWord(word.word)}
              className="p-1 text-gray-500 hover:text-[#B4F416] hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="播放发音"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          )}
          {onJumpToSubtitle && word.subtitle_start_time !== undefined && word.subtitle_start_time > 0 && (
            <button
              onClick={() => onJumpToSubtitle(word.subtitle_start_time, word.subtitle_end_time)}
              className="p-1 text-gray-500 hover:text-indigo-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="跳转到字幕"
            >
              <MapPin className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 释义 - 中文释义为主 */}
      <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 mb-1 font-medium">
        {word.chinese_definition}
      </p>

      {/* 英文释义 - 可选，用于辅助理解 */}
      {word.english_definition && (
        <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-1 mb-1 italic">
          {word.english_definition}
        </p>
      )}

      {/* 剧中例句 - 可选展开 */}
      {word.example_from_video && (
        <div className="mt-1 p-1.5 bg-indigo-50 dark:bg-indigo-900/20 border-[1px] border-indigo-200 dark:border-indigo-800 rounded-sm">
          <p className="text-[10px] text-indigo-700 dark:text-indigo-300 line-clamp-2">
            {word.example_from_video}
          </p>
        </div>
      )}

      {/* 三态按钮 */}
      <div className="flex items-center gap-1 mt-2">
        {(['unknown', 'learning', 'known'] as CardStatus[]).map((s) => {
          const config = STATUS_CONFIG[s]
          const isActive = status === s

          return (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={cn(
                "flex-1 py-1 text-[10px] font-black border-[2px] border-black dark:border-gray-500 transition-all duration-150",
                isActive
                  ? config.activeClass
                  : "bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
              )}
            >
              {config.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ============================================
// 地道表达卡片 - Neo-brutalism
// ============================================

interface ExpressionCardProps {
  expression: VideoExpressionCard
  status?: CardStatus
  onStatusChange: (status: CardStatus) => void
  onJumpToSubtitle?: (startTime: number, endTime?: number) => void
}

function ExpressionCard({ expression, status, onStatusChange, onJumpToSubtitle }: ExpressionCardProps) {
  return (
    <div className={cn(
      "p-3 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] transition-all duration-150 hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[3px_3px_0px_0px_#666] hover:-translate-y-0.5",
      status === 'known' ? 'bg-green-100 dark:bg-green-900/20' :
      status === 'learning' ? 'bg-yellow-100 dark:bg-yellow-900/20' :
      status === 'unknown' ? 'bg-red-100 dark:bg-red-900/20' :
      'bg-white dark:bg-gray-800'
    )}>
      {/* 表达头部 */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="font-black text-base text-black dark:text-white">{expression.expression}</span>
          {expression.difficulty_level && (
            <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 text-xs font-bold border-[2px] border-purple-400 dark:border-purple-600 rounded">
              A{expression.difficulty_level}
            </span>
          )}
        </div>
        {onJumpToSubtitle && expression.context && (expression.subtitle_start_time ?? 0) > 0 && (
          <button
            onClick={() => onJumpToSubtitle(expression.subtitle_start_time!, expression.subtitle_end_time)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-black text-black bg-[#B4F416] hover:bg-[#a3e014] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <Play className="w-3 h-3" />
            播放
          </button>
        )}
      </div>

      {/* 含义 */}
      {expression.meaning && (
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
          {expression.meaning}
        </p>
      )}

      {/* 用法说明 */}
      {expression.formula && (
        <div className="mb-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 border-l-[3px] border-[#B4F416]">
          <p className="text-xs text-gray-600 dark:text-gray-400 font-mono font-medium">
            {expression.formula}
          </p>
        </div>
      )}

      {/* 剧中上下文 */}
      {expression.context && (
        <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border-[2px] border-indigo-200 dark:border-indigo-800 rounded-sm mb-3">
          <p className="text-xs text-indigo-800 dark:text-indigo-200 font-medium">
            "{expression.context}"
          </p>
          {expression.context_translation && (
            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-0.5">
              {expression.context_translation}
            </p>
          )}
        </div>
      )}

      {/* 三态按钮 */}
      <div className="flex items-center gap-1">
        {(['unknown', 'learning', 'known'] as CardStatus[]).map((s) => {
          const config = STATUS_CONFIG[s]
          const isActive = status === s

          return (
            <button
              key={s}
              onClick={() => onStatusChange(s)}
              className={cn(
                "flex-1 py-1.5 text-xs font-black border-[2px] border-black dark:border-gray-500 transition-all duration-150",
                isActive
                  ? config.activeClass
                  : "bg-white dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600"
              )}
            >
              {config.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default LearningModal
