'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/exercises/MatchPairs.vue
 *
 * 左列原序、右列打乱。点左侧 → 点右侧 → 形成一条配对。锁定后高亮对错。
 *
 * Vue 用 ref [...].sort(() => Math.random() - 0.5) 在 setup 时打乱一次；
 * React 用 useState 初始化器（lazy init）保证只在挂载时打乱一次，避免
 * 每次 render 都重新洗牌。
 *
 * ⚠️ hydration 注意：SSR 不渲染洗牌结果（每次随机），客户端首次渲染也会随机，
 * 可能造成 hydration mismatch。这里允许该差异（属于交互组件，会在客户端立即可见），
 * 如果未来要严格一致，应改成 useEffect 中再洗牌。
 */

import { useState } from 'react'
import { t } from '@/lib/maxclass/i18n'
import type { MatchPairsStep, MatchPair } from './types'

interface MatchEntry {
  leftIdx: number
  rightIdx: number
}

function shuffle<T>(arr: T[]): T[] {
  const next = [...arr]
  for (let i = next.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[next[i], next[j]] = [next[j], next[i]]
  }
  return next
}

export function MatchPairs({
  step,
  onSubmit,
}: {
  step: MatchPairsStep
  onSubmit?: (correct: boolean) => void
}) {
  // 右列洗牌（lazy init，只在挂载时执行一次）
  const [shuffled] = useState<MatchPair[]>(() => shuffle(step.pairs))
  const [selectedLeft, setSelectedLeft] = useState<number | null>(null)
  const [matches, setMatches] = useState<MatchEntry[]>([])
  const [locked, setLocked] = useState(false)

  function selectLeft(i: number) {
    if (locked) return
    if (matches.some(m => m.leftIdx === i)) return
    setSelectedLeft(i)
  }
  function selectRight(i: number) {
    if (locked || selectedLeft === null) return
    if (matches.some(m => m.rightIdx === i)) return
    setMatches(prev => [...prev, { leftIdx: selectedLeft, rightIdx: i }])
    setSelectedLeft(null)
  }
  function removeMatch(i: number) {
    setMatches(prev => prev.filter((_, idx) => idx !== i))
  }

  const allCorrect =
    matches.length === step.pairs.length &&
    matches.every(m => {
      const rightText = step.pairs[m.leftIdx].right
      const matchedRight = shuffled[m.rightIdx].right
      return rightText === matchedRight
    })

  function check() {
    setLocked(true)
    onSubmit?.(allCorrect)
  }

  function leftClass(i: number) {
    const matched = matches.find(m => m.leftIdx === i)
    if (locked) {
      if (!matched) return 'border-gray-200 bg-gray-50 text-gray-400'
      const leftPair = step.pairs[matched.leftIdx]
      const correctRight = shuffled[matched.rightIdx].right
      return leftPair.right === correctRight
        ? 'border-green-400 bg-green-50 text-green-700'
        : 'border-red-400 bg-red-50 text-red-700'
    }
    if (selectedLeft === i) return 'border-primary-500 bg-primary-50 text-primary-700'
    if (matched) return 'border-primary-300 bg-primary-50/50 text-primary-600'
    return 'border-gray-200 hover:border-gray-300 text-gray-700'
  }
  function rightClass(i: number) {
    const matched = matches.find(m => m.rightIdx === i)
    if (locked) {
      if (!matched) return 'border-gray-200 bg-gray-50 text-gray-400'
      const leftPair = step.pairs[matched.leftIdx]
      const correctRight = shuffled[matched.rightIdx].right
      return leftPair.right === correctRight
        ? 'border-green-400 bg-green-50 text-green-700'
        : 'border-red-400 bg-red-50 text-red-700'
    }
    if (matched) return 'border-primary-300 bg-primary-50/50 text-primary-600'
    return 'border-gray-200 hover:border-gray-300 text-gray-700'
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 font-medium">{step.instruction}</p>

      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          {step.pairs.map((pair, i) => (
            <button
              key={`l-${i}`}
              type="button"
              onClick={() => selectLeft(i)}
              disabled={locked}
              className={`w-full p-3 rounded-lg border-2 text-left font-medium transition-all text-sm ${leftClass(i)}`}
            >
              {pair.left}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {shuffled.map((pair, i) => (
            <button
              key={`r-${i}`}
              type="button"
              onClick={() => selectRight(i)}
              disabled={locked}
              className={`w-full p-3 rounded-lg border-2 text-left font-medium transition-all text-sm ${rightClass(i)}`}
            >
              {pair.right}
            </button>
          ))}
        </div>
      </div>

      {matches.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {matches.map((m, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs px-3 py-1.5 rounded-full"
            >
              {step.pairs[m.leftIdx].left} ↔ {shuffled[m.rightIdx].right}
              {!locked ? (
                <button
                  type="button"
                  onClick={() => removeMatch(i)}
                  className="ml-1 text-primary-400 hover:text-red-500"
                  aria-label="Remove match"
                >
                  ×
                </button>
              ) : null}
            </span>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex items-center gap-4">
        {!locked && matches.length === step.pairs.length ? (
          <button type="button" onClick={check} className="btn-primary">
            {t('common.verify')}
          </button>
        ) : null}
        {!locked && matches.length < step.pairs.length ? (
          <span className="text-sm text-gray-400">
            {matches.length} / {step.pairs.length} {t('exercise.pairs')}
          </span>
        ) : null}
        {locked ? (
          <div>
            {allCorrect ? (
              <span className="text-green-600 font-medium">✓ {t('exercise.allPairsCorrect')}</span>
            ) : (
              <span className="text-red-600 font-medium">✗ {t('exercise.somePairsWrong')}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
