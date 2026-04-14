'use client'

/**
 * 学习模块 Tab 容器组件 (移动端)
 *
 * 对应 PRD: VIDEO_BATCH_UPLOAD_PRD.md Section 5
 *
 * 功能:
 * - 显示学习内容 Tab 切换
 * - 包含单词、地道表达、语法点、发音要点、词汇网络等 Tab
 * - 三态按钮：[不认识] [模糊] [认识]
 * - 学习进度追踪
 *
 * 设计风格: Neo-brutalism - 与 Speaker 模块保持一致
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { BookOpen, MessageSquare, BookMarked, Volume2, Network, MapPin, Play, Loader2 } from 'lucide-react'
import type {
  VideoWordCard,
  VideoExpressionCard,
  VideoGrammarPoint,
  VideoPronunciationTip,
  VideoVocabularyNetwork,
  CardStatus,
  VideoLanguage,
} from '@/types/video'
import { GrammarPointsTab } from './GrammarPointsTab'
import { PronunciationTipsTab } from './PronunciationTipsTab'
import { VocabularyNetworkTab } from './VocabularyNetworkTab'
import { useTTSPreload } from '@/hooks/useTTSPreload'
import type { TTSPreloadInstance } from '@/hooks/useTTSPreload'

// ============================================
// 类型定义
// ============================================

export interface LearningTabsProps {
  words: VideoWordCard[]
  expressions: VideoExpressionCard[]
  grammarPoints: VideoGrammarPoint[]
  pronunciationTips: VideoPronunciationTip[]
  vocabularyNetwork: VideoVocabularyNetwork | null
  videoLanguage?: VideoLanguage // 视频语言，用于 TTS
  onJumpToSubtitle?: (time: number) => void
  onPlaySegment?: (startTime: number, endTime: number) => void
  getCardStatus?: (cardType: 'word' | 'expression', cardId: string) => CardStatus | undefined
  onStatusChange?: (cardType: 'word' | 'expression', cardId: string, status: CardStatus) => Promise<void>
}

type TabKey = 'words' | 'expressions' | 'grammar' | 'pronunciation' | 'network'

interface TabConfig {
  key: TabKey
  label: string
  icon: React.ReactNode
  count?: number
}

// ============================================
// 常量 - 状态配置 (与 LearningModal 保持一致)
// ============================================

const STATUS_CONFIG: Record<CardStatus, {
  label: string
  activeClass: string
}> = {
  unknown: {
    label: '不认识',
    activeClass: 'bg-red-400 text-black border-black',
  },
  learning: {
    label: '模糊',
    activeClass: 'bg-yellow-400 text-black border-black',
  },
  known: {
    label: '认识',
    activeClass: 'bg-[#B4F416] text-black border-black',
  },
}

// ============================================
// 组件
// ============================================

export function LearningTabs({
  words = [],
  expressions = [],
  grammarPoints = [],
  pronunciationTips = [],
  vocabularyNetwork = null,
  videoLanguage,
  onJumpToSubtitle,
  onPlaySegment,
  getCardStatus,
  onStatusChange
}: LearningTabsProps) {
  // 计算初始标签页：选择第一个有数据的标签页
  const getInitialTab = (): TabKey => {
    const tabOrder: TabKey[] = ['words', 'expressions', 'grammar', 'pronunciation', 'network']
    const tabData = {
      words: words.length,
      expressions: expressions.length,
      grammar: grammarPoints.length,
      pronunciation: pronunciationTips.length,
      network: vocabularyNetwork ? 1 : 0
    }

    // 找到第一个有数据的标签页
    for (const tab of tabOrder) {
      if (tabData[tab] > 0) {
        return tab
      }
    }

    return 'words' // 默认回退
  }

  const [activeTab, setActiveTab] = useState<TabKey>(getInitialTab)
  const [localStatusMap, setLocalStatusMap] = useState<Map<string, CardStatus>>(new Map())
  const containerRef = useRef<HTMLDivElement>(null)
  const ttsPreload = useTTSPreload(videoLanguage)

  // 监听数据变化，如果当前标签页为空则切换到第一个有数据的标签页
  useEffect(() => {
    const tabData = {
      words: words.length,
      expressions: expressions.length,
      grammar: grammarPoints.length,
      pronunciation: pronunciationTips.length,
      network: vocabularyNetwork ? 1 : 0
    }

    if (tabData[activeTab] === 0) {
      const newTab = getInitialTab()
      if (newTab !== activeTab) {
        setActiveTab(newTab)
      }
    }
  }, [words.length, expressions.length, grammarPoints.length, pronunciationTips.length, vocabularyNetwork, activeTab])

  // Tab 切换时滚动到顶部
  const handleTabSwitch = useCallback((tabKey: TabKey) => {
    setActiveTab(tabKey)

    // 延迟执行，确保 DOM 更新后再滚动
    requestAnimationFrame(() => {
      if (!containerRef.current) return

      // 向上查找可滚动的父元素
      let parent: HTMLElement | null = containerRef.current.parentElement
      while (parent) {
        const style = window.getComputedStyle(parent)
        const overflowY = style.overflowY
        if (overflowY === 'auto' || overflowY === 'scroll') {
          parent.scrollTop = 0
          break
        }
        parent = parent.parentElement
      }

      // 同时尝试滚动 window
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }, [])

  // 获取卡片状态（优先本地状态，其次远程状态）
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
          console.error('[LearningTabs] Update error:', error)
          throw error
        }
      }
    },
    [getCardStatus, onStatusChange, localStatusMap]
  )

  // 计算学习进度
  const learnedCount = words.filter(word => {
    const status = getCardStatusLocal('word', word.id)
    return status === 'known' || status === 'learning'
  }).length

  const tabs = [
    { key: 'expressions' as const, label: '地道表达', icon: <MessageSquare className="w-4 h-4" />, count: expressions.length },
    { key: 'words' as const, label: '单词', icon: <BookOpen className="w-4 h-4" />, count: words.length },
    { key: 'grammar' as const, label: '语法点', icon: <BookMarked className="w-4 h-4" />, count: grammarPoints.length },
    { key: 'pronunciation' as const, label: '发音要点', icon: <Volume2 className="w-4 h-4" />, count: pronunciationTips.length },
    { key: 'network' as const, label: '词汇网络', icon: <Network className="w-4 h-4" />, count: vocabularyNetwork ? 1 : 0 },
  ].filter((tab) => tab.count > 0) as TabConfig[] // 隐藏没有数据的 Tab

  // 渲染 Tab 内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'words':
        return (
          <WordsTab
            words={words}
            videoLanguage={videoLanguage}
            ttsPreload={ttsPreload}
            onJumpToSubtitle={onJumpToSubtitle}
            getCardStatus={getCardStatusLocal}
            onStatusChange={handleStatusChange}
          />
        )
      case 'expressions':
        return (
          <ExpressionsTab
            expressions={expressions}
            onJumpToSubtitle={onJumpToSubtitle}
            onPlaySegment={onPlaySegment}
            getCardStatus={getCardStatusLocal}
            onStatusChange={handleStatusChange}
          />
        )
      case 'grammar':
        return <GrammarPointsTab grammarPoints={grammarPoints} />
      case 'pronunciation':
        return <PronunciationTipsTab tips={pronunciationTips} ttsPreload={ttsPreload} />
      case 'network':
        return <VocabularyNetworkTab network={vocabularyNetwork} videoLanguage={videoLanguage} ttsPreload={ttsPreload} />
      default:
        return null
    }
  }

  return (
    <div ref={containerRef} className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 rounded-sm transition-colors duration-300">
      {/* Tab 头部 - sticky 吸顶，滚动时不被遮挡 */}
      {/* touch-action: pan-x 防止安卓全屏时纵向滚动容器吃掉横向滑动手势 */}
      <div className="sticky top-0 z-10 flex border-b-[3px] border-black dark:border-gray-600 overflow-x-auto overscroll-contain rounded-t-sm bg-white dark:bg-gray-800" style={{ touchAction: 'pan-x' }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleTabSwitch(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition-all border-r-[2px] border-black dark:border-gray-600 last:border-r-0",
              activeTab === tab.key
                ? "bg-[#B4F416] text-black"
                : "bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
            )}
          >
            {tab.icon}
            <span>{tab.label}</span>
            {tab.count !== undefined && tab.count > 0 && (
              <span className={cn(
                "px-1.5 py-0.5 text-xs font-black border-[2px]",
                activeTab === tab.key
                  ? "bg-white border-black"
                  : "bg-gray-200 dark:bg-gray-600 border-gray-400 dark:border-gray-500"
              )}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab 内容 */}
      <div className="p-3">
        {renderTabContent()}
      </div>
    </div>
  )
}

