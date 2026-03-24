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

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import { BookOpen, MessageSquare, BookMarked, Volume2, Network, MapPin, Play, Loader2 } from 'lucide-react'
import type {
  VideoWordCard,
  VideoExpressionCard,
  VideoGrammarPoint,
  VideoPronunciationTip,
  VideoVocabularyNetwork,
  CardStatus,
} from '@/types/video'
import { GrammarPointsTab } from './GrammarPointsTab'
import { PronunciationTipsTab } from './PronunciationTipsTab'
import { VocabularyNetworkTab } from './VocabularyNetworkTab'

// ============================================
// 类型定义
// ============================================

export interface LearningTabsProps {
  words: VideoWordCard[]
  expressions: VideoExpressionCard[]
  grammarPoints: VideoGrammarPoint[]
  pronunciationTips: VideoPronunciationTip[]
  vocabularyNetwork: VideoVocabularyNetwork | null
  onJumpToSubtitle?: (time: number) => void
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
  onJumpToSubtitle,
  getCardStatus,
  onStatusChange
}: LearningTabsProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('words')
  const [localStatusMap, setLocalStatusMap] = useState<Map<string, CardStatus>>(new Map())

  // 获取卡片状态（优先本地状态，其次远程状态）
  const getCardStatusLocal = useCallback(
    (cardType: 'word' | 'expression', cardId: string): CardStatus | undefined => {
      const key = `${cardType}:${cardId}`
      if (localStatusMap.has(key)) {
        return localStatusMap.get(key)
      }
      return getCardStatus?.(cardType, cardId)
    },
    [getCardStatus, onStatusChange]
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

  const tabs: TabConfig[] = [
    { key: 'words', label: '单词', icon: <BookOpen className="w-4 h-4" />, count: words.length },
    { key: 'expressions', label: '地道表达', icon: <MessageSquare className="w-4 h-4" />, count: expressions.length },
    { key: 'grammar', label: '语法点', icon: <BookMarked className="w-4 h-4" />, count: grammarPoints.length },
    { key: 'pronunciation', label: '发音要点', icon: <Volume2 className="w-4 h-4" />, count: pronunciationTips.length },
    { key: 'network', label: '词汇网络', icon: <Network className="w-4 h-4" />, count: vocabularyNetwork ? 1 : 0 },
  ]

  // 渲染 Tab 内容
  const renderTabContent = () => {
    switch (activeTab) {
      case 'words':
        return (
          <WordsTab
            words={words}
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
            getCardStatus={getCardStatusLocal}
            onStatusChange={handleStatusChange}
          />
        )
      case 'grammar':
        return <GrammarPointsTab grammarPoints={grammarPoints} />
      case 'pronunciation':
        return <PronunciationTipsTab tips={pronunciationTips} />
      case 'network':
        return <VocabularyNetworkTab network={vocabularyNetwork} />
      default:
        return null
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 rounded-sm transition-colors duration-300">
      {/* Tab 头部 - Neo-brutalism 风格 */}
      <div className="flex border-b-[3px] border-black dark:border-gray-600 overflow-x-auto rounded-t-sm">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
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
  onJumpToSubtitle?: (time: number) => void
  getCardStatus?: (cardType: 'word', cardId: string) => CardStatus | undefined
  onStatusChange?: (cardType: 'word', cardId: string, status: CardStatus) => Promise<void>
}

function WordsTab({ words, onJumpToSubtitle, getCardStatus, onStatusChange }: WordsTabProps) {
  const [playingWord, setPlayingWord] = useState<string | null>(null)

  const playWord = useCallback((word: string) => {
    if (!('speechSynthesis' in window)) return
    if (playingWord) speechSynthesis.cancel()

    setPlayingWord(word)
    const utterance = new SpeechSynthesisUtterance(word)
    utterance.lang = 'fr-FR'
    utterance.rate = 0.8
    utterance.onend = () => setPlayingWord(null)
    utterance.onerror = () => setPlayingWord(null)
    speechSynthesis.speak(utterance)
  }, [playingWord])

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
                {word.part_of_speech && (
                  <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 border-[2px] border-blue-300 dark:border-blue-700 text-xs font-bold rounded">
                    {word.part_of_speech}
                  </span>
                )}
              </div>
              {/* 播放按钮 */}
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
            </div>

            {/* 内容 */}
            <div className="p-3">
              {/* 释义 */}
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">
                {word.chinese_definition}
              </p>

              {/* 剧中例句 */}
              {word.example_from_video && (
                <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border-[2px] border-indigo-200 dark:border-indigo-800 rounded-sm mb-2">
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">剧中例句</p>
                  <p className="text-sm text-indigo-800 dark:text-indigo-200">
                    {word.example_from_video}
                  </p>
                  {word.example_translation && (
                    <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      {word.example_translation}
                    </p>
                  )}
                </div>
              )}

              {/* 功能按钮 */}
              <div className="flex items-center gap-2">
                {onJumpToSubtitle && word.example_from_video && (
                  <button
                    onClick={() => onJumpToSubtitle(word.subtitle_start_time || 0)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-black text-gray-600 dark:text-gray-400 border-[2px] border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-gray-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                    title="跳转到字幕位置"
                  >
                    <MapPin className="w-3 h-3" />
                    定位
                  </button>
                )}
              </div>

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
  getCardStatus?: (cardType: 'expression', cardId: string) => CardStatus | undefined
  onStatusChange?: (cardType: 'expression', cardId: string, status: CardStatus) => Promise<void>
}

function ExpressionsTab({ expressions, onJumpToSubtitle, getCardStatus, onStatusChange }: ExpressionsTabProps) {
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

              {/* 语法公式 */}
              {expr.formula && (
                <div className="p-2 bg-gray-50 dark:bg-gray-700/50 border-[2px] border-gray-200 dark:border-gray-600 rounded-sm mb-2">
                  <p className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-0.5">语法公式</p>
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

              {/* 功能按钮 */}
              <div className="flex items-center gap-2">
                {onJumpToSubtitle && expr.context && (
                  <button
                    onClick={() => onJumpToSubtitle(expr.subtitle_start_time || 0)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-black text-black bg-[#B4F416] hover:bg-[#a3e014] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                    title="播放这段"
                  >
                    <Play className="w-3 h-3" />
                    播放
                  </button>
                )}
                {onJumpToSubtitle && expr.context && (
                  <button
                    onClick={() => onJumpToSubtitle(expr.subtitle_start_time || 0)}
                    className="flex items-center gap-1 px-2 py-1 text-xs font-black text-gray-600 dark:text-gray-400 border-[2px] border-gray-300 dark:border-gray-600 hover:border-black dark:hover:border-gray-400 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                    title="跳转到字幕位置"
                  >
                    <MapPin className="w-3 h-3" />
                    定位
                  </button>
                )}
              </div>

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
