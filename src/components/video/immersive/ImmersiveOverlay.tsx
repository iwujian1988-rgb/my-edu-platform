'use client'

import { useCallback, useState, useEffect, useRef, useMemo } from 'react'
import { ArrowLeft, Subtitles, X } from 'lucide-react'
import { SingleLineSubtitle } from './SingleLineSubtitle'
import { ImmersiveAccordion } from './ImmersiveAccordion'
import { VideoPlayer } from '@/components/video/VideoPlayer'
import { AudioPlayer } from '@/components/video/AudioPlayer'
import { CardPopover } from '@/components/video/CardPopover'
import type {
  VideoFullResponseExtended, VideoListItem, CardType,
  VideoWordCard, VideoPhraseCard, VideoExpressionCard,
  SubtitleWithHighlights,
} from '@/types/video'

const AUTHORIZED_DEBUG_PHONES = ['15652936305']
const PHONE_EMAIL_SUFFIX = '@phone.xiaoyu.com'

// 手写笔记风格：3 种标注
// 0: 荧光笔涂抹
// 1: 手写波浪线（蓝色）
// 2: 手写下划线（红色）
const MARK_STYLES = [
  'bg-yellow-200/70 dark:bg-yellow-400/30 rounded-sm px-0.5 -mx-0.5',
  'underline decoration-[3px] decoration-blue-500 underline-offset-4 decoration-wavy',
  'underline decoration-[3px] decoration-rose-500 underline-offset-4',
]

interface ImmersiveOverlayProps {
  data: VideoFullResponseExtended
  videoId: string
  isLargeScreen: boolean
  isAudioContent: boolean

  currentVideoTime: number
  seekToTime: number | undefined
  seekTrigger: number
  segmentEndTime: number | undefined
  pauseMainVideo: boolean
  mainVideoRef: React.RefObject<HTMLVideoElement | null>
  mainAudioRef: React.RefObject<HTMLAudioElement | null>

  onTimeUpdate: (time: number) => void
  onSeekTo: (time: number) => void
  onSeekTrigger: () => void
  onSubtitleClick: (startTime: number) => void
  onPlaySegment: (startTime: number, endTime: number) => void
  onHighlightClick: (cardType: CardType, cardId: string, event: React.MouseEvent) => void
  onPauseMainVideo: () => void
  onResumeMainVideo: () => void
  onExit: () => void

  displayMode: 'bilingual' | 'original' | 'chinese'

  selectedCard: {
    card: VideoWordCard | VideoPhraseCard | VideoExpressionCard
    type: CardType
    position: { x: number; y: number } | null
  } | null
  onSelectedCardClose: () => void

  exerciseProgressMap: Map<string, { isCorrect: boolean; attempts: number }> | null
  onRecordExerciseAnswer: (exerciseId: string, isCorrect: boolean) => void

  getCardStatus: (cardType: 'word' | 'expression', cardId: string) => string | undefined
  onCardStatusChange: (cardType: 'word' | 'expression', cardId: string, status: string) => Promise<void>

  shouldAutoEnable: boolean
  onVideoEnded: () => void

  creatorAvatarUrl?: string

  shadowReadingSubtitles: SubtitleWithHighlights[]
}

