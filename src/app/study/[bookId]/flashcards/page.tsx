'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, RotateCw, Volume2, ChevronLeft, ChevronRight } from 'lucide-react'
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
  const cardRef = useRef<HTMLDivElement>(null)

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

  // 自动朗读新单词
  useEffect(() => {
    if (currentWord && !loading) {
      // 延迟500ms后自动朗读，让用户先看到单词
      const timer = setTimeout(() => {
        speak(currentWord.word)
      }, 500)

      return () => clearTimeout(timer)
    }
  }, [currentIndex, currentWord, loading])

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
  }, [currentWord, currentIndex])

  // Handle card flip
  const handleFlip = () => {
    setIsFlipped(!isFlipped)
  }

  // Handle word status
  const handleStatus = async (status: 'known' | 'vague' | 'unknown') => {
    if (!currentWord) return

    try {
      await fetch('/api/word-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word_id: currentWord.id,
          book_id: bookId,
          status
        })
      })

      setWordProgress(prev => ({
        ...prev,
        [currentWord.id]: { word_id: currentWord.id, status }
      }))

      setIsFlipped(false)
      if (currentIndex < words.length - 1) {
        setCurrentIndex(prev => prev + 1)
      }
    } catch (error) {
      console.error('Error saving progress:', error)
    }
  }

  // Text-to-speech
  const speak = (text: string) => {
    if ('speechSynthesis' in window && text) {
      speechSynthesis.cancel() // 停止之前的朗读
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.lang = 'en-US'
      utterance.rate = 0.9
      speechSynthesis.speak(utterance)
    }
  }

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

    const threshold = 100 // 拖拽阈值（像素）

    // 左滑：认识
    if (dragOffset.x < -threshold && Math.abs(dragOffset.y) < threshold) {
      handleStatus('known')
    }
    // 右滑：不认识
    else if (dragOffset.x > threshold && Math.abs(dragOffset.y) < threshold) {
      handleStatus('unknown')
    }
    // 上滑：翻转查看详情
    else if (dragOffset.y < -threshold && Math.abs(dragOffset.x) < threshold) {
      handleFlip()
    }
    // 下滑：翻转回正面
    else if (dragOffset.y > threshold && Math.abs(dragOffset.x) < threshold) {
      if (isFlipped) handleFlip()
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
          <div className="clay-card px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
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
            <button
              onClick={() => speak(currentWord?.word || '')}
              className="clay-icon p-2 hover:scale-110 transition-transform"
              title="朗读单词"
            >
              <Volume2 className="w-5 h-5 text-[#9B8CB5]" />
            </button>
          </div>
        </div>
      </header>

      {/* Flashcard */}
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
                className="bg-gradient-to-r from-[#9B8CB5] to-[#B8A5D6] h-full transition-all duration-300"
                style={{ width: `${(currentIndex / words.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Card */}
          <div
            ref={cardRef}
            className="clay-card-xl p-8 mb-6 cursor-pointer min-h-[400px] flex items-center justify-center relative"
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
              transform: `translate(${dragOffset.x}px, ${dragOffset.y}px)`,
              transition: dragStart ? 'none' : 'transform 0.3s ease-out'
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

                {/* Hint */}
                <p className="text-gray-500 font-semibold mt-8">
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

          {/* Control Buttons */}
          <div className="grid grid-cols-3 gap-4 mb-6">
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStatus('unknown')
              }}
              className="clay-button-red py-4 font-black flex flex-col items-center gap-2"
            >
              <span className="text-2xl">✗</span>
              <span>不认识</span>
              <span className="text-xs text-gray-600">➡️ 或 右滑</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStatus('vague')
              }}
              className="clay-button-yellow py-4 font-black flex flex-col items-center gap-2"
            >
              <span className="text-2xl">?</span>
              <span>模糊</span>
              <span className="text-xs text-gray-600">↑</span>
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation()
                handleStatus('known')
              }}
              className="clay-button-green py-4 font-black flex flex-col items-center gap-2"
            >
              <span className="text-2xl">✓</span>
              <span>认识</span>
              <span className="text-xs text-gray-600">⬅️ 或 左滑</span>
            </button>
          </div>

          {/* Navigation */}
          <div className="flex justify-between mb-6">
            <button
              onClick={() => {
                setIsFlipped(false)
                if (currentIndex > 0) setCurrentIndex(prev => prev - 1)
              }}
              disabled={currentIndex === 0}
              className="clay-button-secondary px-6 py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <ChevronLeft className="w-5 h-5" />
              上一张
            </button>

            <button
              onClick={() => {
                setIsFlipped(false)
                if (Math.random() < 0.5) {
                  setCurrentIndex(Math.floor(Math.random() * words.length))
                } else {
                  if (currentIndex < words.length - 1) {
                    setCurrentIndex(prev => prev + 1)
                  }
                }
              }}
              className="clay-button-primary px-6 py-3 font-bold flex items-center gap-2"
            >
              <RotateCw className="w-5 h-5" />
              随机
            </button>

            <button
              onClick={() => {
                setIsFlipped(false)
                if (currentIndex < words.length - 1) setCurrentIndex(prev => prev + 1)
              }}
              disabled={currentIndex === words.length - 1}
              className="clay-button-secondary px-6 py-3 font-bold disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              下一张
              <ChevronRight className="w-5 h-5" />
            </button>
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
