'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Volume2, SkipBack, Pause, Play, RotateCcw, Settings, X } from 'lucide-react'
import Link from 'next/link'
import { speak as speakText, initializeTTS, pauseSpeaking, resumeSpeaking } from '@/lib/speech'

// 辅助函数：Fisher-Yates 洗牌算法
function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  return shuffled
}

type Word = {
  id: string
  word: string
  phonetic: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
}

type WordProgress = {
  word_id: string
  status: 'new' | 'known' | 'vague' | 'unknown'
}

export default function DictationPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string
  const scope = searchParams.get('scope') || 'filtered'

  const [words, setWords] = useState<Word[]>([])
  const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const [bookTitle, setBookTitle] = useState('')
  const [scopeLabel, setScopeLabel] = useState('')

  // 听写相关状态
  const [userInput, setUserInput] = useState('')
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null)
  const [showCorrectAnswer, setShowCorrectAnswer] = useState(false)
  const [countdown, setCountdown] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showDefinition, setShowDefinition] = useState(true) // 默认显示中文释义
  const [definitionPreferenceLoaded, setDefinitionPreferenceLoaded] = useState(false)
  const [hasPlayedOnce, setHasPlayedOnce] = useState(false) // 追踪是否已经播放过一次

  // 用户设置
  const [shuffleOrder, setShuffleOrder] = useState(false)
  const [autoRemoveFromMistakes, setAutoRemoveFromMistakes] = useState(false)
  const [consecutiveCorrectThreshold, setConsecutiveCorrectThreshold] = useState(3)
  const [showSettings, setShowSettings] = useState(false) // 设置面板显示状态
  const [settingsLoaded, setSettingsLoaded] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const speechTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // Fetch words and progress
  useEffect(() => {
    async function fetchData() {
      try {
        const bookRes = await fetch(`/api/books/${bookId}`)
        if (!bookRes.ok) throw new Error('Failed to fetch book')
        const bookData = await bookRes.json()
        setBookTitle(bookData.data.title)

        const params = new URLSearchParams()
        params.set('bookId', bookId)

        if (scope === 'filtered') {
          const theme = searchParams.get('theme')
          const scene = searchParams.get('scene')
          const status = searchParams.get('status')

          if (theme && theme !== 'all') params.set('theme', theme)
          if (scene && scene !== 'all') params.set('scene', scene)
          if (status && status !== 'all') params.set('status', status)
        }

        const wordsRes = await fetch(`/api/words?${params.toString()}`)
        if (!wordsRes.ok) throw new Error('Failed to fetch words')
        const wordsData = await wordsRes.json()

        // 获取用户偏好（包括乱序、自动删除等设置）
        try {
          const prefRes = await fetch(`/api/user-preferences?book_id=${bookId}`)
          if (prefRes.ok) {
            const prefData = await prefRes.json()
            if (prefData.data) {
              // 中文释义设置
              if (prefData.data.hide_definition !== undefined) {
                setShowDefinition(!prefData.data.hide_definition)
              }

              // 听写设置
              setShuffleOrder(prefData.data.shuffle_order || false)
              setAutoRemoveFromMistakes(prefData.data.auto_remove_from_mistakes || false)
              setConsecutiveCorrectThreshold(prefData.data.consecutive_correct_threshold || 3)

              // 应用乱序设置
              const wordsToSet = prefData.data.shuffle_order
                ? shuffleArray([...wordsData.data])
                : wordsData.data

              setWords(wordsToSet)
            }
          }
        } catch (error) {
          console.error('Error fetching preferences:', error)
          // 如果获取偏好失败，使用原始顺序
          setWords(wordsData.data)
        }

        setDefinitionPreferenceLoaded(true)
        setSettingsLoaded(true)

        // Generate scope label
        if (scope === 'all') {
          setScopeLabel('全书')
        } else {
          const parts = []
          const theme = searchParams.get('theme')
          const scene = searchParams.get('scene')
          const status = searchParams.get('status')

          if (theme && theme !== 'all') parts.push(theme)
          if (scene && scene !== 'all') parts.push(scene)
          if (status && status !== 'all') {
            const statusMap: Record<string, string> = {
              'new': '未标注',
              'known': '认识',
              'fuzzy': '模糊',
              'unknown': '不认识'
            }
            parts.push(statusMap[status] || status)
          }

          setScopeLabel(parts.length > 0 ? parts.join(' - ') : '全部')
        }

        const progressRes = await fetch(`/api/word-progress?book_id=${bookId}`)
        if (progressRes.ok) {
          const progressData = await progressRes.json()
          setWordProgress(progressData.data || {})
        }
      } catch (error) {
        console.error('Error fetching data:', error)
        setDefinitionPreferenceLoaded(true)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [bookId, scope, searchParams])

  const currentWord = words[currentIndex]
  const progress = currentWord ? wordProgress[currentWord.id] : null

  // 保存中文释义偏好设置
  const saveDefinitionPreference = useCallback(async (show: boolean) => {
    try {
      await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          hide_definition: !show
        })
      })
    } catch (error) {
      console.error('Error saving preference:', error)
    }
  }, [bookId])

  // 切换中文释义显示
  const handleToggleDefinition = useCallback(() => {
    const newShowDefinition = !showDefinition
    setShowDefinition(newShowDefinition)
    if (definitionPreferenceLoaded) {
      saveDefinitionPreference(newShowDefinition)
    }
  }, [showDefinition, definitionPreferenceLoaded, saveDefinitionPreference])

  // 保存听写设置
  const handleSaveSettings = useCallback(async () => {
    try {
      const response = await fetch('/api/user-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          shuffle_order: shuffleOrder,
          auto_remove_from_mistakes: autoRemoveFromMistakes,
          consecutive_correct_threshold: consecutiveCorrectThreshold
        })
      })

      if (response.ok) {
        // 保存成功，关闭设置面板
        setShowSettings(false)

        // 如果刚刚启用了乱序，需要重新打乱当前单词列表
        // 注意：这里不重新打乱已经学习过的单词，只影响当前会话
        // 如果用户想立即应用乱序，可以重新进入页面
        console.log('✅ 听写设置已保存')
      } else {
        const errorData = await response.json()
        console.error('❌ 保存设置失败:', errorData.error)
        alert(`保存设置失败：${errorData.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('❌ 保存设置时发生错误:', error)
      alert('保存设置时发生错误，请重试')
    }
  }, [bookId, shuffleOrder, autoRemoveFromMistakes, consecutiveCorrectThreshold])

  // 自动聚焦输入框
  useEffect(() => {
    if (currentWord && !loading && !feedback) {
      // 延迟聚焦，确保DOM已渲染
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)

      return () => clearTimeout(timer)
    }
  }, [currentIndex, currentWord, loading, feedback])

  // Text-to-speech - 使用新的TTS工具
  const speak = useCallback(async (text: string) => {
    // 确保TTS已初始化
    if (!(await initializeTTS())) {
      console.warn('⚠️ Dictation: TTS initialization failed')
      return
    }

    if (text) {
      setIsPlaying(true)
      setIsPaused(false)

      speakText(text, {
        lang: 'en-US',
        rate: 0.8, // 稍慢便于听写
        pitch: 1.0,
        volume: 1.0,
        onStart: () => {
          console.log('✅ Dictation: Speech STARTED')
        },
        onEnd: () => {
          console.log('✅ Dictation: Speech ENDED')
          setIsPlaying(false)
          setIsPaused(false)
        },
        onError: () => {
          console.error('❌ Dictation: Speech error')
          setIsPlaying(false)
          setIsPaused(false)
        }
      })
    }
  }, [])

  // 自动播放一次（不循环）
  useEffect(() => {
    if (currentWord && !loading && !feedback) {
      // 延迟500ms后自动播放
      const timer = setTimeout(() => {
        speak(currentWord.word)
        setHasPlayedOnce(true)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [currentIndex, currentWord, loading, feedback, speak])

  // 输入框焦点处理：失焦后再次聚焦时自动播放
  const handleInputFocus = () => {
    // 只有在已经播放过一次（不是页面刚加载）且当前没有播放时才重新播放
    if (hasPlayedOnce && !isPlaying && !feedback && currentWord) {
      speak(currentWord.word)
    }
  }

  // 手动重新播放
  const handleReplay = () => {
    if (currentWord) {
      speak(currentWord.word)
    }
  }

  // 暂停/继续播放 - 使用新的TTS工具
  const handleTogglePause = () => {
    if (isPaused) {
      // 继续
      resumeSpeaking()
      setIsPaused(false)
    } else {
      // 暂停
      pauseSpeaking()
      setIsPaused(true)
    }
  }

  // 返回上一个单词
  const handlePrevious = () => {
    if (currentIndex > 0) {
      setUserInput('')
      setFeedback(null)
      setShowCorrectAnswer(false)
      setCountdown(0)
      setHasPlayedOnce(false) // 重置播放标记
      setCurrentIndex(prev => prev - 1)
    }
  }

  // 用户输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value)
    setFeedback(null)
  }

  // 提交答案
  const handleSubmit = async () => {
    if (!currentWord || !userInput.trim()) return

    const isCorrect = userInput.trim().toLowerCase() === currentWord.word.toLowerCase()

    if (isCorrect) {
      // 正确
      setFeedback('correct')
      playSound('correct')

      // 保存状态为"认识" + 处理连续答对计数
      try {
        const currentProgress = wordProgress[currentWord.id]
        let newConsecutiveCount = (currentProgress as any)?.consecutive_correct_count || 0
        newConsecutiveCount += 1

        // 检查是否需要从错词本移除
        let finalStatus = 'known'
        if (autoRemoveFromMistakes && currentProgress && currentProgress.status !== 'known') {
          // 如果开启了自动移除，且连续答对次数达到阈值，则移出错词本
          if (newConsecutiveCount >= consecutiveCorrectThreshold) {
            finalStatus = 'known' // 从错词本移除，标记为"认识"
            console.log(`✅ 单词 "${currentWord.word}" 连续答对 ${newConsecutiveCount} 次，从错词本移除`)
          } else {
            finalStatus = currentProgress.status // 保持原状态，继续在错词本中
          }
        }

        // 保存进度和计数
        await fetch('/api/word-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word_id: currentWord.id,
            book_id: bookId,
            status: finalStatus,
            consecutive_correct_count: newConsecutiveCount
          })
        })

        setWordProgress(prev => ({
          ...prev,
          [currentWord.id]: {
            word_id: currentWord.id,
            status: finalStatus as 'new' | 'known' | 'vague' | 'unknown',
            consecutive_correct_count: newConsecutiveCount
          }
        }))
      } catch (error) {
        console.error('Error saving progress:', error)
      }

      // 0.5s后切题
      setTimeout(() => {
        moveToNext()
      }, 500)
    } else {
      // 错误
      setFeedback('wrong')
      setShowCorrectAnswer(true)
      playSound('wrong')

      // 自动标记为"不认识" + 重置连续答对计数
      try {
        await fetch('/api/word-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word_id: currentWord.id,
            book_id: bookId,
            status: 'unknown',
            consecutive_correct_count: 0 // 重置连续答对计数
          })
        })

        setWordProgress(prev => ({
          ...prev,
          [currentWord.id]: {
            word_id: currentWord.id,
            status: 'unknown',
            consecutive_correct_count: 0
          }
        }))
      } catch (error) {
        console.error('Error saving progress:', error)
      }

      // 倒计时2s后切题
      setCountdown(2)
      let count = 2
      const timer = setInterval(() => {
        count--
        setCountdown(count)
        if (count <= 0) {
          clearInterval(timer)
          moveToNext()
        }
      }, 1000)
    }
  }

  // 移动到下一个单词
  const moveToNext = () => {
    setUserInput('')
    setFeedback(null)
    setShowCorrectAnswer(false)
    setCountdown(0)
    setHasPlayedOnce(false) // 重置播放标记

    if (currentIndex < words.length - 1) {
      setCurrentIndex(prev => prev + 1)
    }
  }

  // 播放音效
  const playSound = (type: 'correct' | 'wrong') => {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()

    const oscillator = audioContext.createOscillator()
    const gainNode = audioContext.createGain()

    oscillator.connect(gainNode)
    gainNode.connect(audioContext.destination)

    if (type === 'correct') {
      // 正确：清脆的叮声
      oscillator.frequency.value = 800
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.5)
    } else {
      // 错误：温和的滴声（较低频率，正弦波）
      oscillator.frequency.value = 400
      oscillator.type = 'sine'
      gainNode.gain.setValueAtTime(0.2, audioContext.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2)
      oscillator.start(audioContext.currentTime)
      oscillator.stop(audioContext.currentTime + 0.2)
    }
  }

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' && !feedback) {
        e.preventDefault()
        handleSubmit()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [currentWord, userInput, feedback])

  // 自动聚焦输入框
  useEffect(() => {
    if (currentWord && !loading) {
      inputRef.current?.focus()
    }
  }, [currentIndex, currentWord, loading])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-[#9B8CB5] border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-600 font-semibold">加载中...</p>
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>
        <div className="clay-card p-8 text-center">
          <p className="text-lg text-gray-700 font-semibold">暂无单词数据</p>
          <button
            onClick={() => router.push(`/library/${bookId}`)}
            className="clay-button-primary inline-block mt-4 px-6 py-3"
          >
            返回词书详情
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="clay-card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push(`/library/${bookId}`)}
                className="clay-icon p-2 hover:scale-110 transition-transform"
                title="返回"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-gradient-lilac">{bookTitle}</h1>
                <p className="text-xs text-gray-600 font-semibold">
                  听写模式 • {scopeLabel} • {currentIndex + 1} / {words.length}
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowSettings(true)}
              className="clay-icon p-2 hover:scale-110 transition-transform"
              title="听写设置"
            >
              <Settings className="w-5 h-5 text-gray-700" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-6">
            <div className="flex justify-between text-sm text-gray-600 font-semibold mb-2">
              <span>学习进度</span>
              <span>{Math.round((currentIndex / words.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#4CAF50] to-[#66BB6A] h-full transition-all duration-300"
                style={{ width: `${(currentIndex / words.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Dictation Card */}
          <div className="clay-card-xl p-8 mb-6">
            {/* Status Badge */}
            {progress && (
              <div className="mb-4 text-center">
                {progress.status === 'known' && (
                  <span className="clay-badge bg-green-100 text-green-800 px-4 py-2 font-bold">
                    ✓ 已认识
                  </span>
                )}
                {progress.status === 'vague' && (
                  <span className="clay-badge bg-yellow-100 text-yellow-800 px-4 py-2 font-bold">
                    ? 模糊
                  </span>
                )}
                {progress.status === 'unknown' && (
                  <span className="clay-badge bg-red-100 text-red-800 px-4 py-2 font-bold">
                    ✗ 不认识
                  </span>
                )}
              </div>
            )}

            {/* Play Button */}
            <div className="flex justify-center mb-6">
              <button
                onClick={handleReplay}
                disabled={isPlaying && !isPaused}
                className="clay-icon p-4 hover:scale-110 transition-transform shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
                title="重新播放"
              >
                <Volume2 className="w-12 h-12 text-[#9B8CB5]" />
              </button>
              {isPlaying && !isPaused && (
                <div className="absolute mt-16">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#9B8CB5] rounded-full animate-pulse"></div>
                    <span className="text-sm text-gray-600 font-semibold">播放中...</span>
                  </div>
                </div>
              )}
            </div>

            {/* 中文释义显示区域 */}
            <div className="mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                <span className="text-sm text-gray-600">中文释义</span>
                <button
                  onClick={handleToggleDefinition}
                  className="text-xs text-gray-500 hover:text-gray-700 transition-colors underline decoration-dotted"
                  title={showDefinition ? '隐藏中文释义' : '显示中文释义'}
                >
                  {showDefinition ? '隐藏' : '显示'}
                </button>
              </div>
              {showDefinition ? (
                <p className="text-center text-lg font-semibold text-gray-700 py-2">
                  {currentWord.definition}
                </p>
              ) : (
                <p className="text-center text-base text-gray-400 py-2 border-b border-dashed border-gray-300">
                  （已隐藏）
                </p>
              )}
            </div>

            {/* 控制按钮区 - 纯icon样式 */}
            <div className="flex items-center justify-center gap-6 mb-6">
              <button
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="clay-icon p-2 hover:scale-110 transition-transform disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                title="上一个单词"
              >
                <SkipBack className="w-5 h-5 text-gray-600" />
              </button>

              <button
                onClick={handleTogglePause}
                disabled={!isPlaying}
                className="clay-icon p-2 hover:scale-110 transition-transform disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                title={isPaused ? '继续播放' : '暂停播放'}
              >
                {isPaused ? (
                  <Play className="w-5 h-5 text-[#4CAF50]" />
                ) : (
                  <Pause className="w-5 h-5 text-[#4CAF50]" />
                )}
              </button>

              <button
                onClick={handleReplay}
                className="clay-icon p-2 hover:scale-110 transition-transform"
                title="再读一遍"
              >
                <RotateCcw className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Input Area */}
            <div className="mb-6">
              <input
                ref={inputRef}
                type="text"
                value={userInput}
                onChange={handleInputChange}
                onFocus={handleInputFocus}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSubmit()
                  }
                }}
                disabled={feedback !== null}
                className={`w-full px-6 py-4 text-xl font-bold text-center border-2 rounded-xl outline-none transition-all ${
                  feedback === 'correct'
                    ? 'border-green-500 bg-green-50 text-green-800'
                    : feedback === 'wrong'
                    ? 'border-red-500 bg-red-50 text-red-800 animate-shake-input'
                    : 'border-gray-300 bg-white focus:border-[#9B8CB5]'
                }`}
                placeholder="输入你听到的单词..."
                autoComplete="off"
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
              />
            </div>

            {/* Feedback */}
            {feedback === 'correct' && (
              <div className="text-center text-green-700 font-bold text-lg mb-4">
                ✓ 正确！太棒了！
              </div>
            )}

            {feedback === 'wrong' && (
              <div className="text-center text-red-700 font-semibold mb-4">
                <p className="text-lg font-bold mb-2">✗ 拼写错误</p>
                <p className="text-base">
                  正确拼写：<span className="font-black text-xl">{currentWord.word}</span>
                </p>
                {currentWord.phonetic && (
                  <p className="text-sm mt-1">音标：{currentWord.phonetic}</p>
                )}
                {countdown > 0 && (
                  <p className="text-sm mt-2">{countdown}秒后自动切换...</p>
                )}
              </div>
            )}

            {/* Submit Button */}
            {feedback === null && (
              <div className="text-center">
                <button
                  onClick={handleSubmit}
                  disabled={!userInput.trim()}
                  className="clay-button-primary px-8 py-4 text-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  提交答案 (Enter)
                </button>
              </div>
            )}

            {/* Hint */}
            {feedback === null && !userInput && (
              <p className="text-center text-gray-500 font-semibold mt-4">
                💡 听到单词后输入拼写，按Enter提交
              </p>
            )}
          </div>

          {/* Complete Message */}
          {currentIndex === words.length - 1 && feedback === 'correct' && (
            <div className="clay-card-lilac p-6 text-center">
              <h3 className="text-2xl font-bold text-gradient-lilac mb-2">
                🎉 太棒了！
              </h3>
              <p className="text-gray-700 font-semibold mb-4">
                你已经完成了所有单词的听写练习
              </p>
              <button
                onClick={() => router.push(`/library/${bookId}`)}
                className="clay-button-primary inline-block px-6 py-3 font-bold"
              >
                返回词书详情
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSettings(false)}
          ></div>

          {/* Modal */}
          <div className="clay-card-xl p-6 max-w-md w-full relative z-10">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gradient-lilac">⚙️ 听写设置</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="clay-icon p-2 hover:scale-110 transition-transform"
                title="关闭"
              >
                <X className="w-5 h-5 text-gray-700" />
              </button>
            </div>

            {/* 练习顺序 */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                🎲 练习顺序
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 p-3 clay-card cursor-pointer hover:scale-[1.01] transition-transform">
                  <input
                    type="radio"
                    name="shuffleOrder"
                    checked={!shuffleOrder}
                    onChange={() => setShuffleOrder(false)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">按顺序（默认）</span>
                </label>
                <label className="flex items-center gap-3 p-3 clay-card cursor-pointer hover:scale-[1.01] transition-transform">
                  <input
                    type="radio"
                    name="shuffleOrder"
                    checked={shuffleOrder}
                    onChange={() => setShuffleOrder(true)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">随机乱序</span>
                </label>
              </div>
            </div>

            {/* 答对后自动移出错词 */}
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-3">
                ✅ 答对后自动移出错词
              </label>

              {/* 开关 */}
              <div className="mb-3">
                <label className="flex items-center gap-3 p-3 clay-card cursor-pointer hover:scale-[1.01] transition-transform">
                  <input
                    type="checkbox"
                    checked={autoRemoveFromMistakes}
                    onChange={(e) => setAutoRemoveFromMistakes(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-gray-700">启用自动移除</span>
                </label>
              </div>

              {/* 阈值选择 */}
              {autoRemoveFromMistakes && (
                <div className="space-y-2">
                  <label className="block text-xs text-gray-600">连续答对次数</label>
                  <select
                    value={consecutiveCorrectThreshold}
                    onChange={(e) => setConsecutiveCorrectThreshold(Number(e.target.value))}
                    className="w-full px-4 py-2 clay-card text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#9B8CB5]"
                  >
                    <option value={1}>连续答对 1 次</option>
                    <option value={2}>连续答对 2 次</option>
                    <option value={3}>连续答对 3 次（推荐）</option>
                    <option value={5}>连续答对 5 次</option>
                    <option value={10}>连续答对 10 次</option>
                  </select>
                </div>
              )}

              {/* 提示信息 */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-xs text-blue-700">
                  💡 <strong>提示：</strong>开启后，连续答对指定次数的单词会自动从错词本中移除，标记为"认识"。
                </p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                onClick={handleSaveSettings}
                disabled={!settingsLoaded}
                className="flex-1 clay-button-primary px-4 py-3 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存设置
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="flex-1 clay-button-secondary px-4 py-3 text-sm font-bold"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 30%, 50%, 70%, 90% { transform: translateX(-8px); }
          20%, 40%, 60%, 80% { transform: translateX(8px); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
      `}</style>
    </div>
  )
}
