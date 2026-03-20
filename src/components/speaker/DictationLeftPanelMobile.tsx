/**
 * Step 2 听写训练 - 移动端左栏组件（单卡片 + 导航按钮）
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4-B 节（产品需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 *
 * 核心功能：
 * 1. 单卡片显示当前句子（移除横向滚动，避免键盘问题）
 * 2. 全局遮罩开关
 * 3. 移动端：长按临时透视
 * 4. 播放按钮（每个卡片右侧）
 * 5. 左右导航按钮切换句子
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'
import type { SpeakerSentence } from '@/types/speaker'
import type { SentenceMaskState } from '@/hooks/useSpeakerDictationV2'

interface DictationLeftPanelMobileProps {
  sentences: SpeakerSentence[]
  sentenceMasks: SentenceMaskState[]
  globalMaskEnabled: boolean
  activeSentenceIndex: number
  isPlaying: boolean
  currentPlayingSentence: number | null
  onToggleGlobalMask: () => void
  onPlaySentence: (sentenceIndex: number) => void
  onSelectSentence: (sentenceIndex: number) => void
  onScrollToSentence?: (index: number) => void  // 新增：切换句子时通知父组件
}

/**
 * 单个句子卡片（移动端版本）
 */
function SentenceCard({
  sentence,
  index,
  maskState,
  globalMaskEnabled,
  isActive,
  isPlaying,
  onPlay
}: {
  sentence: SpeakerSentence
  index: number
  maskState: SentenceMaskState
  globalMaskEnabled: boolean
  isActive: boolean
  isPlaying: boolean
  onPlay: () => void
}) {
  // 移动端：长按临时透视
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 判断是否应该显示遮罩
  const shouldMask = globalMaskEnabled && !isLongPressing

  // 移动端长按事件处理
  const handleTouchStart = () => {
    if (globalMaskEnabled) {
      // 200ms 后触发长按显示
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressing(true)
      }, 200)
    }
  }

  const handleTouchEnd = () => {
    // 清除定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    // 恢复遮罩
    if (isLongPressing) {
      setIsLongPressing(false)
    }
  }

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
  }

  return (
    <div
      className={`
        w-full p-3 rounded-sm border-2 transition-all duration-200
        ${isActive
          ? 'border-black dark:border-gray-400 bg-[#B4F416]/10 dark:bg-[#B4F416]/5 shadow-[4px_4px_0px_0px_#B4F416] dark:shadow-[4px_4px_0px_0px_#666]'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-black dark:hover:border-gray-400'
        }
        ${maskState.isPlayed ? 'opacity-60' : ''}
      `}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* 句子头部：编号 + 播放按钮 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          SENTENCE {String(index + 1).padStart(2, '0')}
        </span>

        <button
          onClick={(e) => {
            e.stopPropagation()
            onPlay()
          }}
          className={`
            flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-sm
            transition-all duration-150 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] border-2
            ${isPlaying
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-black dark:bg-gray-700 text-white border-black dark:border-gray-600 hover:bg-gray-800 dark:hover:bg-gray-600'
            }
          `}
          aria-label={`播放句子 ${index + 1}`}
        >
          {isPlaying ? (
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <rect x="6" y="4" width="4" height="16" />
              <rect x="14" y="4" width="4" height="16" />
            </svg>
          ) : (
            <Play className="w-5 h-5" strokeWidth={2.5} />
          )}
        </button>
      </div>

      {/* 句子文本（根据遮罩状态显示） */}
      <div className="relative min-h-[60px] flex items-center">
        {shouldMask ? (
          // 遮罩状态：模糊文本 + 半透明遮罩层
          <>
            <div className="text-gray-900 dark:text-white blur-[2px] select-none leading-relaxed font-mono text-sm">
              {sentence.text_en}
            </div>
            <div className="absolute inset-0 bg-gray-300/60 dark:bg-gray-700/60 backdrop-blur-[1px] rounded-sm pointer-events-none" />
          </>
        ) : (
          // 正常显示：清晰的文本
          <div className="text-gray-900 dark:text-white break-words leading-relaxed font-mono text-sm">
            {sentence.text_en}
          </div>
        )}
      </div>

      {/* 长按提示 */}
      {globalMaskEnabled && (
        <div className="mt-2 text-xs font-mono font-bold text-gray-500 dark:text-gray-400 text-center">
          {isLongPressing ? '👀 查看中...' : '👆 长按可临时查看原文'}
        </div>
      )}
    </div>
  )
}

