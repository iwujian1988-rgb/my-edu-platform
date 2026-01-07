'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { BookOpen, ArrowLeft, Filter, Shuffle, ChevronDown, Lightbulb, Trash2, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { WordList } from '@/components/WordList'
import { GlobalHideButton } from '@/components/GlobalHideButton'
import { ScopeSelectorModal } from '@/components/ScopeSelectorModal'
import { BookIcon } from '@/components/BookIcon'
import { saveResumeState } from '@/lib/resumeState'

interface Word {
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
  status: 'known' | 'fuzzy' | 'unknown' | 'new'
  theme?: string
  scene?: string
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
  words: Word[]
  user: any
  useMockData: boolean
}

type SortOrder = 'default' | 'random'
type StatusFilter = 'all' | 'new' | 'known' | 'fuzzy' | 'unknown'

export function BookDetailPageClient({ book, words, user, useMockData }: BookDetailPageClientProps) {
  const searchParams = useSearchParams()

  const [globalHideChinese, setGlobalHideChinese] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTheme, setSelectedTheme] = useState<string>('all')
  const [selectedScene, setSelectedScene] = useState<string>('all')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showSceneMenu, setShowSceneMenu] = useState(false)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const [hasRestoredState, setHasRestoredState] = useState(false)
  const isRestoringRef = useRef(false) // 用于标记是否正在恢复状态

  // 范围选择对话框状态
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [selectedPracticeMode, setSelectedPracticeMode] = useState<'flashcards' | 'dictation' | 'match-game'>('flashcards')

  // 删除词库状态
  const [showDeleteConfirm1, setShowDeleteConfirm1] = useState(false)
  const [showDeleteConfirm2, setShowDeleteConfirm2] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')
  const router = useRouter()

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

  // 随机选择一条学习小贴士
  const tips = [
    '• 建议每天学习20-30个单词，保持连续性',
    '• 尝试不同练习模式，找到最适合你的方式',
    '• 标记"不认识"的单词会自动加入错题本'
  ]
  const [randomTip, setRandomTip] = useState(tips[0]) // 初始值固定，避免hydration错误

  // 在客户端随机选择
  useEffect(() => {
    setRandomTip(tips[Math.floor(Math.random() * tips.length)])
  }, [])

  // ⭐ 保存当前浏览状态（筛选条件 + 页码）
  const saveCurrentState = async () => {
    // 如果正在恢复状态，不保存
    if (isRestoringRef.current) {
      console.log('⏭️ Skipping save during restoration')
      return
    }

    console.log('💾 Saving word list state:', {
      theme: selectedTheme,
      scenario: selectedScene,
      status: statusFilter,
      page: currentPage
    })

    await saveResumeState(book.id, 'word-list', {
      filters: {
        theme: selectedTheme,
        scenario: selectedScene,
        status: statusFilter
      },
      page: currentPage
    })
  }

  // ⭐ 当筛选条件或页码改变时保存状态
  useEffect(() => {
    // 如果正在恢复状态，不保存
    if (isRestoringRef.current) return

    // 使用更短的防抖时间（100ms），确保用户快速操作也能保存
    const timeoutId = setTimeout(() => {
      saveCurrentState()
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [selectedTheme, selectedScene, statusFilter, currentPage])

  // ⭐ 页面卸载时立即保存状态
  useEffect(() => {
    return () => {
      // 组件卸载时立即保存（不使用 beforeunload）
      console.log('💾 Saving state on unmount')
      saveCurrentState()
    }
  }, [selectedTheme, selectedScene, statusFilter, currentPage])

  const WORDS_PER_PAGE = 50

  // 监听滚动，显示/隐藏回到顶部按钮
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // ⭐ 恢复上次浏览状态（从 URL 参数）
  useEffect(() => {
    const theme = searchParams.get('theme')
    const scene = searchParams.get('scenario')
    const status = searchParams.get('status')
    const page = searchParams.get('page')

    // 如果 URL 带有参数，说明是从"继续学习"跳转过来的
    if (theme || scene || status || page) {
      console.log('📍 Restoring browsing state from URL:', { theme, scene, status, page })

      // 标记开始恢复状态
      isRestoringRef.current = true

      // 批量设置状态
      const updates: Promise<void>[] = []
      if (theme && theme !== 'all') {
        updates.push(Promise.resolve().then(() => setSelectedTheme(theme)))
      }
      if (scene && scene !== 'all') {
        updates.push(Promise.resolve().then(() => setSelectedScene(scene)))
      }
      if (status && status !== 'all') {
        updates.push(Promise.resolve().then(() => setStatusFilter(status as StatusFilter)))
      }
      if (page) {
        updates.push(Promise.resolve().then(() => setCurrentPage(parseInt(page))))
      }

      // 等待所有状态设置完成
      Promise.all(updates).then(() => {
        // 延迟标记恢复完成，确保 React 已经处理完状态更新
        setTimeout(() => {
          isRestoringRef.current = false
          setHasRestoredState(true)
          console.log('✅ State restoration completed')
        }, 200)
      })
    } else {
      // 没有 URL 参数，直接标记为已恢复
      isRestoringRef.current = false
      setHasRestoredState(true)
    }
  }, [searchParams])

  // 滚动到顶部
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // 提取所有唯一的主题和场景
  const { uniqueThemes, uniqueScenes } = useMemo(() => {
    const themes = new Set<string>()
    const scenes = new Set<string>()

    words.forEach(word => {
      if (word.theme) themes.add(word.theme)
      if (word.scene) scenes.add(word.scene)
    })

    return {
      uniqueThemes: Array.from(themes).sort(),
      uniqueScenes: Array.from(scenes).sort()
    }
  }, [words])

  // 根据选中的主题筛选场景
  const availableScenes = useMemo(() => {
    if (selectedTheme === 'all') {
      return uniqueScenes
    }
    const scenesInTheme = new Set<string>()
    words.forEach(word => {
      if (word.theme === selectedTheme && word.scene) {
        scenesInTheme.add(word.scene)
      }
    })
    return Array.from(scenesInTheme).sort()
  }, [selectedTheme, words, uniqueScenes])

  // 随机打乱数组
  const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }

  // 应用筛选和排序
  const filteredWords = useMemo(() => {
    let result = [...words]

    // 从 localStorage 读取用户标记的状态（如果存在）
    let localStorageStatus: Record<string, 'known' | 'fuzzy' | 'unknown'> = {}
    if (typeof window !== 'undefined') {
      try {
        const localKey = `word-progress-${book.id}`
        const localData = localStorage.getItem(localKey)
        if (localData) {
          localStorageStatus = JSON.parse(localData)
          console.log('📦 [Filter] Using localStorage status:', localStorageStatus)
        }
      } catch (error) {
        console.error('Failed to read localStorage for filtering:', error)
      }
    }

    // 1. 主题筛选
    if (selectedTheme !== 'all') {
      result = result.filter(word => word.theme === selectedTheme)
    }

    // 2. 场景筛选
    if (selectedScene !== 'all') {
      result = result.filter(word => word.scene === selectedScene)
    }

    // 3. 状态筛选 - 使用 localStorage 中的状态（优先）或原始状态
    if (statusFilter !== 'all') {
      result = result.filter(word => {
        // 优先使用 localStorage 中保存的状态
        const actualStatus = localStorageStatus[word.id] || word.status

        return actualStatus === statusFilter
      })
    }

    // 4. 排序
    if (sortOrder === 'random') {
      result = shuffleArray(result)
    }

    console.log(`✅ [Filter] Filtered to ${result.length} words (statusFilter=${statusFilter})`)
    return result
  }, [words, selectedTheme, selectedScene, statusFilter, sortOrder, book.id])

  // 分页逻辑 - 仅在PC端使用分页，移动端/平板端显示所有单词
  const totalPages = Math.ceil(filteredWords.length / WORDS_PER_PAGE)
  const startIndex = (currentPage - 1) * WORDS_PER_PAGE
  const endIndex = startIndex + WORDS_PER_PAGE

  // 检测是否为移动端/平板端（通过窗口宽度）
  // 初始值设为true，确保在服务端渲染时也能显示所有单词
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(true)

  useEffect(() => {
    const checkDevice = () => {
      const isMobile = window.innerWidth <= 1024 // lg断点是1024px，包含1024px
      setIsMobileOrTablet(isMobile)
      console.log('📱 Device check:', window.innerWidth, 'isMobile:', isMobile)
    }

    // 初始检测
    checkDevice()

    // 监听窗口大小变化
    window.addEventListener('resize', checkDevice)
    return () => window.removeEventListener('resize', checkDevice)
  }, [])

  // 移动端/平板端显示所有单词，PC端使用分页
  const paginatedWords = isMobileOrTablet ? filteredWords : filteredWords.slice(startIndex, endIndex)

  // 调试日志
  console.log('📊 Word display:', {
    isMobileOrTablet,
    totalWords: filteredWords.length,
    displayWords: paginatedWords.length,
    startIndex,
    endIndex
  })

  // 重置页码当筛选条件改变时
  useEffect(() => {
    setCurrentPage(1)
  }, [statusFilter, sortOrder, selectedTheme, selectedScene])

  // 当主题改变时，重置场景选择
  useEffect(() => {
    setSelectedScene('all')
  }, [selectedTheme])

  // 获取筛选标签文本
  const getFilterLabel = () => {
    const labels: Record<StatusFilter, string> = {
      'all': '全部',
      'new': '未标注',
      'known': '认识',
      'fuzzy': '模糊',
      'unknown': '不认识'
    }
    return labels[statusFilter]
  }

  // 生成筛选描述文本
  const getFilterDescription = () => {
    const parts = []
    if (selectedTheme !== 'all') parts.push(selectedTheme)
    if (selectedScene !== 'all') parts.push(selectedScene)
    if (statusFilter !== 'all') parts.push(getFilterLabel())

    if (parts.length === 0) return '全部单词'
    return parts.join(' - ')
  }

  // 打开范围选择对话框
  const handlePracticeModeClick = (mode: 'flashcards' | 'dictation' | 'match-game') => {
    setSelectedPracticeMode(mode)
    setShowScopeModal(true)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-lg border-b border-slate-200 shadow-sm">
        <div className="w-full mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
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
                  <p className="text-xs text-slate-500">{words.length} 个单词</p>
                </div>
              </div>
              {/* 演示数据提示 */}
              {useMockData && (
                <div className="hidden md:block px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-full">
                  <span className="text-xs font-semibold text-amber-700">演示数据</span>
                </div>
              )}
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
      <main className="px-4 sm:px-6 lg:px-8 py-8">
        <div className="w-full mx-auto max-w-7xl">

          {/* 练习模式 + 学习小贴士 */}
          <div className="flex flex-col md:flex-row gap-4 mb-6 items-end">
            {/* 练习模式按钮 - 左侧 */}
            <div className="flex gap-3">
              {/* 卡片背单词 */}
              <button
                onClick={() => handlePracticeModeClick('flashcards')}
                className="group flex-1 md:flex-none hover:scale-[1.02] transition-transform duration-200"
                style={{ width: 'auto', minWidth: '160px' }}
              >
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-100 hover:border-indigo-200 p-4 h-full flex flex-col items-center text-center transition-all duration-300 cursor-pointer">
                  {/* 原创CSS图标 - 卡片翻转 */}
                  <div className="relative w-10 h-10 mb-2">
                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg"></div>
                    <div className="absolute inset-0 border-2 border-indigo-500 rounded-lg transform rotate-180 opacity-50"></div>
                    <div className="absolute inset-2 bg-indigo-100 rounded flex items-center justify-center">
                      <span className="text-indigo-600 font-bold text-lg">F</span>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    卡片背单词
                  </h3>
                </div>
              </button>

              {/* 听写模式 */}
              <button
                onClick={() => handlePracticeModeClick('dictation')}
                className="group flex-1 md:flex-none hover:scale-[1.02] transition-transform duration-200"
                style={{ width: 'auto', minWidth: '160px' }}
              >
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-100 hover:border-emerald-200 p-4 h-full flex flex-col items-center text-center transition-all duration-300 cursor-pointer">
                  {/* 原创CSS图标 - 声音波 */}
                  <div className="relative w-10 h-10 flex items-center justify-center mb-2">
                    <div className="flex items-end gap-0.5">
                      <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                      <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                      <div className="w-1 h-7 bg-emerald-500 rounded-full"></div>
                      <div className="w-1 h-5 bg-emerald-500 rounded-full"></div>
                      <div className="w-1 h-3 bg-emerald-500 rounded-full"></div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    听写模式
                  </h3>
                </div>
              </button>

              {/* 消消乐 */}
              <button
                onClick={() => handlePracticeModeClick('match-game')}
                className="group flex-1 md:flex-none hover:scale-[1.02] transition-transform duration-200"
                style={{ width: 'auto', minWidth: '160px' }}
              >
                <div className="bg-white rounded-xl shadow-sm hover:shadow-md border border-slate-100 hover:border-rose-200 p-4 h-full flex flex-col items-center text-center transition-all duration-300 cursor-pointer">
                  {/* 原创CSS图标 - 拼图块 */}
                  <div className="relative w-10 h-10 mb-2">
                    <div className="absolute top-0 left-0 w-4 h-4 border-2 border-rose-500 rounded"></div>
                    <div className="absolute top-0 right-0 w-4 h-4 border-2 border-rose-500 rounded"></div>
                    <div className="absolute bottom-0 left-0 w-4 h-4 border-2 border-rose-500 rounded"></div>
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-2 border-rose-500 rounded"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-2 h-2 bg-rose-500 rounded-sm"></div>
                    </div>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 mb-2">
                    消消乐
                  </h3>
                </div>
              </button>
            </div>

            {/* 学习小贴士 - 右侧 */}
            <div className="md:ml-auto text-right">
              <h3 className="text-sm font-semibold text-slate-600 mb-2 flex items-center gap-2 justify-end">
                学习小贴士
                <Lightbulb className="w-4 h-4 text-slate-500" />
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">{randomTip}</p>
            </div>
          </div>

          {/* 顶部筛选栏 */}
          <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* 左侧：主题/场景筛选 */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* 主题选择器 */}
                <div className="relative">
                  <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      selectedTheme !== 'all'
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                    }`}
                  >
                    <span>{selectedTheme === 'all' ? '全部主题' : selectedTheme}</span>
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
                          onClick={() => {
                            setSelectedTheme('all')
                            setShowThemeMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            selectedTheme === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          全部主题
                          {selectedTheme === 'all' && <ChevronDown className="w-4 h-4 rotate-180" />}
                        </button>
                        {uniqueThemes.map(theme => (
                          <button
                            key={theme}
                            onClick={() => {
                              setSelectedTheme(theme)
                              setShowThemeMenu(false)
                            }}
                            className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              selectedTheme === theme ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                            }`}
                          >
                            {theme}
                            {selectedTheme === theme && <ChevronDown className="w-4 h-4 rotate-180" />}
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
                      selectedScene !== 'all'
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-slate-50'
                    } ${availableScenes.length === 0 ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span>{selectedScene === 'all' ? '全部场景' : selectedScene}</span>
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
                          onClick={() => {
                            setSelectedScene('all')
                            setShowSceneMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            selectedScene === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          全部场景
                          {selectedScene === 'all' && <ChevronDown className="w-4 h-4 rotate-180" />}
                        </button>
                        {availableScenes.map(scene => (
                          <button
                            key={scene}
                            onClick={() => {
                              setSelectedScene(scene)
                              setShowSceneMenu(false)
                            }}
                            className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                              selectedScene === scene ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                            }`}
                          >
                            {scene}
                            {selectedScene === scene && <ChevronDown className="w-4 h-4 rotate-180" />}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* 右侧：排序与筛选 */}
              <div className="flex items-center gap-3">
                {/* 全局隐藏中文按钮 */}
                <GlobalHideButton
                  bookId={book.id}
                  onHideChange={setGlobalHideChinese}
                />

                {/* 随机按钮 */}
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

                {/* 筛选按钮 + 下拉菜单 */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all duration-200 cursor-pointer ${
                      statusFilter !== 'all'
                        ? 'border-indigo-400 bg-indigo-50 text-indigo-700 shadow-sm'
                        : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    {getFilterLabel()}
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
                          onClick={() => {
                            setStatusFilter('all')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            statusFilter === 'all' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          全部
                          {statusFilter === 'all' && <ChevronDown className="w-4 h-4 rotate-180" />}
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('new')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            statusFilter === 'new' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-700'
                          }`}
                        >
                          未标注
                          {statusFilter === 'new' && <ChevronDown className="w-4 h-4 rotate-180" />}
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('known')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            statusFilter === 'known' ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
                          }`}
                        >
                          认识
                          {statusFilter === 'known' && <ChevronDown className="w-4 h-4 rotate-180 text-emerald-600" />}
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('fuzzy')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            statusFilter === 'fuzzy' ? 'bg-amber-50 text-amber-700' : 'text-slate-700'
                          }`}
                        >
                          模糊
                          {statusFilter === 'fuzzy' && <ChevronDown className="w-4 h-4 rotate-180 text-amber-600" />}
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('unknown')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors cursor-pointer ${
                            statusFilter === 'unknown' ? 'bg-rose-50 text-rose-700' : 'text-slate-700'
                          }`}
                        >
                          不认识
                          {statusFilter === 'unknown' && <ChevronDown className="w-4 h-4 rotate-180 text-rose-600" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 单词列表 */}
          <div>
            <WordList
              initialWords={paginatedWords}
              bookId={book.id}
              globalHideChinese={globalHideChinese}
            />
          </div>

          {/* 底部控制栏 - 仅在PC端且单词数 > 50 时显示 */}
          {!isMobileOrTablet && filteredWords.length > WORDS_PER_PAGE && (
            <section className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mt-6 hidden md:block">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-slate-600">
                  显示 <span className="font-semibold text-slate-900">{startIndex + 1}-{Math.min(endIndex, filteredWords.length)}</span> / 共 <span className="font-semibold text-slate-900">{filteredWords.length}</span> 个单词
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2.5 rounded-xl border-2 border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white transition-all duration-200"
                  >
                    上一页
                  </button>
                  <span className="text-sm font-bold text-slate-900 px-3 py-2.5 bg-slate-50 rounded-xl">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 筛选结果为空时的提示 */}
          {filteredWords.length === 0 && (
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
        practiceMode={selectedPracticeMode}
        filteredCount={filteredWords.length}
        totalCount={words.length}
        filterDescription={getFilterDescription()}
        filterParams={{
          theme: selectedTheme,
          scene: selectedScene,
          status: statusFilter
        }}
      />

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
