/**
 * Step 2 听写训练 - 移动端右栏组件（横向滚动输入流）
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.4-C 节（产品需求）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 *
 * 核心功能：
 * 1. 输入区域横向滚动（一张一张，scroll-snap）
 * 2. 下划线样式输入框
 * 3. 标点符号预置
 * 4. 空格/Enter 键跳转下一个输入框
 * 5. 右键放弃（SKIPPED）
 * 6. 横向滚动同步通知父组件
 */

'use client'

import { useRef, useEffect } from 'react'
import { Play } from 'lucide-react'
import type { SpeakerSentence } from '@/types/speaker'
import { parseSentenceTokens } from '@/lib/speaker-utils'
import type { WordInputState } from '@/hooks/useSpeakerDictationV2'

interface DictationRightPanelMobileProps {
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
  onScrollToSentence?: (index: number) => void  // 新增：滚动时通知父组件
  onSentenceFocus?: (sentenceIndex: number) => void  // 新增：当聚焦输入框时激活对应句子
}

/**
 * 单个句子的输入区域（移动端横向滚动版本）
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
  onPlaySentence,
  onSentenceFocus  // 新增
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
  onPlaySentence: () => void
  onSentenceFocus?: (sentenceIndex: number) => void  // 新增
}) {
  const containerRef = useRef<HTMLDivElement>(null)

  // 解析句子为 tokens（单词 + 标点）
  const tokens = parseSentenceTokens(sentence.text_en)

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
      e.preventDefault()
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
      onMoveToNextWord(wordIndex)
      // 立即聚焦到下一个输入框（确保 DOM 更新）
      setTimeout(() => {
        const allInputs = containerRef.current?.querySelectorAll('input')
        const nextInput = allInputs?.[wordIndex + 1] as HTMLInputElement
        nextInput?.focus()
      }, 0)
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
    e.preventDefault()

    const inputState = wordInputs[wordIndex]

    if (inputState.isSkipped) {
      onUnskipWord(wordIndex)
    } else {
      onSkipWord(wordIndex)
    }
  }

  return (
    <div
      ref={containerRef}
      data-sentence-index={index}
      className={`
        flex-shrink-0 w-[85vw] max-w-md p-3 rounded-sm border-2 transition-all duration-200
        ${isActive
          ? 'border-black dark:border-gray-400 bg-[#B4F416]/10 dark:bg-[#B4F416]/5 shadow-[4px_4px_0px_0px_#B4F416] dark:shadow-[4px_4px_0px_0px_#666]'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-black dark:hover:border-gray-400'
        }
      `}
      style={{
        scrollSnapAlign: 'center'  // scroll-snap 关键属性
      }}
    >
      {/* 句子头部：编号 + 播放按钮 - 纯图标 */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-mono font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          SENTENCE {String(index + 1).padStart(2, '0')}
        </span>

        <button
          onClick={onPlaySentence}
          disabled={isPlaying}
          className={`
            flex items-center justify-center w-9 h-9 rounded-sm
            transition-all duration-150 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] border-2
            ${isPlaying
              ? 'bg-amber-500 text-white border-amber-500'
              : 'bg-black dark:bg-gray-700 text-white border-black dark:border-gray-600 hover:bg-gray-800 dark:hover:bg-gray-600'
            }
          `}
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

      {/* 输入流区域 - Neo-Brutalism underline style */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-3 leading-relaxed">
        {tokens.map((token, tokenIndex) => {
          const wordIndex = tokens.slice(0, tokenIndex).filter(t => t.type === 'word' && !t.skipInput).length

          if (token.type === 'punctuation') {
            return (
              <span
                key={`punct-${tokenIndex}`}
                className="text-gray-900 dark:text-white text-lg font-mono font-medium"
              >
                {token.text}
              </span>
            )
          } else if (token.skipInput) {
            // 缩写词：直接显示
            return (
              <span
                key={`word-${tokenIndex}`}
                className="text-gray-900 dark:text-white text-lg font-mono font-bold"
              >
                {token.text}
              </span>
            )
          } else {
            const inputState = wordInputs[wordIndex]
            const isSkipped = inputState?.isSkipped ?? false
            const isFocused = inputState?.isFocused ?? false

            return (
              <input
                key={`input-${tokenIndex}`}
                type="text"
                value={inputState?.value ?? ''}
                onChange={(e) => handleInputChange(wordIndex, e.target.value)}
                onFocus={handleInputFocus}  // 新增：聚焦时激活句子
                onKeyDown={(e) => handleKeyDown(wordIndex, e)}
                onContextMenu={(e) => handleContextMenu(wordIndex, e)}
                disabled={isSkipped}
                placeholder={isSkipped ? '放弃' : ''}
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={`
                  px-2 py-1
                  font-mono text-base tracking-wide
                  bg-transparent
                  border-b-2
                  transition-all duration-150
                  outline-none
                  ${isFocused
                    ? 'border-black dark:border-gray-400 bg-[#B4F416]/20 text-black dark:text-black'
                    : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-black dark:hover:border-gray-400'
                  }
                  ${isSkipped
                    ? 'opacity-50 line-through text-gray-400'
                    : ''
                  }
                `}
                style={{
                  width: `${Math.max(60, token.text.length * 11)}px`,
                  minWidth: '60px',
                  maxWidth: '250px'
                }}
              />
            )
          }
        })}
      </div>

      {/* 提示 */}
      {isActive && (
        <div className="mt-2 text-xs font-mono font-bold text-gray-500 dark:text-gray-400 text-center">
          💡 按空格/Enter跳转 | 右键可放弃
        </div>
      )}
    </div>
  )
}

