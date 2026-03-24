'use client'

/**
 * 词汇网络 Tab 组件
 *
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 * 点击词汇显示词典数据
 */

import { cn } from '@/lib/utils'
import { Network, Link2, Lightbulb } from 'lucide-react'
import type { VideoVocabularyNetwork, VideoLanguage } from '@/types/video'
import { WordTooltip } from './WordTooltip'

// ============================================
// 类型定义
// ============================================

export interface VocabularyNetworkTabProps {
  network: VideoVocabularyNetwork | null
  videoLanguage?: VideoLanguage
}

// ============================================
// 组件
// ============================================

export function VocabularyNetworkTab({ network, videoLanguage = 'fr' }: VocabularyNetworkTabProps) {
  if (!network) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <Network className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-bold">暂无词汇网络</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 主题 */}
      {network.theme && (
        <div className="bg-indigo-100 dark:bg-indigo-900/30 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
          <div className="flex items-center gap-2 px-3 py-2 bg-indigo-200 dark:bg-indigo-800 border-b-[2px] border-black dark:border-gray-600">
            <Network className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
              词汇网络主题
            </span>
          </div>
          <div className="p-3">
            <p className="text-sm font-black text-indigo-800 dark:text-indigo-200">
              {network.theme}
            </p>
          </div>
        </div>
      )}

      {/* 结构可视化 */}
      {network.structure && (
        <NetworkVisualization structure={network.structure} videoLanguage={videoLanguage} />
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
                <WordTooltip key={index} word={word} language={videoLanguage}>
                  <span className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-xs font-medium border-[2px] border-indigo-300 dark:border-indigo-700 hover:border-black dark:hover:border-gray-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors rounded-sm">
                    {word}
                  </span>
                </WordTooltip>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 吸见搭配 */}
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
  videoLanguage: VideoLanguage
}

function NetworkVisualization({ structure, videoLanguage }: NetworkVisualizationProps) {
  // 尝试解析 JSON 结构
  let parsedStructure: Record<string, string[]> | null = null
  try {
    parsedStructure = JSON.parse(structure)
  } catch {
    // 不是 JSON，直接显示文本
  }

  if (!parsedStructure) {
    return (
      <div className="bg-gray-50 dark:bg-gray-700/50 border-[2px] border-gray-200 dark:border-gray-600 p-3 rounded-sm">
        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap font-medium">
          {structure}
        </p>
      </div>
    )
  }

  const categories = Object.entries(parsedStructure)

  return (
    <div className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
      <div className="flex items-center gap-2 px-3 py-2 bg-indigo-100 dark:bg-indigo-900/30 border-b-[2px] border-black dark:border-gray-600">
        <Network className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
        <span className="text-xs font-black text-indigo-700 dark:text-indigo-300">
          词汇关系图
        </span>
      </div>

      <div className="p-3">
        {/* 中心节点 */}
        <div className="flex justify-center mb-3">
          <div className="px-4 py-2 bg-indigo-500 text-white text-sm font-black border-[2px] border-black dark:border-gray-500 rounded-sm shadow-[2px_2px_0px_0px_#000]">
            主题中心
          </div>
        </div>

        {/* 分类卡片 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
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
                    <WordTooltip key={i} word={word} language={videoLanguage}>
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
    </div>
  )
}

export default VocabularyNetworkTab
