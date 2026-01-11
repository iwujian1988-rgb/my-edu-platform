'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Volume2 } from 'lucide-react'
import Link from 'next/link'
import { speak as speakText, initializeTTS } from '@/lib/speech'
import { saveResumeState } from '@/lib/resumeState'
import { PermissionGate } from '@/components/PermissionDisplay'
import { FEATURE_PERMISSIONS } from '@/lib/permission-constants'

type Word = {
  id: string
  word: string
  phonetic: string
  uk_phonetic?: string
  us_phonetic?: string
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
  status: 'new' | 'known' | 'fuzzy' | 'unknown'
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
  const [isCardSwitching, setIsCardSwitching] = useState(false)
  const [hasUserInteracted, setHasUserInteracted] = useState(false)
  const hasUserInteractedRef = useRef(false) // 使用 ref 避免状态更新延迟
  const [isSpeechInitialized, setIsSpeechInitialized] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const voicesRef = useRef<SpeechSynthesisVoice[]>([])
  const isSpeakingRef = useRef(false) // 追踪当前是否正在播放

  // 批量保存相关状态
  const pendingSaveRef = useRef<Record<string, 'known' | 'fuzzy' | 'unknown'>>({})
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

        // ⭐ 恢复上次学习位置（从 URL 参数）
        const indexParam = searchParams.get('index')
        if (indexParam) {
          const restoredIndex = parseInt(indexParam)
          if (restoredIndex >= 0 && restoredIndex < wordsData.data.length) {
            console.log('📍 Restoring flashcard position:', restoredIndex + 1)
            setCurrentIndex(restoredIndex)
          }
        }

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

  // ⭐ 页面卸载时保存当前卡片位置
  useEffect(() => {
    const handleBeforeUnload = () => {
      saveResumeState(bookId, 'flashcards', {
        index: currentIndex,
        totalWords: words.length
      })
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [bookId, currentIndex, words.length])

  const currentWord = words[currentIndex]
  const progress = currentWord ? wordProgress[currentWord.id] : null

  // Text-to-speech (使用新的TTS工具)
  const speak = useCallback(async (text: string) => {
    console.log('========== speak called ==========')
    console.log('Text:', text)

    if (!text) {
      console.warn('No text provided for speech')
      return
    }

    // 确保TTS已初始化
    if (!(await initializeTTS())) {
      console.warn('⚠️ TTS initialization failed')
      return
    }

    // 使用新的speak函数
    speakText(text, {
      lang: 'en-US',
      rate: 0.8,
      pitch: 1.0,
      volume: 1.0
    })
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
    // 标记用户已经交互（同步更新 ref 和状态）
    hasUserInteractedRef.current = true
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
    }
    setIsFlipped(!isFlipped)
  }, [isFlipped, hasUserInteracted])

  // Handle word status
  const handleStatus = useCallback((status: 'known' | 'fuzzy' | 'unknown') => {
    if (!currentWord) return

    // 立即标记用户已经交互（同步更新 ref 和状态）
    hasUserInteractedRef.current = true
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
    }

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

    // 4. 设置切换状态，立即隐藏当前卡片
    setIsCardSwitching(true)
    setIsFlipped(false)

    // 5. 清除拖动状态，防止回弹
    setDragStart(null)
    setDragOffset({ x: 0, y: 0 })
    setKeyboardAnimation(null)

    // 6. 延迟后切换到下一个单词
    setTimeout(() => {
      if (currentIndex < words.length - 1) {
        const nextIndex = currentIndex + 1
        setCurrentIndex(nextIndex)

        // ⭐ 保存学习进度
        saveResumeState(bookId, 'flashcards', {
          index: nextIndex,
          totalWords: words.length
        })
      }
      // 清除切换状态，显示新卡片
      setTimeout(() => {
        setIsCardSwitching(false)
      }, 50)
    }, 200)
  }, [currentWord, currentIndex, words.length, flushPendingSaves, hasUserInteracted, bookId])

  // 自动朗读新单词 - 当卡片切换完成后自动朗读
  useEffect(() => {
    console.log('Auto-speak useEffect triggered:', {
      hasCurrentWord: !!currentWord,
      currentWord: currentWord?.word,
      loading,
      isFlipped,
      isCardSwitching,
      hasUserInteractedRef: hasUserInteractedRef.current,
      hasUserInteracted: hasUserInteracted,
      isSpeakingRef: isSpeakingRef.current
    })

    // 只在卡片完全显示后（非切换状态）且用户已经交互过后自动朗读
    // 使用 ref 检查，避免状态更新延迟
    if (currentWord && !loading && !isFlipped && !isCardSwitching && hasUserInteractedRef.current && !isSpeakingRef.current) {
      console.log('Auto-speak conditions met, scheduling for:', currentWord.word)
      // 延迟800ms后自动朗读，确保用户交互完成且卡片已稳定
      const timer = setTimeout(() => {
        // 再次检查用户交互状态和播放状态
        if (hasUserInteractedRef.current && !isSpeakingRef.current) {
          console.log('Auto-speak executing speak() for:', currentWord.word)
          speak(currentWord.word)
        } else {
          console.log('Auto-speak canceled: hasUserInteractedRef=', hasUserInteractedRef.current, 'isSpeakingRef=', isSpeakingRef.current)
        }
      }, 800)

      return () => {
        console.log('Auto-speak timeout cleared')
        clearTimeout(timer)
      }
    } else {
      console.log('Auto-speak conditions not met')
    }
  }, [currentIndex, currentWord, isCardSwitching, loading, isFlipped, hasUserInteracted, speak])

  // 键盘快捷键
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 标记用户已经交互（同步更新 ref）
      hasUserInteractedRef.current = true
      if (!hasUserInteracted) {
        setHasUserInteracted(true)
      }

      if (e.key === 'ArrowLeft') {
        // ⬅️ 认识
        e.preventDefault()
        handleStatus('known')
      } else if (e.key === 'ArrowUp') {
        // ↑ 模糊
        e.preventDefault()
        handleStatus('fuzzy')
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
  }, [handleStatus, handleFlip, hasUserInteracted])

  // 页面卸载或隐藏时保存待保存的数据和当前学习位置
  useEffect(() => {
    const handleBeforeUnload = () => {
      // ⭐ 立即保存当前学习位置（防止浏览器返回丢失状态）
      if (words.length > 0 && currentIndex >= 0) {
        console.log('📍 Saving current position on beforeunload:', currentIndex + 1)
        saveResumeState(bookId, 'flashcards', {
          index: currentIndex,
          totalWords: words.length
        })
      }

      // 保存待保存的学习进度
      if (Object.keys(pendingSaveRef.current).length > 0) {
        flushPendingSaves()
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // ⭐ 页面隐藏时也保存当前学习位置
        if (words.length > 0 && currentIndex >= 0) {
          console.log('📍 Saving current position on visibility change:', currentIndex + 1)
          saveResumeState(bookId, 'flashcards', {
            index: currentIndex,
            totalWords: words.length
          })
        }

        if (Object.keys(pendingSaveRef.current).length > 0) {
          flushPendingSaves()
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // ⭐ 组件卸载时保存当前学习位置（最重要）
      if (words.length > 0 && currentIndex >= 0) {
        console.log('📍 Component unmounting, saving position:', currentIndex + 1)
        saveResumeState(bookId, 'flashcards', {
          index: currentIndex,
          totalWords: words.length
        })
      }

      // 保存待保存的学习进度
      const pending = pendingSaveRef.current
      if (Object.keys(pending).length > 0) {
        console.log('Component unmounting, saving pending data:', pending)
        flushPendingSaves()
      }
    }
  }, [flushPendingSaves, bookId, currentIndex, words.length])

  // 拖拽开始
  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    // 标记用户已经交互（同步更新 ref 和状态）
    hasUserInteractedRef.current = true
    if (!hasUserInteracted) {
      setHasUserInteracted(true)
    }

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
      return
    }
    // 下滑：45° 到 135°
    else if (angle > 45 && angle <= 135) {
      // 下滑时如果卡片在背面，翻回正面
      if (isFlipped) {
        handleFlip()
      }
      setDragStart(null)
      setDragOffset({ x: 0, y: 0 })
      return
    }
    // 左滑：135° 到 225°（-135° 到 -180° 和 135° 到 180°）
    else if (angle > 135 || angle <= -135) {
      handleStatus('known')
      return
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
          <button
            onClick={() => router.push('/')}
            className="clay-button-primary inline-block mt-4 px-6 py-3"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <PermissionGate feature={FEATURE_PERMISSIONS.FLASHCARDS} bookId={bookId}>
      <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="clay-card px-6 py-4 flex items-center gap-4">
            <button
              onClick={() => {
                // ⭐ 立即跳转到首页（统一返回路径）
                router.push('/')
                // 在后台保存数据
                setTimeout(() => {
                  flushPendingSaves()
                  // 保存当前学习位置
                  if (words.length > 0 && currentIndex >= 0) {
                    saveResumeState(bookId, 'flashcards', {
                      index: currentIndex,
                      totalWords: words.length
                    })
                  }
                }, 100)
              }}
              className="clay-icon p-2 hover:scale-110 transition-transform"
              title="返回首页"
            >
              <ArrowLeft className="w-5 h-5 text-gray-700" />
            </button>
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
      <main className="container mx-auto px-4 py-2">
        <div className="max-w-xl mx-auto">
          {/* Progress Bar */}
          <div className="mb-2">
            <div className="flex justify-between text-sm text-gray-600 font-semibold mb-2">
              <span>学习进度</span>
              <span>{Math.round(((currentIndex + 1) / words.length) * 100)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-[#9B8CB5] to-[#B8A5D6] h-full transition-all duration-300"
                style={{ width: `${((currentIndex + 1) / words.length) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* 操作提示 */}
          <div className="grid grid-cols-3 gap-4 mb-0 text-center">
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

          {/* 用户未交互提示 - Chrome TTS 限制 */}
          {!hasUserInteracted && (
            <div
              className="clay-card p-6 text-center mb-4 cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => {
                hasUserInteractedRef.current = true
                setHasUserInteracted(true)
              }}
            >
              <p className="text-lg font-semibold text-gray-700 mb-2">👆 点击此处开始学习</p>
              <p className="text-sm text-gray-500">首次点击激活语音功能</p>
            </div>
          )}

          {/* Card */}
          <div className="relative mx-auto" style={{ width: '100%', maxWidth: '672px', height: '800px' }}>
            {/* Current Card */}
            <div
              ref={cardRef}
              className="clay-card-xl p-8 cursor-pointer absolute left-0 right-0"
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              onClick={handleFlip}
              style={{
                position: 'absolute',
                top: '0',
                left: '0',
                right: '0',
                height: '800px',
                perspective: '1000px',
                opacity: (dragStart || keyboardAnimation || isCardSwitching) ? 0 : 1,
                transform: `translateZ(0px) translate(${dragOffset.x + (keyboardAnimation?.x || 0)}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05 + (keyboardAnimation?.rotate || 0)}deg)`,
                transition: dragStart || keyboardAnimation || isCardSwitching ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'transform 0.3s ease-out, opacity 0.3s ease-out',
                zIndex: 10
              }}
            >
              <div
                className="flex flex-col items-center justify-center h-full"
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
                      {progress.status === 'fuzzy' && (
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
                  {(currentWord.uk_phonetic || currentWord.us_phonetic || currentWord.phonetic) && (
                    <div className="text-xl text-gray-600 font-semibold mb-6 space-y-1">
                      {currentWord.uk_phonetic && (
                        <p className="text-base">UK {currentWord.uk_phonetic}</p>
                      )}
                      {currentWord.us_phonetic && (
                        <p className="text-base">US {currentWord.us_phonetic}</p>
                      )}
                      {!currentWord.uk_phonetic && !currentWord.us_phonetic && currentWord.phonetic && (
                        <p>{currentWord.phonetic}</p>
                      )}
                    </div>
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
                      console.log('🔘 Play button clicked')

                      // 标记用户已经交互（同步更新 ref）
                      hasUserInteractedRef.current = true
                      if (!hasUserInteracted) {
                        setHasUserInteracted(true)
                      }

                      // 直接调用封装好的 speak 函数
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

            {/* Preview Card - 下一个单词的预览 */}
            {currentIndex < words.length - 1 && (
              <div
                className="clay-card-xl p-8 pointer-events-none absolute left-0 right-0"
                style={{
                  position: 'absolute',
                  top: '0',
                  left: '0',
                  right: '0',
                  height: '800px',
                  opacity: (Math.abs(dragOffset.x) > 50 || Math.abs(dragOffset.y) > 50 || keyboardAnimation) ? 1 : 0,
                  transition: 'opacity 0.3s ease-out',
                  zIndex: 0,
                  perspective: '1000px'
                }}
              >
                <div
                  className="flex flex-col items-center justify-center h-full"
                  style={{
                    transformStyle: 'preserve-3d',
                    transition: 'transform 0.6s',
                    transform: 'rotateY(0deg)'
                  }}
                >
                  {/* Front - Word */}
                  <div className="text-center" style={{ backfaceVisibility: 'hidden' }}>
                    {/* Word */}
                    <h2 className="text-5xl font-black text-gray-900 mb-4">
                      {words[currentIndex + 1]?.word}
                    </h2>

                    {/* Phonetic */}
                    {(words[currentIndex + 1]?.uk_phonetic || words[currentIndex + 1]?.us_phonetic || words[currentIndex + 1]?.phonetic) && (
                      <div className="text-xl text-gray-600 font-semibold mb-6 space-y-1">
                        {words[currentIndex + 1]?.uk_phonetic && (
                          <p className="text-base">UK {words[currentIndex + 1]?.uk_phonetic}</p>
                        )}
                        {words[currentIndex + 1]?.us_phonetic && (
                          <p className="text-base">US {words[currentIndex + 1]?.us_phonetic}</p>
                        )}
                        {!words[currentIndex + 1]?.uk_phonetic && !words[currentIndex + 1]?.us_phonetic && words[currentIndex + 1]?.phonetic && (
                          <p>{words[currentIndex + 1]?.phonetic}</p>
                        )}
                      </div>
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
                      onClick={(e) => {
                        e.stopPropagation()
                        console.log('🔘 Preview Play button clicked')

                        // 标记用户已经交互（同步更新 ref）
                        hasUserInteractedRef.current = true
                        if (!hasUserInteracted) {
                          setHasUserInteracted(true)
                        }

                        // 先初始化语音合成
                        if (!isSpeechInitialized) {
                          console.log('Initializing speech on first click...')
                          initializeTTS()
                        }

                        // 然后播放音频
                        setTimeout(() => {
                          speak(words[currentIndex + 1]?.word || '')
                        }, 150)
                      }}
                      className="hover:scale-110 transition-transform text-gray-300"
                      title="朗读单词"
                    >
                      <Volume2 className="w-12 h-12" />
                    </button>
                  </div>
                </div>
              </div>
            )}
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
              <button
                onClick={() => router.push('/')}
                className="clay-button-primary inline-block px-6 py-3 font-bold"
              >
                返回首页
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
    </PermissionGate>
  )
}
