'use client'

/**
 * 语法点 Tab 组件
 *
 * 设计风格：Neo-brutalism - 与 Speaker 模块保持一致
 */

import { cn } from '@/lib/utils'
import { BookMarked, Lightbulb, AlertTriangle } from 'lucide-react'
import type { VideoGrammarPoint } from '@/types/video'

// ============================================
// 类型定义
// ============================================

export interface GrammarPointsTabProps {
  grammarPoints: VideoGrammarPoint[]
}

// ============================================
// 组件
// ============================================

export function GrammarPointsTab({ grammarPoints }: GrammarPointsTabProps) {
  if (!grammarPoints || grammarPoints.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500 dark:text-gray-400">
        <BookMarked className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p className="font-bold">暂无语法点</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {grammarPoints.map((point, index) => (
        <GrammarPointCard key={point.id} point={point} index={index + 1} />
      ))}
    </div>
  )
}

// ============================================
// 语法点卡片 - Neo-brutalism
// ============================================

interface GrammarPointCardProps {
  point: VideoGrammarPoint
  index: number
}

function GrammarPointCard({ point, index }: GrammarPointCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 rounded-sm shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] transition-all duration-150 hover:shadow-[4px_4px_0px_0px_#000] dark:hover:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-0.5">
      {/* 头部 */}
      <div className="flex items-center gap-3 px-3 py-2 bg-purple-100 dark:bg-purple-900/30 border-b-[2px] border-black dark:border-gray-600">
        <span className="flex items-center justify-center w-6 h-6 bg-purple-400 text-black text-xs font-black border-[2px] border-black">
          {index}
        </span>
        <h3 className="font-black text-base text-black dark:text-white">
          {point.name}
        </h3>
      </div>

      {/* 内容 */}
      <div className="p-3 space-y-3">
        {/* 结构公式 */}
        {point.structure && (
          <div>
            <div className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              <BookMarked className="w-3 h-3" />
              <span>语法结构</span>
            </div>
            <div className="px-3 py-2 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-600 rounded-sm">
              <code className="text-sm text-purple-700 dark:text-purple-300 font-bold">
                {point.structure}
              </code>
            </div>
          </div>
        )}

        {/* 例句 */}
        {point.example_french && (
          <div>
            <div className="text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              例句
            </div>
            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 border-[2px] border-indigo-200 dark:border-indigo-800 rounded-sm">
              <p className="text-sm text-indigo-800 dark:text-indigo-200 font-medium">
                {point.example_french}
              </p>
              {point.example_ipa && (
                <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-0.5 font-mono">
                  [{point.example_ipa}]
                </p>
              )}
              {point.example_chinese && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                  {point.example_chinese}
                </p>
              )}
            </div>
          </div>
        )}

        {/* 用途说明 */}
        {point.purpose && (
          <div>
            <div className="flex items-center gap-1 text-xs font-bold text-gray-500 dark:text-gray-400 mb-1">
              <Lightbulb className="w-3 h-3" />
              <span>用途</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">
              {point.purpose}
            </p>
          </div>
        )}

        {/* 注意事项 */}
        {point.note && (
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 border-[2px] border-amber-300 dark:border-amber-700 rounded-sm">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-amber-700 dark:text-amber-300">注意</p>
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                  {point.note}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default GrammarPointsTab
