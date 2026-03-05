'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Volume2, ArrowDown } from 'lucide-react'
import Link from 'next/link'
import { useTTS } from '@/hooks/use-tts'
import { saveResumeState } from '@/lib/resumeState'
import { PermissionGate } from '@/components/PermissionDisplay'
import { FEATURE_PERMISSIONS } from '@/lib/permission-constants'
import { FlashcardStatsBar } from '@/components/FlashcardStatsBar'
import { FlashcardScopeDialog } from '@/components/FlashcardScopeDialog'
import { validateScope, validateHashIndex } from '@/lib/urlValidation'

// ⭐ sessionStorage 工具函数
const SESSION_STORAGE_KEY = (bookId: string) => `flashcards_position_${bookId}`
const SESSION_EXPIRY_MS = 5 * 60 * 1000 // 5分钟

interface SessionPosition {
  bookId: string
  index: number
  scope: string
  timestamp: number
}

function saveSessionPosition(bookId: string, index: number, scope: string) {
  // 🔥 关键修复：检查是否在客户端环境（避免 SSR 崩溃）
  if (typeof window === 'undefined') {
    return
  }

  try {
    const position: SessionPosition = {
      bookId,
      index,
      scope,
      timestamp: Date.now()
    }
    sessionStorage.setItem(SESSION_STORAGE_KEY(bookId), JSON.stringify(position))
  } catch (e) {
    console.warn('Failed to save session position:', e)
  }
}

function getSessionPosition(bookId: string): SessionPosition | null {
  // 🔥 关键修复：检查是否在客户端环境（避免 SSR 崩溃）
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const data = sessionStorage.getItem(SESSION_STORAGE_KEY(bookId))
    if (!data) return null

    const position: SessionPosition = JSON.parse(data)

    // 检查是否过期（5分钟）
    const isExpired = Date.now() - position.timestamp > SESSION_EXPIRY_MS
    if (isExpired) {
      sessionStorage.removeItem(SESSION_STORAGE_KEY(bookId))
      return null
    }

    // 检查bookId是否匹配
    if (position.bookId !== bookId) {
      return null
    }

    return position
  } catch (e) {
    console.warn('Failed to get session position:', e)
    return null
  }
}

function clearSessionPosition(bookId: string) {
  // 🔥 关键修复：检查是否在客户端环境（避免 SSR 崩溃）
  if (typeof window === 'undefined') {
    return
  }

  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY(bookId))
  } catch (e) {
    console.warn('Failed to clear session position:', e)
  }
}

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
  audio_url?: string | null
}

type WordProgress = {
  word_id: string
  status: 'new' | 'known' | 'fuzzy' | 'unknown'
}

