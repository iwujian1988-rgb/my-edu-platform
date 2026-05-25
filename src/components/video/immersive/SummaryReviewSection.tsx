'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle, XCircle, HelpCircle } from 'lucide-react'
import type { VideoWordCard, VideoExpressionCard, CardStatus } from '@/types/video'

interface SummaryReviewSectionProps {
  words: VideoWordCard[]
  expressions: VideoExpressionCard[]
  getCardStatus: (cardType: 'word' | 'expression', cardId: string) => CardStatus | undefined
  exerciseProgressMap: Map<string, { isCorrect: boolean; attempts: number }> | null
  fillBlankExercises: Array<Record<string, unknown>>
  multipleChoiceExercises: Array<Record<string, unknown>>
}

export function SummaryReviewSection({
  words,
  expressions,
  getCardStatus,
  exerciseProgressMap,
  fillBlankExercises,
  multipleChoiceExercises,
}: SummaryReviewSectionProps) {
  const unknownWords = useMemo(
    () => words.filter(w => getCardStatus('word', w.id) === 'unknown'),
    [words, getCardStatus]
  )

  const unknownExpressions = useMemo(
    () => expressions.filter(e => getCardStatus('expression', e.id) === 'unknown'),
    [expressions, getCardStatus]
  )

  const wrongExercises = useMemo(() => {
    if (!exerciseProgressMap) return []
    const all = [...fillBlankExercises, ...multipleChoiceExercises]
    return all.filter(ex => {
      const id = (ex as Record<string, unknown>).id as string
      const progress = exerciseProgressMap.get(id)
      return progress && !progress.isCorrect
    })
  }, [exerciseProgressMap, fillBlankExercises, multipleChoiceExercises])

  const hasContent = unknownWords.length > 0 || unknownExpressions.length > 0 || wrongExercises.length > 0

  if (!hasContent) {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <CheckCircle className="w-10 h-10 text-green-500" />
        <p className="text-sm font-bold text-green-600 dark:text-green-400">全部掌握</p>
        <p className="text-xs text-gray-400">没有错题和生词需要复习</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {wrongExercises.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-black dark:text-white mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-red-500" />
            错题 ({wrongExercises.length})
          </h3>
          <div className="space-y-2">
            {wrongExercises.map((ex, i) => {
              const text = ((ex as Record<string, unknown>).text_with_blanks || (ex as Record<string, unknown>).original_text || '') as string
              return (
                <div
                  key={i}
                  className="p-3 bg-red-50 dark:bg-red-900/20 border-[2px] border-red-300 dark:border-red-800 rounded-lg text-sm"
                >
                  {text.slice(0, 100)}{text.length > 100 ? '...' : ''}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {unknownWords.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-black dark:text-white mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-yellow-500" />
            不认识的单词 ({unknownWords.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unknownWords.map(word => (
              <span
                key={word.id}
                className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border-[2px] border-yellow-300 dark:border-yellow-800 rounded-full text-sm font-bold"
              >
                {word.word}
              </span>
            ))}
          </div>
        </div>
      )}

      {unknownExpressions.length > 0 && (
        <div>
          <h3 className="text-sm font-black text-black dark:text-white mb-2 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-yellow-500" />
            不认识的表达 ({unknownExpressions.length})
          </h3>
          <div className="flex flex-wrap gap-2">
            {unknownExpressions.map(expr => (
              <span
                key={expr.id}
                className="px-3 py-1.5 bg-yellow-50 dark:bg-yellow-900/20 border-[2px] border-yellow-300 dark:border-yellow-800 rounded-full text-sm font-bold"
              >
                {expr.expression}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
