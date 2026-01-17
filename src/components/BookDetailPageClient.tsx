'use client'

import { useState, useMemo, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, ArrowLeft, Filter, Shuffle, ChevronDown, Lightbulb, Trash2, AlertTriangle, Layers, Headphones, Gamepad2, RotateCcw, List, Sparkles, Edit3, Grid3x3, Dumbbell } from 'lucide-react'
import Link from 'next/link'
import { WordList } from '@/components/WordList'
import { GlobalHideButton } from '@/components/GlobalHideButton'
import { ScopeSelectorModal } from '@/components/ScopeSelectorModal'
import { BookIcon } from '@/components/BookIcon'
import { ChapterManagementDialog } from '@/components/ChapterManagementDialog'
import { SmartImportDialog } from '@/components/SmartImportDialog'
import { WordTableEditor } from '@/components/WordTableEditor'
import { BatchActionBar } from '@/components/BatchActionBar'

// ✅ 导入新的Hooks和工具函数
import { useBookFilters, type BookFilters } from '@/hooks/useBookFilters'
import { useWordData } from '@/hooks/useWordData'
import { useScreenOrientation } from '@/hooks/useScreenOrientation'
import { WORDS_PER_PAGE, TIPS, getFilterLabel, type StatusFilter } from '@/lib/wordListUtils'
import { getReadingProgress, type ReadingProgress } from '@/lib/readingProgress'
import type { Word } from '@/hooks/useWordData'

// 单词卡片骨架屏组件
function WordCardSkeleton() {
  return (
    <div className="w-full bg-white rounded-xl border-3 border-black overflow-hidden relative">
      {/* 顶部：序号 + 单词 + 音标 + 发音按钮 */}
      <div className="flex items-start gap-3 p-4 border-b-2 border-slate-100">
        {/* 序号 */}
        <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse flex-shrink-0"></div>

        <div className="flex-1">
          {/* 单词 */}
          <div className="h-7 bg-slate-200 rounded w-32 animate-pulse mb-2"></div>

          {/* 音标 */}
          <div className="h-4 bg-slate-200 rounded w-48 animate-pulse"></div>
        </div>

        {/* 发音按钮 */}
        <div className="w-8 h-8 bg-slate-200 rounded-lg animate-pulse flex-shrink-0"></div>
      </div>

      {/* 中部：释义区域 */}
      <div className="p-4 space-y-2 flex-1">
        {/* 词性 */}
        <div className="h-4 bg-slate-200 rounded w-12 animate-pulse"></div>

        {/* 中文释义 */}
        <div className="h-5 bg-slate-200 rounded w-full animate-pulse"></div>
        <div className="h-5 bg-slate-200 rounded w-3/4 animate-pulse"></div>

        {/* 英文释义 */}
        <div className="h-4 bg-slate-200 rounded w-full animate-pulse mt-3"></div>
        <div className="h-4 bg-slate-200 rounded w-2/3 animate-pulse"></div>

        {/* 搭配 */}
        <div className="h-4 bg-slate-200 rounded w-5/6 animate-pulse mt-3"></div>
        <div className="h-4 bg-slate-200 rounded w-1/2 animate-pulse"></div>
      </div>

      {/* 底部：按钮 */}
      <div className="flex gap-2 p-4 pt-2">
        <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
        <div className="flex-1 h-10 bg-slate-200 rounded-lg animate-pulse"></div>
      </div>
    </div>
  )
}

interface Chapter {
  id: string
  title: string
}

interface Book {
  id: string
  title: string
  description: string
  total_words: number
  is_official?: boolean
  created_by?: string
}

interface BookDetailPageClientProps {
  book: Book
  chapters: Chapter[]
  user: any
  // 🆕 服务端传递的初始数据
  initialWords?: Word[]
  initialTotal?: number
}

type SortOrder = 'default' | 'random'

