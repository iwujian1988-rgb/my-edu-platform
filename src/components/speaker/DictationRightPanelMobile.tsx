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

import { useRef, useEffect, useState } from 'react'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'
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
  onScrollToSentence?: (index: number) => void
  onSentenceFocus?: (sentenceIndex: number) => void
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
  onPlaySentence: () => void
  onSentenceFocus?: (sentenceIndex: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [checkResults, setCheckResults] = useState<{[key: number]: boolean}>({})
  // 移动端：是否已激活输入模式（用户点击后才开始聚焦输入框）
  const [isInputActive, setIsInputActive] = useState(false)

  // 解析句子为 tokens（单词 + 标点）
  const tokens = parseSentenceTokens(sentence.text_en)

  // 获取需要输入的单词列表（排除标点和缩写）
  const inputWords = tokens.filter(t => t.type === 'word' && !t.skipInput).map(t => t.text.toLowerCase())

  // 一键清除
  const handleClearSentence = () => {
    wordInputs.forEach((_, idx) => {
      onUpdateWordInput(idx, '')
    })
    setCheckResults({})
  }

  // 检查对错
  const handleCheckSentence = () => {
    const results: {[key: number]: boolean} = {}
    wordInputs.forEach((input, idx) => {
      const userValue = input.value.trim()
      if (userValue === '') return
      const correctAnswer = inputWords[idx]
      const userAnswer = userValue.toLowerCase()
      results[idx] = userAnswer === correctAnswer
    })
    setCheckResults(results)
  }

  // 激活输入模式并聚焦到第一个输入框
  const handleActivateInput = () => {
    setIsInputActive(true)
    // 延迟聚焦，等待状态更新
    setTimeout(() => {
      const firstInput = containerRef.current?.querySelector('input') as HTMLInputElement
      firstInput?.focus()
    }, 50)
  }

  // 句子切换时重置激活状态（新句子需要重新激活）
  useEffect(() => {
    setIsInputActive(false)
  }, [index])

  /**
   * 处理输入框变化
   */
  const handleInputChange = (wordIndex: number, value: string) => {
    onUpdateWordInput(wordIndex, value)
  }

  /**
   * 处理输入框聚焦
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
    if (e.key === ' ') {
      e.preventDefault()
      onMoveToNextWord(wordIndex)
      setTimeout(() => {
        const allInputs = containerRef.current?.querySelectorAll('input')
        const nextInput = allInputs?.[wordIndex + 1] as HTMLInputElement
        nextInput?.focus()
      }, 0)
    }

    if (e.key === 'Enter') {
      e.preventDefault()
      onMoveToNextWord(wordIndex)
      setTimeout(() => {
        const allInputs = containerRef.current?.querySelectorAll('input')
        const nextInput = allInputs?.[wordIndex + 1] as HTMLInputElement
        nextInput?.focus()
      }, 0)
    }

    if (e.key === 'Backspace' && wordInputs[wordIndex].value === '' && wordIndex > 0) {
      e.preventDefault()
      const prevInput = containerRef.current?.querySelectorAll('input')[wordIndex - 1] as HTMLInputElement
      prevInput?.focus()
    }
  }

  /**
   * 处理右键菜单
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
      style={{ scrollSnapAlign: 'center' }}
    >
      {/* 句子头部：编号 + 功能按钮 */}
      <div className="flex items-center justify-between mb-2 gap-2">
        <span className="text-xs font-mono font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider shrink-0">
          {String(index + 1).padStart(2, '0')}
        </span>

        <div className="flex items-center gap-1.5 shrink-0">
          {/* 一键清除按钮 */}
          <button
            onClick={handleClearSentence}
            className="
              flex items-center justify-center w-8 h-8 rounded-sm
              transition-all duration-150
              border-2 border-black dark:border-gray-500
              bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200
              hover:bg-red-500 hover:text-white hover:border-red-500
              active:translate-y-0.5
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* 检查对错按钮 */}
          <button
            onClick={handleCheckSentence}
            className="
              flex items-center justify-center w-8 h-8 rounded-sm
              transition-all duration-150
              border-2 border-black dark:border-gray-500
              bg-black dark:bg-gray-600 text-white
              hover:bg-[#B4F416] hover:text-black hover:border-[#B4F416]
              active:translate-y-0.5
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </button>

          {/* 播放按钮 */}
          <button
            onClick={onPlaySentence}
            disabled={isPlaying}
            className={`
              flex items-center justify-center w-8 h-8 rounded-sm
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
      </div>

      {/* 输入流区域 */}
      <div className="relative">
        {/* 未激活时的覆盖层 - 点击激活输入模式 */}
        {!isInputActive && (
          <div
            onClick={handleActivateInput}
            className="absolute inset-0 z-10 flex items-center justify-center bg-white/80 dark:bg-gray-800/80 backdrop-blur-[1px] cursor-pointer rounded-sm border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-[#B4F416] hover:bg-[#B4F416]/10 transition-all"
          >
            <div className="text-center p-4">
              <div className="text-sm font-mono font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                👆 点击开始输入
              </div>
              <div className="text-xs font-mono text-gray-500 dark:text-gray-400 mt-1">
                点击后弹出键盘
              </div>
            </div>
          </div>
        )}

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
            const checkResult = checkResults[wordIndex]

            return (
              <input
                key={`input-${tokenIndex}`}
                type="text"
                value={inputState?.value ?? ''}
                onChange={(e) => {
                  handleInputChange(wordIndex, e.target.value)
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
                placeholder={isSkipped ? '还未掌握' : ''}
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
                  ${checkResult === true
                    ? 'border-green-500 bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-300 dark:border-green-500'
                    : checkResult === false
                      ? 'border-red-500 bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-300 dark:border-red-500'
                      : isFocused
                        ? 'border-black dark:border-gray-400 bg-[#B4F416]/20 text-gray-900 dark:text-white'
                        : 'border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white hover:border-black dark:hover:border-gray-400'
                  }
                  ${isSkipped ? 'opacity-50 line-through text-gray-400' : ''}
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
      </div>

      {/* 操作提示 */}
      <div className="mt-3 text-center text-xs text-gray-500 dark:text-gray-400 font-mono">
        长按标记"还未掌握" | 点击对号查看输入是否正确
      </div>
    </div>
  )
}

/**
 * 移动端右栏主组件（单卡片 + 导航按钮）
 * 移除了横向滚动交互，只保留按钮切换，避免键盘弹出时的滚动问题
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
  onSentenceFocus
}: DictationRightPanelMobileProps) {
  // 当前激活的句子
  const activeSentence = sentences[activeSentenceIndex]
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
    <div className="flex flex-col bg-gray-50 dark:bg-gray-900 flex-1">
      {/* 单卡片容器 + 左右导航 */}
      <div className="relative flex-1 flex items-center justify-center p-4">
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
          {activeSentence && (
            <SentenceInput
              sentence={activeSentence}
              index={activeSentenceIndex}
              wordInputs={wordInputs[activeSentenceIndex]}
              isActive={true}
              isPlaying={isPlayingSentence}
              onUpdateWordInput={(wordIndex, value) => onUpdateWordInput(activeSentenceIndex, wordIndex, value)}
              onMoveToNextWord={(wordIndex) => onMoveToNextWord(activeSentenceIndex, wordIndex)}
              onSkipWord={(wordIndex) => onSkipWord(activeSentenceIndex, wordIndex)}
              onUnskipWord={(wordIndex) => onUnskipWord(activeSentenceIndex, wordIndex)}
              onPlaySentence={() => onPlaySentence(activeSentenceIndex)}
              onSentenceFocus={onSentenceFocus}
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

      {/* 底部进度指示器 */}
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
