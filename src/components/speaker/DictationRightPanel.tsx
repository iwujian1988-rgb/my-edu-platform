/**
 * Step 2 听写训练 - 右栏组件（下划线输入流）
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4-C 节（产品需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 *
 * 核心功能：
 * 1. 下划线样式输入框
 * 2. 标点符号预置
 * 3. 空格键跳转下一个输入框
 * 4. 移动端 Enter 键映射为 Next
 * 5. 右键放弃（SKIPPED）
 * 6. 反悔机制
 * 7. PC端：滚动同步（滚动时通知父组件当前句子索引）
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Play } from 'lucide-react'
import type { SpeakerSentence } from '@/types/speaker'
import { parseSentenceTokens } from '@/lib/speaker-utils'
import type { WordInputState } from '@/hooks/useSpeakerDictationV2'

interface DictationRightPanelProps {
  sentences: SpeakerSentence[]
  wordInputs: WordInputState[][]
  activeSentenceIndex: number
  isPlaying: boolean
  currentPlayingSentence: number | null
  onUpdateWordInput: (sentenceIndex: number, wordIndex: number, value: string) => void
  onMoveToNextWord: (sentenceIndex: number, wordIndex: number) => void
  onSkipWord: (sentenceIndex: number, wordIndex: number) => void
  onUnskipWord: (sentenceIndex: number, wordIndex: number) => void
  onPlaySentence: (sentenceIndex: number) => void
  onPlayFromStart: (sentenceIndex: number) => void  // 从头播放句子
  onScrollToSentence?: (index: number) => void  // 滚动时通知父组件当前句子索引
  onSentenceFocus?: (sentenceIndex: number) => void  // 当聚焦输入框时激活对应句子
  onClearSentence?: (sentenceIndex: number) => void  // 新增：一键清除句子
  onCheckSentence?: (sentenceIndex: number) => { correct: number, wrong: number, skipped: number } | null  // 新增：检查句子对错
}

/**
 * 单个句子的输入区域
 */
