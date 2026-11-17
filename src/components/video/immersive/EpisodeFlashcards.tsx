'use client'

import { useState } from 'react'
import type { VideoExpressionCard, VideoWordCard } from '@/types/video'

interface EpisodeFlashcardsProps {
  words: VideoWordCard[]
  expressions: VideoExpressionCard[]
}

export function EpisodeFlashcards({ words, expressions }: EpisodeFlashcardsProps) {
  const [open, setOpen] = useState(false)
  const [index, setIndex] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const cards = [
    ...words.map(word => ({ id: word.id, label: '词汇', text: word.word, meaning: word.chinese_definition, example: word.example_from_video })),
    ...expressions.map(expression => ({ id: expression.id, label: '地道表达', text: expression.expression, meaning: expression.meaning, example: expression.context })),
  ]
  if (cards.length === 0) return null
  const card = cards[index]

  function move(nextIndex: number) {
    setIndex(nextIndex)
    setRevealed(false)
  }

  return (
    <div className="mb-4 border border-[#e5ded1] bg-[#faf8f2] p-4 dark:border-stone-700 dark:bg-stone-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-stone-800 dark:text-stone-100">本期闪卡</p>
          <p className="mt-1 text-xs text-stone-600 dark:text-stone-400">{cards.length} 张词汇和表达 · 先想一想，再看释义</p>
        </div>
        <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} className="border border-stone-700 bg-stone-800 px-4 py-2 text-sm font-bold text-white hover:bg-stone-700">
          {open ? '收起闪卡' : '开始复习'}
        </button>
      </div>
      {open && card && (
        <div className="mt-4 border border-[#e8e1d4] bg-white p-5 dark:border-stone-700 dark:bg-stone-800">
          <div className="flex justify-between text-xs font-semibold text-[#9b6c59] dark:text-orange-300"><span>{card.label}</span><span>{index + 1} / {cards.length}</span></div>
          <p className="mt-4 text-xl font-bold text-gray-900 dark:text-white">{card.text}</p>
          {revealed ? (
            <div className="mt-4 space-y-2 text-sm text-gray-700 dark:text-gray-200">
              <p>{card.meaning}</p>
              {card.example && <p className="border-l-2 border-[#d6b8a5] pl-3 leading-relaxed">视频里：{card.example}</p>}
            </div>
          ) : <p className="mt-3 text-sm text-gray-500">先想一想是什么意思</p>}
          <div className="mt-5 flex flex-wrap gap-2">
            <button type="button" onClick={() => setRevealed(!revealed)} className="bg-stone-800 px-4 py-2 text-sm font-bold text-white dark:bg-stone-200 dark:text-stone-900">{revealed ? '隐藏释义' : '查看释义'}</button>
            <button type="button" disabled={index === 0} onClick={() => move(index - 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-gray-600">上一张</button>
            <button type="button" disabled={index === cards.length - 1} onClick={() => move(index + 1)} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold disabled:opacity-40 dark:border-gray-600">下一张</button>
          </div>
        </div>
      )}
    </div>
  )
}
