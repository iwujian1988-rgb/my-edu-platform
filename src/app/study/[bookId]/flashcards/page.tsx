'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Volume2 } from 'lucide-react'
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

export default function FlashcardsPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string
  const scope = searchParams.get('scope') || 'filtered'

  const [words, setWords] = useState<Word[]>([])
  const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bookTitle, setBookTitle] = useState('')
  const [scopeLabel, setScopeLabel] = useState('')

  // 拖拽相关状态
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [keyboardAnimation, setKeyboardAnimation] = useState<{ x: number; rotate: number } | null>(null)
  const cardRef = useRef<HTMLDivElement>(null)

  // 批量保存相关状态
  const pendingSaveRef = useRef<Record<string, 'known' | 'vague' | 'unknown'>>({})
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null)

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
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [bookId, scope, searchParams])

  const currentWord = words[currentIndex]
  const progress = currentWord ? wordProgress[currentWord.id] : null

  // Text-to-speech (使用useCallback避免依赖问题)
  const speak = useCallback((text: string) => {
    if ('speechSynthesis' in window && text) {
      speechSynthesis.cancel() // 停止之前的朗读
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }, [])

  // 批量保存函数
  const flushPendingSaves = useCallback(async () => {
    const pending = { ...pendingSaveRef.current }
    if (Object.keys(pending).length === 0) return

    try {
      // 批量保存所有待保存的数据
      const promises = Object.entries(pending).map(([wordId, status]) =>
        fetch('/api/word-progress', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            word_id: wordId,
            book_id: bookId,
            status
          })
        })
      )

      await Promise.all(promises)
      pendingSaveRef.current = {} // 清空待保存队列
    } catch (error) {
      console.error('Error saving progress batch:', error)
    }
  }, [bookId])

  // Handle card flip
  const handleFlip = useCallback(() => {
    setIsFlipped(!isFlipped)
  }, [isFlipped])

  // Handle word status
  const handleStatus = useCallback((status: 'known' | 'vague' | 'unknown') => {
    if (!currentWord) return

    // 1. 立即更新本地状态（乐观更新）
    setWordProgress(prev => ({
      ...prev,
      [currentWord.id]: { word_id: currentWord.id, status }
    }))

    // 2. 添加到待保存队列
    pendingSaveRef.current[currentWord.id] = status

    // 3. 设置定时器，3秒后批量保存
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current)
    }
    saveTimerRef.current = setTimeout(() => {
      flushPendingSaves()
      saveTimerRef.current = null
    }, 3000)

    // 4. 触发键盘动画
    let animationOffset = { x: 0, rotate: 0 }
    if (status === 'known') {
      animationOffset = { x: -150, rotate: -15 }
    } else if (status === 'vague') {
      animationOffset = { x: 0, rotate: 0 }
    } else if (status === 'unknown') {
      animationOffset = { x: 150, rotate: 15 }
    }
    setKeyboardAnimation(animationOffset)

    setIsFlipped(false)

    // 5. 立即执行动画和切换，不等待保存
    setTimeout(() => {
      setKeyboardAnimation(null)
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1)
      }
    }, 300)
  }, [currentWord, currentIndex, words.length, flushPendingSaves])

  // 自动朗读新单词 - 只在索引变化时触发
  useEffect(() => {
    if (currentWord && !loading && !isFlipped) {
      // 延迟500ms后自动朗读，让用户先看到单词
      const timer = setTimeout(() => {
        speak(currentWord.word)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [currentIndex]) // 只依赖currentIndex

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        // ⬅️ 认识
        e.preventDefault()
        handleStatus('known')
      } else if (e.key === 'ArrowUp') {
        // ↑ 模糊
        e.preventDefault()
        handleStatus('vague')
      } else if (e.key === 'ArrowRight') {
        // ➡️ 不认识
        e.preventDefault()
        handleStatus('unknown')
      } else if (e.key === 'ArrowDown') {
        // ⬇️ 翻转查看详情
        e.preventDefault()
        handleFlip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleStatus, handleFlip])

  // 页面卸载或隐藏时保存待保存的数据
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (Object.keys(pendingSaveRef.current).length > 0) {
        flushPendingSaves()
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden && Object.keys(pendingSaveRef.current).length > 0) {
        flushPendingSaves()
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      // 组件卸载时保存
      if (Object.keys(pendingSaveRef.current).length > 0) {
        flushPendingSaves()
      }
    }
  }, [flushPendingSaves])

  // 拖拽开始
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    setDragStart({ x: clientX, y: clientY })
  }

  // 拖拽中
  const handleDragMove = (e: React.MouseEvent | React.TouchEvent) => {
    if (!dragStart) return

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY

    const deltaX = clientX - dragStart.x
    const deltaY = clientY - dragStart.y

    setDragOffset({ x: deltaX, y: deltaY })
  }

  // 拖拽结束
  const handleDragEnd = () => {
    if (!dragStart) return

    const distance = Math.sqrt(dragOffset.x ** 2 + dragOffset.y ** 2)
    const threshold = 50 // 最小滑动距离（像素）

    // 如果滑动距离太小，视为点击
    if (distance < threshold) {
      setDragStart(null)
      setDragOffset({ x: 0, y: 0 })
      return
    }

    // 计算滑动角度（转换为度数）
    const angle = Math.atan2(dragOffset.y, dragOffset.x) * (180 / Math.PI)

    // 根据角度判断主要滑动方向
    // 右滑：-45° 到 45°
    if (angle > -45 && angle <= 45) {
      handleStatus('unknown')
    }
    // 下滑：45° 到 135°
    else if (angle > 45 && angle <= 135) {
      // 下滑时如果卡片在背面，翻回正面
      if (isFlipped) handleFlip()
    }
    // 左滑：135° 到 225°（-135° 到 -180° 和 135° 到 180°）
    else if (angle > 135 || angle <= -135) {
      handleStatus('known')
    }
    // 上滑：-135° 到 -45°
    else if (angle > -135 && angle <= -45) {
      handleFlip()
    }

    setDragStart(null)
    setDragOffset({ x: 0, y: 0 })
  }

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
          <Link href={`/library/${bookId}`} className="clay-button-primary inline-block mt-4 px-6 py-3">
            返回词书详情
          </Link>
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
            <Link href={`/library/${bookId}`}>
              <button className="clay-icon p-2 hover:scale-110 transition-transform">
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </button>
            </Link>
            <div>
              <h1 className="text-lg font-bold text-gradient-lilac">{bookTitle}</h1>
              <p className="text-xs text-gray-600 font-semibold">
                卡片背单词 • {scopeLabel} • {currentIndex + 1} / {words.length}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Flashcard */}
      <main className="container mx-auto px-4 py-4">
        <div className="max-w-xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-4">
            <div className="flex justify-between text-sm text-gray-600 font-semibold mb-2">
              <span>学习进度</span>
              <span>{Math.round((currentIndex / words.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#9B8CB5] to-[#B8A5D6] h-full transition-all duration-300"
                style={{ width: `${(currentIndex / words.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* 操作提示 */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-center">
            <div>
              <p className="text-xs text-gray-500 mb-1">← 左滑</p>
              <p className="text-sm font-semibold text-green-700">认识</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">↑ 上滑</p>
              <p className="text-sm font-semibold text-yellow-700">模糊</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">→ 右滑</p>
              <p className="text-sm font-semibold text-red-700">不认识</p>
            </div>
          </div>

          {/* Card */}
          <div className="relative mb-6" style={{ height: '400px' }}>
            {/* Preview Card - 下一个单词的预览 */}
            {currentIndex < words.length - 1 && (
              <div
                className="absolute inset-0 clay-card-xl p-8 flex flex-col items-center justify-center pointer-events-none"
                style={{
                  opacity: (Math.abs(dragOffset.x) > 50 || Math.abs(dragOffset.y) > 50 || keyboardAnimation) ? 0.4 : 0,
                  transform: `translateZ(-50px)`,
                  transition: 'opacity 0.3s ease-out',
                  zIndex: 0
                }}
              >
                <div className="text-center w-full">
                  {/* Word */}
                  <h2 className="text-5xl font-black text-gray-900 mb-4">
                    {words[currentIndex + 1]?.word}
                  </h2>

                  {/* Phonetic */}
                  {words[currentIndex + 1]?.phonetic && (
                    <p className="text-xl text-gray-600 font-semibold mb-6">
                      {words[currentIndex + 1]?.phonetic}
                    </p>
                  )}

                  {/* Part of Speech */}
                  {words[currentIndex + 1]?.part_of_speech && (
                    <div className="mb-6">
                      <span className="inline-block clay-badge bg-purple-100 text-purple-800 px-4 py-2 font-bold text-sm">
                        {words[currentIndex + 1]?.part_of_speech}
                      </span>
                    </div>
                  )}

                  {/* Play Button */}
                  <button
                    className="hover:scale-110 transition-transform text-gray-300"
                    title="朗读单词"
                  >
                    <Volume2 className="w-12 h-12" />
                  </button>
                </div>
              </div>
            )}

            <div
              ref={cardRef}
              className="clay-card-xl p-8 cursor-pointer min-h-[350px] flex items-center justify-center relative"
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              onClick={handleFlip}
              style={{
                perspective: '1000px',
                transform: `translate(${dragOffset.x + (keyboardAnimation?.x || 0)}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05 + (keyboardAnimation?.rotate || 0)}deg)`,
                transition: dragStart || keyboardAnimation ? 'transform 0.3s ease-out' : 'transform 0.3s ease-out',
                zIndex: 10
              }}
            >
              <div
                className="w-full"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Front - Word */}
                <div className="text-center" style={{ backfaceVisibility: 'hidden' }}>
                  {/* Status Badge */}
                  {progress && (
                    <div className="mb-4">
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

                  {/* Word */}
                  <h2 className="text-5xl font-black text-gray-900 mb-4">
                    {currentWord.word}
                  </h2>

                  {/* Phonetic */}
                  {currentWord.phonetic && (
                    <p className="text-xl text-gray-600 font-semibold mb-6">
                      {currentWord.phonetic}
                    </p>
                  )}

                  {/* Part of Speech */}
                  {currentWord.part_of_speech && (
                    <div className="mb-6">
                      <span className="inline-block clay-badge bg-purple-100 text-purple-800 px-4 py-2 font-bold text-sm">
                        {currentWord.part_of_speech}
                      </span>
                    </div>
                  )}

                  {/* Play Button - 居中显示 */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      speak(currentWord?.word || '')
                    }}
                    className="hover:scale-110 transition-transform text-gray-400 hover:text-gray-600"
                    title="朗读单词"
                  >
                    <Volume2 className="w-12 h-12" />
                  </button>

                  {/* Hint */}
                  <p className="text-gray-500 font-semibold mt-6">
                    点击卡片或按⬇️查看释义 👆
                  </p>
                </div>

                {/* Back - Definition */}
                <div
                  className="text-center"
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)'
                  }}
                >
                  {/* Definition */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 font-semibold mb-2">英文释义</p>
                    <p className="text-lg text-gray-800 font-bold">
                      {currentWord.definition_en}
                    </p>
                  </div>

                  {/* Chinese Definition */}
                  <div className="mb-6">
                    <p className="text-sm text-gray-500 font-semibold mb-2">中文释义</p>
                    <p className="text-xl text-gray-900 font-bold">
                      {currentWord.definition}
                    </p>
                  </div>

                  {/* Collocation */}
                  {currentWord.collocation && (
                    <div className="mb-6">
                      <p className="text-sm text-gray-500 font-semibold mb-2">搭配</p>
                      <p className="text-base text-gray-800">
                        {currentWord.collocation}
                      </p>
                    </div>
                  )}

                  {/* Example */}
                  {currentWord.example_sentence && (
                    <div className="text-left bg-gray-50 rounded-xl p-4">
                      <p className="text-sm text-gray-500 font-semibold mb-2">例句</p>
                      <p className="text-base text-gray-800">
                        {currentWord.example_sentence}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Complete Message */}
          {currentIndex === words.length - 1 && (
            <div className="clay-card-lilac p-6 text-center">
              <h3 className="text-2xl font-bold text-gradient-lilac mb-2">
                🎉 太棒了！
              </h3>
              <p className="text-gray-700 font-semibold mb-4">
                你已经完成了所有单词的学习
              </p>
              <Link href={`/library/${bookId}`} className="clay-button-primary inline-block px-6 py-3 font-bold">
                返回词书详情
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