/**
 * 移动端左栏主组件（单卡片 + 导航按钮）
 * 移除了横向滚动交互，只保留按钮切换，避免键盘弹出时的滚动问题
 */
export function DictationLeftPanelMobile({
  sentences,
  sentenceMasks,
  globalMaskEnabled,
  activeSentenceIndex,
  isPlaying,
  currentPlayingSentence,
  onToggleGlobalMask,
  onPlaySentence,
  onSelectSentence,
  onScrollToSentence
}: DictationLeftPanelMobileProps) {
  // 当前激活的句子
  const activeSentence = sentences[activeSentenceIndex]
  const activeMaskState = sentenceMasks[activeSentenceIndex]
  const isPlayingSentence = activeSentenceIndex === currentPlayingSentence

  // 切换到上一句
  const handlePrev = () => {
    if (activeSentenceIndex > 0 && onScrollToSentence) {
      onScrollToSentence(activeSentenceIndex - 1)
    }
  }

  // 切换到下一句
  const handleNext = () => {
    if (activeSentenceIndex < sentences.length - 1 && onScrollToSentence) {
      onScrollToSentence(activeSentenceIndex + 1)
    }
  }

  return (
    <div className="flex flex-col bg-white dark:bg-gray-800 border-b-[2px] border-black dark:border-gray-600">
      {/* 全局遮罩开关（固定在顶部） - Neo-Brutalism */}
      <div className="p-3 border-b-[2px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 z-10">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              checked={globalMaskEnabled}
              onChange={onToggleGlobalMask}
              className="sr-only"
            />
            <div className={`
              w-5 h-5 border-2 border-black dark:border-gray-400 rounded-sm transition-all duration-150
              ${globalMaskEnabled ? 'bg-[#B4F416] border-[#B4F416]' : 'bg-white dark:bg-gray-700'}
              flex items-center justify-center
            `}>
              {globalMaskEnabled && (
                <svg className="w-3 h-3 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </div>
          </div>
          <span className="text-sm font-mono font-black text-gray-900 dark:text-white uppercase tracking-wider">
            全局遮罩原文
          </span>
        </label>
        <p className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 mt-2 ml-8">
          👆 长按可临时查看原文
        </p>
      </div>

      {/* 单卡片容器 + 左右导航 */}
      <div className="relative flex items-center justify-center p-4">
        {/* 左导航按钮 */}
        <button
          onClick={handlePrev}
          disabled={activeSentenceIndex === 0}
          className="absolute left-2 z-10 p-2 rounded-sm bg-white dark:bg-gray-800 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] border-2 border-black dark:border-gray-600 text-gray-900 dark:text-white hover:bg-[#B4F416] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="上一句"
        >
          <ChevronLeft className="w-5 h-5" strokeWidth={2.5} />
        </button>

        {/* 当前句子卡片 */}
        <div className="w-[85vw] max-w-md">
          {activeSentence && activeMaskState && (
            <SentenceCard
              sentence={activeSentence}
              index={activeSentenceIndex}
              maskState={activeMaskState}
              globalMaskEnabled={globalMaskEnabled}
              isActive={true}
              isPlaying={isPlayingSentence}
              onPlay={() => onPlaySentence(activeSentenceIndex)}
            />
          )}
        </div>

        {/* 右导航按钮 */}
        <button
          onClick={handleNext}
          disabled={activeSentenceIndex === sentences.length - 1}
          className="absolute right-2 z-10 p-2 rounded-sm bg-white dark:bg-gray-800 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] border-2 border-black dark:border-gray-600 text-gray-900 dark:text-white hover:bg-[#B4F416] hover:text-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          aria-label="下一句"
        >
          <ChevronRight className="w-5 h-5" strokeWidth={2.5} />
        </button>
      </div>

      {/* 进度指示器 - Neo-Brutalism */}
      <div className="flex justify-center gap-1 pb-3">
        {sentences.map((_, index) => (
          <div
            key={index}
            className={`
              h-1.5 rounded-sm transition-all duration-200
              ${index === activeSentenceIndex
                ? 'w-6 bg-black dark:bg-gray-400'
                : 'w-1.5 bg-gray-300 dark:bg-gray-600'
              }
            `}
          />
        ))}
      </div>
    </div>
  )
}
