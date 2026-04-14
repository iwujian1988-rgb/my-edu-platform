'use client'

/**
 * 句型模式展示组件
 *
 * 纯展示型组件，展示 sentence_pattern 类型的练习数据。
 * 每张卡片包含：句型结构、用法解释、例句（法文 + 中文）。
 */

import type { VideoExercise, SentencePatternMetadata } from '@/types/video'
import { MessageSquare } from 'lucide-react'

export interface SentencePatternCardsProps {
  patterns: VideoExercise[]
}

function parseMetadata(exercise: VideoExercise): SentencePatternMetadata | null {
  const meta = exercise.exercise_metadata
  if (!meta || typeof meta !== 'object') return null
  if ('pattern' in meta) return meta as SentencePatternMetadata
  return null
}

export function SentencePatternCards({ patterns }: SentencePatternCardsProps) {
  if (patterns.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-purple-500 flex items-center justify-center">
          <MessageSquare className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          句型模式
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({patterns.length} 个)
        </span>
      </div>

      <div className="space-y-4">
        {patterns.map((exercise, index) => {
          const meta = parseMetadata(exercise)
          if (!meta) return null

          return (
            <div
              key={exercise.id}
              className="bg-white dark:bg-gray-800 rounded-none border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              {/* 句型结构 - 紫色头部 */}
              <div className="bg-purple-100 dark:bg-purple-900/30 px-4 py-3 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <span className="flex items-center justify-center w-6 h-6 rounded-full bg-purple-500 text-white text-xs font-bold">
                    {index + 1}
                  </span>
                  <span className="font-bold text-purple-800 dark:text-purple-200 text-lg">
                    {meta.pattern || exercise.original_text}
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                {/* 用法解释 */}
                {meta.explanation && (
                  <p className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed">
                    {meta.explanation}
                  </p>
                )}

                {/* 例句 */}
                {meta.example && (
                  <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
                    <p className="text-indigo-900 dark:text-indigo-100 text-sm font-medium mb-1">
                      {meta.example.french}
                    </p>
                    <p className="text-indigo-700 dark:text-indigo-300 text-xs">
                      {meta.example.chinese}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
