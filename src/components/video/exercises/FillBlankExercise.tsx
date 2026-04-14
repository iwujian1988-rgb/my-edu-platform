/**
 * 填空练习组件
 *
 * 用于"写"模式，根据难度显示不同策略的填空题
 * - beginner: 1个空，显示首字母提示
 * - intermediate: 2-3个空，显示首尾字母提示
 * - advanced: 完整听写，无提示
 *
 * v2: 每空独立输入框 + 进度持久化 + 完成总结
 */

'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import { cn } from '@/lib/utils'
import {
  Check,
  X,
  ChevronRight,
  RotateCcw,
  HelpCircle,
  Sparkles,
  Target,
  Zap,
  Play,
  Trophy,
  RefreshCw,
  Pencil,
} from 'lucide-react'
import type { VideoExercise, ExerciseDifficulty } from '@/types/video'
import type { ExerciseProgressItem } from '@/hooks/useExerciseProgress'

// 难度配置 - Neo-brutalism 风格
const DIFFICULTY_CONFIG: Record<ExerciseDifficulty, {
  label: string
  description: string
  icon: React.ElementType
  bgColor: string
}> = {
  beginner: {
    label: '入门',
    description: '1个空，首字母提示',
    icon: Sparkles,
    bgColor: 'bg-[#B4F416]',
  },
  intermediate: {
    label: '进阶',
    description: '2-3个空，首尾字母提示',
    icon: Target,
    bgColor: 'bg-[#4ECDC4]',
  },
  advanced: {
    label: '困难',
    description: '完整听写，无提示',
    icon: Zap,
    bgColor: 'bg-[#FF6B6B]',
  },
}

export interface FillBlankExerciseProps {
  exercises: VideoExercise[]
  progressMap: Map<string, ExerciseProgressItem> | null
  onRecordAnswer: (exerciseId: string, isCorrect: boolean) => void
  onPlaySegment?: (startTime: number, endTime: number) => void
}

/** 每个空位的本地状态 */
interface BlankState {
  userAnswer: string
  submitted: boolean
  correct: boolean | null  // null=未提交
}

/** 每道题的本地状态，key 是 exerciseId */
type LocalExerciseState = Map<string, {
  blanks: BlankState[]
  submitted: boolean
}>

