'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { ImmersiveSection } from './ImmersiveSection'
import { InlineShadowReading } from './InlineShadowReading'
import { SummaryReviewSection } from './SummaryReviewSection'
import { GrammarPointsTab } from '@/components/video/learning/GrammarPointsTab'
import { PronunciationTipsTab } from '@/components/video/learning/PronunciationTipsTab'
import { VocabularyNetworkTab } from '@/components/video/learning/VocabularyNetworkTab'
import { ExpressionsTab } from '@/components/video/learning/LearningTabs'
import { useTTSPreload } from '@/hooks/useTTSPreload'
import { FillBlankExercise } from '@/components/video/exercises/FillBlankExercise'
import { MultipleChoiceExercise } from '@/components/video/exercises/MultipleChoiceExercise'
import { TranslationExercise } from '@/components/video/exercises/TranslationExercise'
import { GrammarDrillExercise } from '@/components/video/exercises/GrammarDrillExercise'
import { SentencePatternCards } from '@/components/video/exercises/SentencePatternCards'
import { ScenarioCard } from '@/components/video/exercises/ScenarioCard'
import { useImmersiveProgress, type ImmersivePhase } from '@/hooks/useImmersiveProgress'
import type {
  SubtitleWithHighlights, CardType, CardStatus, VideoLanguage,
  VideoWordCard, VideoExpressionCard, VideoGrammarPoint,
  VideoPronunciationTip, VideoVocabularyNetwork, WordCardExample,
} from '@/types/video'
import {
  Play, Pause, RotateCcw, Check, X, MapPin, Volume2,
  BookMarked, MessageSquare, Volume1, Network, Hand,
} from 'lucide-react'

interface ImmersiveAccordionProps {
  videoId: string
  videoUrl: string | null
  isAudioContent: boolean
  subtitles: SubtitleWithHighlights[]
  currentVideoTime: number
  displayMode: 'bilingual' | 'original' | 'chinese'

  onSubtitleClick: (startTime: number) => void
  onSeekTo: (time: number) => void
  onPlaySegment: (startTime: number, endTime: number) => void
  onHighlightClick: (cardType: CardType, cardId: string, event: React.MouseEvent) => void
  onPauseMainVideo: () => void
  onResumeMainVideo: () => void

  words: VideoWordCard[]
  expressions: VideoExpressionCard[]
  videoLanguage?: VideoLanguage
  getCardStatus: (cardType: 'word' | 'expression', cardId: string) => CardStatus | undefined
  onCardStatusChange: (cardType: 'word' | 'expression', cardId: string, status: CardStatus) => Promise<void>

  grammarPoints: VideoGrammarPoint[]
  pronunciationTips: VideoPronunciationTip[]
  vocabularyNetwork: VideoVocabularyNetwork | null

  fillBlankExercises: Array<Record<string, unknown>>
  multipleChoiceExercises: Array<Record<string, unknown>>
  translationExercises: Array<Record<string, unknown>>
  grammarDrillExercises: Array<Record<string, unknown>>
  sentencePatternExercises: Array<Record<string, unknown>>
  scenarioExercises: Array<Record<string, unknown>>
  exerciseProgressMap: Map<string, { isCorrect: boolean; attempts: number }> | null
  onRecordExerciseAnswer: (exerciseId: string, isCorrect: boolean) => void

  shadowReadingSubtitles: SubtitleWithHighlights[]
  onJumpToSubtitle: (time: number) => void

  closedSections: Set<number>
  onToggleSection: (index: number) => void
  mainVideoRef: React.RefObject<HTMLVideoElement | null>
  mainAudioRef: React.RefObject<HTMLAudioElement | null>
  onHideSubtitle: () => void
  onShowSubtitle: () => void
}

interface PhaseConfig {
  phase: ImmersivePhase
  title: string
  subtitle: string
}

