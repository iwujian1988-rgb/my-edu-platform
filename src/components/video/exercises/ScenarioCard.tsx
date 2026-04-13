'use client'

/**
 * 情景练习展示组件
 *
 * 纯展示型组件，展示 scenario 类型的练习数据。
 * 包含：场景描述、任务要求列表、开头提示语。
 */

import type { VideoExercise, ScenarioMetadata } from '@/types/video'
import { Theater } from 'lucide-react'

export interface ScenarioCardProps {
  scenarios: VideoExercise[]
}

function parseMetadata(exercise: VideoExercise): ScenarioMetadata | null {
  const meta = exercise.exercise_metadata
  if (!meta || typeof meta !== 'object') return null
  if ('description' in meta && !('pattern' in meta)) return meta as ScenarioMetadata
  return null
}

export function ScenarioCard({ scenarios }: ScenarioCardProps) {
  if (scenarios.length === 0) return null

  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-green-500 flex items-center justify-center">
          <Theater className="w-4 h-4 text-white" />
        </div>
        <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
          情景练习
        </h3>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          ({scenarios.length} 个)
        </span>
      </div>

      <div className="space-y-4">
        {scenarios.map((exercise) => {
          const meta = parseMetadata(exercise)
          if (!meta) return null

          return (
            <div
              key={exercise.id}
              className="bg-white dark:bg-gray-800 rounded-lg border-2 border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] overflow-hidden"
            >
              {/* 场景标题 - 绿色头部 */}
              <div className="bg-green-100 dark:bg-green-900/30 px-4 py-3 border-b-2 border-black">
                <div className="flex items-center gap-2">
                  <Theater className="w-5 h-5 text-green-700 dark:text-green-300" />
                  <span className="font-bold text-green-800 dark:text-green-200">
                    角色扮演
                  </span>
                </div>
              </div>

              <div className="p-4 space-y-4">
                {/* 场景描述 */}
                <p className="text-gray-800 dark:text-gray-200 text-sm leading-relaxed">
                  {meta.description || exercise.original_text}
                </p>

                {/* 任务要求 */}
                {(() => {
                  // requirements 可能是 string[] 或 string 或 null
                  const reqs = typeof meta.requirements === 'string'
                    ? [meta.requirements]
                    : Array.isArray(meta.requirements) ? meta.requirements : []
                  return reqs.length > 0 ? (
                    <div>
                      <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-1">
                        <span className="text-base">📋</span> 任务要求
                      </h4>
                      <ul className="space-y-1">
                        {reqs.map((req, i) => (
                          <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                            <span className="text-green-500 mt-0.5 flex-shrink-0">•</span>
                            <span>{req}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null
                })()}

                {/* 开头提示 */}
                {(meta.starter || exercise.answer_text) && (
                  <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-800">
                    <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-300 mb-1 flex items-center gap-1">
                      <span className="text-base">💬</span> 开头提示
                    </h4>
                    <p className="text-amber-900 dark:text-amber-100 text-sm italic">
                      &ldquo;{meta.starter || exercise.answer_text}&rdquo;
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