export function ImmersiveOverlay({
  data,
  videoId,
  isLargeScreen,
  isAudioContent,
  currentVideoTime,
  seekToTime,
  seekTrigger,
  segmentEndTime,
  pauseMainVideo,
  mainVideoRef,
  mainAudioRef,
  onTimeUpdate,
  onSeekTo,
  onSeekTrigger,
  onSubtitleClick,
  onPlaySegment,
  onHighlightClick,
  onPauseMainVideo,
  onResumeMainVideo,
  onExit,
  displayMode,
  selectedCard,
  onSelectedCardClose,
  exerciseProgressMap,
  onRecordExerciseAnswer,
  getCardStatus,
  onCardStatusChange,
  shouldAutoEnable,
  onVideoEnded,
  creatorAvatarUrl,
  shadowReadingSubtitles,
}: ImmersiveOverlayProps) {
  // Track which sections are open - default ALL open
  const [closedSections, setClosedSections] = useState<Set<number>>(new Set())
  // 字幕可见性：盲听时隐藏，精听时恢复
  const [subtitleVisible, setSubtitleVisible] = useState(true)
  // 横屏检测：横屏时视频不吸顶，避免占满屏幕看不到内容
  const [isLandscape, setIsLandscape] = useState(false)
  // 移动端视频高度（用于 fixed 布局的占位）
  const videoWrapRef = useRef<HTMLDivElement>(null)
  const [videoHeight, setVideoHeight] = useState(0)
  // 字幕调试模式：仅授权账号可见
  const [isDebugUser, setIsDebugUser] = useState(false)
  const [showFullSubtitles, setShowFullSubtitles] = useState(false)

  useEffect(() => {
    fetch('/api/auth/user')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.email) {
          const phone = data.email.replace(PHONE_EMAIL_SUFFIX, '')
          if (AUTHORIZED_DEBUG_PHONES.includes(phone)) {
            setIsDebugUser(true)
          }
        }
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    const check = () => {
      setIsLandscape(window.innerWidth > window.innerHeight)
      if (videoWrapRef.current) {
        setVideoHeight(videoWrapRef.current.offsetHeight)
      }
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 移动端用 fixed + 占位，桌面端用 sticky
  const useFixed = !isLargeScreen && !isLandscape

  const { video, subtitles, cards, exercises, grammar_points, pronunciation_tips, vocabulary_network } = data
  const video_ = video as VideoListItem

  // 字幕调试：随机给部分单词做手写笔记标注（基于 hash 稳定）
  const coloredSubtitles = useMemo(() => {
    if (!showFullSubtitles) return []
    return subtitles.map((sub) => {
      const tokens = sub.original_text.split(/(\s+)/)
      return tokens.map((token, wIdx) => {
        if (/^\s*$/.test(token)) return { text: token, mark: -1 }
        const code = token.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
        const hash = (code * 31 + wIdx * 7 + Math.round(sub.start_time * 13)) % 10
        // ~30% 的单词被标注，标注类型由 hash 决定
        if (hash < 3) return { text: token, mark: hash % 3 }
        return { text: token, mark: -1 }
      })
    })
  }, [showFullSubtitles, subtitles])

  const toggleSection = useCallback((index: number) => {
    setClosedSections(prev => {
      const next = new Set(prev)
      if (next.has(index)) {
        next.delete(index)
      } else {
        next.add(index)
      }
      return next
    })
  }, [])

  const playerProps = {
    video: video_,
    onTimeUpdate,
    initialPosition: shouldAutoEnable ? 0 : (data.user_progress?.last_position || 0) as number,
    seekTo: seekToTime,
    seekTrigger,
    segmentEndTime,
    pause: pauseMainVideo,
    onEnded: onVideoEnded,
    // 沉浸模式下始终 autoPlay，确保 play 按钮可以控制视频
    // autoPlay 会自动触发 hasStarted → 加载 src → 播放
    autoPlay: true,
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* 居中限宽容器 — PC 上不撑满全屏 */}
      <div className="max-w-6xl mx-auto bg-white dark:bg-gray-950 min-h-screen shadow-sm">
        {/* Top bar */}
        <div className="sticky top-0 z-50 flex items-center gap-2 px-3 py-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur border-b border-gray-200 dark:border-gray-800">
          <button
            onClick={onExit}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            退出
          </button>
          <h1 className="flex-1 min-w-0 text-sm font-semibold text-gray-900 dark:text-gray-100 line-clamp-1">
            {video_.title}
          </h1>
          {isDebugUser && !showFullSubtitles && (
            <button
              onClick={() => setShowFullSubtitles(true)}
              className="px-2 py-0.5 text-xs font-black text-gray-500 bg-gray-100 rounded hover:bg-gray-200 transition-colors"
            >
              S
            </button>
          )}
        </div>

        {/* Video player — 移动端 fixed 防抖动，桌面端 sticky */}
        <div
          ref={videoWrapRef}
          className={
            useFixed
              ? 'fixed top-0 left-0 right-0 z-40'
              : isLandscape
                ? 'relative'
                : 'sticky top-[44px] z-40'
          }
        >
          {isAudioContent ? (
            <AudioPlayer {...playerProps} audioRefOut={mainAudioRef} fallbackImageUrl={creatorAvatarUrl} />
          ) : (
            <VideoPlayer {...playerProps} videoRefOut={mainVideoRef} />
          )}

          {/* Single-line subtitle */}
          <SingleLineSubtitle
            subtitles={subtitles}
            currentVideoTime={currentVideoTime}
            onSubtitleClick={onSubtitleClick}
            displayMode={displayMode}
            visible={subtitleVisible}
          />

          {/* 字幕隐藏时的恢复按钮 */}
          {!subtitleVisible && (
            <button
              onClick={() => setSubtitleVisible(true)}
              className="absolute bottom-2 right-2 z-10 flex items-center gap-1 px-2 py-1 text-[10px] font-bold text-white bg-black/70 rounded hover:bg-black/90 transition-colors"
            >
              <Subtitles className="w-3 h-3" />
              字幕
            </button>
          )}

          {/* 总标题 — 跟随视频吸顶 */}
          <div className="bg-white dark:bg-gray-950 border-b border-gray-100 dark:border-gray-800 px-4 py-3">
            <h2 className="text-lg font-extrabold text-gray-900 dark:text-gray-100 tracking-tight">
              本集训练内容
            </h2>
          </div>
        </div>

        {/* 移动端 fixed 布局的占位空间 */}
        {useFixed && videoHeight > 0 && (
          <div style={{ height: videoHeight }} />
        )}

        {/* All sections / Full subtitles debug view */}
        {showFullSubtitles ? (
          <div className="px-3 pb-6">
            <div className="sticky top-[44px] z-30 flex items-center justify-between bg-white dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800 px-2 py-2">
              <span className="text-xs font-bold text-gray-500">字幕全文</span>
              <button
                onClick={() => setShowFullSubtitles(false)}
                className="flex items-center gap-1 px-2 py-1 text-xs text-gray-500 hover:text-black transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="divide-y divide-amber-100 dark:divide-gray-800 bg-amber-50/40 dark:bg-gray-900/40">
              {coloredSubtitles.map((tokens, idx) => (
                <div
                  key={idx}
                  className="px-4 py-3 text-xl leading-loose font-serif text-gray-800 dark:text-gray-200"
                >
                  {tokens.map((t, tIdx) =>
                    t.mark >= 0 ? (
                      <span key={tIdx} className={MARK_STYLES[t.mark]}>{t.text}</span>
                    ) : (
                      <span key={tIdx}>{t.text}</span>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : (
        <div className="px-3 pb-6">
          <ImmersiveAccordion
          videoId={videoId}
          videoUrl={video_.video_url}
          isAudioContent={isAudioContent}
          subtitles={subtitles}
          currentVideoTime={currentVideoTime}
          displayMode={displayMode}
          onSubtitleClick={onSubtitleClick}
          onSeekTo={(time) => { onSeekTo(time); onSeekTrigger() }}
          onPlaySegment={onPlaySegment}
          onHighlightClick={onHighlightClick}
          onPauseMainVideo={onPauseMainVideo}
          onResumeMainVideo={onResumeMainVideo}
          words={cards.words}
          expressions={cards.expressions}
          videoLanguage={video_.language as any}
          getCardStatus={getCardStatus as any}
          onCardStatusChange={onCardStatusChange as any}
          grammarPoints={grammar_points}
          pronunciationTips={pronunciation_tips}
          vocabularyNetwork={vocabulary_network}
          fillBlankExercises={exercises.filter(e => e.exercise_type === 'fill_blank') as any}
          multipleChoiceExercises={exercises.filter(e => e.exercise_type === 'multiple_choice') as any}
          translationExercises={exercises.filter(e => e.exercise_type === 'translation') as any}
          grammarDrillExercises={exercises.filter(e => e.exercise_type === 'grammar_drill') as any}
          sentencePatternExercises={exercises.filter(e => e.exercise_type === 'sentence_pattern') as any}
          scenarioExercises={exercises.filter(e => e.exercise_type === 'scenario') as any}
          exerciseProgressMap={exerciseProgressMap}
          onRecordExerciseAnswer={onRecordExerciseAnswer}
          shadowReadingSubtitles={shadowReadingSubtitles}
          onJumpToSubtitle={(time) => { onSeekTo(time); onSeekTrigger() }}
          closedSections={closedSections}
          onToggleSection={toggleSection}
          mainVideoRef={mainVideoRef}
          mainAudioRef={mainAudioRef}
          onHideSubtitle={() => setSubtitleVisible(false)}
          onShowSubtitle={() => setSubtitleVisible(true)}
        />
      </div>
        )}

      {/* Card popover */}
      {selectedCard && (
        <CardPopover
          card={selectedCard.card}
          cardType={selectedCard.type}
          videoLanguage={(video_.language as any) || 'fr'}
          onClose={onSelectedCardClose}
          position={selectedCard.position}
        />
      )}
      </div>
    </div>
  )
}