export function FillBlankExercise({
  exercises,
  progressMap,
  onRecordAnswer,
  onPlaySegment,
}: FillBlankExerciseProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [localStates, setLocalStates] = useState<LocalExerciseState>(() => new Map())
  const [showHint, setShowHint] = useState(false)
  const [showSummary, setShowSummary] = useState(false)
  const [resettedIds, setResettedIds] = useState<Set<string>>(new Set())
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())

  // 显示所有练习题，不按难度筛选
  const filteredExercises = exercises

  // 统计各难度的题目数量（用于显示提示）
  const difficultyCounts = useMemo(() => {
    const counts: Record<ExerciseDifficulty, number> = {
      beginner: 0,
      intermediate: 0,
      advanced: 0,
    }
    exercises.forEach((e) => {
      counts[e.difficulty]++
    })
    return counts
  }, [exercises])

  const currentExercise = filteredExercises[currentIndex]

  // 当前题目的难度（用于显示）
  const currentDifficulty = currentExercise?.difficulty

  // 获取当前题目的本地状态，如果不存在则初始化
  const getCurrentLocalState = useCallback((exercise: VideoExercise) => {
    const existing = localStates.get(exercise.id)
    if (existing) return existing

    const blankCount = exercise.answers?.length || 1

    // 被重置过的题、或无持久化记录 → 显示为未答
    const persisted = resettedIds.has(exercise.id) ? null : progressMap?.get(exercise.id)

    if (persisted) {
      // 已有持久化记录，标记为已完成
      const blanks: BlankState[] = Array.from({ length: blankCount }, () => ({
        userAnswer: '',
        submitted: true,
        correct: persisted.isCorrect ? true : false,
      }))
      return { blanks, submitted: true }
    }

    return {
      blanks: Array.from({ length: blankCount }, () => ({
        userAnswer: '',
        submitted: false,
        correct: null,
      })),
      submitted: false,
    }
  }, [localStates, progressMap, resettedIds])

  // 判断某道题是否已完成（持久化或本地，排除已被重置的）
  const isExerciseCompleted = useCallback((exerciseId: string) => {
    if (resettedIds.has(exerciseId)) return false
    if (progressMap?.has(exerciseId)) return true
    const local = localStates.get(exerciseId)
    return local?.submitted === true
  }, [progressMap, localStates, resettedIds])

  // 统计所有练习题的完成情况
  const difficultyStats = useMemo(() => {
    const total = filteredExercises.length
    let completed = 0
    let correct = 0

    filteredExercises.forEach((e) => {
      if (isExerciseCompleted(e.id)) {
        completed++
        const progress = progressMap?.get(e.id)
        const local = localStates.get(e.id)
        if (progress?.isCorrect || local?.blanks.every(b => b.correct === true)) {
          correct++
        }
      }
    })

    return { completed, correct, total }
  }, [filteredExercises, isExerciseCompleted, progressMap, localStates, resettedIds])

  // 移除难度选择功能，不再需要

  // 更新某个空位的输入
  const handleBlankChange = useCallback(
    (exerciseId: string, blankIndex: number, value: string) => {
      setLocalStates((prev) => {
        const newMap = new Map(prev)
        const state = newMap.get(exerciseId) || {
          blanks: Array.from({ length: blankIndex + 1 }, () => ({
            userAnswer: '',
            submitted: false,
            correct: null as boolean | null,
          })),
          submitted: false,
        }

        // 确保 blanks 数组足够长
        while (state.blanks.length <= blankIndex) {
          state.blanks.push({ userAnswer: '', submitted: false, correct: null })
        }

        const newBlanks = [...state.blanks]
        newBlanks[blankIndex] = { ...newBlanks[blankIndex], userAnswer: value }
        newMap.set(exerciseId, { ...state, blanks: newBlanks })
        return newMap
      })
    },
    []
  )

  // 提交当前题目的答案
  const handleSubmit = useCallback(() => {
    if (!currentExercise) return

    const state = getCurrentLocalState(currentExercise)
    const answers = currentExercise.answers || []

    // 判定每个空位
    const newBlanks = state.blanks.map((blank, index) => {
      const correctAnswer = answers[index] || ''
      const isCorrect = blank.userAnswer.trim().toLowerCase() === correctAnswer.toLowerCase()
      return { ...blank, submitted: true, correct: isCorrect }
    })

    const allCorrect = newBlanks.every((b) => b.correct === true)

    setLocalStates((prev) => {
      const newMap = new Map(prev)
      newMap.set(currentExercise.id, { blanks: newBlanks, submitted: true })
      return newMap
    })

    // 持久化到后端
    onRecordAnswer(currentExercise.id, allCorrect)
  }, [currentExercise, getCurrentLocalState, onRecordAnswer])

  // 重置当前题目
  const handleReset = useCallback(() => {
    if (!currentExercise) return
    setLocalStates((prev) => {
      const newMap = new Map(prev)
      newMap.delete(currentExercise.id)
      return newMap
    })
    setResettedIds((prev) => new Set(prev).add(currentExercise.id))
    setShowHint(false)
  }, [currentExercise])

  // 重做错题：跳转到第一道未答对的题目
  const handleRedoWrong = useCallback(() => {
    const wrongIds = new Set<string>()
    const wrongIndex = filteredExercises.findIndex((e) => {
      const progress = progressMap?.get(e.id)
      if (!progress) return false
      if (!progress.isCorrect) {
        wrongIds.add(e.id)
        return true
      }
      return false
    })
    if (wrongIndex >= 0) {
      setLocalStates((prev) => {
        const newMap = new Map(prev)
        wrongIds.forEach(id => newMap.delete(id))
        return newMap
      })
      setResettedIds((prev) => {
        const next = new Set(prev)
        wrongIds.forEach(id => next.add(id))
        return next
      })
      setCurrentIndex(wrongIndex)
      setShowSummary(false)
    }
  }, [filteredExercises, progressMap])

  // 重新开始所有题目
  const handleRedoAll = useCallback(() => {
    setLocalStates(new Map())
    // 将所有题目标记为已重置
    setResettedIds((prev) => {
      const next = new Set(prev)
      filteredExercises.forEach(e => next.add(e.id))
      return next
    })
    setCurrentIndex(0)
    setShowSummary(false)
    setShowHint(false)
  }, [filteredExercises])

  // 下一题
  const handleNext = useCallback(() => {
    // 检查是否所有题都已完成
    const allDone = filteredExercises.every((e) => isExerciseCompleted(e.id))
    if (allDone) {
      setShowSummary(true)
      return
    }

    // 找下一道未完成的题
    for (let i = currentIndex + 1; i < filteredExercises.length; i++) {
      if (!isExerciseCompleted(filteredExercises[i].id)) {
        setCurrentIndex(i)
        setShowHint(false)
        return
      }
    }
    // 如果后面没有了，从头找
    for (let i = 0; i < currentIndex; i++) {
      if (!isExerciseCompleted(filteredExercises[i].id)) {
        setCurrentIndex(i)
        setShowHint(false)
        return
      }
    }
    // 全部完成
    setShowSummary(true)
  }, [currentIndex, filteredExercises, isExerciseCompleted])

  // 获取提示文本
  const getHintText = useCallback(
    (difficulty: ExerciseDifficulty, answer: string) => {
      if (answer.length <= 1) return answer

      switch (difficulty) {
        case 'beginner':
          return `${answer[0]}${'_'.repeat(answer.length - 1)}`
        case 'intermediate':
          if (answer.length <= 2) return answer
          return `${answer[0]}${'_'.repeat(answer.length - 2)}${answer[answer.length - 1]}`
        case 'advanced':
          return '_'.repeat(answer.length)
        default:
          return '_'.repeat(answer.length)
      }
    },
    []
  )

  // 渲染带独立输入框的填空文本
  const renderTextWithBlanks = useCallback(
    (exercise: VideoExercise) => {
      const textWithBlanks = exercise.text_with_blanks || ''
      const state = getCurrentLocalState(exercise)
      const parts = textWithBlanks.split(/(\[blank\])/g)

      let blankIndex = 0
      return parts.map((part, index) => {
        if (part === '[blank]') {
          const answer = exercise.answers?.[blankIndex] || ''
          const blankState = state.blanks[blankIndex]
          const currentBlankIndex = blankIndex
          blankIndex++

          // 已提交 → 显示结果
          if (blankState?.submitted) {
            const isCorrect = blankState.correct === true
            return (
              <span
                key={index}
                className={cn(
                  'inline-block px-2 py-0.5 font-black mx-0.5 border-b-[3px]',
                  isCorrect
                    ? 'bg-[#B4F416] text-black border-black'
                    : 'bg-[#FF6B6B] text-white border-[#FF6B6B]'
                )}
              >
                {isCorrect ? (
                  <span className="flex items-center gap-1">
                    {answer}
                    <Check className="w-3 h-3" />
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <span className="line-through opacity-70">{blankState.userAnswer}</span>
                    <span className="font-black">{answer}</span>
                  </span>
                )}
              </span>
            )
          }

          // 显示提示
          if (showHint) {
            return (
              <span
                key={index}
                className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 font-mono text-sm font-bold"
              >
                {getHintText(exercise.difficulty, answer)}
              </span>
            )
          }

          // 可编辑的输入框
          const inputId = `${exercise.id}-blank-${currentBlankIndex}`
          return (
            <input
              key={index}
              id={inputId}
              ref={(el) => {
                if (el) {
                  inputRefs.current.set(inputId, el)
                }
              }}
              type="text"
              value={blankState?.userAnswer || ''}
              onChange={(e) => handleBlankChange(exercise.id, currentBlankIndex, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit()
                }
              }}
              placeholder="填入单词"
              className={cn(
                'inline-block w-24 px-2 py-0.5 mx-0.5 text-center',
                'border-[3px] border-black dark:border-gray-600',
                'bg-white dark:bg-gray-800 text-black dark:text-white',
                'font-bold text-sm',
                'shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666]',
                'focus:outline-none focus:shadow-[3px_3px_0px_0px_#000]',
                'transition-shadow align-middle'
              )}
            />
          )
        }

        return <span key={index}>{part}</span>
      })
    },
    [getCurrentLocalState, showHint, getHintText, handleBlankChange, handleSubmit]
  )

  // 如果没有练习题
  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="font-black text-gray-400 dark:text-gray-500">暂无练习题</p>
      </div>
    )
  }

  // 移除难度选择界面

  // 完成总结面板
  if (showSummary) {
    const { completed, correct, total } = difficultyStats
    const wrongExercises = filteredExercises.filter((e) => {
      const progress = progressMap?.get(e.id)
      return progress && !progress.isCorrect
    })
    const accuracy = completed > 0 ? Math.round((correct / completed) * 100) : 0

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className={cn(
            'px-2 py-1 border-[2px] border-black text-xs font-black',
            'bg-gray-100 dark:bg-gray-700',
            'text-black dark:text-white'
          )}>
            全部练习
          </span>
        </div>

        {/* 统计卡片 */}
        <div className="p-4 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-5 h-5 text-[#B4F416]" />
            <span className="font-black text-base text-black dark:text-white">练习完成</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 border-[2px] border-black dark:border-gray-600">
              <div className="text-2xl font-black text-black dark:text-white">{completed}</div>
              <div className="text-xs font-bold text-gray-500">已完成</div>
            </div>
            <div className="text-center p-2 bg-[#B4F416] border-[2px] border-black">
              <div className="text-2xl font-black text-black">{correct}</div>
              <div className="text-xs font-bold text-black/70">正确</div>
            </div>
            <div className="text-center p-2 bg-gray-50 dark:bg-gray-700 border-[2px] border-black dark:border-gray-600">
              <div className="text-2xl font-black text-black dark:text-white">{accuracy}%</div>
              <div className="text-xs font-bold text-gray-500">正确率</div>
            </div>
          </div>
        </div>

        {/* 错题列表 */}
        {wrongExercises.length > 0 && (
          <div className="p-3 border-[3px] border-[#FF6B6B] bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000]">
            <div className="flex items-center gap-2 mb-2">
              <X className="w-4 h-4 text-[#FF6B6B]" />
              <span className="font-black text-sm text-black dark:text-white">
                错题 ({wrongExercises.length})
              </span>
            </div>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {wrongExercises.map((e) => {
                const progress = progressMap?.get(e.id)
                return (
                  <div
                    key={e.id}
                    className="flex items-center justify-between px-2 py-1 bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-xs"
                  >
                    <span className="font-medium text-black dark:text-white truncate flex-1 mr-2">
                      {e.original_text?.substring(0, 50)}...
                    </span>
                    {progress && (
                      <span className="text-[#FF6B6B] font-bold shrink-0">
                        {progress.attempts}次
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex gap-2">
          {wrongExercises.length > 0 && (
            <button
              onClick={handleRedoWrong}
              className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#FF6B6B] text-white border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 font-black text-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              重做错题
            </button>
          )}
          <button
            onClick={handleRedoAll}
            className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#B4F416] text-black border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 font-black text-sm transition-all"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            再练一次
          </button>
        </div>
      </div>
    )
  }

  const currentLocalState = currentExercise ? getCurrentLocalState(currentExercise) : null
  const isAlreadyCompleted = currentExercise ? isExerciseCompleted(currentExercise.id) : false

  return (
    <div className="mb-6">
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <div className="p-1.5 bg-[#B4F416] border-[2px] border-black">
          <Pencil className="w-4 h-4 text-black" />
        </div>
        <h3 className="text-base font-black text-black dark:text-white">填空题</h3>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
          ({exercises.length} 题)
        </span>
      </div>

      <div className="space-y-3">
      {/* 进度条 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="px-2 py-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 text-xs font-black">
            {currentIndex + 1} / {filteredExercises.length}
          </span>
          {currentDifficulty && (
            <span className={cn(
              'px-2 py-1 border-[2px] border-black text-xs font-black',
              DIFFICULTY_CONFIG[currentDifficulty].bgColor,
              'text-black'
            )}>
              {DIFFICULTY_CONFIG[currentDifficulty].label}
            </span>
          )}
        </div>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
          正确率: {difficultyStats.completed > 0 ? Math.round((difficultyStats.correct / difficultyStats.completed) * 100) : 0}%
        </span>
      </div>

      {/* 题目卡片 + 播放按钮 */}
      <div className="flex gap-2">
        <div className="flex-1 p-4 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
          {/* 中文语境提示 */}
          {currentExercise?.translation && (
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2 pb-2 border-b border-gray-200 dark:border-gray-600">
              💡 {currentExercise.translation}
            </p>
          )}
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">
            根据原文含义填入相关单词让句子通顺
          </p>
          <p className="text-base leading-relaxed font-medium text-black dark:text-white">
            {currentExercise && renderTextWithBlanks(currentExercise)}
          </p>
        </div>
        {/* 播放按钮：仅在有对应字幕时间时显示 */}
        {onPlaySegment && currentExercise?.subtitle_start_time != null && (
          <button
            onClick={() => {
              const startTime = currentExercise?.subtitle_start_time ?? 0
              const endTime = currentExercise?.subtitle_end_time ?? startTime + 5
              onPlaySegment(startTime, endTime)
            }}
            className="flex-shrink-0 w-12 flex items-center justify-center border-[3px] border-black dark:border-gray-600 bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] active:translate-y-0.5 transition-all"
            title="播放这段"
          >
            <Play className="w-5 h-5 text-black" fill="none" />
          </button>
        )}
      </div>

      {/* 已完成题目：显示结果 */}
      {isAlreadyCompleted && currentLocalState?.submitted && (
        <div
          className={cn(
            'p-3 border-[3px] border-black shadow-[3px_3px_0px_0px_#000]',
            currentLocalState.blanks.every(b => b.correct === true)
              ? 'bg-[#B4F416] text-black'
              : 'bg-[#FF6B6B] text-white'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {currentLocalState.blanks.every(b => b.correct === true) ? (
              <>
                <Check className="w-5 h-5" />
                <span className="font-black">正确！</span>
              </>
            ) : (
              <>
                <X className="w-5 h-5" />
                <span className="font-black">错误</span>
              </>
            )}
          </div>

          {!currentLocalState.blanks.every(b => b.correct === true) && (
            <div className="text-sm">
              <span className="font-bold">正确答案：</span>
              <span className="font-black">{currentExercise?.answers?.join(', ')}</span>
            </div>
          )}

          {currentExercise?.explanation && (
            <p className="text-sm opacity-80 mt-1">
              {currentExercise.explanation}
            </p>
          )}
        </div>
      )}

      {/* 未完成题目：提示按钮 */}
      {!isAlreadyCompleted && !currentLocalState?.submitted && (
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowHint(!showHint)}
            className={cn(
              'px-3 py-1.5 text-xs font-bold border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all',
              showHint ? 'bg-[#B4F416] text-black' : 'bg-white dark:bg-gray-800 text-black dark:text-white'
            )}
          >
            {showHint ? '隐藏提示' : '显示提示'}
          </button>
          {currentExercise && currentExercise.difficulty !== 'advanced' && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {currentExercise.difficulty === 'beginner' ? '首字母提示' : '首尾字母提示'}
            </span>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          {(isAlreadyCompleted || currentLocalState?.submitted) && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-bold bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
            >
              <RotateCcw className="w-3 h-3" />
              重做
            </button>
          )}
        </div>

        <div>
          {isAlreadyCompleted || currentLocalState?.submitted ? (
            <button
              onClick={handleNext}
              className="flex items-center gap-1 px-4 py-2 bg-[#B4F416] text-black border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 font-black text-sm transition-all"
            >
              {currentIndex < filteredExercises.length - 1 ? (
                <>
                  下一题
                  <ChevronRight className="w-4 h-4" />
                </>
              ) : (
                <>查看总结</>
              )}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!currentLocalState?.blanks.some(b => b.userAnswer.trim())}
              className={cn(
                'flex items-center gap-1 px-4 py-2 border-[2px] border-black font-black text-sm transition-all',
                currentLocalState?.blanks.some(b => b.userAnswer.trim())
                  ? 'bg-[#B4F416] text-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
              )}
            >
              <Check className="w-4 h-4" />
              提交
            </button>
          )}
        </div>
      </div>
      </div>
    </div>
  )
}
