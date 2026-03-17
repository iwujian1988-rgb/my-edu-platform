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

import { useState, useRef, useEffect, useCallback } from 'react'
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
  onSimulatePlaySentence?: (sentenceIndex: number, durationMs: number) => void  // 模拟播放状态（不实际播放音频）
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
  onSentenceFocus,
  isGlobalDemoMode,
  speedMultiplier = 1,
  onStartGlobalDemo,
  runGlobalDemoSentence,
  onDemoComplete
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
  isGlobalDemoMode?: boolean
  speedMultiplier?: number
  onStartGlobalDemo?: () => void
  runGlobalDemoSentence?: number | null  // 当前应该执行全局演示的句子索引
  onDemoComplete?: (sentenceIndex: number) => void  // 演示完成回调
  onClearSentence?: () => void  // 清除句子
  onCheckSentence?: () => { correct: number, wrong: number, skipped: number } | null  // 检查对错
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [checkResults, setCheckResults] = useState<{[key: number]: boolean}>({})
  const [isDemoMode, setIsDemoMode] = useState(false)
  const demoTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isDemoModeRef = useRef(false)  // 用 ref 跟踪演示状态，避免闭包问题

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

  // 演示模式：模拟真实用户打字
  // 返回 Promise<boolean> 表示是否完成
  const startDemoMode = async (): Promise<boolean> => {
    if (isDemoMode) return false

    setIsDemoMode(true)
    isDemoModeRef.current = true
    console.log(`[Demo] 开始演示模式 (速度: ${speedMultiplier}x)`)

    // 清空当前句子的所有输入
    handleClearSentence()

    // 遍历每个单词
    for (let wordIndex = 0; wordIndex < inputWords.length; wordIndex++) {
      const correctWord = inputWords[wordIndex]

      // 聚焦到当前输入框（触发页面滚动）
      if (containerRef.current) {
        const inputs = containerRef.current.querySelectorAll('input')
        const currentInput = inputs[wordIndex] as HTMLInputElement
        if (currentInput) {
          currentInput.focus()
        }
      }

      // 随机决定单词最终状态
      // 10% 出错再修正，10% 出错不修正，80% 直接正确
      const randomValue = Math.random()
      const shouldMakeErrorAndFix = randomValue < 0.1      // 10% 出错后修正
      const shouldMakeErrorNoFix = randomValue >= 0.1 && randomValue < 0.2  // 10% 出错不修正
      let textToType = correctWord

      // 如果需要出错（无论是否修正）
      if (shouldMakeErrorAndFix || shouldMakeErrorNoFix) {
        // 随机替换一个字符为错误的字符
        const errorPosition = Math.floor(Math.random() * correctWord.length)
        const wrongChar = String.fromCharCode(97 + Math.floor(Math.random() * 26)) // 随机字母
        textToType = correctWord.substring(0, errorPosition) + wrongChar + correctWord.substring(errorPosition + 1)
      }

      // 逐字输入（速度根据 speedMultiplier 调整）
      for (let charIndex = 0; charIndex < textToType.length; charIndex++) {
        const currentText = textToType.substring(0, charIndex + 1)
        onUpdateWordInput(wordIndex, currentText)

        // 随机延迟（50-150ms / speedMultiplier）
        await new Promise(resolve => {
          demoTimeoutRef.current = setTimeout(resolve, (50 + Math.random() * 100) / speedMultiplier)
        })

        // 使用 ref 检查状态（避免闭包问题）
        if (!isDemoModeRef.current) return false
      }

      // 如果需要出错再修正（只有 10% 出错后修正的情况才修正）
      if (shouldMakeErrorAndFix) {
        await new Promise(resolve => {
          demoTimeoutRef.current = setTimeout(resolve, (300 + Math.random() * 500) / speedMultiplier)
        })

        // 逐字删除错误的单词
        for (let i = textToType.length - 1; i >= 0; i--) {
          onUpdateWordInput(wordIndex, textToType.substring(0, i))
          await new Promise(resolve => {
            demoTimeoutRef.current = setTimeout(resolve, (30 + Math.random() * 50) / speedMultiplier)
          })
          if (!isDemoModeRef.current) return false
        }

        // 重新输入正确的单词
        for (let charIndex = 0; charIndex < correctWord.length; charIndex++) {
          const currentText = correctWord.substring(0, charIndex + 1)
          onUpdateWordInput(wordIndex, currentText)
          await new Promise(resolve => {
            demoTimeoutRef.current = setTimeout(resolve, (50 + Math.random() * 100) / speedMultiplier)
          })
          if (!isDemoModeRef.current) return false
        }
      }

      // 单词之间停顿（模拟思考，200-800ms / speedMultiplier）
      if (wordIndex < inputWords.length - 1) {
        await new Promise(resolve => {
          demoTimeoutRef.current = setTimeout(resolve, (200 + Math.random() * 600) / speedMultiplier)
        })
      }
    }

    console.log('[Demo] 演示完成')
    setIsDemoMode(false)
    isDemoModeRef.current = false
    return true
  }

  // 停止演示模式
  const stopDemoMode = () => {
    if (demoTimeoutRef.current) {
      clearTimeout(demoTimeoutRef.current)
      demoTimeoutRef.current = null
    }
    setIsDemoMode(false)
    isDemoModeRef.current = false
    console.log('[Demo] 演示已停止')
  }

  // 双击 ⌨️ 图标切换单句演示模式
  const handleKeyboardDoubleClick = () => {
    if (isDemoMode) {
      stopDemoMode()
    } else {
      startDemoMode()
    }
  }

  // 双击 🖱️ 图标触发全局演示模式（仅在第一个句子有效）
  const handleMouseDoubleClick = () => {
    if (index === 0 && onStartGlobalDemo) {
      if (isGlobalDemoMode) {
        console.log('[Demo] 全局演示已在运行中')
      } else {
        onStartGlobalDemo()
      }
    }
  }

  // 监听全局演示模式：当 runGlobalDemoSentence 匹配当前句子时执行演示
  useEffect(() => {
    if (runGlobalDemoSentence === index && !isDemoMode) {
      console.log(`[Demo] 全局演示: 句子 ${index + 1} 开始`)

      // 激活当前句子（触发左侧滚动同步）
      if (onSentenceFocus) {
        onSentenceFocus(index)
      }

      startDemoMode().then((completed) => {
        if (completed && onDemoComplete) {
          console.log(`[Demo] 全局演示: 句子 ${index + 1} 完成`)
          onDemoComplete(index)
        }
      })
    }
  }, [runGlobalDemoSentence, index])

  // 组件卸载时清理定时器
  useEffect(() => {
    return () => {
      if (demoTimeoutRef.current) {
        clearTimeout(demoTimeoutRef.current)
      }
    }
  }, [])

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
                placeholder={isSkipped ? '还未掌握' : ''}
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
          <span
            className="text-base cursor-pointer select-none"
            onDoubleClick={handleKeyboardDoubleClick}
            title="双击开始单句演示模式"
          >
            ⌨️
          </span>
          <span className="font-mono">空格跳转 | 回车换句</span>
          <span className="mx-1">•</span>
          <span
            className={`text-base cursor-pointer select-none ${isGlobalDemoMode ? 'animate-pulse' : ''}`}
            onDoubleClick={index === 0 ? handleMouseDoubleClick : undefined}
            title={index === 0 ? "双击开始全局演示" : ""}
          >
            🖱️
          </span>
          <span className="font-mono">右键标记"还未掌握"</span>
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
  onSentenceFocus,
  onSimulatePlaySentence
}: DictationRightPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitialMountRef = useRef(true)  // 标记是否是首次挂载，避免页面加载时自动滚动
  const isObserverReadyRef = useRef(false)  // 标记 IntersectionObserver 是否已准备好

  // 全局演示模式状态
  const [isGlobalDemoMode, setIsGlobalDemoMode] = useState(false)
  const [runGlobalDemoSentence, setRunGlobalDemoSentence] = useState<number | null>(null)
  const [simulatePlayingSentence, setSimulatePlayingSentence] = useState<number | null>(null)  // 当前模拟播放的句子
  const globalDemoSpeedMultiplier = 10  // 10倍速度
  const globalDemoStateRef = useRef<{ isRunning: boolean; currentIndex: number }>({ isRunning: false, currentIndex: -1 })

  // 开始全局演示模式
  const startGlobalDemoMode = useCallback(() => {
    if (globalDemoStateRef.current.isRunning) return

    console.log('[Global Demo] 开始全局演示模式')
    globalDemoStateRef.current.isRunning = true
    globalDemoStateRef.current.currentIndex = 0
    setIsGlobalDemoMode(true)

    // 先触发第一个句子的播放状态
    if (onSimulatePlaySentence) {
      onSimulatePlaySentence(0, 2000)
      setSimulatePlayingSentence(0)
    }

    // 2 秒后开始打字
    setTimeout(() => {
      if (globalDemoStateRef.current.isRunning) {
        setSimulatePlayingSentence(null)
        setRunGlobalDemoSentence(0)
      }
    }, 2000)
  }, [onSimulatePlaySentence])

  // 停止全局演示模式
  const stopGlobalDemoMode = useCallback(() => {
    globalDemoStateRef.current.isRunning = false
    globalDemoStateRef.current.currentIndex = -1
    setIsGlobalDemoMode(false)
    setRunGlobalDemoSentence(null)
    setSimulatePlayingSentence(null)
    console.log('[Global Demo] 全局演示已停止')
  }, [])

  // 处理单个句子演示完成
  const handleDemoSentenceComplete = useCallback((sentenceIndex: number) => {
    console.log(`[Global Demo] 句子 ${sentenceIndex + 1} 演示完成`)

    // 检查是否还有下一个句子
    const nextIndex = sentenceIndex + 1
    if (nextIndex < sentences.length && globalDemoStateRef.current.isRunning) {
      // 先触发下一个句子的播放状态（2秒）
      if (onSimulatePlaySentence) {
        onSimulatePlaySentence(nextIndex, 2000)
        setSimulatePlayingSentence(nextIndex)
      }

      // 2 秒后开始下一个句子的打字
      setTimeout(() => {
        if (globalDemoStateRef.current.isRunning) {
          globalDemoStateRef.current.currentIndex = nextIndex
          setSimulatePlayingSentence(null)
          setRunGlobalDemoSentence(nextIndex)
        }
      }, 2000)
    } else {
      // 全部完成
      console.log('[Global Demo] 全局演示完成')
      globalDemoStateRef.current.isRunning = false
      globalDemoStateRef.current.currentIndex = -1
      setIsGlobalDemoMode(false)
      setRunGlobalDemoSentence(null)
      setSimulatePlayingSentence(null)
    }
  }, [sentences.length, onSimulatePlaySentence])

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
              按 <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">空格</kbd> 跳转 | 最后词按 <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">↵ Enter</kbd> 换句 | 右键标记"还未掌握"
            </p>
            {/* 移动端提示 */}
            <p className="text-xs text-gray-600 dark:text-gray-400 md:hidden">
              按 <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">空格</kbd> / <kbd className="px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700">↵</kbd> 跳转 | 长按标记"还未掌握"
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
                  onSentenceFocus={onSentenceFocus}
                  isGlobalDemoMode={isGlobalDemoMode}
                  speedMultiplier={globalDemoSpeedMultiplier}
                  onStartGlobalDemo={startGlobalDemoMode}
                  runGlobalDemoSentence={runGlobalDemoSentence}
                  onDemoComplete={handleDemoSentenceComplete}
                />
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