// ============================================
// 三态按钮组件 - Neo-brutalism
// ============================================

interface ThreeStateButtonsProps {
  currentStatus?: CardStatus
  onChange: (status: CardStatus) => void
}

function ThreeStateButtons({ currentStatus, onChange }: ThreeStateButtonsProps) {
  const statuses: CardStatus[] = ['unknown', 'learning', 'known']

  return (
    <div className="flex items-center gap-2 mt-3 pt-3 border-t-[2px] border-gray-200 dark:border-gray-600">
      {statuses.map((status) => {
        const config = STATUS_CONFIG[status]
        const isActive = currentStatus === status

        return (
          <button
            key={status}
            onClick={() => onChange(status)}
            className={cn(
              "flex-1 py-2 px-2 text-xs font-black border-[2px] border-black dark:border-gray-500 transition-all duration-150",
              isActive
                ? config.activeClass + " shadow-[2px_2px_0px_0px_#000]"
                : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-600"
            )}
          >
            {config.label}
          </button>
        )
      })}
    </div>
  )
}

// ============================================
// 进度条组件 - Neo-brutalism
// ============================================

interface ProgressProps {
  learned: number
  total: number
}

function Progress({ learned, total }: ProgressProps) {
  const percentage = total > 0 ? Math.round((learned / total) * 100) : 0

  return (
    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700/50 border-[2px] border-black dark:border-gray-600 rounded-sm transition-colors duration-300">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-black text-gray-700 dark:text-gray-300">
          学习进度
        </span>
        <span className="text-xs font-black text-black dark:text-white">
          {learned}/{total} (<span className="text-[#B4F416]">{percentage}%</span>)
        </span>
      </div>
      <div className="h-2 bg-gray-200 dark:bg-gray-600 border-[2px] border-gray-300 dark:border-gray-500">
        <div
          className="h-full bg-[#B4F416] transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  )
}

// ============================================
// 单词 Tab - Neo-brutalism
// ============================================

interface WordsTabProps {
  words: VideoWordCard[]
  videoLanguage?: string
  ttsPreload: TTSPreloadInstance
  onJumpToSubtitle?: (time: number) => void
  onPlaySegment?: (startTime: number, endTime: number) => void
  getCardStatus?: (cardType: 'word', cardId: string) => CardStatus | undefined
  onStatusChange?: (cardType: 'word', cardId: string, status: CardStatus) => Promise<void>
}

export function WordsTab({ words, videoLanguage, ttsPreload, onJumpToSubtitle, onPlaySegment, getCardStatus, onStatusChange }: WordsTabProps) {
  const [playingWord, setPlayingWord] = useState<string | null>(null)
  const [expandedDefinitions, setExpandedDefinitions] = useState<Set<string>>(new Set())
  const [expandedExamples, setExpandedExamples] = useState<Set<string>>(new Set())

  // 组件挂载时预加载所有单词
  useEffect(() => {
    if (words.length === 0) return
    const timer = setTimeout(() => {
      ttsPreload.preloadWords(words.map((w) => w.word))
    }, 500)
    return () => clearTimeout(timer)
  }, [words, ttsPreload])

  // 播放单词发音
  const playWord = useCallback(async (word: string) => {
    if (playingWord) {
      setPlayingWord(null)
      return
    }

    setPlayingWord(word)
    await ttsPreload.play(word)
    setPlayingWord(null)
  }, [playingWord, ttsPreload])

  const toggleDefinitions = useCallback((wordId: string) => {
    setExpandedDefinitions(prev => {
      const next = new Set(prev)
      if (next.has(wordId)) {
        next.delete(wordId)
      } else {
        next.add(wordId)
      }
      return next
    })
  }, [])

  const toggleExamples = useCallback((wordId: string) => {
    setExpandedExamples(prev => {
      const next = new Set(prev)
      if (next.has(wordId)) {
        next.delete(wordId)
      } else {
        next.add(wordId)
      }
      return next
    })
  }, [])

  const learnedCount = words.filter(word => {
    const status = getCardStatus?.('word', word.id)
    return status === 'known' || status === 'learning'
  }).length

  if (words.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <BookOpen className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-bold">暂无单词卡片</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {words.map((word) => {
        const status = getCardStatus?.('word', word.id)
        const isPlaying = playingWord === word.word
        const showAllDefinitions = expandedDefinitions.has(word.id)
        const showAllExamples = expandedExamples.has(word.id)

        // 获取性别显示配置（法语特有）
        const getGenderConfig = (): { label: string; className: string } | null => {
          if (!word.gender) return null
          const gender = word.gender.toLowerCase()
          if (gender === 'm') {
            return { label: '阳性', className: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-blue-300 dark:border-blue-700' }
          }
          if (gender === 'f') {
            return { label: '阴性', className: 'bg-pink-100 dark:bg-pink-900/40 text-pink-700 dark:text-pink-300 border-pink-300 dark:border-pink-700' }
          }
          return null
        }

        // 获取 CEFR 等级配置
        const getCEFRConfig = (): { level: string; className: string } | null => {
          const level = word.cefr_level?.toUpperCase() || (word.difficulty_level ? `A${word.difficulty_level}` : null)
          if (!level) return null

          const configs: Record<string, string> = {
            'A1': 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 border-green-300 dark:border-green-700',
            'A2': 'bg-green-200 dark:bg-green-900/50 text-green-800 dark:text-green-200 border-green-400 dark:border-green-600',
            'B1': 'bg-yellow-100 dark:bg-yellow-900/40 text-yellow-700 dark:text-yellow-300 border-yellow-300 dark:border-yellow-700',
            'B2': 'bg-yellow-200 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200 border-yellow-400 dark:border-yellow-600',
            'C1': 'bg-orange-100 dark:bg-orange-900/40 text-orange-700 dark:text-orange-300 border-orange-300 dark:border-orange-700',
            'C2': 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 border-red-300 dark:border-red-700',
          }
          return { level, className: configs[level] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600' }
        }

        const genderConfig = getGenderConfig()
        const cefrConfig = getCEFRConfig()
        const hasMultipleDefinitions = (word.definitions?.length || 0) > 1
        const hasMultipleExamples = (word.examples?.length || 0) > 1

        return (
          <div
            key={word.id}
            className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] transition-all duration-150 hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-0.5"
          >
            {/* 头部 - 单词和音标 */}
            <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b-[2px] border-black dark:border-gray-600">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-base text-black dark:text-white">
                  {word.word}
                </span>
                {word.phonetic && (
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    [{word.phonetic}]
                  </span>
                )}
                {/* 性别徽章（法语名词） */}
                {genderConfig && (
                  <span className={cn("px-2 py-0.5 text-xs font-bold border-[2px] rounded", genderConfig.className)}>
                    {genderConfig.label}
                  </span>
                )}
                {word.part_of_speech && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-[2px] border-blue-300 dark:border-blue-700 text-xs font-bold rounded">
                    {word.part_of_speech}
                  </span>
                )}
                {/* CEFR 等级 */}
                {cefrConfig && (
                  <span className={cn("px-2 py-0.5 text-xs font-bold border-[2px] rounded", cefrConfig.className)}>
                    {cefrConfig.level}
                  </span>
                )}
              </div>
              {/* 播放按钮 — API 有音频才显示 */}
              {ttsPreload.isAvailable(word.word) && (
                <button
                  onClick={() => playWord(word.word)}
                  className={cn(
                    "p-1.5 border-[2px] border-black dark:border-gray-500 transition-all duration-150",
                    isPlaying
                      ? "bg-[#B4F416] text-black"
                      : "bg-white dark:bg-gray-600 hover:bg-[#B4F416] hover:text-black"
                  )}
                  title="播放发音"
                >
                  {isPlaying ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Volume2 className="w-4 h-4" />
                  )}
                </button>
              )}
            </div>

            {/* 内容 */}
            <div className="p-3">
              {/* 释义 - 多条释义可展开 */}
              {word.definitions && word.definitions.length > 0 ? (
                <div className="mb-2">
                  {(showAllDefinitions ? word.definitions : word.definitions.slice(0, 1)).map((def, idx) => (
                    <p key={idx} className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                      {word.definitions!.length > 1 && <span className="text-gray-400 mr-1">{idx + 1}.</span>}
                      {def}
                    </p>
                  ))}
                  {hasMultipleDefinitions && (
                    <button
                      onClick={() => toggleDefinitions(word.id)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-1"
                    >
                      {showAllDefinitions ? '收起' : `+${(word.definitions?.length || 1) - 1} 条释义`}
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
                  {word.chinese_definition}
                </p>
              )}

              {/* 搭配/用法 - 单词书优先 */}
              {word.collocation && (
                <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border-[2px] border-amber-200 dark:border-amber-800 rounded-sm mb-2">
                  <p className="text-xs font-bold text-amber-600 dark:text-amber-400 mb-0.5">搭配</p>
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    {word.collocation}
                  </p>
                  {word.collocation_cn && (
                    <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                      {word.collocation_cn}
                    </p>
                  )}
                </div>
              )}

              {/* 例句 - 多个例句可展开 */}
              {word.examples && word.examples.length > 0 ? (
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border-[2px] border-indigo-200 dark:border-indigo-800 rounded-sm mb-2">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                    例句{word.examples.length > 1 ? ` (${word.examples.length})` : ''}
                  </p>
                  {(showAllExamples ? word.examples : word.examples.slice(0, 1)).map((ex, idx) => (
                    <div key={idx} className={idx > 0 ? 'mt-2 pt-2 border-t border-indigo-200 dark:border-indigo-700' : ''}>
                      <p className="text-sm text-indigo-800 dark:text-indigo-200">
                        {ex.fr || ex.en}
                      </p>
                      <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                        {ex.zh}
                      </p>
                    </div>
                  ))}
                  {hasMultipleExamples && (
                    <button
                      onClick={() => toggleExamples(word.id)}
                      className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline mt-2"
                    >
                      {showAllExamples ? '收起' : `+${(word.examples?.length || 1) - 1} 个例句`}
                    </button>
                  )}
                </div>
              ) : (word.example_sentence || word.example_from_video) && (
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border-[2px] border-indigo-200 dark:border-indigo-800 rounded-sm mb-2">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">例句</p>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    {word.example_sentence || word.example_from_video}
                  </p>
                </div>
              )}

              {/* 三态按钮 */}
              <ThreeStateButtons
                currentStatus={status}
                onChange={(newStatus) => onStatusChange?.('word', word.id, newStatus)}
              />
            </div>
          </div>
        )
      })}

      <Progress learned={learnedCount} total={words.length} />
    </div>
  )
}

