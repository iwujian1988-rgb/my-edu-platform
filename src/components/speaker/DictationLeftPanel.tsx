/**
 * Step 2 听写训练 - 左栏组件（原文遮罩 + 播放控制）
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4-B 节（产品需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 *
 * 核心功能：
 * 1. 显示所有句子的完整英文文本
 * 2. 全局遮罩开关：勾选时显示半透明遮罩，未勾选时正常显示
 * 3. PC端：鼠标悬停临时透视（移除遮罩）
 * 4. 移动端：长按临时透视（移除遮罩）
 * 5. 播放按钮放在卡片之间，与右侧卡片高度对齐
 */

'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Play, Volume2 } from 'lucide-react'
import type { SpeakerSentence } from '@/types/speaker'
import type { SentenceMaskState } from '@/hooks/useSpeakerDictationV2'

interface DictationLeftPanelProps {
  sentences: SpeakerSentence[]
  sentenceMasks: SentenceMaskState[]
  globalMaskEnabled: boolean
  activeSentenceIndex: number
  isPlaying: boolean
  currentPlayingSentence: number | null
  onToggleGlobalMask: () => void
  onPlaySentence: (sentenceIndex: number) => void
  onPlayFromStart: (sentenceIndex: number) => void  // 新增：从头播放句子
  onSelectSentence: (sentenceIndex: number) => void
  onScrollToSentence?: (index: number) => void
}

/**
 * 单个句子卡片（带遮罩）- 不包含播放按钮
 */
function SentenceCard({
  sentence,
  index,
  maskState,
  globalMaskEnabled,
  isActive
}: {
  sentence: SpeakerSentence
  index: number
  maskState: SentenceMaskState
  globalMaskEnabled: boolean
  isActive: boolean
}) {
  // PC端：鼠标悬停临时透视（添加延迟，避免鼠标经过时误触发）
  const [isHovered, setIsHovered] = useState(false)
  const hoverTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 移动端：长按临时透视
  const [isLongPressing, setIsLongPressing] = useState(false)
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 判断是否应该显示遮罩
  const shouldMask = globalMaskEnabled && !isHovered && !isLongPressing

  // PC端鼠标事件（添加300ms延迟）
  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    if (globalMaskEnabled) {
      // 检查是否真正悬停在文字区域
      const target = e.target as HTMLElement
      const textElement = target.closest('.text-content')

      // 只有在文字区域才触发倒计时
      if (!textElement) return

      // 清除之前的延迟定时器
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
      // 延迟500ms后再显示
      hoverTimerRef.current = setTimeout(() => {
        setIsHovered(true)
        hoverTimerRef.current = null
      }, 500)
    }
  }

  const handleMouseLeave = () => {
    if (globalMaskEnabled) {
      // 清除延迟定时器（如果还未触发）
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
        hoverTimerRef.current = null
      }
      // 立即隐藏
      setIsHovered(false)
    }
  }

  // 移动端长按事件
  const handleTouchStart = () => {
    if (globalMaskEnabled) {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressing(true)
      }, 200)
    }
  }

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    if (isLongPressing) setIsLongPressing(false)
  }

  const handleTouchCancel = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current)
      longPressTimerRef.current = null
    }
    setIsLongPressing(false)
  }

  // 组件卸载时清理所有定时器
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current)
      }
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current)
      }
    }
  }, [])

  return (
    <div
      className={`
        relative p-6 rounded-sm border-2 transition-all duration-200
        ${isActive
          ? 'border-black dark:border-gray-400 bg-[#B4F416]/10 dark:bg-[#B4F416]/5 shadow-[4px_4px_0px_0px_#B4F416] dark:shadow-[4px_4px_0px_0px_#666]'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-black dark:hover:border-gray-400'
        }
        ${maskState.isPlayed ? 'opacity-60' : ''}
      `}
      style={{
        minHeight: '120px'  // 固定最小高度，与右侧对齐
      }}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
    >
      {/* 句子编号 */}
      <div className="flex items-center justify-between mb-4 mt-0">
        <span className="text-xs font-mono font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          SENTENCE {String(index + 1).padStart(2, '0')}
        </span>
        {/* 占位按钮，完全匹配右侧播放按钮的尺寸 */}
        <div className="flex items-center gap-2 opacity-0 pointer-events-none">
          <div className="w-10 h-10 rounded-sm" />
          <div className="w-10 h-10 rounded-sm" />
        </div>
      </div>

      {/* 句子文本 */}
      <div className="relative">
        <div
          className="text-content relative cursor-pointer"
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
        >
          {shouldMask ? (
            <>
              <div className="text-gray-900 dark:text-white blur-[2px] select-none leading-relaxed font-mono text-sm">
                {sentence.text_en}
              </div>
              <div className="absolute inset-0 bg-gray-300/60 dark:bg-gray-700/60 backdrop-blur-[1px] rounded-sm pointer-events-none" />
            </>
          ) : (
            <div className="text-gray-900 dark:text-white break-words leading-relaxed font-mono text-sm">
              {sentence.text_en}
            </div>
          )}
        </div>
      </div>

      {/* 移动端提示 */}
      <div className="md:hidden mt-2 text-xs font-mono font-bold text-gray-500 dark:text-gray-400 text-center">
        {globalMaskEnabled && '👆 长按可临时查看原文'}
      </div>
    </div>
  )
}

