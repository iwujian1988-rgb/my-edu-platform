'use client'

/**
 * 词汇网络 Tab 组件
 *
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 * 点击词汇显示词典数据
 * 支持展开/收起分类
 */

import { useState, useEffect, memo } from 'react'
import { cn } from '@/lib/utils'
import { Network, Link2, Lightbulb, ChevronDown, ChevronUp } from 'lucide-react'
import type { VideoVocabularyNetwork, VideoLanguage } from '@/types/video'
import { WordTooltip } from './WordTooltip'
import type { TTSPreloadInstance } from '@/hooks/useTTSPreload'

// ============================================
// 类型定义
// ============================================

export interface VocabularyNetworkTabProps {
  network: VideoVocabularyNetwork | null
  videoLanguage?: VideoLanguage
  ttsPreload?: TTSPreloadInstance
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
    network.theme
  )
}

export function VocabularyNetworkTab({ network, videoLanguage = 'fr', ttsPreload }: VocabularyNetworkTabProps) {

  // 挂载时提取 structure + related_words 中的词预加载
  useEffect(() => {
    if (!network || !ttsPreload) return

    const wordsToPreload: string[] = []

    // 从 related_words 提取
    if (network.related_words) {
      wordsToPreload.push(...network.related_words)
    }

    // 从 structure JSON 提取
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

  return (
    <div className="space-y-3">
      {/* 结构可视化 */}
      {network.structure && (
        <NetworkVisualization structure={network.structure} theme={network.theme} videoLanguage={videoLanguage} ttsPreload={ttsPreload} />
      )}

      {/* 相关词汇 */}
      {network.related_words && network.related_words.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 border-b-[2px] border-black dark:border-gray-600">
            <Link2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <span className="text-xs font-bold">相关词汇</span>
          </div>
          <div className="p-3">
            <div className="flex flex-wrap gap-2">
              {network.related_words.map((word, index) => (
                <WordTooltip key={index} word={word} language={videoLanguage} ttsPreload={ttsPreload}>
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium border-[2px] border-indigo-300 dark:border-indigo-700 hover:border-black dark:hover:border-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors rounded-sm">
                    {word}
                  </span>
                </WordTooltip>
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
// 词汇网络可视化组件
// ============================================

interface NetworkVisualizationProps {
  structure: string
  theme?: string | null
  videoLanguage: VideoLanguage
  ttsPreload?: TTSPreloadInstance
}

const NetworkVisualization = memo(function NetworkVisualization({ structure, theme, videoLanguage, ttsPreload }: NetworkVisualizationProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  // 尝试解析 JSON 结构
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
      {/* 中心节点 - 可点击展开/收起 */}
      <div className="flex flex-col items-center">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="group flex flex-col items-center"
        >
          <div className="px-4 py-2 bg-indigo-500 text-white text-sm font-black border-[2px] border-black dark:border-gray-500 rounded-sm shadow-[2px_2px_0px_0px_#000] group-hover:bg-indigo-600 transition-colors">
            {theme || '主题中心'}
          </div>
          <div className="mt-1 text-indigo-500 dark:text-indigo-400">
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </div>
        </button>
      </div>

      {/* 连接线 + 分类卡片 */}
      {isExpanded && (
        <div>
          {/* CSS 连接线 - 仅 PC 端显示 */}
          <div className="hidden sm:block relative h-8">
            {/* 主干线 - 从中心向下 */}
            <div className="absolute left-1/2 top-0 w-px h-4 bg-indigo-400 dark:bg-indigo-500 -translate-x-1/2" />

            {/* 横向连接线 */}
            <div className="absolute top-4 left-[10%] right-[10%] h-px bg-indigo-400 dark:bg-indigo-500" />

            {/* 垂直分支线 - 指向每个分类 */}
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
                      <WordTooltip key={i} word={word} language={videoLanguage} ttsPreload={ttsPreload}>
                        <span className="px-1.5 py-1 bg-gray-100 dark:bg-gray-700 text-xs text-gray-700 dark:text-gray-300 border-[2px] border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 active:bg-indigo-100 dark:active:bg-indigo-900/50 transition-colors cursor-pointer rounded-sm">
                          {word}
                        </span>
                      </WordTooltip>
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

export default VocabularyNetworkTab