export function BookDetailPageClient({
  book,
  chapters,
  user,
  initialWords = [],
  initialTotal
}: BookDetailPageClientProps) {
  const router = useRouter()

  // ✅ 使用新的Hooks管理状态（传入bookId以支持断点续读）
  const { filters, setPage, setTheme, setScenario, setChapter, setStatus, updateFilters } = useBookFilters(book.id)

  // 🆕 传递初始数据给useWordData，避免首次加载时调用API
  const { words, totalWords, hasMore, isLoading, isLoadingMore } = useWordData({
    book,
    isPortrait: false,
    initialData: initialWords,
    initialTotal: initialTotal
  })

  const { isPortrait } = useScreenOrientation()

  // 本地UI状态（不需要持久化到URL）
  const [globalHideChinese, setGlobalHideChinese] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showSceneMenu, setShowSceneMenu] = useState(false)
  const [showChapterMenu, setShowChapterMenu] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)

  // ⚡ UX优化：本地立即loading状态，用于点击翻页按钮时立即显示骨架屏
  const [isPageChanging, setIsPageChanging] = useState(false)
  const [showSkeleton, setShowSkeleton] = useState(false)
  const skeletonStartTimeRef = useRef<number>(0)
  const loadingPageRef = useRef<number | null>(null)  // 🔥 新思路：记录正在加载的页码
  const initializedRef = useRef(false)

  // 🚀 渐进式渲染：控制初始显示的卡片数量
  const initialVisibleCount = isPortrait ? 6 : 12  // 竖屏6个，横屏12个
  const [visibleCount, setVisibleCount] = useState(initialVisibleCount)

  // 🔥 初始化：记录第一页的数据标识
  useEffect(() => {
    if (!initializedRef.current && words.length > 0 && filters.page === 1) {
      console.log('🔥 [Init] Initializing with page 1 data, first word id:', words[0]?.id)
      loadingPageRef.current = 1  // 记录当前已加载的页码
      firstWordIdRef.current = words[0].id  // 🔥 同时初始化 firstWordIdRef，避免首次翻页时为null
      initializedRef.current = true
    }
  }, [words, filters.page])

  // 当翻页或数据变化时重置可见数量
  useEffect(() => {
    if (!isLoading && !isPageChanging) {
      setVisibleCount(initialVisibleCount)
    }
  }, [filters.page, isLoading, isPageChanging, initialVisibleCount])

  // 🆕 骨架屏显示逻辑：点击翻页时立即显示
  useEffect(() => {
    if (isPageChanging) {
      console.log('🎯 [Skeleton] Page changing to', filters.page, ', showing skeleton')
      setShowSkeleton(true)
      skeletonStartTimeRef.current = Date.now()
      // 不在这里设置 loadingPageRef，而是在数据真正更新时设置
    }
  }, [isPageChanging, filters.page])

  // 🔥 数据到达检测：通过比较 words 的第一个元素来判断数据是否更新
  const firstWordIdRef = useRef<string | null>(null)
  const skeletonTimerRef = useRef<NodeJS.Timeout | null>(null)
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 渐进式显示更多卡片（由WordList触发）
  const handleLoadMoreVisible = useCallback(() => {
    setVisibleCount(prev => Math.min(prev + 2, words.length))
  }, [words.length])

  // 断点续读状态
  const [showRestoreToast, setShowRestoreToast] = useState(false)
  const [restoredPage, setRestoredPage] = useState<number | null>(null)
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const [savedProgress, setSavedProgress] = useState<ReadingProgress | null>(null)

  // 🔥 数据到达检测：通过比较 words 的第一个元素来判断数据是否更新
  // 必须放在状态声明之后，因为依赖 restoredPage 和 showRestoreToast
  useEffect(() => {
    // 如果不在翻页状态，重置firstWordIdRef
    if (!isPageChanging && !showSkeleton && words.length > 0) {
      firstWordIdRef.current = words[0].id
      return
    }

    // 如果正在显示骨架屏，检查数据是否更新
    if (showSkeleton && words.length > 0) {
      const currentFirstWordId = words[0].id

      // 如果第一个单词的ID改变了，说明新数据已到达
      if (currentFirstWordId !== firstWordIdRef.current) {
        console.log('🎯 [Skeleton] New data detected! Old word ID:', firstWordIdRef.current, ', New word ID:', currentFirstWordId, ', Page:', filters.page)

        const elapsedTime = Date.now() - skeletonStartTimeRef.current
        const remainingTime = Math.max(0, 800 - elapsedTime)

        // 更新firstWordIdRef
        firstWordIdRef.current = currentFirstWordId
        loadingPageRef.current = filters.page  // 记录已加载的页码

        // 🔥 如果是断点续读场景，此时显示Toast提示
        if (restoredPage !== null && !showRestoreToast) {
          console.log('🎉 [Resume] Data arrived, showing restore toast for page:', restoredPage)
          setShowRestoreToast(true)

          // 3秒后自动隐藏Toast
          toastTimerRef.current = setTimeout(() => {
            console.log('⏱️ [Resume] Hiding restore toast')
            setShowRestoreToast(false)
            setRestoredPage(null)  // 清除恢复页码，避免影响下次
          }, 3000)
        }

        // 🔥 处理骨架屏隐藏（普通翻页和断点续读都需要）
        if (remainingTime === 0) {
          console.log('🎯 [Skeleton] Hiding skeleton immediately')
          setShowSkeleton(false)
          setIsPageChanging(false)
        } else {
          console.log('🎯 [Skeleton] Waiting for remaining', remainingTime, 'ms')
          skeletonTimerRef.current = setTimeout(() => {
            console.log('🎯 [Skeleton] Min display time elapsed, hiding skeleton')
            setShowSkeleton(false)
            setIsPageChanging(false)
          }, remainingTime)
        }

        // 清理函数
        return () => {
          if (skeletonTimerRef.current) {
            clearTimeout(skeletonTimerRef.current)
            skeletonTimerRef.current = null
          }
          if (toastTimerRef.current) {
            clearTimeout(toastTimerRef.current)
            toastTimerRef.current = null
          }
        }
      } else {
        console.log('🎯 [Skeleton] Still waiting for new data... (current word ID unchanged:', currentFirstWordId, ')')
      }
    }
  }, [showSkeleton, words, filters.page, isPageChanging, restoredPage, showRestoreToast])

  // ⭐ 断点续读：检查并显示恢复提示
  useEffect(() => {
    const checkAndRestoreProgress = async () => {
      console.log('🔍 [Resume] Checking reading progress for book:', book.id)

      // 如果URL已经有参数，说明用户已经在浏览，不需要恢复
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('page') || urlParams.has('theme') || urlParams.has('status')) {
        console.log('⏭️ [Resume] URL has params, skipping restore')
        return
      }

      // 检查是否有保存的进度
      const progress = await getReadingProgress(book.id)
      console.log('📖 [Resume] Saved progress:', progress)

      if (!progress) {
        console.log('ℹ️ [Resume] No saved progress found')
        return
      }

      // 验证进度数据的完整性
      if (!progress.page || progress.page <= 1) {
        console.log('ℹ️ [Resume] Page is 1 or invalid, no need to restore')
        return
      }

      // ⭐ 保存进度到状态，但不立即恢复，等待用户确认
      console.log('📍 [Resume] Found progress, showing confirm dialog for page:', progress.page)
      setSavedProgress(progress)
      setShowRestoreConfirm(true)
    }

    checkAndRestoreProgress()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id]) // 只在组件挂载时执行一次

  // 处理用户确认恢复
  const handleConfirmRestore = () => {
    console.log('🔥 [Resume] handleConfirmRestore called, savedProgress:', savedProgress)
    if (!savedProgress || !savedProgress.page) {
      console.log('❌ [Resume] No saved progress or invalid page, aborting')
      return
    }

    console.log('✅ [Resume] User confirmed, restoring to page:', savedProgress.page)

    // ⭐ 使用批量更新，避免逐个设置触发页码重置
    const filtersToRestore: Partial<BookFilters> = {
      page: savedProgress.page
    }

    // 安全地添加筛选条件（仅在值存在且不为 'all' 时）
    if (savedProgress.theme && savedProgress.theme !== 'all') {
      filtersToRestore.theme = savedProgress.theme
    }
    if (savedProgress.scenario && savedProgress.scenario !== 'all') {
      filtersToRestore.scenario = savedProgress.scenario
    }
    if (savedProgress.chapter && savedProgress.chapter !== 'all') {
      filtersToRestore.chapter = savedProgress.chapter
    }
    if (savedProgress.status && savedProgress.status !== 'all') {
      filtersToRestore.status = savedProgress.status as StatusFilter
    }

    console.log('🔄 [Resume] Calling updateFilters with:', filtersToRestore)

    // 🔥 修复：先设置 isPageChanging = true，确保显示骨架屏而不是旧单词
    setIsPageChanging(true)

    // 先隐藏确认对话框
    setShowRestoreConfirm(false)

    // ✅ 批量恢复所有筛选条件，不会重置页码
    updateFilters(filtersToRestore)

    console.log('✅ [Resume] updateFilters called successfully, isPageChanging set to true')

    // 🔥 保存要恢复的页码，但不立即显示Toast
    // Toast将在数据真正到达后显示（在数据到达检测useEffect中）
    setRestoredPage(savedProgress.page)
  }

  // 处理用户取消恢复
  const handleCancelRestore = () => {
    console.log('❌ [Resume] User cancelled restore')
    setShowRestoreConfirm(false)
    setSavedProgress(null)
  }

  // 生成恢复进度的提示文案
  const getRestoreMessage = (progress: ReadingProgress): string => {
    if (!progress.page) {
      return '您上次有学习进度，是否继续？'
    }

    const parts: string[] = []

    // 如果有筛选条件，优先显示筛选条件
    if (progress.status && progress.status !== 'all') {
      const statusLabels: Record<string, string> = {
        'new': '新词',
        'known': '认识',
        'fuzzy': '模糊',
        'unknown': '不认识'
      }
      parts.push(statusLabels[progress.status] || progress.status)
    }

    if (progress.chapter && progress.chapter !== 'all') {
      parts.push(`章节: ${progress.chapter}`)
    }

    if (progress.theme && progress.theme !== 'all') {
      parts.push(`主题: ${progress.theme}`)
    }

    if (progress.scenario && progress.scenario !== 'all') {
      parts.push(`场景: ${progress.scenario}`)
    }

    // 如果有筛选条件，显示"筛选条件 + 页码"
    if (parts.length > 0) {
      if (progress.page > 1) {
        return `您上次在学习"${parts.join(' - ')}"（第${progress.page}页），是否继续？`
      } else {
        return `您上次在学习"${parts.join(' - ')}"，是否继续？`
      }
    }

    // 如果没有筛选条件，只显示页码
    if (progress.page > 1) {
      return `您上次学习到第 ${progress.page} 页，是否继续学习？`
    }

    return '您上次有学习进度，是否继续？'
  }

  // 范围选择对话框状态
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [selectedPracticeMode, setSelectedPracticeMode] = useState<'flashcards' | 'dictation' | 'match-game' | 'typing'>('flashcards')

  // 删除词库状态
  const [showDeleteConfirm1, setShowDeleteConfirm1] = useState(false)
  const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // 章节管理状态
  const [showChapterManagement, setShowChapterManagement] = useState(false)

  // 智能导入状态
  const [showSmartImport, setShowSmartImport] = useState(false)

  // 视图模式状态
  type ViewMode = 'learning' | 'editing'
  const [viewMode, setViewMode] = useState<ViewMode>('learning')

  // 批量选择状态
  const [selectedWordIds, setSelectedWordIds] = useState<Set<string>>(new Set())

  // WordTableEditor 刷新触发器
  const [wordTableRefreshKey, setWordTableRefreshKey] = useState(0)

  // 处理删除词库
  const handleDeleteBook = async () => {
    setIsDeleting(true)
    setDeleteError('')

    try {
      const response = await fetch(`/api/books/${book.id}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '删除失败')
      }

      // 删除成功，跳转到首页
      router.push('/')
    } catch (error: any) {
      setDeleteError(error.message)
      setIsDeleting(false)
      setShowDeleteConfirm2(false)
    }
  }

  // 随机学习提示
  const [randomTip, setRandomTip] = useState(TIPS[0])

  // ✅ 改进：使用新Hooks后，URL恢复和数据获取已由Hooks处理，不需要额外代码

  // 随机选择学习提示
  useEffect(() => {
    setRandomTip(TIPS[Math.floor(Math.random() * TIPS.length)])
  }, [])

  // ⚡ UX优化：当数据加载完成时，清除立即loading状态
  // 监听滚动位置
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ✅ 改进：统一的筛选和翻页处理函数
  const handleThemeChange = (theme: string) => {
    setTheme(theme)
    setShowThemeMenu(false)
  }

  const handleSceneChange = (scene: string) => {
    setScenario(scene)
    setShowSceneMenu(false)
  }

  const handleChapterChange = (chapter: string) => {
    setChapter(chapter)
    setShowChapterMenu(false)
  }

  const handleStatusChange = (status: StatusFilter) => {
    setStatus(status)
    setShowFilterMenu(false)
  }

  // 翻页处理：切换页面并滚动到顶部（PC和竖屏都使用）
  const handlePageChange = (newPage: number) => {
    console.log('📄 Page change to', newPage, '- Setting isPageChanging to true')
    // ⚡ 立即显示骨架屏（乐观UI）- 同步更新确保立即生效
    setIsPageChanging(true)
    console.log('📄 isPageChanging set to true (will be reset when data loads)')
    console.log('📄 Calling setPage')
    setPage(newPage)
    console.log('📄 Scrolling to top')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 打开范围选择对话框（或直接跳转到听写页面）
  const handlePracticeModeClick = (mode: 'flashcards' | 'dictation' | 'match-game' | 'typing') => {
    if (mode === 'dictation') {
      // 听写模式：直接跳转到听写页面，由页面内部自动弹出范围选择对话框
      router.push(`/study/${book.id}/dictation`)
    } else if (mode === 'typing') {
      // 打字练习：直接跳转到打字练习页面，由页面内部自动弹出范围选择对话框
      router.push(`/study/${book.id}/typing`)
    } else if (mode === 'match-game') {
      // 消消乐：暂未实现
      alert('消消乐功能正在开发中，敬请期待！')
    } else {
      // 卡片背单词：弹出范围选择对话框
      setSelectedPracticeMode(mode)
      setShowScopeModal(true)
    }
  }

  // 滚动到顶部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // ✅ 改进：提取所有唯一的主题、场景和章节
  const { uniqueThemes, uniqueScenes, uniqueChapters } = useMemo(() => {
    const themes = new Set<string>()
    const scenes = new Set<string>()
    const chaptersMap = new Map<string | null, { id: string; title: string; order_index: number }>()

    words.forEach(word => {
      if (word.theme) themes.add(word.theme)
      if (word.scene) scenes.add(word.scene)
      // 收集章节信息（使用 chapter_id 作为唯一标识）
      if (word.chapter_id && word.chapter) {
        chaptersMap.set(word.chapter_id, {
          id: word.chapter_id,
          title: word.chapter,
          order_index: 0 // 这里可以后续从 word 中获取 order_index
        })
      }
    })

    return {
      uniqueThemes: Array.from(themes).sort(),
      uniqueScenes: Array.from(scenes).sort(),
      uniqueChapters: Array.from(chaptersMap.values()).sort((a, b) => a.order_index - b.order_index)
    }
  }, [words])

  // 根据选中的主题筛选场景
  const availableScenes = useMemo(() => {
    if (filters.theme === 'all') {
      return uniqueScenes
    }
    const scenesInTheme = new Set<string>()
    words.forEach(word => {
      if (word.theme === filters.theme && word.scene) {
        scenesInTheme.add(word.scene)
      }
    })
    return Array.from(scenesInTheme).sort()
  }, [filters.theme, words, uniqueScenes])

  // 随机打乱数组（本地工具函数）
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // ✅ 注意：words已经是useWordData Hook中筛选过的结果
  // 这里只需要做额外的客户端随机排序
  // 🔥 修复：当 isPageChanging 为 true 时，返回空数组，避免显示旧数据
  const displayWords = useMemo(() => {
    // 如果正在翻页，返回空数组
    if (isPageChanging) {
      console.log('🔥 [displayWords] Page changing, returning empty array')
      return []
    }

    let result = [...words]

    if (sortOrder === 'random') {
      result = shuffleArray(result)
    }

    console.log('🔥 [displayWords] Returning', result.length, 'words')
    return result
  }, [words, sortOrder, isPageChanging])

  // 分页逻辑
  const totalPages = Math.ceil(totalWords / WORDS_PER_PAGE)
  const startIndex = (filters.page - 1) * WORDS_PER_PAGE + 1
  const endIndex = Math.min(filters.page * WORDS_PER_PAGE, totalWords)

  // ✅ 改进：删除了旧的筛选重置useEffect，新Hooks已自动处理

  // 生成筛选描述文本
  const getFilterDescription = () => {
    const parts = []
    if (filters.theme !== 'all') parts.push(filters.theme)
    if (filters.scenario !== 'all') parts.push(filters.scenario)
    if (filters.status !== 'all') parts.push(getFilterLabel(filters.status))

    if (parts.length === 0) return '全部单词'
    return parts.join(' - ')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* ⭐ 断点续读确认对话框 */}
      {showRestoreConfirm && savedProgress && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ marginTop: '10vh' }}>
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center">
                <RotateCcw className="w-6 h-6 text-indigo-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 mb-2">发现学习进度</h3>
                <p className="text-sm text-slate-600 mb-4">
                  {getRestoreMessage(savedProgress)}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelRestore}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-slate-700 border-2 border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                  >
                    从头开始
                  </button>
                  <button
                    onClick={handleConfirmRestore}
                    className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    继续学习
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ⭐ 断点续读Toast提示 */}
      {showRestoreToast && restoredPage && (
        <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 animate-in slide-in-from-top fade-in duration-300">
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-6 py-3 rounded-xl shadow-lg flex items-center gap-3">
            <RotateCcw className="w-5 h-5" />
            <span className="font-semibold">
              已恢复到第 {restoredPage} 页
            </span>
          </div>
        </div>
      )}
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="w-full mx-auto max-w-[1800px] px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Back */}
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 transition-colors duration-200"
              >
                <ArrowLeft className="w-5 h-5 text-slate-700" />
              </Link>
              <div className="flex items-center gap-3">
                <BookIcon title={book.title || 'Book'} size="md" />
                <div>
                  <h1 className="text-lg font-bold text-slate-900">{book.title || '未命名词书'}</h1>
                  <p className="text-xs text-slate-500">{totalWords || book.total_words || '-'} 个单词</p>
                </div>
              </div>
            </div>

            {/* User & Actions */}
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-600 hidden sm:block">{user.email}</span>

              {/* 删除词库按钮 - 仅自定义词库显示 */}
              {!book.is_official && book.created_by === user.id && (
                <>
                  <button
                    onClick={() => setShowDeleteConfirm1(true)}
                    className="px-4 py-2 text-sm font-semibold text-red-600 border-2 border-red-200 rounded-xl hover:border-red-400 hover:bg-red-50 transition-all duration-200 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span className="hidden sm:inline">删除词库</span>
                  </button>

                  {/* 第一次确认对话框 */}
                  {showDeleteConfirm1 && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ marginTop: '10vh' }}>
                      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-amber-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">确定删除词库？</h3>
                            <p className="text-sm text-slate-600 mb-4">
                              您即将删除自定义词库「{book.title}」，此操作不可撤销。
                            </p>
                            <div className="flex gap-3">
                              <button
                                onClick={() => {
                                  setShowDeleteConfirm1(false)
                                  setShowDeleteConfirm2(true)
                                }}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors"
                              >
                                确定删除
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm1(false)}
                                className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* 第二次确认对话框 */}
                  {showDeleteConfirm2 && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm" style={{ marginTop: '10vh' }}>
                      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200">
                        <div className="flex items-start gap-4">
                          <div className="flex-shrink-0 w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                            <AlertTriangle className="w-6 h-6 text-red-600" />
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">最后确认</h3>
                            <p className="text-sm text-slate-600 mb-4">
                              删除后，所有单词、学习进度、练习记录都将被永久删除，无法恢复！
                            </p>
                            {deleteError && (
                              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl">
                                <p className="text-sm text-red-600">{deleteError}</p>
                              </div>
                            )}
                            <div className="flex gap-3">
                              <button
                                onClick={handleDeleteBook}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                              >
                                {isDeleting ? (
                                  <>
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    删除中...
                                  </>
                                ) : (
                                  '确认删除'
                                )}
                              </button>
                              <button
                                onClick={() => {
                                  setShowDeleteConfirm2(false)
                                  setDeleteError('')
                                }}
                                disabled={isDeleting}
                                className="flex-1 px-4 py-2.5 border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
                              >
                                取消
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </>
              )}

              <Link
                href="/logout"
                className="px-4 py-2 text-sm font-semibold text-slate-700 border-2 border-slate-200 rounded-xl hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
              >
                退出
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 pt-16 pb-8">
        <div className="w-full mx-auto max-w-[1800px]">

          {/* 学习小贴士 - 移到顶部（移动端优先） */}
          <div className="mb-2 md:mb-3 text-right">
            <h3 className="text-xs md:text-sm font-black text-black mb-1 md:mb-2 flex items-center gap-1 md:gap-2 justify-end">
              <Lightbulb className="w-3 h-3 md:w-4 md:h-4 text-[#FACC15]" strokeWidth={2.5} />
              学习小贴士
            </h3>
            <p className="text-[10px] md:text-xs font-bold text-gray-600 leading-relaxed text-right">{randomTip}</p>
          </div>

          {/* 游戏模式选择区域 - 强制硬核风格（响应式优化） */}
          {/* 练习模式入口 - 仅学习模式显示 */}
          {viewMode === 'learning' && (
          <section className="flex md:grid md:grid-cols-4 gap-1.5 md:gap-6 mb-4 md:mb-6 overflow-x-auto pb-4 md:pb-0 snap-x no-scrollbar px-1">

            {/* 1. 卡片背单词 */}
            <button
              onClick={() => handlePracticeModeClick('flashcards')}
              className="snap-center flex-shrink-0 w-[28vw] md:w-auto relative group h-12 md:h-28 flex items-center px-1.5 md:px-6 gap-1.5 md:gap-5 overflow-hidden transition-all"
              style={{
                backgroundColor: '#B4F416',
                border: '3px solid #000000',
                borderRadius: '10px',
                boxShadow: '4px 4px 0px 0px #000000',
              }}
            >
              <div className="p-1 md:p-3 rounded-lg border-2 border-black bg-white text-black shrink-0">
                <Layers className="w-3.5 h-3.5 md:w-6 md:h-6" strokeWidth={2.5} />
              </div>
              <div className="text-left z-10">
                <h3 className="text-[11px] md:text-xl font-black text-black leading-none tracking-tight">卡片背单词</h3>
                <p className="text-[8px] md:text-sm font-bold text-black/70 mt-0.5 md:mt-1 uppercase tracking-wide">Flashcards</p>
              </div>
              <Layers className="absolute -right-1 -bottom-3 text-black/10 rotate-12 w-10 h-10 md:w-24 md:h-24 hidden md:block" />
            </button>

            {/* 2. 听写模式 */}
            <button
              onClick={() => handlePracticeModeClick('dictation')}
              className="snap-center flex-shrink-0 w-[28vw] md:w-auto relative group h-12 md:h-28 flex items-center px-1.5 md:px-6 gap-1.5 md:gap-5 overflow-hidden transition-all"
              style={{
                backgroundColor: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '10px',
                boxShadow: '4px 4px 0px 0px #000000',
              }}
            >
              <div className="p-1 md:p-3 rounded-lg border-2 border-black bg-[#3B82F6] text-white shrink-0">
                <Headphones className="w-3.5 h-3.5 md:w-6 md:h-6" strokeWidth={2.5} />
              </div>
              <div className="text-left z-10">
                <h3 className="text-[11px] md:text-xl font-black text-black leading-none tracking-tight">听写模式</h3>
                <p className="text-[8px] md:text-sm font-bold text-black/60 mt-0.5 md:mt-1 uppercase tracking-wide">Dictation</p>
              </div>
            </button>

            {/* 3. 消消乐 */}
            <button
              onClick={() => handlePracticeModeClick('match-game')}
              className="snap-center flex-shrink-0 w-[28vw] md:w-auto relative group h-12 md:h-28 flex items-center px-1.5 md:px-6 gap-1.5 md:gap-5 overflow-hidden transition-all"
              style={{
                backgroundColor: '#ffffff',
                border: '3px solid #000000',
                borderRadius: '10px',
                boxShadow: '4px 4px 0px 0px #000000',
              }}
            >
              <div className="p-1 md:p-3 rounded-lg border-2 border-black bg-[#FF6B6B] text-white shrink-0">
                <Gamepad2 className="w-3.5 h-3.5 md:w-6 md:h-6" strokeWidth={2.5} />
              </div>
              <div className="text-left z-10">
                <h3 className="text-[11px] md:text-xl font-black text-black leading-none tracking-tight">消消乐</h3>
                <p className="text-[8px] md:text-sm font-bold text-black/60 mt-0.5 md:mt-1 uppercase tracking-wide">Match Game</p>
              </div>
            </button>

            {/* 4. 打字练习（肌肉训练）- 暂时注释，避免重复 */}
            {/*
            <button
              onClick={() => handlePracticeModeClick('typing')}
              className="snap-center flex-shrink-0 w-[28vw] md:w-auto relative group h-12 md:h-28 flex items-center px-1.5 md:px-6 gap-1.5 md:gap-5 overflow-hidden transition-all"
              style={{
                backgroundColor: '#B4F416',
                border: '3px solid #000000',
                borderRadius: '10px',
                boxShadow: '4px 4px 0px 0px #000000',
              }}
            >
              <div className="p-1 md:p-3 rounded-lg border-2 border-black bg-[#1E293B] text-[#B4F416] shrink-0">
                <Dumbbell className="w-3.5 h-3.5 md:w-6 md:h-6" strokeWidth={2.5} />
              </div>
              <div className="text-left z-10">
                <h3 className="text-[11px] md:text-xl font-black text-black leading-none tracking-tight">打字练习</h3>
                <p className="text-[8px] md:text-sm font-bold text-black/70 mt-0.5 md:mt-1 uppercase tracking-wide">Typing</p>
              </div>
              <Dumbbell className="absolute -right-1 -bottom-3 text-black/10 rotate-12 w-10 h-10 md:w-24 md:h-24 hidden md:block" />
            </button>
            */}
          </section>
          )}

          {/* 顶部筛选栏 */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* 左侧：主题/场景筛选 - 仅学习模式显示 */}
              {viewMode === 'learning' && (
              <div className="flex items-center gap-3 flex-wrap">
                {/* 主题选择器 */}
                <div className="relative">
                  <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      filters.theme !== 'all'
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{filters.theme === 'all' ? '全部主题' : filters.theme}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showThemeMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 主题下拉菜单 */}
                  {showThemeMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowThemeMenu(false)}
                      />
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-80 overflow-y-auto">
                        <button
                          onClick={() => handleThemeChange('all')}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            filters.theme === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          全部主题
                          {filters.theme === 'all' && <ChevronDown className="w-4 h-4 rotate-180" />}
                        </button>
                        {uniqueThemes.map(theme => (
                          <button
                            key={theme}
                            onClick={() => handleThemeChange(theme)}
                            className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              filters.theme === theme ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                            }`}
                          >
                            {theme}
                            {filters.theme === theme && <ChevronDown className="w-4 h-4 rotate-180" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* 场景选择器 */}
                <div className="relative">
                  <button
                    onClick={() => setShowSceneMenu(!showSceneMenu)}
                    disabled={availableScenes.length === 0}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                      filters.scenario !== 'all'
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                    } ${availableScenes.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span>{filters.scenario === 'all' ? '全部场景' : filters.scenario}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showSceneMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 场景下拉菜单 */}
                  {showSceneMenu && availableScenes.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSceneMenu(false)}
                      />
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-80 overflow-y-auto">
                        <button
                          onClick={() => handleSceneChange('all')}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            filters.scenario === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          全部场景
                          {filters.scenario === 'all' && <ChevronDown className="w-4 h-4 rotate-180" />}
                        </button>
                        {availableScenes.map(scene => (
                          <button
                            key={scene}
                            onClick={() => handleSceneChange(scene)}
                            className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              filters.scenario === scene ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                            }`}
                          >
                            {scene}
                            {filters.scenario === scene && <ChevronDown className="w-4 h-4 rotate-180" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>

                {/* 章节选择器 - 仅当有章节时显示 */}
                {uniqueChapters.length > 0 && (
                  <div className="relative">
                    <button
                      onClick={() => setShowChapterMenu(!showChapterMenu)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        filters.chapter !== 'all'
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                      }`}
                    >
                      <span>{filters.chapter === 'all' ? '全部章节' : uniqueChapters.find(c => c.id === filters.chapter)?.title || '全部章节'}</span>
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showChapterMenu ? 'rotate-180' : ''}`} />
                    </button>

                    {/* 章节下拉菜单 */}
                    {showChapterMenu && (
                      <>
                        <div
                          className="fixed inset-0 z-10"
                          onClick={() => setShowChapterMenu(false)}
                        />
                        <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-80 overflow-y-auto">
                          <button
                            onClick={() => handleChapterChange('all')}
                            className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              filters.chapter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                            }`}
                          >
                            全部章节
                            {filters.chapter === 'all' && <ChevronDown className="w-4 h-4 rotate-180" />}
                          </button>
                          {uniqueChapters.map(chapter => (
                            <button
                              key={chapter.id}
                              onClick={() => handleChapterChange(chapter.id)}
                              className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                                filters.chapter === chapter.id ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                              }`}
                            >
                              {chapter.title}
                              {filters.chapter === chapter.id && <ChevronDown className="w-4 h-4 rotate-180" />}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
              )}

              {/* 右侧：排序与筛选 */}
              <div className="flex items-center gap-3">
                {/* 视图模式切换 - 仅自定义词库显示 */}
                {!book.is_official && (
                  <button
                    onClick={() => {
                      setViewMode(viewMode === 'learning' ? 'editing' : 'learning')
                      setSelectedWordIds(new Set())
                    }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 ${
                      viewMode === 'editing'
                        ? 'border-purple-400 bg-purple-50 text-purple-700 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-purple-300 hover:bg-slate-50'
                    }`}
                    title={viewMode === 'learning' ? '切换到编辑模式' : '切换到编辑词库'}
                  >
                    {viewMode === 'editing' ? (
                      <>
                        <Edit3 className="w-4 h-4" />
                        <span className="hidden sm:inline">恢复学习</span>
                      </>
                    ) : (
                      <>
                        <Grid3x3 className="w-4 h-4" />
                        <span className="hidden sm:inline">编辑词库</span>
                      </>
                    )}
                  </button>
                )}

                {/* 章节管理按钮 - 仅编辑模式下显示 */}
                {viewMode === 'editing' && !book.is_official && (
                  <button
                    onClick={() => setShowChapterManagement(true)}
                    className="px-4 py-2 text-sm font-semibold text-indigo-600 border-2 border-indigo-200 rounded-xl hover:border-indigo-400 hover:bg-indigo-50 transition-all duration-200 flex items-center gap-2"
                  >
                    <List className="w-4 h-4" />
                    <span className="hidden sm:inline">章节管理</span>
                  </button>
                )}

                {/* 智能导入按钮 - 仅编辑模式下显示 */}
                {viewMode === 'editing' && !book.is_official && (
                  <button
                    onClick={() => setShowSmartImport(true)}
                    className="px-4 py-2 text-sm font-semibold text-purple-600 border-2 border-purple-200 rounded-xl hover:border-purple-400 hover:bg-purple-50 transition-all duration-200 flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span className="hidden sm:inline">智能导入</span>
                  </button>
                )}

                {/* 全局隐藏中文按钮 - 仅学习模式显示 */}
                {viewMode === 'learning' && (
                  <GlobalHideButton
                    bookId={book.id}
                    onHideChange={setGlobalHideChinese}
                  />
                )}

                {/* 随机按钮 - 仅学习模式显示 */}
                {viewMode === 'learning' && (
                  <button
                    onClick={() => setSortOrder(sortOrder === 'default' ? 'random' : 'default')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      sortOrder === 'random'
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50'
                    }`}
                  >
                    <Shuffle className="w-4 h-4" />
                    随机
                  </button>
                )}

                {/* 筛选按钮 + 下拉菜单 - 仅学习模式显示 */}
                {viewMode === 'learning' && (
                  <div className="relative">
                    <button
                      onClick={() => setShowFilterMenu(!showFilterMenu)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                        filters.status !== 'all'
                          ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                          : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50'
                      }`}
                    >
                      <Filter className="w-4 h-4" />
                      {getFilterLabel(filters.status)}
                      <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${showFilterMenu ? 'rotate-180' : ''}`} />
                    </button>

                  {/* 筛选下拉菜单 */}
                  {showFilterMenu && (
                    <>
                      {/* 点击外部关闭 */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowFilterMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-slate-200 z-20 overflow-hidden">
                        <button
                          onClick={() => handleStatusChange('all')}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            filters.status === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          全部
                          {filters.status === 'all' && <ChevronDown className="w-4 h-4 rotate-180" />}
                        </button>
                        <button
                          onClick={() => handleStatusChange('new')}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            filters.status === 'new' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          未标注
                          {filters.status === 'new' && <ChevronDown className="w-4 h-4 rotate-180" />}
                        </button>
                        <button
                          onClick={() => handleStatusChange('known')}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            filters.status === 'known' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          认识
                          {filters.status === 'known' && <ChevronDown className="w-4 h-4 rotate-180 text-emerald-600" />}
                        </button>
                        <button
                          onClick={() => handleStatusChange('fuzzy')}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            filters.status === 'fuzzy' ? 'bg-amber-50 text-amber-700' : 'text-slate-700'
                          }`}
                        >
                          模糊
                          {filters.status === 'fuzzy' && <ChevronDown className="w-4 h-4 rotate-180 text-amber-600" />}
                        </button>
                        <button
                          onClick={() => handleStatusChange('unknown')}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            filters.status === 'unknown' ? 'bg-rose-50 text-rose-700' : 'text-slate-700'
                          }`}
                        >
                          不认识
                          {filters.status === 'unknown' && <ChevronDown className="w-4 h-4 rotate-180 text-rose-600" />}
                        </button>
                      </div>
                    </>
                  )}
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* 单词列表 */}
          <div className="relative min-h-[400px]">
            {/* 学习模式：卡片视图 */}
            {viewMode === 'learning' ? (
              <>
                {/* ⚡ UX优化：首次加载或翻页时显示骨架屏（至少显示1200ms） */}
                {/* 🔥 修复：当isPageChanging为true时，即使skeleton隐藏也要继续显示skeleton，避免旧数据闪现 */}
                {(isLoading && filters.page === 1) || showSkeleton || isPageChanging ? (
                  <>
                    {console.log('🎨 Rendering skeleton loader, isLoading:', isLoading, 'showSkeleton:', showSkeleton, 'isPageChanging:', isPageChanging, 'skeleton count:', initialVisibleCount)}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
                      {[...Array(initialVisibleCount)].map((_, index) => (
                        <WordCardSkeleton key={`skeleton-${index}`} />
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    <WordList
                      initialWords={displayWords}
                      bookId={book.id}
                      globalHideChinese={globalHideChinese}
                      visibleCount={visibleCount}
                      onVisibleChange={handleLoadMoreVisible}
                    />
                  </>
                )}
              </>
            ) : (
              /* 编辑模式：表格视图 */
              <>
                <WordTableEditor
                  key={wordTableRefreshKey}
                  bookId={book.id}
                  chapters={chapters}
                  onWordUpdated={() => {
                    // 刷新单词列表
                    setWordTableRefreshKey(prev => prev + 1)
                  }}
                  onWordDeleted={() => {
                    // 刷新单词列表
                    setWordTableRefreshKey(prev => prev + 1)
                  }}
                />
              </>
            )}
          </div>

          {/* 底部控制栏 - PC和竖屏都显示，翻页时也显示 */}
          {/* 🔥 修复：只要有数据或正在翻页或显示骨架屏就显示，避免底部栏闪烁 */}
          {(displayWords.length > 0 || isPageChanging || showSkeleton) && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-6 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-slate-600">
                  显示 <span className="font-semibold text-slate-900">{startIndex}-{endIndex}</span> / 共 <span className="font-semibold text-slate-900">{totalWords}</span> 个单词
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handlePageChange(Math.max(1, filters.page - 1))}
                    disabled={filters.page === 1}
                    className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all duration-200"
                  >
                    上一页
                  </button>
                  <span className="text-sm font-bold text-slate-900 px-3 py-2.5 bg-slate-50 rounded-xl">
                    {filters.page} / {totalPages}
                  </span>
                  <button
                    data-testid="next-page-button"
                    onClick={() => handlePageChange(Math.min(totalPages, filters.page + 1))}
                    disabled={filters.page === totalPages}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 筛选结果为空时的提示 */}
          {/* 🔥 修复：只有在非翻页状态且骨架屏不显示时，才显示"没有找到单词"提示 */}
          {displayWords.length === 0 && !isPageChanging && !showSkeleton && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
              <Filter className="w-16 h-16 mx-auto mb-4 text-slate-300" />
              <h3 className="text-xl font-bold text-slate-700 mb-2">没有找到符合条件的单词</h3>
              <p className="text-slate-500">请尝试切换筛选条件</p>
            </section>
          )}

        </div>
      </main>

      {/* 范围选择对话框 */}
      <ScopeSelectorModal
        isOpen={showScopeModal}
        onClose={() => setShowScopeModal(false)}
        bookId={book.id}
        bookTitle={book.title || '未命名词书'}
        practiceMode={selectedPracticeMode}
        filteredCount={displayWords.length}
        totalCount={words.length}
        filterDescription={getFilterDescription()}
        filterParams={{
          theme: filters.theme,
          scene: filters.scenario,
          status: filters.status
        }}
      />

      {/* 章节管理对话框 */}
      <ChapterManagementDialog
        isOpen={showChapterManagement}
        onClose={() => setShowChapterManagement(false)}
        bookId={book.id}
        bookTitle={book.title || '未命名词书'}
        isOfficial={book.is_official || false}
      />

      {/* 智能导入对话框 */}
      <SmartImportDialog
        isOpen={showSmartImport}
        onClose={() => setShowSmartImport(false)}
        bookId={book.id}
        bookTitle={book.title || '未命名词书'}
        chapters={chapters}
        onSuccess={() => {
          // 刷新 WordTableEditor 以显示新添加的单词
          setWordTableRefreshKey(prev => prev + 1)
        }}
      />

      {/* 批量操作栏 - 仅在学习模式下显示 */}
      {viewMode === 'learning' && selectedWordIds.size > 0 && (
        <BatchActionBar
          selectedCount={selectedWordIds.size}
          onClear={() => setSelectedWordIds(new Set())}
          bookId={book.id}
          chapters={chapters}
          onSuccess={() => {
            // 刷新页面
            router.refresh()
          }}
        />
      )}

      {/* 回到顶部按钮 */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 z-50 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-110 cursor-pointer"
          aria-label="回到顶部"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 10l7-7m0 0l7 7m-7-7v18"
            />
          </svg>
        </button>
      )}
    </div>
  )
}
