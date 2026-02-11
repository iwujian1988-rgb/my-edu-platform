/**
 * 句子掩码显示组件
 *
 * 参考：
 * - AI_DEVELOPMENT_GUIDE.md 第 4.3 节（掩码展示组件）
 * - shangwenjie.md 第 2.4 节（填空交互 UI）
 */

'use client'

import { useState, useRef, useEffect } from 'react'
import { Play, Volume2, Eye } from 'lucide-react'
import type { WordMask } from '@/lib/speaker-utils'

interface SentenceMaskDisplayProps {
  words: WordMask[]
  isPlaying: boolean
  isCompleted: boolean
  onPlay: () => void
  onWordFill: (wordIndex: number, userInput: string) => void
  onReveal: (wordIndex: number) => void
}

/**
 * 单词槽位组件
 */
function WordSlot({
  word,
  isMasked,
  isRevealed,
  isCompleted,
  onFill,
  onReveal,
  onFocus
}: {
  word: string
  isMasked: boolean
  isRevealed: boolean
  isCompleted: boolean
  onFill: (value: string) => void
  onReveal: () => void
  onFocus: () => void
}) {
  const [inputValue, setInputValue] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [showHint, setShowHint] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // 如果已揭示，显示正确单词
  if (isRevealed || !isMasked) {
    return (
      <span className="
        inline-flex items-center px-2 py-1
        text-gray-900 dark:text-white
        font-medium
      ">
        {word}
      </span>
    )
  }

  // 掩码状态：显示输入框
  return (
    <span
      className={`
        inline-flex items-center gap-1 px-2 py-1 rounded-lg
        border-2 transition-all duration-200
        ${isFocused
          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
          : 'border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800'
        }
        ${isCompleted ? 'border-green-500 bg-green-50 dark:bg-green-900/20' : ''}
      `}
      onFocus={onFocus}
    >
      {/* 输入框 */}
      <input
        ref={inputRef}
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            onFill(inputValue)
            setInputValue('')
          }
        }}
        onFocus={() => setIsFocused(true)}
        onBlur={() => {
          setIsFocused(false)
          // 失去焦点时自动提交
          if (inputValue.trim()) {
            onFill(inputValue)
            setInputValue('')
          }
        }}
        className="
          w-16 md:w-24 bg-transparent border-none outline-none
          text-gray-900 dark:text-white
          placeholder-gray-400 dark:placeholder-gray-600
          text-center
        "
        placeholder={isFocused ? '' : '_'}
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
      />

      {/* 提示按钮（仅在聚焦时显示） */}
      {isFocused && !isCompleted && (
        <button
          onClick={() => {
            onReveal()
            setShowHint(true)
          }}
          className="
            flex-shrink-0 p-1 rounded
            text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400
            transition-colors
          "
          title="提示"
        >
          <Eye className="w-4 h-4" />
        </button>
      )}
    </span>
  )
}

/**
 * 句子掩码显示组件
 */
export function SentenceMaskDisplay({
  words,
  isPlaying,
  isCompleted,
  onPlay,
  onWordFill,
  onReveal
}: SentenceMaskDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // 自动滚动到第一个掩码位置
  useEffect(() => {
    if (containerRef.current) {
      const firstMasked = containerRef.current.querySelector('input')
      if (firstMasked && !isCompleted) {
        firstMasked.scrollIntoView({ behavior: 'smooth', block: 'center' })
        ;(firstMasked as HTMLInputElement).focus()
      }
    }
  }, [words, isCompleted])

  return (
    <div className="space-y-6">
      {/* 播放控制 */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={onPlay}
          disabled={isPlaying}
          className={`
            flex items-center gap-2 px-6 py-3 rounded-full font-medium
            transition-all duration-300
            ${isPlaying
              ? 'bg-gray-300 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:scale-105 shadow-lg'
            }
          `}
        >
          {isPlaying ? (
            <>
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span>播放中...</span>
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              <span>播放句子</span>
            </>
          )}
        </button>
      </div>

      {/* 句子显示区域 */}
      <div
        ref={containerRef}
        className="
          p-6 md:p-8 rounded-2xl
          bg-white dark:bg-gray-800
          border-2 border-gray-200 dark:border-gray-700
          shadow-lg
        "
      >
        <div className="text-lg md:text-xl leading-loose text-center">
          {words.map((wordMask, index) => {
            const isPunctuation = !/^[a-zA-Z]+$/.test(wordMask.word)

            if (isPunctuation) {
              // 标点符号直接显示
              return (
                <span
                  key={index}
                  className="text-gray-600 dark:text-gray-400"
                >
                  {wordMask.word}
                </span>
              )
            }

            return (
              <WordSlot
                key={index}
                word={wordMask.word}
                isMasked={wordMask.isMasked}
                isRevealed={wordMask.isRevealed}
                isCompleted={isCompleted}
                onFill={(value) => onWordFill(index, value)}
                onReveal={() => onReveal(index)}
                onFocus={() => {}}
              />
            )
          })}
        </div>
      </div>

      {/* 提示信息 */}
      <div className="text-center text-sm text-gray-600 dark:text-gray-400">
        <p>💡 点击输入框填写单词，按 Enter 键快速提交</p>
        <p className="mt-1">👁️ 点击眼睛图标可查看提示</p>
      </div>
    </div>
  )
}