const PHASES: PhaseConfig[] = [
  { phase: 'phase1_blindListen', title: '盲听', subtitle: '不看字幕先听一遍，激活你的语感' },
  { phase: 'phase2_intensiveListen', title: '精听', subtitle: '带字幕逐句对照，找到你听漏的地方' },
  { phase: 'phase3_vocabulary', title: '本期生词', subtitle: '扫清生词障碍，为后续学习打基础' },
  { phase: 'phase4_shadowReading', title: '跟读', subtitle: '开口跟读训练，听力口语一起提升' },
  { phase: 'phase5_grammar', title: '语法&知识点', subtitle: '理解语法规则，举一反三' },
  { phase: 'phase6_exercises', title: '练习', subtitle: '趁热打铁，用练习巩固记忆' },
  { phase: 'phase7_summary', title: '总结回顾', subtitle: '回顾薄弱项，不让今天的错误留到明天' },
]

export function ImmersiveAccordion(props: ImmersiveAccordionProps) {
  const { progress, markPhaseComplete } = useImmersiveProgress(props.videoId)

  return (
    <div>
      {PHASES.map((config, index) => {
        const isOpen = !props.closedSections.has(index)
        const isCompleted = progress[config.phase]

        return (
          <ImmersiveSection
            key={config.phase}
            index={index + 1}
            title={config.title}
            subtitle={config.subtitle}
            isOpen={isOpen}
            isCompleted={isCompleted}
            isLast={index === PHASES.length - 1}
            onToggle={() => props.onToggleSection(index)}
          >
            <PhaseContent
              index={index}
              isCompleted={isCompleted}
              markPhaseComplete={markPhaseComplete}
              {...props}
            />
          </ImmersiveSection>
        )
      })}
    </div>
  )
}