function SentenceInput({
  sentence,
  index,
  wordInputs,
  isActive,
  isPlaying,
  onUpdateWordInput,
  onMoveToNextWord,
  onSkipWord,
  onUnskipWord,
  totalSentences,
  onSentenceFocus
}: {
  sentence: SpeakerSentence
  index: number
  wordInputs: WordInputState[]
  isActive: boolean
  isPlaying: boolean
  onUpdateWordInput: (wordIndex: number, value: string) => void
  onMoveToNextWord: (wordIndex: number) => void
  onSkipWord: (wordIndex: number) => void
  onUnskipWord: (wordIndex: number) => void
  totalSentences: number
  onSentenceFocus?: (sentenceIndex: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [checkResults, setCheckResults] = useState<{[key: number]: boolean}>({})

  // 解析句子为 tokens（单词 + 标点）
  const tokens = parseSentenceTokens(sentence.text_en)

  // 获取需要输入的单词列表（排除标点和缩写）
  const inputWords = tokens.filter(t => t.type === 'word' && !t.skipInput).map(t => t.text.toLowerCase())

  // 一键清除：通过 onUpdateWordInput 清空所有输入框
  const handleClearSentence = () => {
    // 清空所有输入框
    wordInputs.forEach((_, index) => {
      onUpdateWordInput(index, '')
    })
    // 清除检查结果
    setCheckResults({})
  }

  // 检查对错：对比用户输入和正确答案
  const handleCheckSentence = () => {
    const results: {[key: number]: boolean} = {}
    wordInputs.forEach((input, index) => {
      const userValue = input.value.trim()
      // 空的不标记对错，跳过
      if (userValue === '') {
        return
      }
      const correctAnswer = inputWords[index]
      const userAnswer = userValue.toLowerCase()
      results[index] = userAnswer === correctAnswer
    })
    setCheckResults(results)
  }

  // 自动聚焦到当前输入框
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const focusedInput = containerRef.current.querySelector('input:focus') as HTMLInputElement
    if (!focusedInput) {
      // 找到第一个 isFocused 的输入框
      const targetIndex = wordInputs.findIndex(w => w.isFocused)
      if (targetIndex >= 0) {
        const input = containerRef.current.querySelectorAll('input')[targetIndex] as HTMLInputElement
        input?.focus()
      }
    }
  }, [isActive, wordInputs])

  /**
   * 处理输入框变化
   */
  const handleInputChange = (wordIndex: number, value: string) => {
    onUpdateWordInput(wordIndex, value)
  }

  /**
   * 处理输入框聚焦 - 激活当前句子，使左侧自动滚动
   */
  const handleInputFocus = () => {
    if (onSentenceFocus) {
      onSentenceFocus(index)
    }
  }

  /**
   * 处理按键事件
   */
  const handleKeyDown = (wordIndex: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    // 空格键：跳转到下一个输入框
    if (e.key === ' ') {
      e.preventDefault() // 阻止输入空格
      onMoveToNextWord(wordIndex)
      // 立即聚焦到下一个输入框（确保 DOM 更新）
      setTimeout(() => {
        const allInputs = containerRef.current?.querySelectorAll('input')
        const nextInput = allInputs?.[wordIndex + 1] as HTMLInputElement
        nextInput?.focus()
      }, 0)
    }

    // Enter 键：移动端虚拟键盘映射为 Next
    if (e.key === 'Enter') {
      e.preventDefault()
      // 检查是否是最后一个单词
      const nonSkipWords = tokens.filter(t => t.type === 'word' && !t.skipInput)
      if (wordIndex === nonSkipWords.length - 1) {
        // 最后一个单词：跳转到下一句
        if (index < totalSentences - 1) {
          // 触发跳转到下一句的逻辑（通过设置 activeSentenceIndex）
          const nextSentenceEvent = new CustomEvent('goToNextSentence', { detail: index + 1 })
          window.dispatchEvent(nextSentenceEvent)
        }
      } else {
        // 不是最后一个单词：跳转到下一个输入框
        onMoveToNextWord(wordIndex)
        // 立即聚焦到下一个输入框（确保 DOM 更新）
        setTimeout(() => {
          const allInputs = containerRef.current?.querySelectorAll('input')
          const nextInput = allInputs?.[wordIndex + 1] as HTMLInputElement
          nextInput?.focus()
        }, 0)
      }
    }

    // Backspace 键：如果当前输入框为空，返回上一个输入框
    if (e.key === 'Backspace' && wordInputs[wordIndex].value === '' && wordIndex > 0) {
      e.preventDefault()
      const prevInput = containerRef.current?.querySelectorAll('input')[wordIndex - 1] as HTMLInputElement
      prevInput?.focus()
    }
  }

  /**
   * 处理右键菜单（屏蔽默认，显示放弃选项）
   */
  const handleContextMenu = (wordIndex: number, e: React.MouseEvent) => {
    e.preventDefault() // 屏蔽浏览器默认右键菜单

    const inputState = wordInputs[wordIndex]

    if (inputState.isSkipped) {
      // 已放弃：显示"重新输入"选项
      onUnskipWord(wordIndex)
    } else {
      // 未放弃：标记为 SKIPPED
      onSkipWord(wordIndex)
    }
  }

  return (
    <div
      ref={containerRef}
      className={`
        p-6 rounded-sm border-2 transition-all duration-200
        ${isActive
          ? 'border-black dark:border-gray-400 bg-[#B4F416]/10 dark:bg-[#B4F416]/5 shadow-[4px_4px_0px_0px_#B4F416] dark:shadow-[4px_4px_0px_0px_#666]'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-black dark:hover:border-gray-400'
        }
      `}
      style={{
        minHeight: '120px'  // 确保最小高度一致，与左侧对齐
      }}
    >
      {/* 句子头部：编号 + 功能按钮组 */}
      <div className="flex items-center justify-between mb-4 mt-0 gap-2">
        <span className="text-xs font-mono font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* 一键清除按钮 */}
          <button
            onClick={handleClearSentence}
            className="
              flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-bold
              transition-all duration-150
              border-2 border-black dark:border-gray-500
              bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
              hover:bg-red-500 hover:text-white hover:border-red-500
              active:translate-y-0.5
            "
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="hidden sm:inline">清除</span>
          </button>

          {/* 检查对错按钮 */}
          <button
            onClick={handleCheckSentence}
            className="
              flex items-center gap-1 px-2 py-1 rounded-sm text-xs font-bold
              transition-all duration-150
              border-2 border-black dark:border-gray-500
              bg-black dark:bg-gray-600 text-white
              hover:bg-[#B4F416] hover:text-black hover:border-[#B4F416]
              active:translate-y-0.5
            "
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span className="hidden sm:inline">检查</span>
          </button>
        </div>
      </div>

      {/* 输入流区域 - 下划线风格 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 leading-relaxed">
        {tokens.map((token, tokenIndex) => {
          // 计算对应的单词索引（只计算单词，不计算标点和跳过输入的单词）
          const wordIndex = tokens.slice(0, tokenIndex).filter(t => t.type === 'word' && !t.skipInput).length

          if (token.type === 'punctuation') {
            // 标点符号：直接显示（预置）
            return (
              <span
                key={`punct-${tokenIndex}`}
                className="text-gray-900 dark:text-white text-lg font-mono font-medium"
              >
                {token.text}
              </span>
            )
          } else if (token.skipInput) {
            // 缩写词：直接显示，不需要用户输入
            return (
              <span
                key={`word-${tokenIndex}`}
                className="text-gray-900 dark:text-white text-lg font-mono font-bold"
              >
                {token.text}
              </span>
            )
          } else {
            // 单词：渲染为下划线输入框
            const inputState = wordInputs[wordIndex]
            const isSkipped = inputState?.isSkipped ?? false
            const isFocused = inputState?.isFocused ?? false
            // 使用本地检查结果
            const checkResult = checkResults[wordIndex]

            return (
              <input
                key={`input-${tokenIndex}`}
                type="text"
                value={inputState?.value ?? ''}
                onChange={(e) => {
                  handleInputChange(wordIndex, e.target.value)
                  // 输入变化时清除该位置的检查结果
                  if (checkResults[wordIndex] !== undefined) {
                    setCheckResults(prev => {
                      const next = { ...prev }
                      delete next[wordIndex]
                      return next
                    })
                  }
                }}
                onFocus={handleInputFocus}
                onKeyDown={(e) => handleKeyDown(wordIndex, e)}
                onContextMenu={(e) => handleContextMenu(wordIndex, e)}
                disabled={isSkipped}
                placeholder={isSkipped ? '放弃' : ''}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={`
                  px-3 py-1.5
                  font-mono text-lg tracking-wide
                  bg-transparent
                  border-b-2
                  transition-all duration-150
                  outline-none
                  ${checkResult === true
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500'
                    : checkResult === false
                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500'
                      : isFocused
                        ? 'border-black dark:border-gray-400 bg-[#B4F416]/20 text-gray-900 dark:text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-black dark:hover:border-gray-400'
                  }
                  ${isSkipped
                    ? 'opacity-50 line-through text-gray-400'
                    : ''
                  }
                `}
                style={{
                  width: `${Math.max(100, token.text.length * 14)}px`,
                  minWidth: '100px',
                  maxWidth: '300px'
                }}
              />
            )
          }
        })}
      </div>

      {/* 右键提示 */}
      {isActive && (
        <div className="mt-3 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
          <span className="text-base">⌨️</span>
          <span className="font-mono">空格跳转 | 回车换句</span>
          <span className="mx-1">•</span>
          <span className="text-base">🖱️</span>
          <span className="font-mono">右键放弃</span>
        </div>
      )}
    </div>
  )
}

/**
 * 右栏主组件
 */
export function DictationRightPanel({
  sentences,
  wordInputs,
  activeSentenceIndex,
  isPlaying,
  currentPlayingSentence,
  onUpdateWordInput,
  onMoveToNextWord,
  onSkipWord,
  onUnskipWord,
  onPlaySentence,
  onPlayFromStart,
  onScrollToSentence,
  onSentenceFocus  // 接收聚焦回调
}: DictationRightPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitialMountRef = useRef(true)  // 标记是否是首次挂载，避免页面加载时自动滚动
  const isObserverReadyRef = useRef(false)  // 标记 IntersectionObserver 是否已准备好

  // ========================================
  // 1. 双栏同步滚动：当左侧点击句子时，自动滚动右侧
  // ========================================
  useEffect(() => {
    // 首次挂载时不滚动，保持页面在顶部
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false
      return
    }

    if (!containerRef.current) return

    // 找到对应索引的卡片（通过 data-sentence-index 属性）
    const cardsContainer = containerRef.current.querySelector('.space-y-4') as HTMLElement
    if (!cardsContainer) return

    const activeCard = cardsContainer.querySelector(`[data-sentence-index="${activeSentenceIndex}"]`) as HTMLElement
    if (!activeCard) return

    // 滚动到视口顶部（与左侧顶部对齐）
    activeCard.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    })
  }, [activeSentenceIndex])

  // ========================================
  // 2. 双栏同步滚动：当右侧滚动时，通知父组件当前可见的句子
  //    使用 Intersection Observer 检测当前在视口的句子
  // ========================================
  useEffect(() => {
    if (!containerRef.current || !onScrollToSentence) return

    // 查找所有卡片元素（通过 data-sentence-index 属性）
    const cardsContainer = containerRef.current.querySelector('.space-y-4') as HTMLElement
    if (!cardsContainer) return

    const cardElements = Array.from(
      cardsContainer.querySelectorAll('[data-sentence-index]')
    ) as HTMLElement[]

    // 延迟标记 Observer 准备就绪，避免首次触发
    const readyTimer = setTimeout(() => {
      isObserverReadyRef.current = true
    }, 500) // 500ms 后才允许 IntersectionObserver 触发更新

    // 创建 Intersection Observer
    const observer = new IntersectionObserver(
      (entries) => {
        // Observer 准备好之前不触发回调，避免页面加载时自动滚动
        if (!isObserverReadyRef.current) {
          return
        }

        // 找到最接近视口顶部的句子
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

        // 通知父组件更新激活的句子索引
        if (mostVisibleIndex >= 0) {
          onScrollToSentence(mostVisibleIndex)
        }
      },
      {
        root: containerRef.current, // 相对于容器计算
        threshold: [0, 0.25, 0.5, 0.75, 1.0], // 多个阈值提高准确度
        rootMargin: '-20% 0px -60% 0px' // 只考虑视口中间区域
      }
    )

    // 观察所有句子元素
    cardElements.forEach((element) => observer.observe(element))

    return () => {
      clearTimeout(readyTimer)
      cardElements.forEach((element) => observer.unobserve(element))
      observer.disconnect()
      isObserverReadyRef.current = false
    }
  }, [sentences.length, onScrollToSentence])

  return (
    <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900">
      {/* 顶部提示区 */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
              <span className="text-blue-600 dark:text-blue-400 text-sm font-bold">ℹ️</span>
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-1">
              听写训练说明
            </h3>
            {/* PC端提示 */}
            <p className="text-xs text-gray-600 dark:text-gray-400 hidden md:block">
              按 <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">空格</kbd> 跳转 | 最后词按 <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">↵ Enter</kbd> 换句 | 右键"放弃"
            </p>
            {/* 移动端提示 */}
            <p className="text-xs text-gray-600 dark:text-gray-400 md:hidden">
              按 <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">空格</kbd> / <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">↵</kbd> 跳转 | 长按"放弃"
            </p>
          </div>
        </div>
      </div>

      {/* 输入区域列表（可滚动） */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto p-4"
        style={{
          maxHeight: 'calc(100vh - 300px)'
        }}
      >
        {/* 卡片容器 - 使用 space-y-4 和左侧保持一致 */}
        <div className="space-y-4">
          {sentences.map((sentence, index) => {
            const isActive = index === activeSentenceIndex
            const isPlaying = index === currentPlayingSentence

            return (
              <div
                key={sentence.id || index}
                data-sentence-index={index}
              >
                <SentenceInput
                  sentence={sentence}
                  index={index}
                  wordInputs={wordInputs[index]}
                  isActive={isActive}
                  isPlaying={isPlaying}
                  onUpdateWordInput={(wordIndex, value) => onUpdateWordInput(index, wordIndex, value)}
                  onMoveToNextWord={(wordIndex) => onMoveToNextWord(index, wordIndex)}
                  onSkipWord={(wordIndex) => onSkipWord(index, wordIndex)}
                  onUnskipWord={(wordIndex) => onUnskipWord(index, wordIndex)}
                  onClearSentence={() => {}}
                  onCheckSentence={() => null}
                  totalSentences={sentences.length}
                  onSentenceFocus={onSentenceFocus}  // 传递聚焦回调
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