/**
 * 移动端右栏主组件（横向滚动）
 */
export function DictationRightPanelMobile({
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
  onScrollToSentence,
  onSentenceFocus  // 接收聚焦回调
}: DictationRightPanelMobileProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null)

  // ========================================
  // 监听横向滚动，通知父组件当前激活的句子
  // ========================================
  useEffect(() => {
    if (!containerRef.current || !onScrollToSentence) return

    const container = containerRef.current

    const handleScroll = () => {
      // 使用防抖来避免频繁更新
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current)
      }

      scrollTimerRef.current = setTimeout(() => {
        const scrollLeft = container.scrollLeft
        const cardWidth = container.firstChild?.clientWidth || 0
        const currentIndex = Math.round(scrollLeft / cardWidth)

        if (currentIndex >= 0 && currentIndex < sentences.length) {
          onScrollToSentence(currentIndex)
        }
      }, 100)
    }

    container.addEventListener('scroll', handleScroll)

    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (scrollTimerRef.current) {
        clearTimeout(scrollTimerRef.current)
      }
    }
  }, [sentences.length, onScrollToSentence])

  // ========================================
  // 当 activeSentenceIndex 变化时，自动滚动到对应卡片
  // ========================================
  useEffect(() => {
    if (!containerRef.current) return

    const container = containerRef.current
    const cardWidth = container.firstChild?.clientWidth || 0
    const targetScrollLeft = activeSentenceIndex * cardWidth

    container.scrollTo({
      left: targetScrollLeft,
      behavior: 'smooth'
    })
  }, [activeSentenceIndex])

  return (
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 flex-1">
      {/* 横向滚动容器 */}
      <div
        ref={containerRef}
        className="flex overflow-x-auto gap-4 p-4 snap-x snap-mandatory flex-1 scrollbar-hide"
        style={{
          scrollbarWidth: 'none',  // Firefox
          msOverflowStyle: 'none'   // IE/Edge
        }}
      >
        {sentences.map((sentence, index) => {
          const isActive = index === activeSentenceIndex
          const isPlaying = index === currentPlayingSentence

          return (
            <SentenceInput
              key={sentence.id || index}
              sentence={sentence}
              index={index}
              wordInputs={wordInputs[index]}
              isActive={isActive}
              isPlaying={isPlaying}
              onUpdateWordInput={(wordIndex, value) => onUpdateWordInput(index, wordIndex, value)}
              onMoveToNextWord={(wordIndex) => onMoveToNextWord(index, wordIndex)}
              onSkipWord={(wordIndex) => onSkipWord(index, wordIndex)}
              onUnskipWord={(wordIndex) => onUnskipWord(index, wordIndex)}
              onPlaySentence={() => onPlaySentence(index)}
              onSentenceFocus={onSentenceFocus}  // 传递聚焦回调
            />
          )
        })}
      </div>

      {/* 底部进度指示器 - Neo-Brutalism */}
      <div className="flex justify-center gap-1 py-3 bg-white dark:bg-gray-800 border-t-[2px] border-black dark:border-gray-600">
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
