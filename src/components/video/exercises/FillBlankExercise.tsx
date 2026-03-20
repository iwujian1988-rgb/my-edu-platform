/**
 * 填空练习组件
 *
 * 用于"写"模式，根据难度显示不同策略的填空题
 * - beginner: 1个空，显示首字母提示
 * - intermediate: 2-3个空，显示首尾字母提示
 * - advanced: 完整听写，无提示
 */

'use client'

import { useState, useCallback, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Check,
  X,
  ChevronRight,
  RotateCcw,
  Volume2,
  HelpCircle,
  Sparkles,
  Target,
  Zap,
} from 'lucide-react'
import type { VideoExercise, ExerciseDifficulty } from '@/types/video'

// 难度配置
const DIFFICULTY_CONFIG: Record<ExerciseDifficulty, {
  label: string
  description: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
}> = {
  beginner: {
    label: '入门',
    description: '1个空，首字母提示',
    icon: Sparkles,
    color: 'text-green-600',
    bgColor: 'bg-green-50 dark:bg-green-900/20',
    borderColor: 'border-green-300 dark:border-green-700',
  },
  intermediate: {
    label: '进阶',
    description: '2-3个空，首尾字母提示',
    icon: Target,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-900/20',
    borderColor: 'border-blue-300 dark:border-blue-700',
  },
  advanced: {
    label: '困难',
    description: '完整听写，无提示',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50 dark:bg-purple-900/20',
    borderColor: 'border-purple-300 dark:border-purple-700',
  },
}

interface FillBlankExerciseProps {
  exercises: VideoExercise[]
  onCheckAnswer: (exerciseId: string, answer: string) => void
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

    // 简单对比（实际应用中可能需要更智能的匹配）
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
          // 首字母 + 下划线
          return `${answer[0]}${'_'.repeat(answer.length - 1)}`
        case 'intermediate':
          // 首尾字母 + 下划线
          if (answer.length <= 2) return answer
          return `${answer[0]}${'_'.repeat(answer.length - 2)}${answer[answer.length - 1]}`
        case 'advanced':
          // 无提示
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
          const currentBlankIndex = blankIndex
          blankIndex++

          if (showAnswer) {
            return (
              <span
                key={index}
                className={cn(
                  'px-2 py-1 rounded font-medium',
                  currentState?.isSubmitted
                    ? currentState.isCorrect
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                    : 'bg-primary/10 text-primary'
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
                className="px-2 py-1 rounded bg-muted font-mono text-sm"
              >
                {getHintText(exercise.difficulty, answer)}
              </span>
            )
          }

          return (
            <span
              key={index}
              className="inline-flex items-center px-2 py-1 rounded bg-muted"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
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
      <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
        <p>暂无练习题</p>
      </div>
    )
  }

  // 难度选择界面
  if (!selectedDifficulty) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-medium mb-2">选择练习难度</h3>
          <p className="text-sm text-muted-foreground">
            根据你的熟练程度选择合适的难度
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3">
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
                  'p-4 rounded-lg border-2 text-left transition-all',
                  'hover:shadow-md hover:scale-[1.02]',
                  config.bgColor,
                  config.borderColor
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn('p-2 rounded-full', config.bgColor)}>
                    <Icon className={cn('w-5 h-5', config.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className={cn('font-medium', config.color)}>
                        {config.label}
                      </span>
                      <Badge variant="outline">{count} 题</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
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
    <div className="space-y-6">
      {/* 进度 */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedDifficulty(null)}
            className="text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4 mr-1" />
            返回
          </Button>
          <Badge variant="outline">
            {currentIndex + 1} / {filteredExercises.length}
          </Badge>
          <Badge variant="secondary">
            {DIFFICULTY_CONFIG[selectedDifficulty].label}
          </Badge>
        </div>
        <div className="text-muted-foreground">
          正确率: {submittedCount > 0 ? Math.round((correctCount / submittedCount) * 100) : 0}%
        </div>
      </div>

      {/* 关联字幕（如有） */}
      {currentExercise.subtitle_text && (
        <div className="p-3 rounded-lg bg-muted/50 text-sm">
          <div className="flex items-center gap-2 mb-1">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <span className="text-muted-foreground">原文：</span>
          </div>
          <p>{currentExercise.subtitle_text}</p>
        </div>
      )}

      {/* 题目 */}
      <div className="p-4 rounded-lg border bg-card">
        <p className="text-lg leading-relaxed">
          {renderTextWithBlanks(
            currentExercise,
            currentState?.isSubmitted || false
          )}
        </p>
      </div>

      {/* 输入区域 */}
      {!currentState?.isSubmitted && (
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              填写答案（多个答案用逗号分隔）
            </label>
            <input
              type="text"
              value={currentState?.userAnswer || ''}
              onChange={(e) => handleAnswerChange(e.target.value)}
              placeholder={`共 ${currentExercise.answers.length} 个空`}
              className="w-full px-4 py-2 rounded-md border bg-background"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && currentState?.userAnswer) {
                  handleSubmit()
                }
              }}
            />
          </div>

          {/* 提示按钮 */}
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowHint(!showHint)}
            >
              {showHint ? '隐藏提示' : '显示提示'}
            </Button>
            {currentExercise.difficulty !== 'advanced' && (
              <span className="text-xs text-muted-foreground">
                {currentExercise.difficulty === 'beginner'
                  ? '显示首字母'
                  : '显示首尾字母'}
              </span>
            )}
          </div>
        </div>
      )}

      {/* 结果 */}
      {currentState?.isSubmitted && (
        <div
          className={cn(
            'p-4 rounded-lg',
            currentState.isCorrect
              ? 'bg-green-50 dark:bg-green-900/20'
              : 'bg-red-50 dark:bg-red-900/20'
          )}
        >
          <div className="flex items-center gap-2 mb-2">
            {currentState.isCorrect ? (
              <>
                <Check className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-600">正确！</span>
              </>
            ) : (
              <>
                <X className="w-5 h-5 text-red-600" />
                <span className="font-medium text-red-600">错误</span>
              </>
            )}
          </div>

          {!currentState.isCorrect && (
            <div className="text-sm">
              <span className="text-muted-foreground">正确答案：</span>
              <span className="font-medium">{currentExercise.answers.join(', ')}</span>
            </div>
          )}

          {currentExercise.explanation && (
            <p className="text-sm text-muted-foreground mt-2">
              {currentExercise.explanation}
            </p>
          )}
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {currentState?.isSubmitted && (
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="w-4 h-4 mr-1" />
              重做
            </Button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {currentState?.isSubmitted ? (
            currentIndex < filteredExercises.length - 1 ? (
              <Button onClick={handleNext}>
                下一题
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            ) : (
              <Button variant="outline" onClick={() => setSelectedDifficulty(null)}>
                完成本难度
              </Button>
            )
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!currentState?.userAnswer}
            >
              <Check className="w-4 h-4 mr-1" />
              提交
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
