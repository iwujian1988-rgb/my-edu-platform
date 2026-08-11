'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/blocks/ExerciseBlock.vue
 *
 * 课程模块中的「关联练习」block：列出 exerciseIds，每条跳 /exercice/{id}（保留法语拼写）。
 * 通过 mock.getExercise(id) 查找真实标题，找不到时回落到 "练习 #${id}"。
 */

import Link from 'next/link'
import { getExercise } from '@/data/maxclass/mock'
import type { Block } from '@/data/parcours-mock'

export function ExerciseBlock({ block }: { block: Block }) {
  const ids = block.exerciseIds ?? []

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-950">
      <h3 className="mb-3 font-bold text-gray-800 dark:text-gray-100">{block.title}</h3>
      <div className="space-y-2">
        {ids.map(exId => {
          const ex = getExercise(exId)
          const title = ex?.title ?? `练习 #${exId}`
          return (
            <Link
              key={exId}
              href={`/exercice/${exId}`}
              className="group flex items-center gap-3 rounded-lg border border-gray-100 p-3 transition-colors hover:border-primary-300 hover:bg-primary-50 dark:border-gray-800 dark:hover:bg-primary-900/20"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-100 text-sm font-bold text-primary-600 group-hover:bg-primary-200 dark:bg-primary-900/40 dark:text-primary-200">
                {exId}
              </div>
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-700 group-hover:text-primary-700 dark:text-gray-200 dark:group-hover:text-primary-200">
                  {title}
                </p>
                <p className="text-xs text-gray-400 dark:text-gray-500">ID: {exId}</p>
              </div>
              <svg
                className="h-4 w-4 text-gray-300 group-hover:text-primary-500 dark:text-gray-600 dark:group-hover:text-primary-300"
                fill="currentColor"
                viewBox="0 0 20 20"
                aria-hidden
              >
                <path d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" />
              </svg>
            </Link>
          )
        })}
        {ids.length === 0 && (
          <p className="text-xs text-gray-400 dark:text-gray-500">暂无关联练习</p>
        )}
      </div>
    </div>
  )
}
