'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/CourseStepCard.vue
 * 课程步骤卡：完成态显示对勾 + 绿色背景，否则灰色圆圈显示步号。
 */

import { t } from '@/lib/maxclass/i18n'

export interface CourseStepData {
  title?: string
  exerciseIds?: number[]
}

export function CourseStepCard({
  step,
  index,
  completed = false,
}: {
  step: CourseStepData
  index: number
  completed?: boolean
}) {
  const exerciseCount = step.exerciseIds?.length ?? 0
  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-all ${
        completed ? 'border-green-200 bg-green-50/50' : 'border-gray-200 bg-white'
      }`}
    >
      <div
        className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
          completed ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
        }`}
      >
        {completed ? '✓' : index + 1}
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-gray-800">
          {step.title || t('exercise.step', { n: index + 1 })}
        </h4>
        <p className="text-sm text-gray-500 mt-1">
          {t('pages.home.exerciseCount', { count: exerciseCount })}
        </p>
      </div>
    </div>
  )
}
