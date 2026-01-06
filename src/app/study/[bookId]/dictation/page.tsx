'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Volume2, SkipBack, Pause, Play, RotateCcw } from 'lucide-react'
import Link from 'next/link'

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

        setWords(wordsData.data)

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

        // 获取用户偏好（听写模式中文释义设置）
        try {
          const prefRes = await fetch(`/api/user-preferences?book_id=${bookId}`)
          if (prefRes.ok) {
            const prefData = await prefRes.json()
            if (prefData.data && prefData.data.hide_definition !== undefined) {
              setShowDefinition(!prefData.data.hide_definition)
            }
          }
        } catch (error) {
          console.error('Error fetching preferences:', error)
        }

        setDefinitionPreferenceLoaded(true)
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

  // Text-to-speech - 只播放一次
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window && text) {
      speechSynthesis.cancel()

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.8 // 稍慢便于听写
      utterance.pitch = 1.0

      utterance.onstart = () => {
        setIsPlaying(true)
        setIsPaused(false)
      }

      utterance.onend = () => {
        setIsPlaying(false)
        setIsPaused(false)
      }

      utterance.onerror = () => {
        setIsPlaying(false)
        setIsPaused(false)
      }

      speechSynthesis.speak(utterance)
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

  // 暂停/继续播放
  const handleTogglePause = () => {
    if (isPaused) {
      // 继续
      speechSynthesis.resume()
      setIsPaused(false)
    } else {
      // 暂停
      speechSynthesis.pause()
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

      // 保存状态为"认识"
      try {
        await fetch('/api/word-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word_id: currentWord.id,
            book_id: bookId,
            status: 'known'
          })
        })

        setWordProgress(prev => ({
          ...prev,
          [currentWord.id]: { word_id: currentWord.id, status: 'known' }
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

      // 自动标记为"不认识"
      try {
        await fetch('/api/word-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word_id: currentWord.id,
            book_id: bookId,
            status: 'unknown'
          })
        })

        setWordProgress(prev => ({
          ...prev,
          [currentWord.id]: { word_id: currentWord.id, status: 'unknown' }
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
          <div className="clay-card px-6 py-4 flex items-center gap-4">
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