// ============================================
// 表达 Tab - Neo-brutalism
// ============================================

interface ExpressionsTabProps {
  expressions: VideoExpressionCard[]
  onJumpToSubtitle?: (time: number) => void
  onPlaySegment?: (startTime: number, endTime: number) => void
  getCardStatus?: (cardType: 'expression', cardId: string) => CardStatus | undefined
  onStatusChange?: (cardType: 'expression', cardId: string, status: CardStatus) => Promise<void>
}

function ExpressionsTab({ expressions, onJumpToSubtitle, onPlaySegment, getCardStatus, onStatusChange }: ExpressionsTabProps) {
  const learnedCount = expressions.filter(expr => {
    const status = getCardStatus?.('expression', expr.id)
    return status === 'known' || status === 'learning'
  }).length

  if (expressions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-bold">暂无地道表达</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {expressions.map((expr) => {
        const status = getCardStatus?.('expression', expr.id)

        return (
          <div
            key={expr.id}
            className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] transition-all duration-150 hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-0.5"
          >
            {/* 头部 - 表达和难度 */}
            <div className="flex items-center justify-between px-3 py-2 bg-purple-100 dark:bg-purple-900/30 border-b-[2px] border-black dark:border-gray-600">
              <div className="flex items-center gap-2">
                <span className="font-black text-base text-black dark:text-white">
                  {expr.expression}
                </span>
                {expr.difficulty_level && (
                  <span className="px-2 py-0.5 bg-purple-200 dark:bg-purple-800 text-purple-700 dark:text-purple-300 border-[2px] border-purple-400 dark:border-purple-600 text-xs font-bold rounded">
                    A{expr.difficulty_level}
                  </span>
                )}
              </div>
            </div>

            {/* 内容 */}
            <div className="p-3">
              {/* 含义 */}
              {expr.meaning && (
                <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
                  {expr.meaning}
                </p>
              )}

              {/* 用法说明 */}
              {expr.formula && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 border-[2px] border-gray-200 dark:border-gray-600 rounded-sm mb-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">用法说明</p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {expr.formula}
                  </p>
                </div>
              )}

              {/* 剧中语境 */}
              {expr.context && (
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border-[2px] border-indigo-200 dark:border-indigo-800 rounded-sm mb-2">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">剧中语境</p>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    {expr.context}
                  </p>
                  {expr.context_translation && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      {expr.context_translation}
                    </p>
                  )}
                </div>
              )}

              {/* 播放按钮 - 仅在有时间数据时显示 */}
              {onPlaySegment && expr.context && (expr.subtitle_start_time ?? 0) > 0 && expr.subtitle_end_time && (
                <button
                  onClick={() => onPlaySegment(expr.subtitle_start_time!, expr.subtitle_end_time!)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-black text-black bg-[#B4F416] hover:bg-[#a3e014] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                  title="播放这段字幕"
                >
                  <Play className="w-3 h-3" />
                  播放
                </button>
              )}

              {/* 三态按钮 */}
              <ThreeStateButtons
                currentStatus={status}
                onChange={(newStatus) => onStatusChange?.('expression', expr.id, newStatus)}
              />
            </div>
          </div>
        )
      })}

      <Progress learned={learnedCount} total={expressions.length} />
    </div>
  )
}

export default LearningTabs
