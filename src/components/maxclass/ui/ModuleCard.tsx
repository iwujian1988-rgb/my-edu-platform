'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/ModuleCard.vue
 * 课程模块卡：跳 /parcours/{courseSlug}/module/{module.slug}，含可选进度条。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'

export interface ModuleCardData {
  slug: string
  title: string
  description?: string
  exerciseIds?: number[]
}

export function ModuleCard({
  module,
  courseSlug,
  progress,
}: {
  module: ModuleCardData
  courseSlug: string
  progress?: number
}) {
  const to = `/parcours/${courseSlug}/module/${module.slug}`
  const exerciseCount = module.exerciseIds?.length ?? 0
  return (
    <Link
      href={to}
      className="bg-white rounded-lg border p-5 hover:border-primary-300 hover:shadow-md transition-all group block"
    >
      <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors">{module.title}</h3>
      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{module.description}</p>
      <div className="flex items-center gap-3 mt-3">
        <span className="text-xs text-gray-400">
          {t('pages.home.exerciseCount', { count: exerciseCount })}
        </span>
        {progress !== undefined ? (
          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        ) : null}
      </div>
    </Link>
  )
}
