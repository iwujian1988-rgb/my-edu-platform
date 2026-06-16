'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/exercises/FillBlank.vue
 *
 * 段落渲染：text 段直接显示；blank 段在未锁定时是 input（输入答案），锁定后显示答案对错。
 *
 * Vue 用 reactive({}) answers/results + ref locked；React 用 useState 三组状态。
 * Vue 用 v-model 双向绑定；React 用 value + onChange。
 */

import { useState } from 'react'
import { t } from '@/lib/maxclass/i18n'
import type { FillBlankStep } from './types'

export function FillBlank({
  step,
  onSubmit,
}: {
  step: FillBlankStep
  onSubmit?: (correct: boolean) => void
}) {
  const [answers, setAnswers] = useState<Record<number, string>>({})
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [locked, setLocked] = useState(false)

  const blanks = step.segments.filter(s => s.type === 'blank')
  const allCorrect =
    blanks.length > 0 &&
    blanks.every(b => (answers[b.id]?.trim().toLowerCase() ?? '') === b.answer.toLowerCase())

  function check() {
    const next: Record<number, boolean> = {}
    blanks.forEach(b => {
      next[b.id] = (answers[b.id]?.trim().toLowerCase() ?? '') === b.answer.toLowerCase()
    })
    setResults(next)
    setLocked(true)
    onSubmit?.(
      blanks.length > 0 &&
        blanks.every(b => (answers[b.id]?.trim().toLowerCase() ?? '') === b.answer.toLowerCase()),
    )
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 font-medium">{step.instruction}</p>

      <div className="text-lg leading-relaxed">
        {step.segments.map((seg, i) => {
          if (seg.type === 'text') {
            return (
              <span key={i} className="whitespace-pre-wrap">{seg.content}</span>
            )
          }
          // blank
          const ok = results[seg.id]
          return (
            <span key={i} className="inline-block mx-1">
              {!locked ? (
                <input
                  type="text"
                  autoComplete="off"
                  value={answers[seg.id] ?? ''}
                  onChange={e => setAnswers(prev => ({ ...prev, [seg.id]: e.target.value }))}
                  onKeyDown={e => { if (e.key === 'Enter') check() }}
                  className="border-b-2 w-40 px-1 py-0.5 text-center font-medium focus:outline-none transition-colors bg-transparent border-primary-400 focus:border-primary-700"
                  placeholder="___"
                />
              ) : (
                <span
                  className={`inline-block border-b-2 px-1 font-bold ${
                    ok ? 'border-green-500 text-green-700' : 'border-red-500 text-red-700'
                  }`}
                >
                  {answers[seg.id] || '—'}
                  {!ok ? (
                    <span className="text-green-700 font-normal ml-1">({seg.answer})</span>
                  ) : null}
                </span>
              )}
            </span>
          )
        })}
      </div>

      <div className="mt-6 flex items-center gap-4">
        {!locked ? (
          <button type="button" onClick={check} className="btn-primary">
            {t('common.verify')}
          </button>
        ) : null}
        {locked ? (
          <div className="flex items-center gap-2">
            {allCorrect ? (
              <span className="text-green-600 font-medium">✓ {t('exercise.correctFill')}</span>
            ) : (
              <span className="text-red-600 font-medium">✗ {t('exercise.wrongFill')}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
