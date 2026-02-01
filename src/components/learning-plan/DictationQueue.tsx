'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  Volume2,
  CornerDownLeft,
  Play
} from 'lucide-react'
import { markWord } from '@/services/learning-plan'
import { useLearningPlanTTS } from '@/hooks/useLearningPlanTTS'
import { useTheme } from '@/contexts/ThemeContext'

interface Word {
  id: string
  word: string
  phonetic?: string
  meaning?: string
  type: 'new' | 'review'
  audio_url?: string | null  // 🔧 添加 audio_url 属性
}

interface Props {
  initialWords: Word[]
  bookId: string
  onComplete: () => void
  totalOriginalWords?: number  // 🔧 新增：原始总单词数
  completedOriginalWords?: number  // 🔧 新增：已完成单词数
}

export function DictationQueue({
  initialWords,
  bookId,
  onComplete,
  totalOriginalWords,
  completedOriginalWords
}: Props) {
  const router = useRouter()
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'

  // TTS Hook - 学习计划专用（高性能版本）
  const { play: speak, isPlaying } = useLearningPlanTTS({ type: '2', showFallbackToast: false })

  // Refs
  const inputRef = useRef<HTMLInputElement>(null)
  const hasPlayedOnceRef = useRef(false)
  const isTransitioningRef = useRef(false)  // 🔧 新增：标记是否正在切题（防止竞态条件）

  // 队列状态
  const [queue, setQueue] = useState<Word[]>([...initialWords])
  const [completed, setCompleted] = useState<Word[]>([])
  // 🔧 移除 currentIndex，始终使用 queue[0] 作为当前单词（避免索引和队列不同步）
  const [currentWordId, setCurrentWordId] = useState<string>(initialWords[0]?.id || '') // 🔧 新增：追踪当前单词ID

  // UI 状态
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false) // 🔧 新增：记录用户是否已交互
  const [marking, setMarking] = useState(false)
  const [displayedWord, setDisplayedWord] = useState<Word | null>(null)  // 🔧 新增：保存当前显示的单词（防止队列更新后显示错误）

  const currentWord = queue[0]  // 🔧 始终使用第一个单词作为当前单词

  // 🔧 同步 displayedWord（当没有反馈显示时）
  useEffect(() => {
    if (!feedback && !showCorrectAnswer) {
      setDisplayedWord(currentWord || null)
    }
  }, [currentWord, feedback, showCorrectAnswer])

  // 🔧 使用原始进度数据（如果没有传入，则使用队列长度）
  const totalCount = totalOriginalWords || initialWords.length
  const initialCompletedCount = completedOriginalWords || 0

  // 🔧 监听 currentWord 变化，更新 currentWordId
  useEffect(() => {
    console.log('[DictationQueue] 🔍 currentWord 变化检测:', {
      currentWord: currentWord?.word,
      currentWordId,
      hasUserInteracted
    })

    if (currentWord && currentWord.id !== currentWordId) {
      console.log('[DictationQueue] 🔍 currentWord 变化:', {
        oldId: currentWordId,
        newId: currentWord.id,
        newWord: currentWord.word
      })
      setCurrentWordId(currentWord.id)

      // 🔧 自动聚焦输入框
      setTimeout(() => {
        inputRef.current?.focus()
        console.log('[DictationQueue] 🎯 自动聚焦输入框')
      }, 100)
    }
  }, [currentWord, currentWordId])

  // 🔧 首次加载时聚焦输入框
  useEffect(() => {
    if (currentWord && inputRef.current && !hasUserInteracted) {
      inputRef.current.focus()
      console.log('[DictationQueue] 🎯 首次加载聚焦输入框')
    }
  }, [])
  const completedCount = completed.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  // ============================================
  // 🔊 音效系统
  // ============================================
  const getAudioContext = () => {
    if (typeof window === 'undefined') return null
    if (!window.AudioContext && !(window as any).webkitAudioContext) return null
    return new (window.AudioContext || (window as any).webkitAudioContext)()
  }

  // 打字机音效
  const playTypewriterSound = () => {
    try {
      const audioContext = getAudioContext()
      if (!audioContext) return
      const now = audioContext.currentTime

      const metalOsc = audioContext.createOscillator()
      const metalGain = audioContext.createGain()
      metalOsc.type = 'square'
      metalOsc.frequency.setValueAtTime(800, now)
      metalGain.gain.setValueAtTime(0.02, now)
      metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.03)

      const bodyOsc = audioContext.createOscillator()
      const bodyGain = audioContext.createGain()
      bodyOsc.type = 'triangle'
      bodyOsc.frequency.setValueAtTime(200, now)
      bodyGain.gain.setValueAtTime(0.03, now)
      bodyGain.gain.exponentialRampToValueAtTime(0.001, now + 0.05)

      metalOsc.connect(metalGain).connect(audioContext.destination)
      bodyOsc.connect(bodyGain).connect(audioContext.destination)

      metalOsc.start(now + 0.005)
      metalOsc.stop(now + 0.045)
      bodyOsc.start(now)
      bodyOsc.stop(now + 0.06)
    } catch (error) {
      console.warn('打字机音效播放失败:', error)
    }
  }

  // 错误音效
  const playErrorSound = () => {
    try {
      const audioContext = getAudioContext()
      if (!audioContext) return
      const now = audioContext.currentTime

      const osc1 = audioContext.createOscillator()
      const gain1 = audioContext.createGain()
      osc1.type = 'sawtooth'
      osc1.frequency.setValueAtTime(150, now)
      osc1.frequency.linearRampToValueAtTime(100, now + 0.3)
      gain1.gain.setValueAtTime(0.2, now)
      gain1.gain.exponentialRampToValueAtTime(0.01, now + 0.3)

      const osc2 = audioContext.createOscillator()
      const gain2 = audioContext.createGain()
      osc2.type = 'square'
      osc2.frequency.setValueAtTime(30, now)
      gain2.gain.setValueAtTime(0.05, now)
      gain2.gain.exponentialRampToValueAtTime(0.01, now + 0.2)

      osc1.connect(gain1).connect(audioContext.destination)
      osc2.connect(gain2).connect(audioContext.destination)

      osc1.start(now)
      osc1.stop(now + 0.3)
      osc2.start(now)
      osc2.stop(now + 0.2)
    } catch (error) {
      console.warn('错误音效播放失败:', error)
    }
  }

  // 正确音效
  const playCorrectSound = () => {
    try {
      const audioContext = getAudioContext()
      if (!audioContext) return
      const now = audioContext.currentTime

      const osc = audioContext.createOscillator()
      const gain = audioContext.createGain()
      osc.type = 'sine'
      osc.frequency.setValueAtTime(800, now)
      osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1)
      gain.gain.setValueAtTime(0.15, now)
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15)

      osc.connect(gain).connect(audioContext.destination)
      osc.start(now)
      osc.stop(now + 0.15)
    } catch (error) {
      console.warn('正确音效播放失败:', error)
    }
  }

  const lastPlayTimeRef = useRef(0)
  const playTypewriterSoundThrottled = () => {
    const now = Date.now()
    if (now - lastPlayTimeRef.current > 80) {
      lastPlayTimeRef.current = now
      playTypewriterSound()
    }
  }

  // ============================================
  // 🎵 播放发音
  // ============================================
  const playPronunciation = () => {
    // 🔧 使用 displayedWord 或 currentWord（优先 displayedWord）
    const wordToPlay = displayedWord || currentWord
    if (!wordToPlay || isPlaying) return

    setHasPlayedOnce(true)
    hasPlayedOnceRef.current = true
    speak(wordToPlay.word, wordToPlay.audio_url)

    // 🔧 播放后聚焦输入框
    setTimeout(() => {
      inputRef.current?.focus()
      console.log('[DictationQueue] 🎯 播放后聚焦输入框')
    }, 100)
  }

  // 🔧 修复：自动播放发音（用户交互后才自动播放）
  useEffect(() => {
    console.log('[DictationQueue] 🔍 自动播放 useEffect 触发:', {
      hasUserInteracted,
      currentWordId,
      currentWord: currentWord?.word,
      isTransitioning: isTransitioningRef.current,
      showCorrectAnswer  // 🔧 新增日志
    })

    // 🔧 如果正在切题（队列更新中），跳过自动播放（防止竞态条件）
    if (isTransitioningRef.current) {
      console.log('[DictationQueue] ⏸️ 正在切题，跳过自动播放')
      return
    }

    // 🔧 如果正在显示错误答案，跳过自动播放（避免干扰用户学习）
    if (showCorrectAnswer) {
      console.log('[DictationQueue] ⏸️ 正在显示错误答案，跳过自动播放')
      return
    }

    if (currentWord && hasUserInteracted && currentWordId) {
      // 只有在用户交互过之后才自动播放
      hasPlayedOnceRef.current = false
      setHasPlayedOnce(false)

      // 延迟 500ms 播放
      const timer = setTimeout(() => {
        // 🔧 再次检查是否还在切题中（双重保险）
        if (isTransitioningRef.current) {
          console.log('[DictationQueue] ⏸️ 延迟检查时仍在切题，跳过自动播放')
          return
        }

        // 🔧 再次检查是否还在显示错误答案（双重保险）
        if (showCorrectAnswer) {
          console.log('[DictationQueue] ⏸️ 延迟检查时仍在显示错误答案，跳过自动播放')
          return
        }

        if (!hasPlayedOnceRef.current && currentWord) {
          console.log('[DictationQueue] 🎵 自动播放发音:', currentWord.word)
          speak(currentWord.word, currentWord.audio_url)
          setHasPlayedOnce(true)
          hasPlayedOnceRef.current = true

          // 🔧 自动播放后聚焦输入框
          setTimeout(() => {
            inputRef.current?.focus()
            console.log('[DictationQueue] 🎯 自动播放后聚焦输入框')
          }, 100)
        }
      }, 500)
      return () => clearTimeout(timer)
    }
  }, [currentWordId, hasUserInteracted, showCorrectAnswer]) // 🔧 添加 showCorrectAnswer 依赖

  // ============================================
  // ⌨️ Tab键提示首字母
  // ============================================
  const handleTabKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // 🔧 使用 displayedWord 或 currentWord（优先 displayedWord）
    const wordForHint = displayedWord || currentWord
    if (e.key === 'Tab' && wordForHint) {
      e.preventDefault()
      const firstLetter = wordForHint.word.charAt(0).toLowerCase()
      setUserInput(prev => prev + firstLetter)
    }
  }

  // ============================================
  // ✅ 提交答案
  // ============================================
  const handleSubmit = async () => {
    if (!currentWord || marking) return

    // 🔧 标记用户已交互（后续单词自动播放）
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
      console.log('[DictationQueue] ✅ 用户首次交互，后续将自动播放')
    }

    // 🔧 保存当前显示的单词（防止队列更新后显示错误）
    const wordBeingTested = currentWord
    setDisplayedWord(currentWord)

    const isEmptyInput = userInput.trim() === ''
    const isCorrect = !isEmptyInput && userInput.trim().toLowerCase() === wordBeingTested.word.toLowerCase()

    setMarking(true)

    console.log('[DictationQueue] 📝 验证答案:', {
      userInput,
      correctWord: wordBeingTested.word,
      isCorrect,
      status: isCorrect ? 'known' : 'fuzzy'
    })

    // 🔥 先立即更新UI（乐观更新）
    const status = isCorrect ? 'known' : 'fuzzy'  // 🔧 改为 fuzzy，不是 unknown

    if (status === 'known') {
      // ✅ 答对：移出队列，显示反馈，1秒后切题
      const nextWordId = queue.length > 1 ? queue[1]?.id : null  // 🔧 提前获取下一个单词ID

      // 🔧 设置切题标志（防止自动播放乱序）
      isTransitioningRef.current = true
      console.log('[DictationQueue] 🔒 开始切题，锁定自动播放')

      setCompleted(prev => [...prev, wordBeingTested])
      setQueue(prev => prev.filter(w => w !== wordBeingTested))
      console.log('[DictationQueue] ✅ Correct! Progress:', completed.length + 1, '/', totalCount)

      setFeedback('correct')
      playCorrectSound()

      // 🔧 1秒后自动切题
      setTimeout(() => {
        console.log('[DictationQueue] ✅ 答对切题:', {
          userInput,
          oldQueue: queue.length,
          completed: completed.length,
          下一个单词: nextWordId
        })
        setUserInput('')
        setFeedback(null)
        setShowCorrectAnswer(false)
        // 🔧 不再需要 setCurrentIndex，因为始终使用 queue[0]
        setMarking(false)

        // 🔧 解锁自动播放（给 React 一点时间重新渲染）
        setTimeout(() => {
          isTransitioningRef.current = false
          console.log('[DictationQueue] 🔓 切题完成，解锁自动播放')
        }, 100)
      }, 1000)
    } else {
      // ❌ 答错：移到队尾，显示正确答案，3秒后切题
      // 🔧 答错时不锁定（因为3秒足够队列更新完成，不应阻止自动播放）
      setQueue(prev => {
        const newQueue = [...prev]
        const index = newQueue.findIndex(w => w === wordBeingTested)
        if (index !== -1) {
          const [word] = newQueue.splice(index, 1)
          return [...newQueue, word]
        }
        return newQueue
      })
      console.log('[DictationQueue] ❌ Wrong! Word moved to end of queue')

      setFeedback('wrong')
      setShowCorrectAnswer(true)
      playErrorSound()

      // 3秒后自动切题
      setTimeout(() => {
        setUserInput('')
        setFeedback(null)
        setShowCorrectAnswer(false)
        // 🔧 不再需要 setCurrentIndex，因为始终使用 queue[0]
        setMarking(false)
      }, 3000)
    }

    // 🌐 后台调用API（不阻塞UI）
    markWord({
      wordId: wordBeingTested.id,
      bookId,
      status,
      source: 'dictation'
    }).then(() => {
      console.log('[DictationQueue] ✅ API mark success')
    }).catch((error) => {
      console.error('[DictationQueue] ❌ API mark failed:', error)
      toast.error('标记失败，请重试')
    })

    // 检查是否全部完成
    if (status === 'known' && completed.length + 1 === totalCount) {
      toast.success('🎉 太棒了！今日任务全部完成！')
      setTimeout(() => {
        onComplete()
      }, 1500)
    }
  }

  // 在显示错误答案时，按回车可以立即跳过
  const handleKeyPressInErrorState = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && feedback === 'wrong' && showCorrectAnswer) {
      e.preventDefault()
      // 立即跳到下一个单词
      setUserInput('')
      setFeedback(null)
      setShowCorrectAnswer(false)
      // 🔧 不再需要 setCurrentIndex，因为始终使用 queue[0]
      setMarking(false)
    }
  }

  // 返回
  const handleBack = () => {
    router.back()
  }

  if (!currentWord) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-[#0f172a]">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 text-green-500">✅</div>
          <h2 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
            🎉 所有单词已完成！
          </h2>
          <button
            onClick={onComplete}
            className="px-6 py-3 bg-[#B4F416] border-3 border-black text-black font-bold rounded shadow-[4px_4px_0px_0px_#000]"
          >
            查看完成统计
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0f172a]">
      {/* 顶部导航栏 */}
      <div className="sticky top-0 z-10 px-4 py-3 bg-white dark:bg-[#0f172a]">
        <div className="max-w-2xl mx-auto flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <button
              onClick={handleBack}
              className="p-2 rounded hover:opacity-70 text-gray-600 dark:text-gray-400"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                <span>🎧 听写模式</span>
              </h1>
            </div>
          </div>
        </div>

        {/* 进度条 */}
        <div className="max-w-2xl mx-auto mb-2">
          <div className="flex justify-between text-xs mb-1 text-gray-500 dark:text-gray-400">
            <span>{completedCount + initialCompletedCount}/{totalCount} 已完成</span>
            <span className="font-mono">{((completedCount + initialCompletedCount) / totalCount * 100).toFixed(0)}%</span>
          </div>
          <div className="w-full h-2 rounded-full overflow-hidden bg-gray-200 dark:bg-slate-800">
            <div
              className="h-full bg-[#B4F416] transition-all duration-300"
              style={{ width: `${((completedCount + initialCompletedCount) / totalCount * 100)}%` }}
            />
          </div>
        </div>

        {/* 队列状态 */}
        <div className="max-w-2xl mx-auto flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
            <span className="font-mono">✅ 已完成: {completedCount + initialCompletedCount}</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-gray-400">
            <span className="font-mono">🔄 循环中: {queue.length}</span>
          </div>
        </div>
      </div>

      {/* 听写区域 */}
      <div className="max-w-2xl mx-auto px-4 py-6">
        <div className="p-8 border-[4px] border-black rounded shadow-[8px_8px_0px_0px_#000] dark:shadow-none bg-white dark:bg-[#0f172a]">
          {/* 类型标签 */}
          {(displayedWord || currentWord) && (
            <div className={`mb-4 inline-block px-3 py-1 rounded-full text-xs font-black border-2 border-black ${
              (displayedWord || currentWord).type === 'review'
                ? 'bg-[#FACC15] text-black'
                : 'bg-[#B4F416] text-black'
            }`} style={{ boxShadow: '2px 2px 0px 0px #000' }}>
              {(displayedWord || currentWord).type === 'review' ? '🔄 复习' : '✨ 新学'}
            </div>
          )}

          {/* 播放发音按钮 */}
          <div className="flex flex-col items-center mb-8">
            <button
              onClick={playPronunciation}
              disabled={isPlaying}
              className="w-24 h-24 rounded-full flex items-center justify-center transition-all hover:scale-105 disabled:opacity-50 bg-[#a855f7] border-4 border-black shadow-[4px_4px_0px_0px_#000] dark:shadow-none active:translate-x-[2px] active:translate-y-[2px] active:shadow-none"
            >
              <Play className="w-12 h-12 text-white ml-1" fill="white" strokeWidth={2} />
            </button>

            {/* 🔧 首次提示 */}
            {!hasUserInteracted && (
              <p className="mt-4 text-sm text-gray-500 dark:text-gray-400 animate-pulse">
                💡 点击播放按钮或提交首个答案后，后续单词将自动播放
              </p>
            )}
          </div>

          {/* 沉浸式输入区 */}
          <div className="w-full flex flex-col items-center">
            {/* 输入框 */}
            <div className="w-full px-8 relative group">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={(e) => {
                  setUserInput(e.target.value)
                  // 触发打字机音效
                  if (e.target.value && feedback === null) {
                    playTypewriterSoundThrottled()
                  }
                }}
                onKeyPress={(e) => {
                  if (feedback === 'wrong' && showCorrectAnswer) {
                    handleKeyPressInErrorState(e)
                  } else if (e.key === 'Enter') {
                    handleSubmit()
                  }
                }}
                onKeyDown={handleTabKeyPress}
                placeholder="在此书写..."
                disabled={feedback === 'correct'}
                className="w-full py-4 text-3xl font-black text-center bg-transparent border-b-4 border-gray-300 dark:border-slate-600 focus:outline-none focus:border-black dark:focus:border-slate-400 transition-all placeholder:font-bold placeholder:text-2xl placeholder:text-gray-400 dark:placeholder:text-slate-600 text-gray-900 dark:text-white"
                autoFocus
              />
              {/* 动态底线动画 */}
              <div className="absolute bottom-0 left-0 w-0 h-1 bg-[#B4F416] transition-all duration-500 ease-out group-focus-within:w-full group-focus-within:left-0"></div>
            </div>

            {/* 提交按钮 */}
            <div className="h-16 mt-6 flex items-center justify-center">
              <button
                onClick={handleSubmit}
                disabled={userInput.trim() === '' || feedback !== null || marking}
                className={`flex items-center gap-2 px-6 py-3 text-white border-2 border-black rounded-full transition-all ${
                  userInput.trim() === '' || feedback !== null || marking
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-black shadow-[4px_4px_0px_0px_#B4F416] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_#B4F416] active:translate-y-[4px] active:shadow-none'
                }`}
              >
                <span className="text-sm font-black">提交</span>
                <CornerDownLeft size={18} strokeWidth={3} />
              </button>
            </div>
          </div>

          {/* Feedback Messages */}
          {feedback === 'correct' && (
            <div className="mt-4 text-center">
              <p className="text-green-600 font-black text-lg">✓ 正确！</p>
            </div>
          )}

          {feedback === 'wrong' && showCorrectAnswer && displayedWord && (
            <div className="mt-4 text-center">
              <p className="text-red-600 font-black text-lg mb-2">✗ 拼写错误</p>
              <p className="font-bold mb-1 text-gray-600 dark:text-gray-400">
                正确拼写：<span className="font-black text-xl text-gray-900 dark:text-white">{displayedWord.word}</span>
              </p>
              {displayedWord.phonetic && (
                <p className="text-sm font-mono text-gray-500 dark:text-gray-500">
                  {displayedWord.phonetic}
                </p>
              )}
              {displayedWord.meaning && (
                <p className="text-sm mt-2 text-gray-600 dark:text-gray-400">
                  {displayedWord.meaning}
                </p>
              )}
              <p className="text-xs font-semibold mt-2 text-gray-400 dark:text-gray-500">
                💡 按回车立即跳过，或等待 3 秒自动跳过
              </p>
            </div>
          )}
        </div>

        {/* 提示 */}
        {!feedback && (
          <div className="mt-4 p-4 rounded text-center bg-gray-100 dark:bg-slate-800 border-2 border-black dark:border-slate-600">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              💡 点击播放按钮听发音，然后输入正确的拼写
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
              ⌨️ 按 Tab 键显示首字母提示
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