export default function FlashcardsPageClient() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = params.bookId as string

  // 使用 TTS Hook
  const { play: speak, isPlaying, isLoading } = useTTS({ type: '2', showFallbackToast: false })

  // ⭐ 智能跳转逻辑：检测 resume 参数
  const isFromHomepageResume = searchParams.get('resume') === 'true'

  // 新的scope参数: all | unknown | fuzzy | known | new
  // 如果从首页进入，使用 URL 参数中的 scope；否则使用默认值 'unknown'
  const scopeParam = searchParams.get('scope')
  const scope = isFromHomepageResume ? validateScope(scopeParam) : (searchParams.get('scope') || 'unknown')
  const shuffle = searchParams.get('shuffle') === 'true'

  // ⭐ Hash 定位：从 URL hash 中获取索引（如 #word-10）
  const initialHashIndex = isFromHomepageResume ? validateHashIndex(window.location.hash) : undefined

  const [words, setWords] = useState<Word[]>([])
  const [wordProgress, setWordProgress] = useState<Record<string, WordProgress>>({})
  // ⭐ 初始化索引：优先级 sessionStorage > hash > 0
  const [currentIndex, setCurrentIndex] = useState(() => {
    // 1. 优先从 sessionStorage 读取（刷新恢复）
    const sessionPosition = getSessionPosition(bookId)
    if (sessionPosition && sessionPosition.scope === scope) {
      console.log('📍 Restoring from sessionStorage:', sessionPosition.index + 1)
      return sessionPosition.index
    }

    // 2. 其次使用 hash 索引（从首页进入）
    // 🔥 修复：移除 > 0 检查，允许 index=0（第1个单词）也能恢复
    if (initialHashIndex !== undefined) {
      // 注意：words 初始为空，这里只是设置初始值
      // 实际的有效值会在 hash 定位 useEffect 中修正
      return initialHashIndex
    }

    // 3. 默认从第一个开始
    return 0
  })
  const [isFlipped, setIsFlipped] = useState(false)
  const [loading, setLoading] = useState(true)
  const [bookTitle, setBookTitle] = useState('')
  const [currentScope, setCurrentScope] = useState(scope)
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)

  // 🔥 关键修复：判断是否应该显示范围选择对话框
  // 逻辑：如果sessionStorage有学习进度（刷新恢复），则不显示对话框；否则显示对话框
  const sessionPosition = getSessionPosition(bookId)
  const hasLearningProgress = sessionPosition && sessionPosition.scope === scope
  const shouldShowDialog = !isFromHomepageResume && !hasLearningProgress
  const [showScopeSelectDialog, setShowScopeSelectDialog] = useState(shouldShowDialog)

  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [scopeStats, setScopeStats] = useState<any>(null) // 保存统计数据供对话框使用
  const [totalWordsInScope, setTotalWordsInScope] = useState(0) // 保存当前范围的总单词数（不是当前加载的）
  const [waitingForLoad, setWaitingForLoad] = useState(false) // 是否在等待加载更多

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
  const loadMoreWordsRef = useRef<(() => Promise<void>) | null>(null)
  const isChangingScopeRef = useRef(false) // 追踪是否正在切换范围
  const nextWordTimerRef = useRef<NodeJS.Timeout | null>(null) // 追踪 handleNextWord 的定时器
  const hasDraggedRef = useRef(false) // 追踪是否真正拖拽了（区分点击和拖拽）

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
        // 🚀 性能优化：跳过books API调用，直接加载单词数据
        const [wordsRes, savedProgressRes, statsRes] = await Promise.all([
          fetch(`/api/words?bookId=${bookId}&status=${scope}&shuffle=${shuffle}&page=1&pageSize=50`),
          fetch(`/api/flashcard-progress?bookId=${bookId}&scopeType=${scope}`),
          fetch(`/api/words/stats?bookId=${bookId}`) // 获取真实的统计数据
        ])

        if (!wordsRes.ok) throw new Error('Failed to fetch words')
        const wordsData = await wordsRes.json()
        const loadedWords = wordsData.data || []
        setWords(loadedWords)

        // 从 stats API 获取真实的总数（比 wordsData.count 更准确）
        let finalTotal = 0
        if (statsRes.ok) {
          const statsData = await statsRes.json()
          if (statsData.success && statsData.data) {
            const scopeTotal = statsData.data[scope] || 0
            finalTotal = scopeTotal
            // 保存统计数据供对话框使用
            setScopeStats(statsData.data)
            console.log(`📊 Total words in scope '${scope}': ${scopeTotal}`)
          }
        }

        // 如果 stats API 失败或返回0，fallback 到 wordsData.count
        if (finalTotal === 0 && wordsData.count !== undefined) {
          finalTotal = wordsData.count
          console.log(`📊 Fallback: using wordsData.count: ${wordsData.count}`)
        }

        setTotalWordsInScope(finalTotal)

        // 设置书名（从API返回）
        if (wordsData.bookTitle) {
          setBookTitle(wordsData.bookTitle)
        }

        // 只获取当前加载单词的进度（不是全部单词）
        if (loadedWords.length > 0) {
          const wordIds = loadedWords.map((w: Word) => w.id)
          const progressRes = await fetch(`/api/word-progress?book_id=${bookId}&word_ids=${wordIds.join(',')}`)
          if (progressRes.ok) {
            const progressData = await progressRes.json()
            setWordProgress(progressData.data || {})
          }
        }

        // 恢复上次学习位置（从进度记录）
        let restoredIndex = 0
        if (savedProgressRes.ok) {
          const savedProgress = await savedProgressRes.json()
          if (savedProgress.data && savedProgress.data.currentIndex !== undefined) {
            const savedIndex = savedProgress.data.currentIndex
            const wordsLength = loadedWords?.length || 0

            // 确保索引有效：如果超出范围，调整到可用范围
            if (savedIndex >= 0 && savedIndex < wordsLength) {
              restoredIndex = savedIndex
              console.log('📍 Restoring flashcard position:', restoredIndex + 1)
            } else if (savedIndex >= wordsLength && wordsLength > 0) {
              // 保存的索引超出当前加载的单词范围，调整到最后一个
              restoredIndex = wordsLength - 1
              console.log('⚠️ Saved index out of loaded range, adjusted to last loaded word:', restoredIndex + 1)
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
          totalWords: loadedWords?.length || 0
        })

        // 设置是否有更多单词可加载
        if (loadedWords && loadedWords.length < 50) {
          setHasMore(false)
        }

        setCurrentScope(scope)
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [bookId, scope, shuffle])

  // 🔄 懒加载：当接近末尾时自动加载更多单词
  useEffect(() => {
    if (loading || loadingMore || !hasMore) return

    const remaining = words.length - currentIndex
    const loadThreshold = 5 // 还剩5个单词时加载下一批

    if (remaining <= loadThreshold) {
      loadMoreWords()
    }
  }, [currentIndex, words.length])

  // 🔄 当加载更多完成后，自动前进到下一个单词
  useEffect(() => {
    if (waitingForLoad && !loadingMore && words.length > currentIndex + 1) {
      console.log('✅ New words loaded, auto-advancing...')
      setCurrentIndex(prev => prev + 1)
      setWaitingForLoad(false)
    }
  }, [waitingForLoad, loadingMore, words.length, currentIndex])

  // 加载更多单词
  const loadMoreWords = useCallback(async () => {
    if (loadingMore || !hasMore) return

    setLoadingMore(true)
    try {
      const nextPage = currentPage + 1
      const response = await fetch(
        `/api/words?bookId=${bookId}&status=${scope}&shuffle=${shuffle}&page=${nextPage}&pageSize=50`
      )

      if (!response.ok) throw new Error('Failed to load more words')

      const data = await response.json()

      if (data.data && data.data.length > 0) {
        const newWords = data.data
        setWords(prev => [...prev, ...newWords])
        setCurrentPage(nextPage)

        // 获取新加载单词的进度
        const wordIds = newWords.map((w: Word) => w.id)
        const progressRes = await fetch(`/api/word-progress?book_id=${bookId}&word_ids=${wordIds.join(',')}`)
        if (progressRes.ok) {
          const progressData = await progressRes.json()
          setWordProgress(prev => ({ ...prev, ...(progressData.data || {}) }))
        }

        // 如果返回的单词数少于50，说明没有更多了
        if (newWords.length < 50) {
          setHasMore(false)
        }
      } else {
        setHasMore(false)
      }
    } catch (error) {
      console.error('Error loading more words:', error)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, currentPage, bookId, scope, shuffle])

  // 保存 loadMoreWords 到 ref，供 handleNextWord 使用
  loadMoreWordsRef.current = loadMoreWords

  // ⭐ 清理 timer 的 useEffect（beforeunload中的位置保存已由实时保存处理）
  useEffect(() => {
    return () => {
      // 清理所有 timer
      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current)
        saveTimerRef.current = null
      }
      if (nextWordTimerRef.current) {
        clearTimeout(nextWordTimerRef.current)
        nextWordTimerRef.current = null
      }
    }
  }, [])

  // ⭐ Hash 定位逻辑：处理 URL hash 索引（从首页进入或直接访问URL）
  useEffect(() => {
    // 只要不是loading且有hash，就处理hash定位
    if (!loading && words.length > 0) {
      const currentHash = window.location.hash
      const hashIndex = validateHashIndex(currentHash)

      if (hashIndex !== undefined) {
        console.log('[Flashcards] Hash positioning: scrolling to word', hashIndex + 1)

        // 确保 hash 索引在有效范围内
        const validIndex = Math.min(hashIndex, words.length - 1)

        // 如果当前索引与有效索引不匹配，调整到有效位置
        if (currentIndex !== validIndex) {
          console.log(`[Flashcards] Adjusting index from ${currentIndex} to ${validIndex} (words.length: ${words.length})`)
          setCurrentIndex(validIndex)

          // ⭐ 如果索引被调整，同步更新URL hash（避免测试失败）
          if (hashIndex !== validIndex) {
            const newHash = `#word-${validIndex}`
            window.history.replaceState(null, '', newHash)
            console.log(`[Flashcards] Updated URL hash from #word-${hashIndex} to ${newHash}`)
          }
        }

        // 使用 scrollIntoView 定位到当前卡片（如果有 id）
        const timer = setTimeout(() => {
          const element = document.getElementById(`word-${validIndex}`)
          if (element) {
            element.scrollIntoView({ behavior: 'smooth', block: 'center' })
            console.log('[Flashcards] Scrolled to word element:', validIndex + 1)
          }
        }, 100)

        return () => clearTimeout(timer)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, words.length]) // 移除 currentIndex 依赖，避免无限循环

  // ⭐ 实时保存当前位置到 sessionStorage（用于刷新恢复）
  useEffect(() => {
    if (!loading && words.length > 0) {
      // 保存当前索引到 sessionStorage
      saveSessionPosition(bookId, currentIndex, currentScope)
      console.log('💾 Saved to sessionStorage:', currentIndex + 1, 'scope:', currentScope)

      // ⭐⭐⭐ 同时立即保存到服务器（resume_state）- 解决关闭浏览器丢失进度的问题
      saveResumeState(bookId, 'flashcards', {
        index: currentIndex,
        scope: currentScope,
        totalWords: words.length
      })
      console.log('💾 Saved to resume_state:', currentIndex + 1)
    }
  }, [currentIndex, currentScope, bookId, loading, words.length])

  const currentWord = words[currentIndex]
  const progress = currentWord ? wordProgress[currentWord.id] : null

  // 批量保存函数
  const flushPendingSaves = useCallback(async (options?: { keepalive?: boolean }) => {
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
          }),
          // ⭐ 使用 keepalive 确保页面卸载时请求能完成
          keepalive: options?.keepalive ?? false
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
    // 设置标志，防止显示完成对话框
    isChangingScopeRef.current = true

    // 清除待执行的定时器（防止切换范围后触发完成对话框）
    if (nextWordTimerRef.current) {
      clearTimeout(nextWordTimerRef.current)
      nextWordTimerRef.current = null
    }

    // 隐藏完成对话框（如果显示的话）
    if (showCompleteDialog) {
      setShowCompleteDialog(false)
    }

    // 重置分页状态
    setWords([])
    setCurrentPage(1)
    setHasMore(true)
    setLoadingMore(false)
    setWaitingForLoad(false)

    // 跳转到新范围
    router.push(`/study/${bookId}/flashcards?scope=${newScope}&shuffle=true`)
  }, [bookId, router, showCompleteDialog])

  // 完成后重新学习当前范围
  const handleRestartScope = useCallback(() => {
    // 重置到第一个单词（不需要重新加载，单词已在内存中）
    setCurrentIndex(0)
    setIsFlipped(false)
    setShowCompleteDialog(false)
    // 重置懒加载状态，让用户可以再次加载更多
    setLoadingMore(false)
    // 如果单词列表为空，才需要重新加载
    if (words.length === 0) {
      setLoading(true)
    }
  }, [words.length])

  // 完成后选择其他范围
  const handleSelectOtherScope = useCallback(async () => {
    setShowCompleteDialog(false)

    // 先获取统计数据（如果还没有的话）
    if (!scopeStats) {
      try {
        const response = await fetch(`/api/words/stats?bookId=${bookId}`)
        const result = await response.json()
        if (result.success && result.data) {
          setScopeStats(result.data)
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      }
    }

    setShowScopeSelectDialog(true)
  }, [bookId, scopeStats])

  // Handle card flip
  const handleFlip = useCallback(() => {
    // 如果刚刚拖拽过（移动距离 > 10px），不触发翻转
    if (hasDraggedRef.current) {
      console.log('🚫 Dragged, skipping flip')
      return
    }

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
    const oldProgress = wordProgress[currentWord.id]
    const oldStatus = oldProgress?.status || null

    setWordProgress(prev => ({
      ...prev,
      [currentWord.id]: { word_id: currentWord.id, status }
    }))

    // ⚡ 立即更新底部统计显示（前端缓存，延迟同步）
    if (window.updateFlashcardStats) {
      window.updateFlashcardStats(oldStatus, status)
    }

    // 同时更新 scopeStats（用于对话框显示）
    setScopeStats(prev => {
      if (!prev) return prev

      const updated = { ...prev }

      // 从旧状态减1
      if (oldStatus && oldStatus !== 'all') {
        updated[oldStatus] = Math.max(0, (updated[oldStatus] || 0) - 1)
      }

      // 给新状态加1
      if (status !== 'all') {
        updated[status] = (updated[status] || 0) + 1
      }

      return updated
    })

    // 不再需要 setStatsRefreshKey，因为我们直接更新了前端缓存
    // setStatsRefreshKey(Date.now())

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
    // 清除之前的定时器（防止在切换范围时触发）
    if (nextWordTimerRef.current) {
      clearTimeout(nextWordTimerRef.current)
    }

    nextWordTimerRef.current = setTimeout(() => {
      // 🎯 判断逻辑：基于总数判断是否完成（更可靠）
      const reachedTotalEnd = totalWordsInScope > 0 && currentIndex >= totalWordsInScope - 1
      const reachedLoadedEnd = currentIndex >= words.length - 1

      // 如果正在切换范围，不显示完成对话框
      if (isChangingScopeRef.current) {
        console.log('🔄 Changing scope, skipping complete dialog')
        isChangingScopeRef.current = false
        setIsCardSwitching(false)
        return
      }

      // 🔧 FIX: 使用 reachedTotalEnd 判断完成，而不是 reachedLoadedEnd && !hasMore
      // 这样即使 API 返回的数据量不足，也能正确判断是否完成
      if (reachedTotalEnd) {
        // 真的完成了所有单词（基于总数判断）
        console.log('🎉 All words completed! (based on totalWordsInScope)')
        setShowCompleteDialog(true)
        setIsCardSwitching(false)
        return
      }

      if (reachedLoadedEnd && hasMore) {
        // 到达当前加载的末尾，但还有更多单词
        // 等待懒加载完成，不要前进
        console.log('⏳ At end of loaded words, waiting for lazy load...')
        setWaitingForLoad(true)
        setIsCardSwitching(false)

        // 如果懒加载还没触发，手动触发一次
        if (!loadingMore && loadMoreWordsRef.current) {
          console.log('🔄 Manually triggering load more...')
          loadMoreWordsRef.current()
        }
        return
      }

      // 正常情况：切换到下一个单词
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

      // 清除切换状态，显示新卡片
      setTimeout(() => {
        setIsCardSwitching(false)
      }, 50)
    }, 200)
  }, [currentWord, currentIndex, words.length, flushPendingSaves, hasUserInteracted, bookId, scope, saveFlashcardProgress, hasMore])

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
          speak(currentWord.word, currentWord.audio_url)
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, currentWord, isCardSwitching, loading, isFlipped, hasUserInteracted])
  // 注意：speak 函数从依赖中移除，因为它是稳定的 hook 返回值，不需要作为依赖

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

  // 页面卸载或隐藏时保存待保存的数据（单词进度）
  // ⭐ 注意：当前位置已通过实时保存处理，这里只需保存pending的单词进度
  useEffect(() => {
    const handleBeforeUnload = () => {
      // ⭐ 立即保存待保存的学习进度（使用 keepalive 确保请求完成）
      if (Object.keys(pendingSaveRef.current).length > 0) {
        flushPendingSaves({ keepalive: true })
      }
    }

    const handleVisibilityChange = () => {
      if (document.hidden) {
        // ⭐ 页面隐藏时也立即保存（使用 keepalive）
        if (Object.keys(pendingSaveRef.current).length > 0) {
          flushPendingSaves({ keepalive: true })
        }
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      document.removeEventListener('visibilitychange', handleVisibilityChange)

      // ⭐ 组件卸载时立即保存待保存的学习进度（使用 keepalive）
      const pending = pendingSaveRef.current
      if (Object.keys(pending).length > 0) {
        console.log('Component unmounting, saving pending data:', pending)
        flushPendingSaves({ keepalive: true })
      }
    }
  }, [flushPendingSaves])

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
    hasDraggedRef.current = false // 重置拖拽标志
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

    // 如果移动距离 > 10px，标记为拖拽
    const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2)
    if (distance > 10) {
      hasDraggedRef.current = true
    }

    setDragOffset({ x: deltaX, y: deltaY })
  }

  // 拖拽结束
  const handleDragEnd = () => {
    if (!dragStart) return

    const distance = Math.sqrt(dragOffset.x ** 2 + dragOffset.y ** 2)
    const threshold = 50 // 最小滑动距离（像素）

    // 延迟重置拖拽标志（让 onClick 有机会检查）
    setTimeout(() => {
      hasDraggedRef.current = false
    }, 0)

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
      handleStatus('fuzzy')
      return
    }

    setDragStart(null)
    setDragOffset({ x: 0, y: 0 })
  }

  // 🔧 安全检查：如果 currentWord 不存在（在所有 hooks 之后）
  if (!currentWord && !loading) {
    console.error('[Flashcards] currentWord is undefined!', { currentIndex, wordsLength: words.length })
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <p className="text-lg font-bold mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>加载中...</p>
          <p className="text-sm transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>正在准备单词卡片</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="inline-block w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin"></div>
          <p className="mt-4 font-black transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>加载中...</p>
        </div>
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div
          className="p-8 text-center max-w-md mx-auto transition-colors duration-300"
          style={{
            backgroundColor: 'var(--card-bg)',
            border: '3px solid #000',
            borderRadius: '12px',
            boxShadow: '4px 4px 0px 0px #000',
          }}
        >
          <h2 className="text-2xl font-black mb-4 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>🎉 太棒了！</h2>
          <p className="text-lg font-bold mb-2 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
            你已经完成了 <span className="font-mono">{scopeLabelMap[currentScope]}</span> 范围的所有单词
          </p>
          <p className="text-sm font-semibold mb-6 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
            接下来你想做什么？
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => setShowScopeSelectDialog(true)}
              className="w-full px-6 py-3 font-black border-2 border-black rounded-lg hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
              style={{ backgroundColor: '#dbeafe' }}
            >
              📚 选择其他范围
            </button>
            <button
              onClick={() => router.push('/')}
              className="w-full px-6 py-3 font-black border-2 border-black rounded-lg hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
              style={{ backgroundColor: '#B4F416' }}
            >
              返回首页
            </button>
          </div>
        </div>

        {/* 范围选择对话框 */}
        <FlashcardScopeDialog
          bookId={bookId}
          bookTitle={bookTitle}
          isOpen={showScopeSelectDialog}
          onClose={() => setShowScopeSelectDialog(false)}
          initialStats={scopeStats}
        />
      </div>
    )
  }

  return (
    <PermissionGate feature={FEATURE_PERMISSIONS.FLASHCARDS} bookId={bookId}>
      <div
        className="min-h-screen relative overflow-hidden transition-colors duration-300"
        style={{
          backgroundColor: 'var(--bg-primary)',
          touchAction: 'none',
          overscrollBehavior: 'none'
        }}
      >
        {/* 1. Header Section - Neo-Brutalism */}
        <header className="sticky top-0 z-50 px-4 py-4 transition-colors duration-300" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-2xl mx-auto flex items-center gap-4 mb-4">
            <button
              className="w-12 h-12 flex items-center justify-center rounded-xl transition-transform active:translate-y-1 transition-colors duration-300"
              style={{ border: '3px solid #000', boxShadow: '4px 4px 0px 0px #000', backgroundColor: 'var(--card-bg)' }}
              onClick={() => {
                // ⚡ 立即跳转，不等待保存
                // 保存由 beforeunload/visibilitychange/unmount 事件处理
                router.push('/')
              }}
            >
              <ArrowLeft size={24} strokeWidth={3} />
            </button>

            <div
              className="flex-1 h-12 flex items-center px-4 rounded-xl overflow-hidden transition-colors duration-300"
              style={{ border: '3px solid #000', boxShadow: '4px 4px 0px 0px #000', backgroundColor: 'var(--card-bg)' }}
            >
              <div className="flex flex-col">
                <span className="text-xs font-bold uppercase tracking-wider transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>Currently Studying</span>
                <span className="text-sm md:text-base font-black truncate transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>{bookTitle}</span>
              </div>
              <div className="ml-auto font-black text-lg transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>{currentIndex + 1} / {totalWordsInScope || words.length}</div>
            </div>
          </div>

          {/* 2. Progress Bar - Neo-Brutalism */}
          <div className="max-w-2xl mx-auto mb-4">
            <div className="flex justify-between text-xs font-bold mb-1 px-1 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
              <span>PROGRESS</span>
              <span>{Math.round(((currentIndex + 1) / (totalWordsInScope || words.length)) * 100)}%</span>
            </div>
            <div className="w-full h-6 rounded-full overflow-hidden relative transition-colors duration-300" style={{ border: '3px solid #000', backgroundColor: 'var(--card-bg)' }}>
              <div
                className="h-full transition-colors duration-300"
                style={{ width: `${((currentIndex + 1) / (totalWordsInScope || words.length)) * 100}%`, borderRight: '3px solid #000', backgroundColor: '#B4F416' }}
              />
            </div>
          </div>

          {/* 3. Swipe Instructions - Visual Cues (Neo-Brutalism) */}
          <div className="max-w-md mx-auto grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-1 border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_#000] transition-colors duration-300" style={{ backgroundColor: '#B4F416' }}>← LEFT</div>
              <span className="text-[10px] font-bold transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>认识</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-1 border-2 border-black rounded-lg text-xs font-black shadow-[2px_2px_0px_0px_#000] transition-colors duration-300" style={{ backgroundColor: '#FACC15' }}>↑ UP</div>
              <span className="text-[10px] font-bold transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>模糊</span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <div className="px-3 py-1 border-2 border-black rounded-lg text-xs font-black text-white shadow-[2px_2px_0px_0px_#000] transition-colors duration-300" style={{ backgroundColor: '#FF6B6B' }}>RIGHT →</div>
              <span className="text-[10px] font-bold transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>不认识</span>
            </div>
          </div>
        </header>

        {/* 用户未交互提示 - Neo-Brutalism */}
        {!hasUserInteracted && (
          <>
            {/* 半透明毛玻璃遮罩 - 覆盖整个屏幕 */}
            <div
              className="fixed inset-0 z-10"
              style={{
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
                backgroundColor: 'rgba(255, 255, 255, 0.6)'
              }}
            />
            {/* 提示框 */}
            <div
              className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md p-6 text-center cursor-pointer z-20 transition-colors duration-300"
              style={{
                backgroundColor: 'var(--card-bg)',
                border: '3px solid #000',
                borderRadius: '12px',
                boxShadow: '4px 4px 0px 0px #000',
              }}
              onClick={() => {
                hasUserInteractedRef.current = true
                setHasUserInteracted(true)
              }}
            >
              <p className="text-lg font-black mb-2 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>👆 点击此处开始学习</p>
              <p className="text-sm font-bold transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>首次点击激活语音功能</p>
            </div>
          </>
        )}

        {/* 4. THE MAIN CARD - 重构版本 */}
        <div className="flex items-center justify-center min-h-[600px]">
          <div style={{ width: '340px', height: '440px', position: 'relative' }}>
            {/* Current Card */}
            <div
              ref={cardRef}
              className="rounded-3xl flex flex-col p-6 text-center cursor-grab active:cursor-grabbing transition-colors duration-300"
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
                backgroundColor: 'var(--card-bg)',
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
                    <h1 className="text-5xl md:text-6xl font-black tracking-tight text-center transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>{currentWord.word}</h1>

                    {/* Phonetic + Button */}
                    <div className="flex items-center gap-4 justify-center">
                      <span className="font-mono text-lg transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                        {currentWord.us_phonetic || currentWord.uk_phonetic || currentWord.phonetic}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          hasUserInteractedRef.current = true
                          if (!hasUserInteracted) {
                            setHasUserInteracted(true)
                          }
                          speak(currentWord?.word || '', currentWord?.audio_url)
                        }}
                        className="w-10 h-10 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded-full shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                      >
                        <Volume2 size={18} strokeWidth={2.5} />
                      </button>
                    </div>

                    {/* Part of Speech */}
                    <span className="inline-block px-3 py-1.5 border-2 border-black rounded text-sm font-bold transition-colors duration-300" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
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
                        <p className="text-sm font-bold mb-1 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>英文释义</p>
                        <p className="text-base font-black leading-snug break-words transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                          {currentWord.definition_en}
                        </p>
                      </div>
                    )}

                    {/* Chinese Definition */}
                    {currentWord.definition && (
                      <div className="mb-4">
                        <p className="text-sm font-bold mb-1 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>中文释义</p>
                        <p className="text-base font-black leading-snug break-words transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                          {currentWord.definition}
                        </p>
                      </div>
                    )}

                    {/* English Collocation */}
                    {currentWord.collocation_en && (
                      <div className="mb-4">
                        <p className="text-sm font-bold mb-1 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>英文搭配</p>
                        <p className="text-sm font-semibold leading-snug break-words transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                          {currentWord.collocation_en}
                        </p>
                      </div>
                    )}

                    {/* Chinese Collocation */}
                    {currentWord.collocation && (
                      <div className="mb-4">
                        <p className="text-sm font-bold mb-1 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>搭配</p>
                        <p className="text-sm font-semibold leading-snug break-words transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                          {currentWord.collocation}
                        </p>
                      </div>
                    )}

                    {/* English Example */}
                    {currentWord.example_sentence_en && (
                      <div
                        className="p-3 mb-4 transition-colors duration-300"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '2px solid #000',
                          borderRadius: '8px',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>英文例句</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              speak(currentWord.example_sentence_en || '', null)
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                          >
                            <Volume2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                        <p className="text-sm font-semibold leading-snug break-words transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                          {currentWord.example_sentence_en}
                        </p>
                      </div>
                    )}

                    {/* Chinese Example */}
                    {currentWord.example_sentence && (
                      <div
                        className="p-3 transition-colors duration-300"
                        style={{
                          backgroundColor: 'var(--bg-tertiary)',
                          border: '2px solid #000',
                          borderRadius: '8px',
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-bold transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>例句</p>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              speak(currentWord.example_sentence || '', null)
                            }}
                            className="w-7 h-7 flex items-center justify-center bg-[#B4F416] border-2 border-black rounded-md shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
                          >
                            <Volume2 size={14} strokeWidth={2.5} />
                          </button>
                        </div>
                        <p className="text-sm font-semibold leading-snug break-words transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
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
                className="rounded-3xl flex flex-col items-center justify-center p-6 text-center pointer-events-none transition-colors duration-300"
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
                  backgroundColor: 'var(--card-bg)'
                }}
              >
                <h2 className="text-4xl md:text-5xl font-black mb-3 transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                  {words[currentIndex + 1]?.word}
                </h2>

                <div className="flex items-center gap-2 mb-4 justify-center">
                  <span className="font-mono text-base transition-colors duration-300" style={{ color: '#d1d5db' }}>
                    {words[currentIndex + 1]?.us_phonetic || words[currentIndex + 1]?.uk_phonetic || words[currentIndex + 1]?.phonetic}
                  </span>
                </div>

                <div className="mb-4">
                  <span className="inline-block px-2 py-1 border-2 border-black rounded text-xs font-bold transition-colors duration-300" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-primary)' }}>
                    {words[currentIndex + 1]?.part_of_speech || 'n.'}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Complete Message - Neo-Brutalism */}
        {/* 注释：不再自动显示完成消息，只通过showCompleteDialog对话框显示 */}
        {/* {currentIndex === words.length - 1 && !showCompleteDialog && (
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
        )} */}

        {/* 统计色块 - 低调样式，放在卡片下方 */}
        <div className="max-w-2xl mx-auto mt-4 mb-6">
          <FlashcardStatsBar
            bookId={bookId}
            currentScope={currentScope}
            onScopeChange={handleScopeChange}
            initialStats={scopeStats}
          />
          {loadingMore && (
            <div className="text-center mt-2 text-xs text-blue-600 font-bold animate-pulse">
              📚 加载更多单词... ({words.length}/{totalWordsInScope || words.length})
            </div>
          )}
          {waitingForLoad && !loadingMore && (
            <div className="text-center mt-2 text-xs text-orange-600 font-bold animate-pulse">
              ⏳ 等待加载...
            </div>
          )}
        </div>

        {/* Completion Dialog - Modal */}
        {showCompleteDialog && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
            onClick={() => setShowCompleteDialog(false)}
          >
            <div
              className="rounded-xl border-[3px] border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md p-6 transition-colors duration-300"
              style={{ backgroundColor: 'var(--card-bg)' }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-black mb-4 text-center transition-colors duration-300" style={{ color: 'var(--text-primary)' }}>
                🎉 太棒了！
              </h3>
              <p className="font-semibold mb-2 text-center transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                你已经完成了 <span className="font-mono font-bold">{scopeLabelMap[currentScope]}</span> 范围的所有单词学习！
              </p>
              <p className="text-sm font-semibold mb-6 text-center transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
                接下来你想做什么？
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={handleRestartScope}
                  className="w-full px-4 py-3 border-2 border-black rounded-lg font-bold hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#B4F416' }}
                >
                  🔄 重新学习这个范围
                </button>
                <button
                  onClick={handleSelectOtherScope}
                  className="w-full px-4 py-3 border-2 border-black rounded-lg font-bold hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all flex items-center justify-center gap-2"
                  style={{ backgroundColor: '#dbeafe' }}
                >
                  📚 选择其他范围
                </button>
                <button
                  onClick={() => router.push('/')}
                  className="w-full px-4 py-3 border-2 border-black rounded-lg font-bold transition-colors hover:opacity-80"
                  style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  返回首页
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Scope Selection Dialog */}
        <FlashcardScopeDialog
          bookId={bookId}
          bookTitle={bookTitle}
          isOpen={showScopeSelectDialog}
          onClose={() => setShowScopeSelectDialog(false)}
          initialStats={scopeStats}
        />
      </div>
    </PermissionGate>
  )
}
