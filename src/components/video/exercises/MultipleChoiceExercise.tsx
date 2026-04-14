'use client'

/**
 * 选择题练习组件
 *
 * 从题干解析 A/B/C/D 选项，用户点击选择后显示正确/错误及解析。
 * Neo-brutalism 风格，与 FillBlankExercise 保持一致。
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { VideoExercise } from '@/types/video'
import type { ExerciseProgressItem } from '@/hooks/useExerciseProgress'
import { Check, X, ChevronRight, ListChecks, RotateCcw } from 'lucide-react'

export interface MultipleChoiceExerciseProps {
  exercises: VideoExercise[]
  progressMap: Map<string, ExerciseProgressItem> | null
  onRecordAnswer: (exerciseId: string, isCorrect: boolean) => void
}

interface ParsedOption {
  label: string
  text: string
}

interface ParsedQuestion {
  stem: string
  options: ParsedOption[]
  correctLabel: string
}

function parseOptions(questionText: string, answer: string, metadataOptions?: Record<string, string>): ParsedQuestion {
  // 优先使用 metadata 中的选项（新格式）
  if (metadataOptions && Object.keys(metadataOptions).length > 0) {
    const options = Object.entries(metadataOptions).map(([label, text]) => ({
      label: label.toUpperCase(),
      text: text.trim(),
    }))
    return {
      stem: questionText,
      options,
      correctLabel: answer.trim().toUpperCase().charAt(0)
    }
  }

  // 兼容旧格式：从题目文本中解析选项
  const optionPattern = /([A-D])[.．)）、]\s*([^A-D]*?)(?=[A-D][.．)）、]|$)/gi
  const options: ParsedOption[] = []
  let match

  while ((match = optionPattern.exec(questionText)) !== null) {
    options.push({
      label: match[1].toUpperCase(),
      text: match[2].trim(),
    })
  }

  if (options.length < 2) {
    return { stem: questionText, options: [], correctLabel: answer.trim().toUpperCase().charAt(0) }
  }

  const firstOptionIdx = questionText.search(/[A-D][.．)）、]/i)
  const stem = firstOptionIdx > 0 ? questionText.slice(0, firstOptionIdx).trim() : ''
  const correctLabel = answer.trim().toUpperCase().charAt(0)

  return { stem, options, correctLabel }
}

export function MultipleChoiceExercise({
  exercises,
  progressMap,
  onRecordAnswer,
}: MultipleChoiceExerciseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedLabel, setSelectedLabel] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  if (exercises.length === 0) return null

  const exercise = exercises[currentIndex]
  const meta = exercise.exercise_metadata as { question?: string; answer?: string; explanation?: string; options?: Record<string, string> } | null
  const questionText = meta?.question || exercise.original_text || ''
  const answer = meta?.answer || exercise.answer_text || ''
  const explanation = meta?.explanation || ''
  const metadataOptions = meta?.options

  const parsed = parseOptions(questionText, answer, metadataOptions)
  const isCorrect = selectedLabel === parsed.correctLabel

  const handleSubmit = useCallback(() => {
    if (!selectedLabel || submitted) return
    setSubmitted(true)
    onRecordAnswer(exercise.id, selectedLabel === parsed.correctLabel)
  }, [selectedLabel, submitted, exercise.id, parsed.correctLabel, onRecordAnswer])

  const handleNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setSelectedLabel(null)
      setSubmitted(false)
    }
  }, [currentIndex, exercises.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setSelectedLabel(null)
      setSubmitted(false)
    }
  }, [currentIndex])

  const handleRetry = useCallback(() => {
    setSelectedLabel(null)
    setSubmitted(false)
  }, [])

  const existingProgress = progressMap?.get(exercise.id)

  return (
    <div className="mb-6">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-amber-400 border-[2px] border-black">
          <ListChecks className="w-4 h-4 text-black" />
        </div>
        <h3 className="text-base font-black text-black dark:text-white">选择题</h3>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
          ({exercises.length} 题)
        </span>
      </div>

      {/* 卡片 */}
      <div className="border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
        {/* 进度条 */}
        <div className="bg-amber-200 dark:bg-amber-900/40 px-3 py-2 border-b-[3px] border-black dark:border-gray-600 flex items-center justify-between">
          <span className="text-xs font-black text-black dark:text-white">
            {currentIndex + 1} / {exercises.length}
          </span>
          {existingProgress && (
            <span className={cn(
              'px-1.5 py-0.5 text-xs font-black border-[2px] border-black',
              existingProgress.isCorrect ? 'bg-[#B4F416] text-black' : 'bg-[#FF6B6B] text-white'
            )}>
              {existingProgress.isCorrect ? '已答对' : '已答错'}
            </span>
          )}
        </div>

        <div className="p-3 space-y-3">
          {/* 题干 */}
          {parsed.stem && (
            <p className="text-sm leading-relaxed font-medium text-black dark:text-white">
              {parsed.stem}
            </p>
          )}

          {/* 选项 */}
          {parsed.options.length > 0 && (
            <div className="space-y-2">
              {parsed.options.map(opt => {
                const isSelected = selectedLabel === opt.label
                const isCorrectOption = opt.label === parsed.correctLabel

                let btnClass = 'bg-white dark:bg-gray-700 border-[2px] border-black dark:border-gray-600'
                if (submitted) {
                  if (isCorrectOption) {
                    btnClass = 'bg-[#B4F416] border-[3px] border-black'
                  } else if (isSelected && !isCorrectOption) {
                    btnClass = 'bg-[#FF6B6B] border-[3px] border-black text-white'
                  } else {
                    btnClass = 'bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-600 opacity-50'
                  }
                } else if (isSelected) {
                  btnClass = 'bg-amber-100 dark:bg-amber-900/30 border-[3px] border-black'
                }

                return (
                  <button
                    key={opt.label}
                    onClick={() => !submitted && setSelectedLabel(opt.label)}
                    disabled={submitted}
                    className={cn(
                      'w-full text-left px-3 py-2 transition-all flex items-start gap-2',
                      !submitted && 'hover:-translate-y-0.5 hover:shadow-[2px_2px_0px_0px_#000]',
                      btnClass
                    )}
                  >
                    <span className={cn(
                      'flex-shrink-0 w-6 h-6 border-[2px] border-black flex items-center justify-center text-xs font-black',
                      submitted && isCorrectOption && 'bg-black text-white',
                      submitted && isSelected && !isCorrectOption && 'bg-black text-white',
                      !submitted && isSelected && 'bg-black text-white',
                    )}>
                      {opt.label}
                    </span>
                    <span className="text-sm text-black dark:text-white pt-0.5">{opt.text}</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* 提交后显示解析 */}
          {submitted && (
            <div className={cn(
              'p-3 border-[3px]',
              isCorrect
                ? 'bg-[#B4F416] border-black'
                : 'bg-[#FF6B6B] border-black text-white'
            )}>
              <div className="flex items-center gap-2 mb-1">
                {isCorrect ? <Check className="w-4 h-4 text-black" /> : <X className="w-4 h-4" />}
                <span className="text-sm font-black">{isCorrect ? '正确!' : '错误'}</span>
              </div>
              {explanation && (
                <p className={cn('text-sm mt-1', isCorrect ? 'text-black/70' : 'text-white/80')}>
                  {explanation}
                </p>
              )}
            </div>
          )}

          {/* 操作按钮 */}
          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrev}
                disabled={currentIndex === 0}
                className="px-3 py-1.5 text-xs font-bold border-[2px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[2px_2px_0px_0px_#000] disabled:opacity-30 hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                上一题
              </button>
              {submitted && !isCorrect && (
                <button
                  onClick={handleRetry}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-[2px] border-black dark:border-gray-600 bg-amber-100 dark:bg-amber-900/30 shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  重试
                </button>
              )}
            </div>

            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={!selectedLabel}
                className={cn(
                  'px-4 py-1.5 text-xs font-black border-[2px] border-black transition-all',
                  selectedLabel
                    ? 'bg-amber-400 text-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                )}
              >
                提交
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={currentIndex >= exercises.length - 1}
                className="flex items-center gap-1 px-4 py-1.5 text-xs font-black bg-[#B4F416] text-black border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 disabled:opacity-30 transition-all"
              >
                下一题 <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
