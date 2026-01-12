'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Volume2, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { speak as speakText, initializeTTS } from '@/lib/speech'
import { saveResumeState } from '@/lib/resumeState'
import { PermissionGate } from '@/components/PermissionDisplay'
import { FEATURE_PERMISSIONS } from '@/lib/permission-constants'
import { FlashcardStatsBar } from '@/components/FlashcardStatsBar'

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
  // 新的scope参数: all | unknown | fuzzy | known | new
  const scope = searchParams.get('scope') || 'unknown'
  const shuffle = searchParams.get('shuffle') === 'true'

  const [words, setWords] = useState<Word[]>([])
  const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({})
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bookTitle, setBookTitle] = useState('')
  const [currentScope, setCurrentScope] = useState(scope)

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

  // 范围名称映射
  const scopeLabelMap: Record<string, string> = {
    all: '全部单词',
    unknown: '不认识的',
    fuzzy: '模糊的',
    known: '认识',
    new: '未标注'
  }

  // Fetch words and progress
  useEffect(() => {
    async function fetchData() {
      try {
        // 🚀 性能优化：并行请求 book info, words, progress, saved position
        // flashcards模式需要加载所有单词，不使用分页
        const [bookRes, wordsRes, progressRes, savedProgressRes] = await Promise.all([
          fetch(`/api/books/${bookId}`),
          fetch(`/api/words?bookId=${bookId}&status=${scope}&shuffle=${shuffle}&page=1&pageSize=10000`),
          fetch(`/api/word-progress?book_id=${bookId}`),
          fetch(`/api/flashcard-progress?bookId=${bookId}&scopeType=${scope}`)
        ])

        if (!bookRes.ok) throw new Error('Failed to fetch book')
        const bookData = await bookRes.json()
        setBookTitle(bookData.data.title)

        if (!wordsRes.ok) throw new Error('Failed to fetch words')
        const wordsData = await wordsRes.json()
        setWords(wordsData.data || [])

        // 获取用户进度
        if (progressRes.ok) {
          const progressData = await progressRes.json()
          setWordProgress(progressData.data || {})
        }

        // 恢复上次学习位置（从进度记录）
        let restoredIndex = 0
        if (savedProgressRes.ok) {
          const savedProgress = await savedProgressRes.json()
          if (savedProgress.data && savedProgress.data.currentIndex !== undefined) {
            const savedIndex = savedProgress.data.currentIndex
            const wordsLength = wordsData.data?.length || 0

            // 确保索引有效：如果超出范围，调整到最后一个单词
            if (savedIndex >= 0 && savedIndex < wordsLength) {
              restoredIndex = savedIndex
              console.log('📍 Restoring flashcard position:', restoredIndex + 1)
            } else if (savedIndex >= wordsLength && wordsLength > 0) {
              // 保存的索引超出当前列表范围，调整到最后一个单词
              restoredIndex = wordsLength - 1
              console.log('⚠️ Saved index out of range, adjusted to last word:', restoredIndex + 1)
            } else {
              // 当前列表为空或其他异常情况
              restoredIndex = 0
              console.log('⚠️ Cannot restore position, starting from beginning')
            }

            setCurrentIndex(restoredIndex)
          }
        }

        // 保存当前会话的resume state（用于首页"继续学习"）
        saveResumeState(bookId, 'flashcards', {
          scope,
          index: restoredIndex,
          totalWords: wordsData.data?.length || 0
        })

        setCurrentScope(scope)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [bookId, scope, shuffle])

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

  // 保存flashcard学习进度
  const saveFlashcardProgress = useCallback(async (index: number) => {
    try {
      await fetch('/api/flashcard-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          scopeType: currentScope,
          currentIndex: index,
          totalWords: words.length
        })
      })
    } catch (error) {
      console.error('Error saving flashcard progress:', error)
    }
  }, [bookId, currentScope, words.length])

  // 范围切换处理
  const handleScopeChange = useCallback((newScope: string) => {
    // 跳转到新范围
    router.push(`/study/${bookId}/flashcards?scope=${newScope}&shuffle=true`)
  }, [bookId, router])

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

        // ⭐ 保存学习进度（两种方式）
        saveResumeState(bookId, 'flashcards', {
          scope,
          index: nextIndex,
          totalWords: words.length
        })

        // 保存flashcard范围进度
        saveFlashcardProgress(nextIndex)
      }
      // 清除切换状态，显示新卡片
      setTimeout(() => {
        setIsCardSwitching(false)
      }, 50)
    }, 200)
  }, [currentWord, currentIndex, words.length, flushPendingSaves, hasUserInteracted, bookId, scope, saveFlashcardProgress])

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
      // 延迟300ms后自动朗读，确保卡片切换动画完成
      const timer = setTimeout(() => {
        // 再次检查用户交互状态和播放状态
        if (hasUserInteractedRef.current && !isSpeakingRef.current) {
          console.log('Auto-speak executing speak() for:', currentWord.word)
          speak(currentWord.word)
        } else {
          console.log('Auto-speak canceled: hasUserInteractedRef=', hasUserInteractedRef.current, 'isSpeakingRef=', isSpeakingRef.current)
        }
      }, 300)

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

    // 阻止移动端的默认滚动行为
    if ('touches' in e) {
      e.preventDefault()
    }

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
      setDragStart(null)
      setDragOffset({ x: 0, y: 0 })
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
      setDragStart(null)
      setDragOffset({ x: 0, y: 0 })
      handleStatus('known')
      return
    }
    // 上滑：-135° 到 -45°
    else if (angle > -135 && angle <= -45) {
      setDragStart(null)
      setDragOffset({ x: 0, y: 0 })
      handleFlip()
      return
    }

    setDragStart(null)
    setDragOffset({ x: 0, y: 0 })
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 text-gray-900 font-black">加载中...</p>
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F9FA' }}>
        <div
          className="p-8 text-center"
          style={{
            backgroundColor: '#ffffff',
            border: '3px solid #000',
            borderRadius: '12px',
            boxShadow: '4px 4px 0px 0px #000',
          }}
        >
          <p className="text-lg text-gray-900 font-black mb-4">暂无单词数据</p>
          <button
            onClick={() => router.push('/')}
            className="inline-block px-6 py-3 font-black bg-[#B4F416] border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
          >
            返回首页
          </button>
        </div>
      </div>
    )
  }

  return (
    <PermissionGate feature={FEATURE_PERMISSIONS.FLASHCARDS} bookId={bookId}>
      <div
        className="min-h-screen bg-[#F8F9FA] relative overflow-hidden"
        style={{
          touchAction: 'none',
          overscrollBehavior: 'none'
        }}
      >
        {/* 1. Header Section - Neo-Brutalism */}
        <header className="sticky top-0 z-50 px-4 py-4 bg-[#F8F9FA]">
          <div className="max-w-2xl mx-auto flex items-center gap-4 mb-4">
            <button
              className="w-12 h-12 flex items-center justify-center bg-white rounded-xl transition-transform active:translate-y-1"
              style={{ border: '3px solid #000', boxShadow: '4px 4px 0px 0px #000' }}
              onClick={async () => {
                // ⭐ 先保存数据，再跳转
                console.log('🔙 Back button: Saving data before navigation...')

                // 1. 立即保存当前学习位置
                if (words.length > 0 && currentIndex >= 0) {
                  saveResumeState(bookId, 'flashcards', {
                    index: currentIndex,
                    totalWords: words.length
                  })
                }

                // 2. 保存待保存的学习进度
                flushPendingSaves()

                // 3. 等待一下确保保存完成，然后跳转
                await new Promise(resolve => setTimeout(resolve, 200))

                // 4. 跳转回首页
                router.push('/')
              }}
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>

            <div
              className="flex-1 h-12 flex items-center px-4 bg-white rounded-xl overflow-hidden"
              style={{ border: '3px solid #000', boxShadow: '4px 4px 0px 0px #000' }}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Currently Studying</span>
                <span className="text-sm md:text-base font-black truncate">{bookTitle}</span>
              </div>
              <div className="ml-auto font-black text-lg">{currentIndex + 1} / {words.length}</div>
            </div>
          </div>

          {/* 2. Progress Bar - Neo-Brutalism */}
          <div className="max-w-2xl mx-auto mb-4">
            <div className="flex justify-between text-xs font-bold mb-1 px-1">
              <span>PROGRESS</span>
              <span>{Math.round(((currentIndex + 1) / words.length) * 100)}%</span>
            </div>
            <div className="w-full h-6 bg-white rounded-full overflow-hidden relative" style={{ border: '3px solid #000' }}>
              <div
                className="h-full bg-[#B4F416]"
                style={{ width: `${((currentIndex + 1) / words.length) * 100}%`, borderRight: '3px solid #000' }}
              />
            </div>
          </div>

          {/* 2.5 统计色块 - 可点击切换范围 */}
          <div className="max-w-2xl mx-auto mb-4">
            <FlashcardStatsBar
              bookId={bookId}
              currentScope={currentScope}
              onScopeChange={handleScopeChange}
            />
          </div>

          {/* 3. Swipe Instructions - Visual Cues (Neo-Brutalism) */}
          <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-1 bg-[#B4F416] border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_#000]">← LEFT</div>
              <span className="text-[10px] font-bold">认识</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-1 bg-[#FACC15] border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_#000]">↑ UP</div>
              <span className="text-[10px] font-bold">模糊</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-1 bg-[#FF6B6B] border-2 border-black rounded-lg text-xs font-black text-white shadow-[2px_2px_0px_0px_#000]">RIGHT →</div>
              <span className="text-[10px] font-bold">不认识</span>
            </div>
          </div>
        </header>

        {/* 用户未交互提示 - Neo-Brutalism */}
        {!hasUserInteracted && (
          <div
            className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 text-center cursor-pointer z-20"
            style={{
              backgroundColor: '#ffffff',
              border: '3px solid #000',
              borderRadius: '12px',
              boxShadow: '4px 4px 0px 0px #000',
            }}
            onClick={() => {
              hasUserInteractedRef.current = true
              setHasUserInteracted(true)
            }}
          >
            <p className="text-lg font-black text-gray-900 mb-2">👆 点击此处开始学习</p>
            <p className="text-sm font-bold text-gray-600">首次点击激活语音功能</p>
          </div>
        )}

        {/* 4. THE MAIN CARD - 重构版本 */}
        <div className="flex items-center justify-center min-h-[600px]">
          <div style={{ width: '340px', height: '440px', position: 'relative' }}>
            {/* Current Card */}
            <div
              ref={cardRef}
              className="bg-white rounded-3xl flex flex-col p-6 text-center cursor-grab active:cursor-grabbing"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '340px',
                height: '440px',
                border: '4px solid #000',
                boxShadow: '12px 12px 0px 0px #000',
                perspective: '1000px',
                opacity: (dragStart || keyboardAnimation || isCardSwitching) ? 0 : 1,
                transform: `translate(${dragOffset.x + (keyboardAnimation?.x || 0)}px, ${dragOffset.y}px) rotate(${dragOffset.x * 0.05 + (keyboardAnimation?.rotate || 0)}deg)`,
                transition: dragStart || keyboardAnimation || isCardSwitching ? 'transform 0.3s ease-out, opacity 0.3s ease-out' : 'transform 0.15s ease-out, opacity 0.3s ease-out',
                zIndex: 10,
                touchAction: 'none', // 阻止移动端的默认滚动行为
              }}
              onMouseDown={handleDragStart}
              onMouseMove={handleDragMove}
              onMouseUp={handleDragEnd}
              onMouseLeave={handleDragEnd}
              onTouchStart={handleDragStart}
              onTouchMove={handleDragMove}
              onTouchEnd={handleDragEnd}
              onClick={handleFlip}
            >
              <div
                className="flex flex-col w-full h-full"
                style={{
                  transformStyle: 'preserve-3d',
                  transition: 'transform 0.6s',
                  transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
                }}
              >
                {/* Front - Word */}
                <div style={{
                  backfaceVisibility: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  padding: '1.5rem 1.5rem 0.75rem 1.5rem'
                }}>
                  {/* Status Badge - absolute top right */}
                  {progress && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1.5rem' }}>
                      {progress.status === 'known' && (
                        <span className="inline-block px-3 py-1 bg-[#B4F416] border-2 border-black rounded-full text-xs font-black" style={{ boxShadow: '2px 2px 0px 0px #000' }}>
                          ✓ 已认识
                        </span>
                      )}
                      {progress.status === 'fuzzy' && (
                        <span className="inline-block px-3 py-1 bg-[#FACC15] border-2 border-black rounded-full text-xs font-black" style={{ boxShadow: '2px 2px 0px 0px #000' }}>
                          ? 模糊
                        </span>
                      )}
                      {progress.status === 'unknown' && (
                        <span className="inline-block px-3 py-1 bg-[#FF6B6B] border-2 border-black rounded-full text-xs font-black text-white" style={{ boxShadow: '2px 2px 0px 0px #000' }}>
                          ✗ 不认识
                        </span>
                      )}
                    </div>
                  )}

                  {/* Main Content - flex distribution */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '1.5rem' }}>
                    {/* Word */}
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-center">{currentWord.word}</h1>

                    {/* Phonetic + Button */}
                    <div className="flex items-center gap-4 justify-center">
                      <span className="font-mono text-lg text-gray-600">
                        {currentWord.us_phonetic || currentWord.uk_phonetic || currentWord.phonetic}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          hasUserInteractedRef.current = true
                          if (!hasUserInteracted) {
                            setHasUserInteracted(true)
                          }
                          speak(currentWord?.word || '')
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                      >
                        <Volume2 size={18} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Part of Speech */}
                    <span className="inline-block px-3 py-1.5 bg-gray-100 border-2 border-black rounded text-sm font-bold">
                      {currentWord.part_of_speech || 'n.'}
                    </span>
                  </div>

                  {/* Footer Hint - fixed at bottom */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem' }}>
                    <ArrowDown size={20} className="animate-bounce text-black" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black">Tap to Flip</p>
                  </div>
                </div>

                {/* Back - Definition */}
                <div
                  style={{
                    backfaceVisibility: 'hidden',
                    transform: 'rotateY(180deg)',
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '1.5rem 1.5rem 0.75rem 1.5rem',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                  }}
                >
                  {/* Content Area - 与正面一样的结构 */}
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                    {/* English Definition */}
                    {currentWord.definition_en && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 font-bold mb-1">英文释义</p>
                        <p className="text-base text-gray-900 font-black leading-snug break-words">
                          {currentWord.definition_en}
                        </p>
                      </div>
                    )}

                    {/* Chinese Definition */}
                    {currentWord.definition && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 font-bold mb-1">中文释义</p>
                        <p className="text-base text-gray-900 font-black leading-snug break-words">
                          {currentWord.definition}
                        </p>
                      </div>
                    )}

                    {/* English Collocation */}
                    {currentWord.collocation_en && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 font-bold mb-1">英文搭配</p>
                        <p className="text-sm text-gray-800 font-semibold leading-snug break-words">
                          {currentWord.collocation_en}
                        </p>
                      </div>
                    )}

                    {/* Chinese Collocation */}
                    {currentWord.collocation && (
                      <div className="mb-4">
                        <p className="text-sm text-gray-500 font-bold mb-1">搭配</p>
                        <p className="text-sm text-gray-800 font-semibold leading-snug break-words">
                          {currentWord.collocation}
                        </p>
                      </div>
                    )}

                    {/* English Example */}
                    {currentWord.example_sentence_en && (
                      <div
                        className="p-3 mb-4"
                        style={{
                          backgroundColor: '#F3F4F6',
                          border: '2px solid #000',
                          borderRadius: '8px',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-500 font-bold">英文例句</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              speak(currentWord.example_sentence_en || '')
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                          >
                            <Volume2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-900 font-semibold leading-snug break-words">
                          {currentWord.example_sentence_en}
                        </p>
                      </div>
                    )}

                    {/* Chinese Example */}
                    {currentWord.example_sentence && (
                      <div
                        className="p-3"
                        style={{
                          backgroundColor: '#F3F4F6',
                          border: '2px solid #000',
                          borderRadius: '8px',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm text-gray-500 font-bold">例句</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              speak(currentWord.example_sentence || '')
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                          >
                            <Volume2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                        <p className="text-sm text-gray-900 font-semibold leading-snug break-words">
                          {currentWord.example_sentence}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Footer Hint - 保持和正面一致 */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.25rem', marginTop: 'auto' }}>
                    <ArrowDown size={20} className="animate-bounce text-black" />
                    <p className="text-[10px] font-bold uppercase tracking-widest text-black">Tap to Flip</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Card - 下一个单词的预览 */}
            {currentIndex < words.length - 1 && (
              <div
                className="bg-white rounded-3xl flex flex-col items-center justify-center p-6 text-center pointer-events-none"
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '340px',
                  height: '440px',
                  border: '4px solid #000',
                  boxShadow: '8px 8px 0px 0px rgba(0,0,0,0.2)',
                  opacity: (Math.abs(dragOffset.x) > 50 || Math.abs(dragOffset.y) > 50 || keyboardAnimation) ? 1 : 0,
                  transition: 'opacity 0.3s ease-out',
                  zIndex: 5,
                  transform: 'scale(0.95)',
                }}
              >
                <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-3">
                  {words[currentIndex + 1]?.word}
                </h2>

                <div className="flex items-center gap-2 mb-4 justify-center">
                  <span className="font-mono text-base text-gray-300">
                    {words[currentIndex + 1]?.us_phonetic || words[currentIndex + 1]?.uk_phonetic || words[currentIndex + 1]?.phonetic}
                  </span>
                </div>

                <div className="mb-4">
                  <span className="inline-block px-2 py-1 bg-gray-100 border-2 border-black rounded text-xs font-bold">
                    {words[currentIndex + 1]?.part_of_speech || 'n.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Complete Message - Neo-Brutalism */}
        {currentIndex === words.length - 1 && (
          <div className="text-center pb-8">
            <div
              className="inline-block p-6"
              style={{
                backgroundColor: '#ffffff',
                border: '3px solid #000',
                borderRadius: '12px',
                boxShadow: '4px 4px 0px 0px #000',
              }}
            >
              <h3 className="text-xl font-black text-gray-900 mb-2">
                🎉 太棒了！
              </h3>
              <p className="text-gray-700 font-bold mb-4 text-sm">
                你已经完成了所有单词的学习
              </p>
              <button
                onClick={() => router.push('/')}
                className="inline-block px-6 py-2 font-black bg-[#B4F416] border-2 border-black rounded-lg shadow-[3px_3px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all text-sm"
              >
                返回首页
              </button>
            </div>
          </div>
        )}
      </div>
    </PermissionGate>
  )
}
