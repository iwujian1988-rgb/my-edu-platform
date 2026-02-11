/**
 * 听写控制面板组件
 *
 * 功能：
 * 1. 显示学习进度（当前句/总句数）
 * 2. 句子导航（上一句/下一句）
 * 3. 显示准确率和鼓励语句
 * 4. 重置当前句子
 */

'use client'

import { ChevronLeft, ChevronRight, RotateCcw } from 'lucide-react'

interface DictationControlPanelProps {
  currentIndex: number
  totalSentences: number
  accuracy: number
  encouragement: string
  isCompleted: boolean
  canGoNext: boolean
  canGoPrevious: boolean
  onNext: () => void
  onPrevious: () => void
  onReset: () => void
}

export function DictationControlPanel({
  currentIndex,
  totalSentences,
  accuracy,
  encouragement,
  isCompleted,
  canGoNext,
  canGoPrevious,
  onNext,
  onPrevious,
  onReset
}: DictationControlPanelProps) {
  return (
    <div className="space-y-6">
      {/* 进度条 */}
      <div className="space-y-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            进度：{currentIndex + 1} / {totalSentences}
          </span>
          <span className="text-gray-600 dark:text-gray-400">
            {Math.round(((currentIndex + 1) / totalSentences) * 100)}%
          </span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-500 h-full transition-all duration-500"
            style={{ width: `${((currentIndex + 1) / totalSentences) * 100}%` }}
          />
        </div>
      </div>

      {/* 完成后的反馈 */}
      {isCompleted && (
        <div className="p-4 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-700 dark:text-green-300 mb-2">
              {accuracy}% 准确率
            </p>
            <p className="text-green-600 dark:text-green-400">
              {encouragement}
            </p>
          </div>
        </div>
      )}

      {/* 控制按钮 */}
      <div className="flex items-center justify-center gap-4">
        {/* 上一句按钮 */}
        <button
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium
            transition-all duration-300
            ${canGoPrevious
              ? 'bg-white dark:bg-gray-800 text-gray-900 dark:text-white border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-500 hover:shadow-md'
              : 'bg-gray-100 dark:bg-gray-900 text-gray-400 dark:text-gray-700 border-2 border-transparent cursor-not-allowed'
            }
          `}
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="hidden sm:inline">上一句</span>
        </button>

        {/* 重置按钮 */}
        <button
          onClick={onReset}
          className="
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium
            bg-white dark:bg-gray-800
            text-gray-900 dark:text-white
            border-2 border-gray-300 dark:border-gray-600
            hover:border-blue-500 dark:hover:border-blue-500
            transition-all duration-300
            hover:shadow-md
          "
          title="重新开始本句"
        >
          <RotateCcw className="w-5 h-5" />
          <span className="hidden sm:inline">重置</span>
        </button>

        {/* 下一句按钮 */}
        <button
          onClick={onNext}
          disabled={!canGoNext}
          className={`
            flex items-center gap-2 px-4 py-2 rounded-lg font-medium
            transition-all duration-300
            ${canGoNext
              ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 shadow-lg'
              : 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-500 cursor-not-allowed'
            }
          `}
        >
          <span className="hidden sm:inline">下一句</span>
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* 完成本句后的提示 */}
      {isCompleted && canGoNext && (
        <div className="text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            ✅ 本句已完成，点击"下一句"继续
          </p>
        </div>
      )}

      {/* 所有句子完成 */}
      {isCompleted && !canGoNext && (
        <div className="text-center p-4 rounded-xl bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
          <p className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
            🎉 恭喜完成听写训练！
          </p>
          <p className="text-sm text-blue-700 dark:text-blue-300">
            你可以点击"重置"重新练习，或返回时间轴进入下一步
          </p>
        </div>
      )}
    </div>
  )
}
