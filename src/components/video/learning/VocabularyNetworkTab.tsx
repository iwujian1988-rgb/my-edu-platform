'use client'

/**
 * 词汇网络 Tab 组件
 *
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 * 点击词汇显示词典数据
 * 支持展开/收起分类
 *
 * 两种渲染模式：
 * 1. 有 structure（分类结构）→ 完整思维导图：中心词 + 分类卡片
 * 2. 无 structure 但有 core_word + related_words → 简化版：中心词 + 扩展词网格
 *
 * 释义来源：优先匹配该视频的 video_word_cards 数据（内联展示），其次点击查词典
 */

import { useState, useEffect, useMemo, memo } from 'react'
import { cn } from '@/lib/utils'
import { Network, Link2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import type { VideoVocabularyNetwork, VideoWordCard, VideoLanguage } from '@/types/video'
import { WordTooltip } from './WordTooltip'
import type { TTSPreloadInstance } from '@/hooks/useTTSPreload'

// ============================================
// 类型定义
// ============================================

export interface VocabularyNetworkTabProps {
  network: VideoVocabularyNetwork | null
  /** 该视频的单词卡片数据，用于内联显示释义 */
  wordCards?: VideoWordCard[]
  videoLanguage?: VideoLanguage
  ttsPreload?: TTSPreloadInstance
}

/** 释义行数据的轻量结构 */
interface WordBrief {
  phonetic: string | null
  definition: string | null
  partOfSpeech: string | null
}

// ============================================
// 工具函数
// ============================================

/** 从 VideoWordCard[] 构建小写 word → WordBrief 映射 */
function buildWordMap(cards: VideoWordCard[]): Map<string, WordBrief> {
  const map = new Map<string, WordBrief>()
  for (const card of cards) {
    const key = card.word.toLowerCase()
    if (map.has(key)) continue
    map.set(key, {
      phonetic: card.phonetic,
      definition: card.definitions?.[0] || card.chinese_definition || null,
      partOfSpeech: card.part_of_speech,
    })
  }
  return map
}

// ============================================
// 组件
// ============================================

/** 判断词汇网络是否有实际可展示的内容（排除全 null 的空记录） */
export function hasVocabularyNetworkContent(network: VideoVocabularyNetwork | null): boolean {
  if (!network) return false
  return !!(
    network.structure ||
    (network.related_words && network.related_words.length > 0) ||
    network.collocations ||
    network.theme ||
    network.core_word
  )
}

export function VocabularyNetworkTab({ network, wordCards = [], videoLanguage = 'fr', ttsPreload }: VocabularyNetworkTabProps) {

  // word → brief 映射（小写 key，用于内联释义匹配）
  const wordMap = useMemo(() => buildWordMap(wordCards), [wordCards])

  // 挂载时提取 structure + related_words 中的词预加载
  useEffect(() => {
    if (!network || !ttsPreload) return

    const wordsToPreload: string[] = []

    if (network.related_words) {
      wordsToPreload.push(...network.related_words)
    }

    if (network.structure) {
      try {
        const parsed: Record<string, string[]> = JSON.parse(network.structure)
        Object.values(parsed).forEach((words) => {
          if (Array.isArray(words)) wordsToPreload.push(...words)
        })
      } catch {
        // 非 JSON 结构，跳过
      }
    }

    if (wordsToPreload.length > 0) {
      ttsPreload.preloadWords(wordsToPreload)
    }
  }, [network, ttsPreload])

  if (!hasVocabularyNetworkContent(network)) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-bold">暂无词汇网络</p>
      </div>
    )
  }

  const centerLabel = network.core_word || network.theme || '主题中心'

  return (
    <div className="space-y-3">
      {network.structure ? (
        <StructuredNetworkVisualization
          structure={network.structure}
          centerLabel={centerLabel}
          videoLanguage={videoLanguage}
          ttsPreload={ttsPreload}
          wordMap={wordMap}
        />
      ) : network.core_word && network.related_words && network.related_words.length > 0 ? (
        <SimpleNetworkVisualization
          centerLabel={centerLabel}
          relatedWords={network.related_words}
          videoLanguage={videoLanguage}
          ttsPreload={ttsPreload}
          wordMap={wordMap}
        />
      ) : null}

      {/* 相关词汇（仅在 structure 存在时额外展示，避免与简化版重复） */}
      {network.structure && network.related_words && network.related_words.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b-[2px] border-black dark:border-gray-600">
            <Link2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs font-bold">相关词汇</span>
          </div>
          <div className="p-3">
            <div className="flex flex-wrap gap-2">
              {network.related_words.map((word, index) => (
                <NetworkWord key={index} word={word} wordMap={wordMap} videoLanguage={videoLanguage} ttsPreload={ttsPreload} />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 常见搭配 */}
      {network.collocations && (
        <div className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b-[2px] border-black dark:border-gray-600">
            <Lightbulb className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs font-bold">常见搭配</span>
          </div>
          <div className="p-3">
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line font-medium">
              {network.collocations}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================
// 网络词组件：有卡片释义时内联展示，否则仅展示可点击词标签
// ============================================

interface NetworkWordProps {
  word: string
  wordMap: Map<string, WordBrief>
  videoLanguage: VideoLanguage
  ttsPreload?: TTSPreloadInstance
  /** 标签样式变体 */
  variant?: 'default' | 'compact'
}

function NetworkWord({ word, wordMap, videoLanguage, ttsPreload, variant = 'default' }: NetworkWordProps) {
  const brief = wordMap.get(word.toLowerCase())

  // 统一：点击才显示释义（无论是否有 wordCard 数据）
  return (
    <WordTooltip word={word} language={videoLanguage} ttsPreload={ttsPreload}>
      <span className={cn(
        "px-2 py-1 text-xs font-medium border-[2px] cursor-pointer transition-colors rounded-sm",
        variant === 'compact'
          ? "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500"
          : "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 border-indigo-300 dark:border-indigo-700 hover:border-black dark:hover:border-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"
      )}>
        {word}
      </span>
    </WordTooltip>
  )
}

// ============================================
// 完整版网络可视化（有 structure 分类结构）
// ============================================

interface StructuredNetworkVisualizationProps {
  structure: string
  centerLabel: string
  videoLanguage: VideoLanguage
  ttsPreload?: TTSPreloadInstance
  wordMap: Map<string, WordBrief>
}

const StructuredNetworkVisualization = memo(function StructuredNetworkVisualization({ structure, centerLabel, videoLanguage, ttsPreload, wordMap }: StructuredNetworkVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  let parsedStructure: Record<string, string[]> | null = null
  try {
    parsedStructure = JSON.parse(structure)
  } catch {
    // 不是 JSON，直接显示文本
  }

  if (!parsedStructure) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 border-[1px] border-gray-200 dark:border-gray-600 p-3 rounded-sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-medium">
          {structure}
        </p>
      </div>
    )
  }

  const categories = Object.entries(parsedStructure)
  const categoryCount = categories.length

  return (
    <div className="space-y-3">
      {/* 中心节点 */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex flex-col items-center"
        >
          <div className="px-4 py-2 bg-indigo-500 text-white text-sm font-black border-[2px] border-black dark:border-gray-500 rounded-sm shadow-[2px_2px_0px_0px_#000] group-hover:bg-indigo-600 transition-colors">
            {centerLabel}
          </div>
          <div className="mt-1 text-indigo-500 dark:text-indigo-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
      </div>

      {/* 连接线 + 分类卡片 */}
      {isExpanded && (
        <div>
          <div className="hidden sm:block relative h-8">
            <div className="absolute left-1/2 top-0 w-px h-4 bg-indigo-400 dark:bg-indigo-500 -translate-x-1/2" />
            <div className="absolute top-4 left-[10%] right-[10%] h-px bg-indigo-400 dark:bg-indigo-500" />
            {categories.map((_, idx) => {
              const leftPercent = categoryCount > 1
                ? 10 + (80 / (categoryCount - 1)) * idx
                : 50
              return (
                <div
                  key={idx}
                  className="absolute top-4 w-px h-4 bg-indigo-400 dark:bg-indigo-500"
                  style={{ left: `${leftPercent}%` }}
                />
              )
            })}
          </div>

          {/* 分类卡片 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {categories.map(([category, words]) => (
              <div
                key={category}
                className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[3px_3px_0px_0px_#666] hover:-translate-y-0.5 transition-all"
              >
                <div className="px-2 py-1.5 bg-gray-100 dark:bg-gray-700 border-b-[2px] border-black dark:border-gray-600">
                  <h5 className="text-xs font-black text-center text-gray-900 dark:text-gray-100">
                    {category}
                  </h5>
                </div>
                <div className="p-2">
                  <div className="flex flex-wrap gap-1 justify-center">
                    {Array.isArray(words) && words.map((word, i) => (
                      <NetworkWord key={i} word={word} wordMap={wordMap} videoLanguage={videoLanguage} ttsPreload={ttsPreload} variant="compact" />
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
})

// ============================================
// 简化版网络可视化（无 structure，只有 core_word + related_words）
// ============================================

interface SimpleNetworkVisualizationProps {
  centerLabel: string
  relatedWords: string[]
  videoLanguage: VideoLanguage
  ttsPreload?: TTSPreloadInstance
  wordMap: Map<string, WordBrief>
}

const SimpleNetworkVisualization = memo(function SimpleNetworkVisualization({ centerLabel, relatedWords, videoLanguage, ttsPreload, wordMap }: SimpleNetworkVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const wordCount = relatedWords.length

  return (
    <div className="space-y-3">
      {/* 中心节点 */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex flex-col items-center"
        >
          <div className="px-4 py-2 bg-indigo-500 text-white text-sm font-black border-[2px] border-black dark:border-gray-500 rounded-sm shadow-[2px_2px_0px_0px_#000] group-hover:bg-indigo-600 transition-colors">
            {centerLabel}
          </div>
          <div className="mt-1 text-indigo-500 dark:text-indigo-400">
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </button>
      </div>

      {/* 扩展词网格 */}
      {isExpanded && (
        <div>
          <div className="hidden sm:block relative h-4">
            <div className="absolute left-1/2 top-0 w-px h-4 bg-indigo-400 dark:bg-indigo-500 -translate-x-1/2" />
          </div>

          <div className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[2px_3px_0px_0px_#000] dark:shadow-[2px_3px_0px_0px_#666]">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 dark:bg-gray-700 border-b-[2px] border-black dark:border-gray-600">
              <Link2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs font-bold text-indigo-700 dark:text-indigo-300">
                延伸词 ({wordCount})
              </span>
            </div>
            <div className="p-3">
              <div className="flex flex-wrap gap-2 justify-center">
                {relatedWords.map((word, i) => (
                  <NetworkWord key={i} word={word} wordMap={wordMap} videoLanguage={videoLanguage} ttsPreload={ttsPreload} />
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
})

export default VocabularyNetworkTab
