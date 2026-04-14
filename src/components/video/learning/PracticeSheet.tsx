'use client'

/**
 * 练习底部抽屉组件 (移动端)
 *
 * 功能:
 * - 从底部滑出的抽屉式练习界面
 * - 支持向下拖动关闭
 * - Neo-brutalism 设计风格
 * - 85vh 高度，带拖动条和关闭按钮
 *
 * 设计风格: Neo-brutalism - 与 LearningModal 保持一致
 */

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { X, Loader2 } from 'lucide-react'
import type { Video, VideoExercise } from '@/types/video'
import { FillBlankExercise } from '../exercises/FillBlankExercise'
import { MultipleChoiceExercise } from '../exercises/MultipleChoiceExercise'
import { TranslationExercise } from '../exercises/TranslationExercise'
import { GrammarDrillExercise } from '../exercises/GrammarDrillExercise'
import { SentencePatternCards } from '../exercises/SentencePatternCards'
import { ScenarioCard } from '../exercises/ScenarioCard'

// ============================================
// 类型定义
// ============================================

export interface PracticeSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  video: Video
  exercises: VideoExercise[]
  progressMap?: Map<string, { isCorrect: boolean; attempts: number }>
  onRecordAnswer?: (exerciseId: string, isCorrect: boolean) => void
  onPlaySegment?: (startTime: number, endTime: number) => void
}

// ============================================
// 常量
// ============================================

const SHEET_HEIGHT = '85vh'
const DRAG_THRESHOLD = 50
const SNAP_THRESHOLD = 100

// ============================================
// 组件
// ============================================

export function PracticeSheet({
  open,
  onOpenChange,
  video,
  exercises,
  progressMap = new Map(),
  onRecordAnswer,
  onPlaySegment,
}: PracticeSheetProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [dragStartY, setDragStartY] = useState(0)
  const [currentY, setCurrentY] = useState(0)
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)

  // 重置拖动状态
  useEffect(() => {
    if (!open) {
      setCurrentY(0)
      setIsDragging(false)
    }
  }, [open])

  // 处理拖动开始
  const handleDragStart = useCallback((clientY: number) => {
    setIsDragging(true)
    setDragStartY(clientY)
    setCurrentY(0)
  }, [])

  // 处理拖动移动
  const handleDragMove = useCallback((clientY: number) => {
    if (!isDragging) return
    const deltaY = clientY - dragStartY
    setCurrentY(Math.max(0, deltaY))
  }, [isDragging, dragStartY])

  // 处理拖动结束
  const handleDragEnd = useCallback(() => {
    if (!isDragging) return

    // 如果拖动超过阈值，关闭抽屉
    if (currentY > SNAP_THRESHOLD) {
      onOpenChange(false)
    } else {
      // 否则回弹
      setCurrentY(0)
    }

    setIsDragging(false)
  }, [isDragging, currentY, onOpenChange])

  // 触摸事件处理
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // 只在拖动条区域触发
    if (dragHandleRef.current?.contains(e.target as Node)) {
      handleDragStart(e.touches[0].clientY)
    }
  }, [handleDragStart])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    handleDragMove(e.touches[0].clientY)
  }, [handleDragMove])

  const handleTouchEnd = useCallback(() => {
    handleDragEnd()
  }, [handleDragEnd])

  // 鼠标事件处理
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (dragHandleRef.current?.contains(e.target as Node)) {
      handleDragStart(e.clientY)
      e.preventDefault()
    }
  }, [handleDragStart])

  useEffect(() => {
    if (!isDragging) return

    const handleMouseMove = (e: MouseEvent) => {
      handleDragMove(e.clientY)
    }

    const handleMouseUp = () => {
      handleDragEnd()
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDragging, handleDragMove, handleDragEnd])

  // 计算抽屉样式
  const sheetStyle = {
    y: isDragging ? currentY : 0,
    transition: isDragging ? 'none' : 'transform 0.3s ease-out',
  }

  // 计算遮罩透明度
  const overlayOpacity = isDragging ? Math.max(0, 0.5 - (currentY / 500)) : 0.5

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 半透明遮罩背景 */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/50"
            style={{ opacity: overlayOpacity }}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
          />

          {/* 底部抽屉 */}
          <motion.div
            ref={sheetRef}
            className={cn(
              "fixed bottom-0 left-0 right-0 z-[60] bg-white dark:bg-gray-800",
              "rounded-t-xl shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666]",
              "border-[3px] border-black dark:border-gray-600",
              "flex flex-col"
            )}
            style={{
              height: SHEET_HEIGHT,
              maxHeight: SHEET_HEIGHT,
              ...sheetStyle,
            }}
            initial={{ y: '100%' }}
            animate={{ y: isDragging ? currentY : 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onMouseDown={handleMouseDown}
          >
            {/* 拖动条 */}
            <div
              ref={dragHandleRef}
              className="flex items-center justify-center py-3 cursor-grab active:cursor-grabbing border-b-[2px] border-black dark:border-gray-600 bg-gray-50 dark:bg-gray-700"
            >
              <div className="w-12 h-1.5 bg-gray-300 dark:bg-gray-500 rounded-full" />
            </div>

            {/* 头部 - 标题和关闭按钮 */}
            <div className="flex items-center justify-between px-4 py-3 border-b-[2px] border-black dark:border-gray-600 bg-gray-100 dark:bg-gray-700">
              <h2 className="text-lg font-black text-black dark:text-white">
                练习 - {video.title}
              </h2>
              <button
                onClick={() => onOpenChange(false)}
                className="p-2 text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* 内容区域 - 可滚动 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
              {exercises.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-center">
                  <Loader2 className="w-12 h-12 animate-spin text-gray-400 mb-4" />
                  <p className="text-gray-600 dark:text-gray-400 font-bold">
                    暂无练习题
                  </p>
                </div>
              ) : (
                <>
                  {/* 填空题 */}
                  <FillBlankExercise
                    exercises={exercises.filter(e => e.exercise_type === 'fill_blank')}
                    progressMap={progressMap}
                    onRecordAnswer={onRecordAnswer}
                    onPlaySegment={onPlaySegment}
                  />

                  {/* 选择题 */}
                  <MultipleChoiceExercise
                    exercises={exercises.filter(e => e.exercise_type === 'multiple_choice')}
                    progressMap={progressMap}
                    onRecordAnswer={onRecordAnswer}
                  />

                  {/* 翻译题 */}
                  <TranslationExercise
                    exercises={exercises.filter(e => e.exercise_type === 'translation')}
                    progressMap={progressMap}
                    onRecordAnswer={onRecordAnswer}
                  />

                  {/* 语法练习 */}
                  <GrammarDrillExercise
                    exercises={exercises.filter(e => e.exercise_type === 'grammar_drill')}
                    progressMap={progressMap}
                    onRecordAnswer={onRecordAnswer}
                  />

                  {/* 句型卡片 */}
                  <SentencePatternCards
                    patterns={exercises.filter(e => e.exercise_type === 'sentence_pattern')}
                  />

                  {/* 情景对话 */}
                  <ScenarioCard
                    scenarios={exercises.filter(e => e.exercise_type === 'scenario')}
                  />
                </>
              )}
            </div>

            {/* 底部安全区 */}
            <div className="h-safe-bottom" />
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

export default PracticeSheet
