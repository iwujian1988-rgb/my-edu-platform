'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/exercises/Reorder.vue
 * 拖拽排序：HTML5 drag-drop + 上/下箭头按钮双交互；锁定后用 step.correctOrder 比对。
 *
 * Vue 用 ref + splice；React 用 useState 新数组（不可变更新）。
 */

import { useState } from 'react'
import { t } from '@/lib/maxclass/i18n'
import type { ReorderStep, ReorderItem } from './types'

export function Reorder({
  step,
  onSubmit,
}: {
  step: ReorderStep
  onSubmit?: (correct: boolean) => void
}) {
  const [items, setItems] = useState<ReorderItem[]>(() => [...step.items])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [locked, setLocked] = useState(false)

  const correct = (() => {
    const order = items.map(it => it.id)
    return JSON.stringify(order) === JSON.stringify(step.correctOrder)
  })()

  function drop(targetIdx: number) {
    if (locked || dragIdx === null) return
    setItems(prev => {
      const next = [...prev]
      const [moved] = next.splice(dragIdx, 1)
      next.splice(targetIdx, 0, moved)
      return next
    })
    setDragIdx(null)
  }

  function moveUp(idx: number) {
    if (locked || idx <= 0) return
    setItems(prev => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]]
      return next
    })
  }
  function moveDown(idx: number) {
    if (locked || idx >= items.length - 1) return
    setItems(prev => {
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]]
      return next
    })
  }

  function check() {
    setLocked(true)
    onSubmit?.(correct)
  }

  function itemClass(idx: number) {
    if (!locked) {
      return dragIdx === idx
        ? 'border-primary-400 bg-primary-50 opacity-50'
        : 'border-gray-200 hover:border-gray-300 bg-white'
    }
    const itemId = items[idx].id
    const correctId = step.correctOrder[idx]
    return itemId === correctId
      ? 'border-green-400 bg-green-50 cursor-default'
      : 'border-red-400 bg-red-50 cursor-default'
  }

  return (
    <div>
      <p className="text-sm text-gray-500 mb-4 font-medium">{step.instruction}</p>

      <div className="space-y-2">
        {items.map((item, displayIdx) => (
          <div
            key={item.id}
            draggable={!locked}
            onDragStart={() => !locked && setDragIdx(displayIdx)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => drop(displayIdx)}
            className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${
              locked ? '' : 'cursor-grab select-none'
            } ${itemClass(displayIdx)}`}
          >
            <span className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-sm font-bold text-gray-500">
              {displayIdx + 1}
            </span>
            <span className="flex-1 font-medium">{item.text}</span>
            <div className="flex flex-col gap-0.5">
              <button
                type="button"
                onClick={e => { e.stopPropagation(); moveUp(displayIdx) }}
                disabled={locked || displayIdx === 0}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                aria-label="Move up"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 12l5-5 5 5z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={e => { e.stopPropagation(); moveDown(displayIdx) }}
                disabled={locked || displayIdx === items.length - 1}
                className="text-gray-400 hover:text-gray-700 disabled:opacity-30"
                aria-label="Move down"
              >
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 8l5 5 5-5z" />
                </svg>
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 flex items-center gap-4">
        {!locked ? (
          <button type="button" onClick={check} className="btn-primary">
            {t('common.verify')}
          </button>
        ) : null}
        {locked ? (
          <div>
            {correct ? (
              <span className="text-green-600 font-medium">✓ {t('exercise.correctOrder')}</span>
            ) : (
              <span className="text-red-600 font-medium">✗ {t('exercise.wrongOrder')}</span>
            )}
          </div>
        ) : null}
      </div>
    </div>
  )
}
