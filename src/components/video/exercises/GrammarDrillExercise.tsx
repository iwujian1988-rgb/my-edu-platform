'use client'

/**
 * 语法练习组件
 *
 * 显示语法题目，用户输入答案，提交后对比参考答案和解析。
 * Neo-brutalism 风格。
 */

import { useState, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { VideoExercise } from '@/types/video'
import type { ExerciseProgressItem } from '@/hooks/useExerciseProgress'
import { ChevronRight, BookOpen, Check, X, RotateCcw } from 'lucide-react'

export interface GrammarDrillExerciseProps {
  exercises: VideoExercise[]
  progressMap: Map<string, ExerciseProgressItem> | null
  onRecordAnswer: (exerciseId: string, isCorrect: boolean) => void
}

function isAnswerMatch(userAnswer: string, referenceAnswer: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().trim().replace(/[.。!！?？,，;；:：、\s]+/g, '')
  return normalize(userAnswer) === normalize(referenceAnswer)
}

export function GrammarDrillExercise({
  exercises,
  progressMap,
  onRecordAnswer,
}: GrammarDrillExerciseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [userInput, setUserInput] = useState('')
  const [submitted, setSubmitted] = useState(false)

  if (exercises.length === 0) return null

  const exercise = exercises[currentIndex]
  const meta = exercise.exercise_metadata as { question?: string; answer?: string; explanation?: string } | null
  const questionText = meta?.question || exercise.original_text || ''
  const referenceAnswer = meta?.answer || exercise.answer_text || ''
  const explanation = meta?.explanation || ''

  const handleSubmit = useCallback(() => {
    if (!userInput.trim() || submitted) return
    const correct = isAnswerMatch(userInput, referenceAnswer)
    setSubmitted(true)
    onRecordAnswer(exercise.id, correct)
  }, [userInput, submitted, exercise.id, referenceAnswer, onRecordAnswer])

  const handleNext = useCallback(() => {
    if (currentIndex < exercises.length - 1) {
      setCurrentIndex(prev => prev + 1)
      setUserInput('')
      setSubmitted(false)
    }
  }, [currentIndex, exercises.length])

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(prev => prev - 1)
      setUserInput('')
      setSubmitted(false)
    }
  }, [currentIndex])

  const handleRedo = useCallback(() => {
    setUserInput('')
    setSubmitted(false)
  }, [])

  const existingProgress = progressMap?.get(exercise.id)

  // 计算当前答案是否正确（用于显示）
  const correct = submitted ? isAnswerMatch(userInput, referenceAnswer) : false

  return (
    <div className="mb-6">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-[#FF6B6B] border-[2px] border-black">
          <BookOpen className="w-4 h-4 text-black" />
        </div>
        <h3 className="text-base font-black text-black dark:text-white">语法练习</h3>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
          ({exercises.length} 题)
        </span>
      </div>

      {/* 卡片 */}
      <div className="border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
        {/* 进度条 */}
        <div className="bg-[#FF6B6B]/30 dark:bg-rose-900/40 px-3 py-2 border-b-[3px] border-black dark:border-gray-600 flex items-center justify-between">
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
          {/* 题目 */}
          <div className="p-3 bg-gray-50 dark:bg-gray-700 border-[2px] border-black dark:border-gray-600">
            <p className="text-sm leading-relaxed text-black dark:text-white whitespace-pre-wrap">
              {questionText}
            </p>
          </div>

          {/* 用户输入 / 提交后结果 */}
          {!submitted ? (
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="请输入你的答案..."
              rows={3}
              className="w-full px-3 py-2 border-[3px] border-black dark:border-gray-600 text-sm focus:outline-none resize-none bg-white dark:bg-gray-800 text-black dark:text-white"
            />
          ) : (
            <div className={cn(
              'p-3 border-[3px] border-black',
              correct ? 'bg-[#B4F416]' : 'bg-[#FF6B6B]'
            )}>
              <div className="flex items-center gap-2 mb-1">
                {correct ? <Check className="w-4 h-4 text-black" /> : <X className="w-4 h-4 text-white" />}
                <span className={cn('text-sm font-black', correct ? 'text-black' : 'text-white')}>
                  {correct ? '正确!' : '与参考答案不同'}
                </span>
              </div>

              {!correct && (
                <div className={cn('text-sm mt-1 space-y-1', correct ? 'text-black/70' : 'text-white')}>
                  <div>
                    <span className="font-bold">你的答案：</span>
                    <span className="line-through opacity-70">{userInput.trim()}</span>
                  </div>
                  <div>
                    <span className="font-bold">参考答案：</span>
                    <span className="font-black">{referenceAnswer}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 解析 */}
          {submitted && explanation && (
            <div className="p-3 bg-gray-50 dark:bg-gray-700 border-[2px] border-black dark:border-gray-600">
              <p className="text-xs font-black text-gray-600 dark:text-gray-400 mb-1">解析</p>
              <p className="text-sm text-black dark:text-white whitespace-pre-wrap">{explanation}</p>
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
              {submitted && !isAnswerMatch(userInput, referenceAnswer) && (
                <button
                  onClick={handleRedo}
                  className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold border-[2px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
                >
                  <RotateCcw className="w-3 h-3" />
                  重做
                </button>
              )}
            </div>

            {!submitted ? (
              <button
                onClick={handleSubmit}
                disabled={!userInput.trim()}
                className={cn(
                  'px-4 py-1.5 text-xs font-black border-[2px] border-black transition-all',
                  userInput.trim()
                    ? 'bg-[#FF6B6B] text-white shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5'
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
