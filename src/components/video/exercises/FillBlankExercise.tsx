/**
 * 填空练习组件
 *
 * 用于"写"模式，根据难度显示不同策略的填空题
 * - beginner: 1个空，显示首字母提示
 * - intermediate: 2-3个空，显示首尾字母提示
 * - advanced: 完整听写，无提示
 *
 * 样式：Neo-brutalism 风格，与全站保持一致
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
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
} from 'lucide-react'
import type { VideoExercise, ExerciseDifficulty } from '@/types/video'

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

interface FillBlankExerciseProps {
  exercises: VideoExercise[]
  onCheckAnswer: (exerciseId: string, answer: string) => void
  onPlaySegment?: (startTime: number, endTime: number) => void  // 播放按钮回调（开始+结束时间)
}

interface ExerciseState {
  exerciseId: string
  userAnswer: string
  isSubmitted: boolean
  isCorrect: boolean | null
}

export function FillBlankExercise({
  exercises,
  onCheckAnswer,
  onPlaySegment,
}: FillBlankExerciseProps) {
  const [selectedDifficulty, setSelectedDifficulty] = useState<ExerciseDifficulty | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [exerciseStates, setExerciseStates] = useState<Map<string, ExerciseState>>(
    () => new Map()
  )
  const [showHint, setShowHint] = useState(false)

  // 按难度筛选练习题
  const filteredExercises = useMemo(() => {
    if (!selectedDifficulty) return []
    return exercises.filter((e) => e.difficulty === selectedDifficulty)
  }, [exercises, selectedDifficulty])

  // 统计各难度的题目数量
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
  const currentState = currentExercise
    ? exerciseStates.get(currentExercise.id)
    : null

  // 选择难度
  const handleSelectDifficulty = useCallback((difficulty: ExerciseDifficulty) => {
    setSelectedDifficulty(difficulty)
    setCurrentIndex(0)
    setExerciseStates(new Map())
    setShowHint(false)
  }, [])

  // 更新答案
  const handleAnswerChange = useCallback((answer: string) => {
    if (!currentExercise) return

    setExerciseStates((prev) => {
      const newMap = new Map(prev)
      newMap.set(currentExercise.id, {
        exerciseId: currentExercise.id,
        userAnswer: answer,
        isSubmitted: false,
        isCorrect: null,
      })
      return newMap
    })
  }, [currentExercise])

  // 提交答案
  const handleSubmit = useCallback(() => {
    if (!currentExercise || !currentState) return

    const isCorrect = currentState.userAnswer
      .toLowerCase()
      .trim()
      .split(',')
      .map((a) => a.trim())
      .every((answer, index) => {
        const correctAnswer = currentExercise.answers[index]
        return answer === correctAnswer.toLowerCase()
      })

    setExerciseStates((prev) => {
      const newMap = new Map(prev)
      newMap.set(currentExercise.id, {
        ...currentState,
        isSubmitted: true,
        isCorrect,
      })
      return newMap
    })

    onCheckAnswer(currentExercise.id, currentState.userAnswer)
  }, [currentExercise, currentState, onCheckAnswer])

  // 重置当前练习
  const handleReset = useCallback(() => {
    if (!currentExercise) return

    setExerciseStates((prev) => {
      const newMap = new Map(prev)
      newMap.delete(currentExercise.id)
      return newMap
    })
    setShowHint(false)
  }, [currentExercise])

  // 下一题
  const handleNext = useCallback(() => {
    if (currentIndex < filteredExercises.length - 1) {
      setCurrentIndex(currentIndex + 1)
      setShowHint(false)
    }
  }, [currentIndex, filteredExercises.length])

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

  // 渲染带空白的文本
  const renderTextWithBlanks = useCallback(
    (exercise: VideoExercise, showAnswer: boolean) => {
      const parts = exercise.text_with_blanks.split(/(\[blank\])/g)

      let blankIndex = 0
      return parts.map((part, index) => {
        if (part === '[blank]') {
          const answer = exercise.answers[blankIndex] || ''
          blankIndex++

          if (showAnswer) {
            return (
              <span
                key={index}
                className={cn(
                  'px-2 py-0.5 font-black',
                  currentState?.isSubmitted
                    ? currentState.isCorrect
                      ? 'bg-[#B4F416] text-black'
                      : 'bg-[#FF6B6B] text-white'
                    : 'bg-[#B4F416] text-black'
                )}
              >
                {answer}
              </span>
            )
          }

          if (showHint) {
            return (
              <span
                key={index}
                className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 font-mono text-sm font-bold"
              >
                {getHintText(exercise.difficulty, answer)}
              </span>
            )
          }

          return (
            <span
              key={index}
              className="inline-flex items-center px-2 py-0.5 bg-gray-100 dark:bg-gray-700"
            >
              <HelpCircle className="w-4 h-4 text-gray-400" />
            </span>
          )
        }

        return <span key={index}>{part}</span>
      })
    },
    [currentState, showHint, getHintText]
  )

  // 统计
  const correctCount = Array.from(exerciseStates.values()).filter(
    (s) => s.isCorrect === true
  ).length
  const submittedCount = Array.from(exerciseStates.values()).filter(
    (s) => s.isSubmitted
  ).length

  // 如果没有练习题
  if (exercises.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <p className="font-black text-gray-400 dark:text-gray-500">暂无练习题</p>
      </div>
    )
  }

  // 难度选择界面
  if (!selectedDifficulty) {
    return (
      <div className="space-y-3">
        <div className="text-center mb-4">
          <h3 className="text-base font-black text-black dark:text-white">选择练习难度</h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            根据你的熟练程度选择
          </p>
        </div>

        <div className="space-y-2">
          {(Object.keys(DIFFICULTY_CONFIG) as ExerciseDifficulty[]).map((difficulty) => {
            const config = DIFFICULTY_CONFIG[difficulty]
            const count = difficultyCounts[difficulty]
            const Icon = config.icon

            if (count === 0) return null

            return (
              <button
                key={difficulty}
                onClick={() => handleSelectDifficulty(difficulty)}
                className={cn(
                  'w-full p-3 border-[3px] border-black dark:border-gray-600 text-left transition-all',
                  'shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]',
                  'hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5',
                  'active:shadow-[1px_1px_0px_0px_#000] active:translate-y-0.5',
                  config.bgColor
                )}
              >
                <div className="flex items-center gap-3">
                  <div className="p-1.5 bg-white dark:bg-gray-800 border-[2px] border-black">
                    <Icon className="w-4 h-4 text-black dark:text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-black text-sm">
                        {config.label}
                      </span>
                      <span className="px-2 py-0.5 bg-white dark:bg-gray-800 border-[2px] border-black text-xs font-black">
                        {count} 题
                      </span>
                    </div>
                    <p className="text-xs text-black/70 mt-0.5">
                      {config.description}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* 进度条 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSelectedDifficulty(null)}
            className="flex items-center gap-1 px-2 py-1 text-xs font-bold bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
          >
            <RotateCcw className="w-3 h-3" />
            返回
          </button>
          <span className="px-2 py-1 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 text-xs font-black">
            {currentIndex + 1} / {filteredExercises.length}
          </span>
          <span className={cn(
            'px-2 py-1 border-[2px] border-black text-xs font-black',
            DIFFICULTY_CONFIG[selectedDifficulty].bgColor,
            'text-black'
          )}>
            {DIFFICULTY_CONFIG[selectedDifficulty].label}
          </span>
        </div>
        <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
          正确率: {submittedCount > 0 ? Math.round((correctCount / submittedCount) * 100) : 0}%
        </span>
      </div>

      {/* 题目卡片 + 播放按钮 */}
      <div className="flex gap-2">
        <div className="flex-1 p-4 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666]">
          <p className="text-base leading-relaxed font-medium text-black dark:text-white">
            {renderTextWithBlanks(
              currentExercise,
              currentState?.isSubmitted || false
            )}
          </p>
        </div>
        {/* 播放按钮 - 始终显示用于测试 */}
        {onPlaySegment && (
          <button
            onClick={() => {
              // 使用模拟时间：每道题10秒递增， 字幕时长5秒（测试用）
              const startTime = currentExercise.subtitle_start_time ?? (currentIndex * 10)
              const endTime = startTime + 5 // 固定5秒长度
              onPlaySegment(startTime, endTime)
            }}
            className="flex-shrink-0 w-12 flex items-center justify-center border-[3px] border-black dark:border-gray-600 bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 active:shadow-[1px_1px_0px_0px_#000] active:translate-y-0.5 transition-all"
            title="播放这段"
          >
            <Play className="w-5 h-5 text-black" fill="none" />
          </button>
        )}
      </div>

      {/* 输入区域 */}
      {!currentState?.isSubmitted && (
        <div className="space-y-3">
          <label className="text-xs font-black text-black dark:text-white">
            填写答案（多个答案用逗号分隔）
          </label>
          <input
            type="text"
            value={currentState?.userAnswer || ''}
            onChange={(e) => handleAnswerChange(e.target.value)}
            placeholder={`共 ${currentExercise.answers.length} 个空`}
            className="w-full px-3 py-2 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 text-black dark:text-white font-medium shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] focus:outline-none focus:shadow-[4px_4px_0px_0px_#000] transition-shadow"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && currentState?.userAnswer) {
                handleSubmit()
              }
            }}
          />

          {/* 提示按钮 */}
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
            {currentExercise.difficulty !== 'advanced' && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentExercise.difficulty === 'beginner' ? '首字母提示' : '首尾字母提示'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 结果 */}
      {currentState?.isSubmitted && (
        <div
          className={cn(
            'p-3 border-[3px] border-black shadow-[3px_3px_0px_0px_#000]',
            currentState.isCorrect
              ? 'bg-[#B4F416] text-black'
              : 'bg-[#FF6B6B] text-white'
          )}
        >
          <div className="flex items-center gap-2 mb-1">
            {currentState.isCorrect ? (
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

          {!currentState.isCorrect && (
            <div className="text-sm">
              <span className="font-bold">正确答案：</span>
              <span className="font-black">{currentExercise.answers.join(', ')}</span>
            </div>
          )}

          {currentExercise.explanation && (
            <p className="text-sm opacity-80 mt-1">
              {currentExercise.explanation}
            </p>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div>
          {currentState?.isSubmitted && (
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
          {currentState?.isSubmitted ? (
            currentIndex < filteredExercises.length - 1 ? (
              <button
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-[#B4F416] text-black border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 font-black text-sm transition-all"
              >
                下一题
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={() => setSelectedDifficulty(null)}
                className="px-4 py-2 bg-[#B4F416] text-black border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 font-black text-sm transition-all"
              >
                完成本难度
              </button>
            )
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!currentState?.userAnswer}
              className={cn(
                'flex items-center gap-1 px-4 py-2 border-[2px] border-black font-black text-sm transition-all',
                currentState?.userAnswer
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
  )
}
