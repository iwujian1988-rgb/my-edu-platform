'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/exercises/TrueFalse.vue
 * 多条判断题：每条独立选 Vrai/Faux，全做后统一校验。
 */

import { useState } from 'react'
import { t } from '@/lib/maxclass/i18n'
import type { TrueFalseStep } from './types'

export function TrueFalse({
  step,
  onSubmit,
}: {
  step: TrueFalseStep
  onSubmit?: (correct: boolean) => void
}) {
  const [answers, setAnswers] = useState<Record<number, boolean>>({})
  const [results, setResults] = useState<Record<number, boolean>>({})
  const [locked, setLocked] = useState(false)

  const allAnswered = step.statements.every(s => answers[s.id] !== undefined)
  const allCorrect = step.statements.every(s => answers[s.id] === s.correct)

  function answer(id: number, value: boolean) {
    if (!locked) setAnswers(prev => ({ ...prev, [id]: value }))
  }

  function check() {
    const next: Record<number, boolean> = {}
    step.statements.forEach(s => {
      next[s.id] = answers[s.id] === s.correct
    })
    setResults(next)
    setLocked(true)
    onSubmit?.(step.statements.every(s => answers[s.id] === s.correct))
  }

  function statementClass(id: number) {
    if (!locked) return 'border-gray-200'
    return results[id] ? 'border-green-300 bg-green-50/50' : 'border-red-300 bg-red-50/50'
  }

  function btnClass(id: number, val: boolean) {
    if (!locked) {
      return answers[id] === val
        ? 'bg-primary-700 text-white'
        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
    }
    const correct = step.statements.find(s => s.id === id)?.correct
    if (val === correct) return 'bg-green-600 text-white'
    if (val === answers[id] && val !== correct) return 'bg-red-500 text-white'
    return 'bg-gray-100 text-gray-400'
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-6 font-medium">{step.instruction}</p>

      <div className="space-y-4">
        {step.statements.map(stmt => (
          <div
            key={stmt.id}
            className={`p-4 rounded-lg border-2 transition-colors ${statementClass(stmt.id)}`}
          >
            <p className="font-medium text-gray-800 mb-3">{stmt.text}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => answer(stmt.id, true)}
                disabled={locked}
                className={`px-5 py-2 rounded text-sm font-bold transition-colors ${btnClass(stmt.id, true)}`}
              >
                {t('exercise.true')}
              </button>
              <button
                type="button"
                onClick={() => answer(stmt.id, false)}
                disabled={locked}
                className={`px-5 py-2 rounded text-sm font-bold transition-colors ${btnClass(stmt.id, false)}`}
              >
                {t('exercise.false')}
              </button>
              {locked && results[stmt.id] !== undefined ? (
                <span
                  className={`flex items-center text-sm font-medium ${
                    results[stmt.id] ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  {results[stmt.id] ? '✓' : '✗'}
                  {!results[stmt.id] ? (
                    <span className="ml-2 text-gray-500">
                      ({stmt.correct ? t('exercise.true') : t('exercise.false')})
                    </span>
                  ) : null}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6">
        {!locked && allAnswered ? (
          <button type="button" onClick={check} className="btn-primary">
            {t('common.verify')}
          </button>
        ) : null}
        {locked ? (
          <div>
            {allCorrect ? (
              <span className="text-green-600 font-medium">✓ {t('exercise.allAnswersCorrect')}</span>
            ) : (
              <span className="text-red-600 font-medium">✗ {t('exercise.someAnswersWrong')}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
