'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/exercises/MultipleChoice.vue
 * 单选题：选项以 grid 排列，选中后再校验；锁定后高亮正确/错误。
 */

import { useState } from 'react'
import { t } from '@/lib/maxclass/i18n'
import type { MultipleChoiceStep } from './types'

export function MultipleChoice({
  step,
  onSubmit,
}: {
  step: MultipleChoiceStep
  onSubmit?: (correct: boolean) => void
}) {
  const [selected, setSelected] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)

  function optionClass(id: string) {
    if (!locked) {
      return selected === id
        ? 'border-primary-500 bg-primary-50 text-primary-700'
        : 'border-gray-200 hover:border-gray-300 text-gray-700'
    }
    if (id === step.correct) return 'border-green-500 bg-green-50 text-green-700'
    if (id === selected) return 'border-red-500 bg-red-50 text-red-700'
    return 'border-gray-200 text-gray-400'
  }

  function check() {
    setLocked(true)
    onSubmit?.(selected === step.correct)
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 font-medium">{step.instruction}</p>
      <p className="text-lg font-bold text-gray-800 mb-6">{step.question}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {step.options.map(opt => {
          const showSelected = selected === opt.id || (locked && opt.id === step.correct)
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => !locked && setSelected(opt.id)}
              disabled={locked}
              className={`p-4 rounded-lg border-2 text-left transition-all font-medium ${optionClass(opt.id)}`}
            >
              <span
                className={`inline-block w-7 h-7 rounded-full border-2 text-center text-sm leading-6 mr-3 ${
                  showSelected ? 'border-current' : 'border-gray-300'
                }`}
              >
                {opt.id.toUpperCase()}
              </span>
              {opt.text}
            </button>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-4">
        {!locked && selected ? (
          <button type="button" onClick={check} className="btn-primary">
            {t('common.verify')}
          </button>
        ) : null}
        {locked ? (
          <div>
            {selected === step.correct ? (
              <span className="text-green-600 font-medium">✓ {t('exercise.correctAnswer')}</span>
            ) : (
              <span className="text-red-600 font-medium">
                ✗ {t('exercise.wrongAnswer', { answer: step.correct.toUpperCase() })}
              </span>
            )}
          </div>
        ) : null}
        {locked && step.explanation ? (
          <p className="text-sm text-gray-600 mt-2 italic">{step.explanation}</p>
        ) : null}
      </div>
    </div>
  )
}