/**
 * 左栏主组件
 */
export function DictationLeftPanel({
  sentences,
  sentenceMasks,
  globalMaskEnabled,
  activeSentenceIndex,
  isPlaying,
  currentPlayingSentence,
  onToggleGlobalMask,
  onPlaySentence,
  onPlayFromStart,
  onSelectSentence,
  onScrollToSentence,
  cardHeights  // 接收卡片高度数组
}: DictationLeftPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cardsContainerRef = useRef<HTMLDivElement>(null)
  const isObserverReadyRef = useRef(false)  // 标记 IntersectionObserver 是否已准备好

  // ========================================
  // 1. 双栏同步滚动：当右侧激活的句子变化时，自动滚动左侧
  // ========================================
  useEffect(() => {
    if (!cardsContainerRef.current) return

    // 找到对应索引的卡片（data-sentence-index 属性）
    const activeCard = cardsContainerRef.current.querySelector(`[data-sentence-index="${activeSentenceIndex}"]`) as HTMLElement
    if (!activeCard) return

    activeCard.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    })
  }, [activeSentenceIndex])

  // ========================================
  // 2. 双栏同步滚动：当左侧滚动时，通知父组件
  // ========================================
  useEffect(() => {
    if (!cardsContainerRef.current || !onScrollToSentence) return

    // 查找所有卡片元素（通过 data-sentence-index 属性）
    const cardElements = Array.from(
      cardsContainerRef.current.querySelectorAll('[data-sentence-index]')
    ) as HTMLElement[]

    // 延迟标记 Observer 准备就绪，避免首次触发
    const readyTimer = setTimeout(() => {
      isObserverReadyRef.current = true
    }, 500) // 500ms 后才允许 IntersectionObserver 触发更新

    const observer = new IntersectionObserver(
      (entries) => {
        // Observer 准备好之前不触发回调，避免页面加载时自动滚动
        if (!isObserverReadyRef.current) {
          return
        }

        let maxIntersectionRatio = 0
        let mostVisibleIndex = -1

        entries.forEach((entry) => {
          if (entry.intersectionRatio > maxIntersectionRatio) {
            maxIntersectionRatio = entry.intersectionRatio
            // 从 data-sentence-index 属性获取索引
            const indexStr = (entry.target as HTMLElement).dataset.sentenceIndex
            mostVisibleIndex = indexStr ? parseInt(indexStr, 10) : -1
          }
        })

        if (mostVisibleIndex >= 0) {
          onScrollToSentence(mostVisibleIndex)
        }
      },
      {
        root: containerRef.current,
        threshold: [0, 0.25, 0.5, 0.75, 1.0],
        rootMargin: '-20% 0px -60% 0px'
      }
    )

    cardElements.forEach((element) => observer.observe(element))

    return () => {
      clearTimeout(readyTimer)
      cardElements.forEach((element) => observer.unobserve(element))
      observer.disconnect()
      isObserverReadyRef.current = false
    }
  }, [sentences.length, onScrollToSentence])

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 transition-colors duration-300">
      {/* 全局遮罩开关 - Neo-Brutalism */}
      <div className="p-4 border-b-[2px] border-black dark:border-gray-600 sticky top-0 bg-white dark:bg-gray-800 z-10 transition-colors duration-300">
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
          <span className="text-sm font-semibold text-gray-900 dark:text-white">
            全局遮罩原文
          </span>
        </label>
        {/* PC端提示 */}
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-8 hidden md:block">
          鼠标悬停查看原文
        </p>
        {/* 移动端提示 */}
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 ml-8 md:hidden">
          长按查看原文
        </p>
      </div>

      {/* 句子列表（可滚动） - 使用 space-y-4 和右侧保持一致 */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 pb-4"
        style={{
          maxHeight: 'calc(100vh - 200px)',
          paddingTop: '16px'  // 添加顶部内边距，确保第一个句子不被遮挡
        }}
      >
        {/* 卡片容器 - 使用 space-y-4 和右侧完全一致 */}
        <div ref={cardsContainerRef} className="space-y-4">
          {sentences.map((sentence, index) => {
            const maskState = sentenceMasks[index]
            const isActive = index === activeSentenceIndex
            const isSentencePlaying = index === currentPlayingSentence

            return (
              <React.Fragment key={sentence.id || index}>
                {/* 句子卡片容器 */}
                <div
                  data-sentence-index={index}
                  className="relative"
                >
                  <SentenceCard
                    sentence={sentence}
                    index={index}
                    maskState={maskState}
                    globalMaskEnabled={globalMaskEnabled}
                    isActive={isActive}
                  />

                  {/* 播放按钮组：绝对定位在卡片底部中央（除了最后一个） */}
                  {index < sentences.length - 1 && (
                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                      <div className="flex items-center gap-2">
                        {/* 从头听按钮 - 纯图标 */}
                        <button
                          onClick={() => onPlayFromStart(index)}
                          className="
                            flex items-center justify-center w-10 h-10 rounded-sm
                            transition-all duration-150 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666]
                            border-2 border-black dark:border-gray-600
                            bg-white dark:bg-gray-800
                            text-gray-700 dark:text-gray-300
                            hover:bg-[#B4F416] hover:text-black hover:border-[#B4F416]
                          "
                          title={`从头播放句子 ${index + 1}`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                          </svg>
                        </button>

                        {/* 播放/暂停按钮 - 纯图标 */}
                        <button
                          onClick={() => onPlaySentence(index)}
                          className={`
                            flex items-center justify-center w-10 h-10 rounded-sm
                            transition-all duration-150 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] border-2
                            ${currentPlayingSentence === index
                              ? 'bg-amber-500 text-white border-amber-500'
                              : 'bg-black dark:bg-gray-700 text-white border-black dark:border-gray-600 hover:bg-gray-800 dark:hover:bg-gray-600'
                            }
                          `}
                          title={currentPlayingSentence === index ? `暂停句子 ${index + 1}` : `播放句子 ${index + 1}`}
                        >
                          {currentPlayingSentence === index ? (
                            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                              <rect x="6" y="4" width="4" height="16" />
                              <rect x="14" y="4" width="4" height="16" />
                            </svg>
                          ) : (
                            <Play className="w-5 h-5" strokeWidth={2.5} />
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            )
          })}
        </div>
      </div>
    </div>
  )
}