/* ===== Media controls — always resolve ref at call time ===== */
function useMediaControls(
  mainVideoRef: React.RefObject<HTMLVideoElement | null>,
  mainAudioRef: React.RefObject<HTMLAudioElement | null>,
  isAudioContent: boolean
) {
  const [isPlaying, setIsPlaying] = useState(false)

  const getEl = useCallback(() =>
    isAudioContent ? mainAudioRef.current : mainVideoRef.current
  , [isAudioContent, mainVideoRef, mainAudioRef])

  // Poll play state periodically (lightweight, avoids stale event listener issue)
  useEffect(() => {
    const id = setInterval(() => {
      const el = getEl()
      if (el) setIsPlaying(!el.paused)
    }, 500)
    return () => clearInterval(id)
  }, [getEl])

  const togglePlay = useCallback(() => {
    const el = getEl()
    if (!el) return
    if (el.paused) {
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [getEl])

  const restart = useCallback(() => {
    const el = getEl()
    if (!el) return
    el.currentTime = 0
    el.play().catch(() => {})
  }, [getEl])

  return { isPlaying, togglePlay, restart }
}

/* ===== Compact word cards — 2 columns, click to open detail popover ===== */
function CompactWordCards({
  words,
  getCardStatus,
  onCardStatusChange,
  onPlaySegment,
}: {
  words: VideoWordCard[]
  getCardStatus: (cardType: 'word', cardId: string) => CardStatus | undefined
  onCardStatusChange: (cardType: 'word', cardId: string, status: CardStatus) => Promise<void>
  onPlaySegment: (startTime: number, endTime: number) => void
}) {
  const [activeWord, setActiveWord] = useState<VideoWordCard | null>(null)
  const [popoverPos, setPopoverPos] = useState<{ x: number; y: number } | null>(null)

  const handleWordClick = useCallback((word: VideoWordCard, e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setPopoverPos({ x: rect.left, y: rect.bottom + 4 })
    setActiveWord(word)
  }, [])

  const handleClose = useCallback(() => {
    setActiveWord(null)
    setPopoverPos(null)
  }, [])

  return (
    <>
      <div className="grid grid-cols-2 gap-1.5">
        {words.map(word => {
          const status = getCardStatus('word', word.id)
          const statusColor = status === 'known'
            ? 'border-green-300 bg-green-50'
            : status === 'learning'
              ? 'border-yellow-300 bg-yellow-50'
              : 'border-red-300 bg-red-50'
          return (
            <button
              key={word.id}
              onClick={(e) => handleWordClick(word, e)}
              className={`text-left p-2 rounded border ${statusColor} transition-colors active:scale-[0.98]`}
            >
              <div className="flex items-center gap-1">
                <span className="text-[12px] font-black text-black dark:text-white">{word.word}</span>
                {word.phonetic && (
                  <span className="text-[9px] text-gray-400">[{word.phonetic}]</span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-1">
                {word.chinese_definition}
              </p>
            </button>
          )
        })}
      </div>

      {/* Word detail popover */}
      {activeWord && (
        <WordDetailPopover
          word={activeWord}
          status={getCardStatus('word', activeWord.id)}
          onStatusChange={(status) => onCardStatusChange('word', activeWord.id, status)}
          onClose={handleClose}
          position={popoverPos}
          onPlaySegment={onPlaySegment}
        />
      )}
    </>
  )
}

/* ===== Word detail popover with full info + status buttons ===== */
const STATUS_LABELS: Record<CardStatus, { label: string; color: string; activeColor: string }> = {
  unknown: { label: '不认识', color: 'border-red-300 bg-white text-red-600', activeColor: 'bg-red-500 text-white border-red-600' },
  learning: { label: '学习中', color: 'border-yellow-300 bg-white text-yellow-700', activeColor: 'bg-yellow-400 text-black border-yellow-500' },
  known: { label: '认识', color: 'border-green-300 bg-white text-green-700', activeColor: 'bg-green-500 text-white border-green-600' },
}

function WordDetailPopover({
  word,
  status,
  onStatusChange,
  onClose,
  position,
  onPlaySegment,
}: {
  word: VideoWordCard
  status: CardStatus | undefined
  onStatusChange: (status: CardStatus) => void
  onClose: () => void
  position: { x: number; y: number } | null
  onPlaySegment: (startTime: number, endTime: number) => void
}) {
  const currentStatus = status || 'unknown'

  const getPopoverStyle = (): React.CSSProperties => {
    if (!position) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const POPOVER_WIDTH = 320
    const POPOVER_MAX_HEIGHT = 400
    const PADDING = 16

    let left = position.x
    let top = position.y

    if (left + POPOVER_WIDTH + PADDING > window.innerWidth) {
      left = window.innerWidth - POPOVER_WIDTH - PADDING
    }
    if (left < PADDING) {
      left = PADDING
    }
    if (top + POPOVER_MAX_HEIGHT + PADDING > window.innerHeight) {
      top = Math.max(PADDING, window.innerHeight - POPOVER_MAX_HEIGHT - PADDING)
    }

    return { top: `${top}px`, left: `${left}px` }
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        className="fixed z-50 w-80 max-h-[70vh] bg-white dark:bg-gray-800 rounded-lg shadow-xl border-2 border-black dark:border-gray-600 overflow-hidden"
        style={getPopoverStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium px-2 py-0.5 rounded bg-blue-100 text-blue-700">单词</span>
            {word.cefr_level && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-700">{word.cefr_level}</span>
            )}
            {word.gender && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-pink-100 text-pink-700">{word.gender === 'm' ? '阳性' : '阴性'}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 overflow-y-auto max-h-[50vh] space-y-2.5">
          {/* Word + phonetic + POS */}
          <div>
            <h3 className="text-lg font-bold">{word.word}</h3>
            <div className="flex items-center gap-2 flex-wrap mt-0.5">
              {word.phonetic && (
                <span className="text-sm text-gray-500 font-mono">[{word.phonetic}]</span>
              )}
              {word.part_of_speech && (
                <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 rounded">{word.part_of_speech}</span>
              )}
            </div>
          </div>

          {/* Chinese definition */}
          <p className="font-medium text-sm">{word.chinese_definition}</p>

          {/* Multiple definitions (if available) */}
          {word.definitions && word.definitions.length > 0 && (
            <div className="space-y-0.5">
              {word.definitions.map((def, i) => (
                <p key={i} className="text-xs text-gray-600 flex items-start gap-1">
                  <span className="text-gray-400 flex-shrink-0">{i + 1}.</span>
                  {def}
                </p>
              ))}
            </div>
          )}

          {/* Video example */}
          {word.example_from_video && (
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
              <div className="flex items-center gap-1 mb-1">
                <MapPin className="w-3 h-3 text-blue-500" />
                <span className="text-[10px] text-blue-600 font-bold">视频例句</span>
              </div>
              <p>{word.example_from_video}</p>
              {word.example_translation && (
                <p className="text-gray-500 mt-0.5 text-xs">{word.example_translation}</p>
              )}
              <button
                onClick={() => onPlaySegment(word.subtitle_start_time, word.subtitle_end_time)}
                className="mt-1.5 flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 font-bold"
              >
                <Volume2 className="w-3 h-3" /> 播放这句
              </button>
            </div>
          )}

          {/* Dictionary examples */}
          {word.examples && word.examples.length > 0 && (
            <div>
              <span className="text-[10px] text-gray-400 font-bold">例句</span>
              <div className="mt-1 space-y-1">
                {word.examples.slice(0, 3).map((ex: WordCardExample, i: number) => (
                  <div key={i} className="p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded text-xs">
                    {ex.fr && <p>{ex.fr}</p>}
                    {ex.en && <p>{ex.en}</p>}
                    <p className="text-gray-500 mt-0.5">{ex.zh}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collocation */}
          {word.collocation && (
            <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded text-sm">
              <span className="text-[10px] text-amber-600 font-bold">搭配</span>
              <p className="mt-0.5">{word.collocation}</p>
              {word.collocation_cn && (
                <p className="text-gray-500 text-xs mt-0.5">{word.collocation_cn}</p>
              )}
            </div>
          )}
        </div>

        {/* Status buttons footer */}
        <div className="border-t dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900 flex gap-1.5">
          {(['unknown', 'learning', 'known'] as CardStatus[]).map(s => {
            const cfg = STATUS_LABELS[s]
            const isActive = currentStatus === s
            return (
              <button
                key={s}
                onClick={() => onStatusChange(s)}
                className={`flex-1 px-2 py-1.5 text-[10px] font-black rounded border-2 transition-all ${isActive ? cfg.activeColor : cfg.color}`}
              >
                {cfg.label}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}

/* ===== Phase content ===== */
function PhaseContent({
  index,
  isCompleted,
  markPhaseComplete,
  ...props
}: ImmersiveAccordionProps & {
  index: number
  isCompleted: boolean
  markPhaseComplete: (phase: ImmersivePhase) => void
}) {
  const { isPlaying, togglePlay, restart } = useMediaControls(
    props.mainVideoRef, props.mainAudioRef, props.isAudioContent
  )

  switch (index) {
    case 0: // 盲听 — 播放时隐藏字幕
      return (
        <BlindListenPhase
          isCompleted={isCompleted}
          isPlaying={isPlaying}
          onTogglePlay={() => { togglePlay(); props.onHideSubtitle() }}
          onRestart={() => { restart(); props.onHideSubtitle() }}
          onComplete={() => markPhaseComplete('phase1_blindListen')}
          isAudioContent={props.isAudioContent}
          mainVideoRef={props.mainVideoRef}
          mainAudioRef={props.mainAudioRef}
        />
      )

    case 1: // 精听 — 播放时恢复字幕
      return (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => { togglePlay(); props.onShowSubtitle() }}
              className="flex items-center gap-1 px-2 py-1 text-[10px] font-black bg-[#B4F416] text-black border border-black shadow-[2px_2px_0px_0px_#000] transition-all"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
              {isPlaying ? '暂停' : '播放'}
            </button>
          </div>
          <p className="text-[11px] text-gray-500 leading-relaxed">
            现在打开字幕重新听一遍，逐句对比你刚才听懂了多少。关注连读、弱读和生词发音——每一次发现「原来这里说的是这个」都是进步。
          </p>
        </div>
      )

    case 2: // 本期单词 — 2列卡片 + 点击弹层
      return (
        <>
          {props.words.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-3">暂无生词</p>
          ) : (
            <CompactWordCards
              words={props.words}
              getCardStatus={props.getCardStatus}
              onCardStatusChange={props.onCardStatusChange}
              onPlaySegment={props.onPlaySegment}
            />
          )}
        </>
      )

    case 3: // 跟读
      return (
        <InlineShadowReading
          videoId={props.videoId}
          videoUrl={props.videoUrl}
          subtitles={props.shadowReadingSubtitles}
          isAudio={props.isAudioContent}
          onPauseMainVideo={props.onPauseMainVideo}
          onResumeMainVideo={props.onResumeMainVideo}
          onComplete={() => markPhaseComplete('phase4_shadowReading')}
        />
      )

    case 4: // 语法&知识点 — 子模块平铺
      return <KnowledgeFlatLayout {...props} />

    case 5: // 练习 — 各组件自带标题，不包 NoteCard 避免重复
      return (
        <div className="space-y-3" data-immersive="light">
          <FillBlankExercise exercises={props.fillBlankExercises as any} progressMap={props.exerciseProgressMap} onRecordAnswer={props.onRecordExerciseAnswer} onPlaySegment={props.onPlaySegment} />
          <MultipleChoiceExercise exercises={props.multipleChoiceExercises as any} progressMap={props.exerciseProgressMap} onRecordAnswer={props.onRecordExerciseAnswer} />
          <TranslationExercise exercises={props.translationExercises as any} progressMap={props.exerciseProgressMap} onRecordAnswer={props.onRecordExerciseAnswer} />
          {props.grammarDrillExercises.length > 0 && (
            <GrammarDrillExercise exercises={props.grammarDrillExercises as any} progressMap={props.exerciseProgressMap} onRecordAnswer={props.onRecordExerciseAnswer} />
          )}
          {props.sentencePatternExercises.length > 0 && (
            <SentencePatternCards patterns={props.sentencePatternExercises as any} />
          )}
          {props.scenarioExercises.length > 0 && (
            <ScenarioCard scenarios={props.scenarioExercises as any} />
          )}
          {props.fillBlankExercises.length === 0 && props.multipleChoiceExercises.length === 0 && props.translationExercises.length === 0 && props.grammarDrillExercises.length === 0 && props.sentencePatternExercises.length === 0 && props.scenarioExercises.length === 0 && (
            <p className="text-center text-gray-400 py-3 text-xs">暂无练习题</p>
          )}
        </div>
      )

    case 6: // 总结
      return (
        <SummaryReviewSection
          words={props.words}
          expressions={props.expressions}
          getCardStatus={props.getCardStatus}
          exerciseProgressMap={props.exerciseProgressMap}
          fillBlankExercises={props.fillBlankExercises as any}
          multipleChoiceExercises={props.multipleChoiceExercises as any}
        />
      )

    default:
      return null
  }
}

/* ===== Knowledge flat layout — 轻量笔记风格 ===== */

/** 笔记模块标题 — 加重左边线 + 大标题 */
function NoteCard({ icon, title, count, children }: {
  icon: React.ReactNode
  title: string
  count?: number
  children: React.ReactNode
}) {
  return (
    <div className="border-l-4 border-gray-400 dark:border-gray-500 pl-3 py-1">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-gray-500">{icon}</span>
        <h3 className="text-base font-extrabold text-gray-900 dark:text-gray-100">{title}</h3>
        {count !== undefined && count > 0 && (
          <span className="text-[10px] text-gray-400 ml-0.5">{count}</span>
        )}
      </div>
      {children}
    </div>
  )
}

function KnowledgeFlatLayout(props: ImmersiveAccordionProps) {
  const ttsPreload = useTTSPreload(props.videoLanguage)
  const {
    expressions, words, grammarPoints, pronunciationTips, vocabularyNetwork,
    onJumpToSubtitle, onPlaySegment, getCardStatus, onCardStatusChange, videoLanguage,
  } = props

  const hasAny = grammarPoints.length > 0 || expressions.length > 0 || pronunciationTips.length > 0 || vocabularyNetwork

  if (!hasAny) {
    return <p className="text-center text-gray-400 py-3 text-xs">暂无语法知识点</p>
  }

  return (
    <div className="space-y-3" data-immersive="light">
      {grammarPoints.length > 0 && (
        <NoteCard icon={<BookMarked className="w-4 h-4" />} title="语法点" count={grammarPoints.length}>
          <GrammarPointsTab grammarPoints={grammarPoints} />
        </NoteCard>
      )}

      {expressions.length > 0 && (
        <NoteCard icon={<MessageSquare className="w-4 h-4" />} title="地道表达" count={expressions.length}>
          <ExpressionsTab
            expressions={expressions}
            onJumpToSubtitle={onJumpToSubtitle}
            onPlaySegment={onPlaySegment}
            getCardStatus={getCardStatus as any}
            onStatusChange={onCardStatusChange as any}
            showProgress={false}
          />
        </NoteCard>
      )}

      {pronunciationTips.length > 0 && (
        <NoteCard icon={<Volume1 className="w-4 h-4" />} title="发音要点" count={pronunciationTips.length}>
          <PronunciationTipsTab tips={pronunciationTips} ttsPreload={ttsPreload} />
        </NoteCard>
      )}

      {vocabularyNetwork && (
        <NoteCard icon={<Network className="w-4 h-4" />} title="词汇网络">
          <VocabularyNetworkTab
            network={vocabularyNetwork}
            wordCards={words}
            videoLanguage={videoLanguage}
            ttsPreload={ttsPreload}
          />
        </NoteCard>
      )}
    </div>
  )
}

/* ===== Blind Listen ===== */
function BlindListenPhase({
  isCompleted,
  isPlaying,
  onTogglePlay,
  onRestart,
  onComplete,
  isAudioContent,
  mainVideoRef,
  mainAudioRef,
}: {
  isCompleted: boolean
  isPlaying: boolean
  onTogglePlay: () => void
  onRestart: () => void
  onComplete: () => void
  isAudioContent: boolean
  mainVideoRef: React.RefObject<HTMLVideoElement | null>
  mainAudioRef: React.RefObject<HTMLAudioElement | null>
}) {
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [pos, setPos] = useState({ x: 50, y: 200 })
  const [size, setSize] = useState({ w: 300, h: 60 })
  const dragging = useRef(false)
  const resizing = useRef(false)
  const dragOff = useRef({ x: 0, y: 0 })

  // 获取播放器边界（视口坐标）
  const getPlayerBounds = useCallback(() => {
    const el = isAudioContent ? mainAudioRef.current : mainVideoRef.current
    if (!el) return { left: 0, top: 0, right: window.innerWidth, bottom: window.innerHeight }
    const rect = el.getBoundingClientRect()
    // 扩展底部覆盖字幕条区域
    return {
      left: rect.left,
      top: rect.top,
      right: rect.right,
      bottom: rect.bottom + 44,
    }
  }, [isAudioContent, mainVideoRef, mainAudioRef])

  const clampPos = useCallback((x: number, y: number, w: number, h: number) => {
    const b = getPlayerBounds()
    return {
      x: Math.max(b.left, Math.min(x, b.right - w)),
      y: Math.max(b.top, Math.min(y, b.bottom - h)),
    }
  }, [getPlayerBounds])

  const clampSize = useCallback((w: number, h: number) => {
    const b = getPlayerBounds()
    return {
      w: Math.max(120, Math.min(w, b.right - pos.x)),
      h: Math.max(36, Math.min(h, b.bottom - pos.y)),
    }
  }, [getPlayerBounds, pos])

  const onDragStart = useCallback((e: React.PointerEvent) => {
    if (resizing.current) return
    dragging.current = true
    dragOff.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [pos])

  const onDragMove = useCallback((e: React.PointerEvent) => {
    if (dragging.current) {
      const raw = { x: e.clientX - dragOff.current.x, y: e.clientY - dragOff.current.y }
      setPos(clampPos(raw.x, raw.y, size.w, size.h))
    }
    if (resizing.current) {
      setSize(prev => {
        const next = clampSize(prev.w + e.movementX, prev.h + e.movementY)
        return { w: Math.max(120, next.w), h: Math.max(36, next.h) }
      })
    }
  }, [clampPos, clampSize, size.w, size.h])

  const onDragEnd = useCallback(() => {
    dragging.current = false
    resizing.current = false
  }, [])

  const onResizeStart = useCallback((e: React.PointerEvent) => {
    e.stopPropagation()
    resizing.current = true
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [])

  return (
    <div className="space-y-2">
      <p className="text-[11px] text-gray-500 leading-relaxed">第一遍不看字幕纯听，就像真实对话一样。你的大脑会主动捕捉关键词、感受语调节奏，这是建立听力直觉最有效的方式。</p>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={onTogglePlay} className="flex items-center gap-1 px-2.5 py-1 text-[10px] font-black bg-[#B4F416] text-black border border-black shadow-[2px_2px_0px_0px_#000] transition-all">
          {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
          {isPlaying ? '暂停' : '播放'}
        </button>
        <button onClick={onRestart} className="flex items-center gap-1 px-2 py-1 text-[10px] font-black bg-white text-gray-600 border border-black shadow-[2px_2px_0px_0px_#000] transition-all">
          <RotateCcw className="w-3 h-3" /> 重播
        </button>
        {!isAudioContent && (
          <button onClick={() => setOverlayVisible(v => !v)} className={`flex items-center gap-1 px-2 py-1 text-[10px] font-black border border-black shadow-[2px_2px_0px_0px_#000] transition-all ${overlayVisible ? 'bg-gray-800 text-white' : 'bg-white text-gray-600'}`}>
            {overlayVisible ? '隐藏遮罩' : '遮挡字幕'}
          </button>
        )}
        <div className="flex-1" />
        {isCompleted ? (
          <span className="flex items-center gap-1 text-green-600 text-[10px] font-bold"><Check className="w-3 h-3" /> 已完成</span>
        ) : (
          <button onClick={onComplete} className="px-2.5 py-1 text-[10px] font-black bg-white text-gray-500 border border-gray-300 transition-all hover:bg-gray-100">
            我听完了
          </button>
        )}
      </div>

      {overlayVisible && (
        <p className="text-[10px] text-gray-400">↕ 拖动遮罩移动 · ↘ 拖右下角缩放</p>
      )}

      {overlayVisible && (
        <div
          onPointerDown={onDragStart}
          onPointerMove={onDragMove}
          onPointerUp={onDragEnd}
          className="fixed z-[60] touch-none select-none"
          style={{ left: pos.x, top: pos.y, width: size.w, height: size.h }}
        >
          <div className="w-full h-full bg-black rounded-lg border-2 border-gray-400 cursor-grab active:cursor-grabbing flex items-center justify-center gap-2 overflow-hidden">
            {/* 移动图标 + 脉冲动画 */}
            <div className="relative select-none pointer-events-none">
              <Hand className="w-4 h-4 text-gray-300" />
              <div className="absolute inset-0 animate-ping">
                <Hand className="w-4 h-4 text-gray-300/40" />
              </div>
            </div>
            <span className="text-[10px] text-gray-400 font-bold select-none pointer-events-none">拖动挡住视频原字幕</span>
          </div>
          {/* 右下角 resize 手柄 — 三条斜线 */}
          <div
            onPointerDown={onResizeStart}
            className="absolute bottom-0 right-0 w-8 h-8 cursor-se-resize flex items-center justify-center"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="text-gray-400">
              <line x1="14" y1="2" x2="2" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14" y1="7" x2="7" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <line x1="14" y1="12" x2="12" y2="14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>
        </div>
      )}
    </div>
  )
}
