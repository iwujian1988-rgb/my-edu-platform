'use client'

import { useState, useMemo, useEffect } from 'react'
import { BookOpen, ArrowLeft, Filter, Shuffle, ChevronDown, EyeOff, Check, X, Volume2, Gamepad2, CreditCard } from 'lucide-react'
import Link from 'next/link'
import { WordList } from '@/components/WordList'
import { GlobalHideButton } from '@/components/GlobalHideButton'
import { ScopeSelectorModal } from '@/components/ScopeSelectorModal'

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
  status: 'known' | 'fuzzy' | 'unknown'
  theme?: string
  scene?: string
}

interface Book {
  id: string
  title: string
  description: string
  total_words: number
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
  const [globalHideChinese, setGlobalHideChinese] = useState(false)
  const [sortOrder, setSortOrder] = useState<SortOrder>('default')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [showFilterMenu, setShowFilterMenu] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedTheme, setSelectedTheme] = useState<string>('all')
  const [selectedScene, setSelectedScene] = useState<string>('all')
  const [showThemeMenu, setShowThemeMenu] = useState(false)
  const [showSceneMenu, setShowSceneMenu] = useState(false)

  // 范围选择对话框状态
  const [showScopeModal, setShowScopeModal] = useState(false)
  const [selectedPracticeMode, setSelectedPracticeMode] = useState<'flashcards' | 'dictation' | 'match-game'>('flashcards')

  const WORDS_PER_PAGE = 50

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

        if (statusFilter === 'new') {
          return actualStatus === 'unknown'
        }
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

  // 分页逻辑
  const totalPages = Math.ceil(filteredWords.length / WORDS_PER_PAGE)
  const startIndex = (currentPage - 1) * WORDS_PER_PAGE
  const endIndex = startIndex + WORDS_PER_PAGE
  const paginatedWords = filteredWords.slice(startIndex, endIndex)

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
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-3 sm:px-4 md:px-6 py-3 md:py-4 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>
          <div className="flex items-center justify-between">
            {/* Logo & Back */}
            <div className="flex items-center gap-3">
              <Link
                href="/"
                className="flex items-center justify-center w-10 h-10 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-700" />
              </Link>
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl">
                  <BookOpen className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-gray-900">{book.title || '未命名词书'}</h1>
                  <p className="text-xs text-gray-500">{words.length} 个单词</p>
                </div>
              </div>
              {/* 演示数据提示 */}
              {useMockData && (
                <div className="hidden md:block px-3 py-1 bg-yellow-100 border border-yellow-300 rounded-full">
                  <span className="text-xs font-semibold text-yellow-800">演示数据</span>
                </div>
              )}
            </div>

            {/* User */}
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-600 hidden sm:block">{user.email}</span>
              <Link
                href="/logout"
                className="px-4 py-2 text-sm font-bold text-gray-700 border-2 border-gray-200 rounded-xl hover:border-red-300 hover:text-red-600 transition-all"
              >
                退出
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-3 sm:px-4 md:px-6 py-6 md:py-8">
        <div className="w-full mx-auto" style={{ maxWidth: '1400px' }}>

          {/* 顶部筛选栏 */}
          <section className="clay-card p-4 md:p-6 mb-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* 左侧：主题/场景筛选 */}
              <div className="flex items-center gap-3 flex-wrap">
                {/* 主题选择器 */}
                <div className="relative">
                  <button
                    onClick={() => setShowThemeMenu(!showThemeMenu)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                      selectedTheme !== 'all'
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-700 hover:border-purple-300'
                    }`}
                  >
                    <span>{selectedTheme === 'all' ? '全部主题' : selectedTheme}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showThemeMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 主题下拉菜单 */}
                  {showThemeMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowThemeMenu(false)}
                      />
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-20 max-h-80 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedTheme('all')
                            setShowThemeMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            selectedTheme === 'all' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                          }`}
                        >
                          全部主题
                          {selectedTheme === 'all' && <Check className="w-4 h-4" />}
                        </button>
                        {uniqueThemes.map(theme => (
                          <button
                            key={theme}
                            onClick={() => {
                              setSelectedTheme(theme)
                              setShowThemeMenu(false)
                            }}
                            className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                              selectedTheme === theme ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                            }`}
                          >
                            {theme}
                            {selectedTheme === theme && <Check className="w-4 h-4" />}
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
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-colors ${
                      selectedScene !== 'all'
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-700 hover:border-purple-300'
                    } ${availableScenes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span>{selectedScene === 'all' ? '全部场景' : selectedScene}</span>
                    <ChevronDown className={`w-4 h-4 transition-transform ${showSceneMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 场景下拉菜单 */}
                  {showSceneMenu && availableScenes.length > 0 && (
                    <>
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowSceneMenu(false)}
                      />
                      <div className="absolute left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-200 z-20 max-h-80 overflow-y-auto">
                        <button
                          onClick={() => {
                            setSelectedScene('all')
                            setShowSceneMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            selectedScene === 'all' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                          }`}
                        >
                          全部场景
                          {selectedScene === 'all' && <Check className="w-4 h-4" />}
                        </button>
                        {availableScenes.map(scene => (
                          <button
                            key={scene}
                            onClick={() => {
                              setSelectedScene(scene)
                              setShowSceneMenu(false)
                            }}
                            className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                              selectedScene === scene ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                            }`}
                          >
                            {scene}
                            {selectedScene === scene && <Check className="w-4 h-4" />}
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
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                    sortOrder === 'random'
                      ? 'border-purple-400 bg-purple-50 text-purple-700'
                      : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                  随机
                </button>

                {/* 筛选按钮 + 下拉菜单 */}
                <div className="relative">
                  <button
                    onClick={() => setShowFilterMenu(!showFilterMenu)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                      statusFilter !== 'all'
                        ? 'border-purple-400 bg-purple-50 text-purple-700'
                        : 'border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600'
                    }`}
                  >
                    <Filter className="w-4 h-4" />
                    {getFilterLabel()}
                    <ChevronDown className={`w-4 h-4 transition-transform ${showFilterMenu ? 'rotate-180' : ''}`} />
                  </button>

                  {/* 筛选下拉菜单 */}
                  {showFilterMenu && (
                    <>
                      {/* 点击外部关闭 */}
                      <div
                        className="fixed inset-0 z-10"
                        onClick={() => setShowFilterMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-40 bg-white rounded-xl shadow-xl border border-gray-200 z-20 overflow-hidden">
                        <button
                          onClick={() => {
                            setStatusFilter('all')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            statusFilter === 'all' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                          }`}
                        >
                          全部
                          {statusFilter === 'all' && <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('new')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            statusFilter === 'new' ? 'bg-purple-50 text-purple-700' : 'text-gray-700'
                          }`}
                        >
                          未标注
                          {statusFilter === 'new' && <Check className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('known')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            statusFilter === 'known' ? 'bg-green-50 text-green-700' : 'text-gray-700'
                          }`}
                        >
                          认识
                          {statusFilter === 'known' && <Check className="w-4 h-4 text-green-600" />}
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('fuzzy')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            statusFilter === 'fuzzy' ? 'bg-yellow-50 text-yellow-700' : 'text-gray-700'
                          }`}
                        >
                          模糊
                          {statusFilter === 'fuzzy' && <Check className="w-4 h-4 text-yellow-600" />}
                        </button>
                        <button
                          onClick={() => {
                            setStatusFilter('unknown')
                            setShowFilterMenu(false)
                          }}
                          className={`w-full px-4 py-3 text-left text-sm font-semibold flex items-center justify-between hover:bg-gray-50 transition-colors ${
                            statusFilter === 'unknown' ? 'bg-red-50 text-red-700' : 'text-gray-700'
                          }`}
                        >
                          不认识
                          {statusFilter === 'unknown' && <Check className="w-4 h-4 text-red-600" />}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* 练习模式选择 */}
          <section className="mb-6">
            <div className="clay-card p-6 md:p-8 mb-6">
              <h2 className="text-2xl md:text-3xl font-black text-gradient-lilac mb-2">
                选择练习模式 🎯
              </h2>
              <p className="text-gray-700 font-semibold mb-6">
                选择你喜欢的练习模式开始学习吧！
              </p>
            </div>

            {/* 练习模式网格 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 卡片背单词 */}
              <button
                onClick={() => handlePracticeModeClick('flashcards')}
                className="group text-left"
              >
                <div className="clay-card-lilac p-8 h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="clay-icon p-4 mb-6 group-hover:scale-110 transition-transform">
                    <CreditCard className="w-12 h-12 text-gradient-lilac" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    卡片背单词
                  </h3>
                  <p className="text-base text-gray-700 font-semibold mb-6 flex-1">
                    经典记忆模式，点击翻转卡片，快速记忆单词
                  </p>

                  <div className="clay-button-primary text-center py-3 font-black">
                    开始背诵
                  </div>
                </div>
              </button>

              {/* 听写模式 */}
              <button
                onClick={() => handlePracticeModeClick('dictation')}
                className="group text-left"
              >
                <div className="clay-card-mint p-8 h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="clay-icon p-4 mb-6 group-hover:scale-110 transition-transform">
                    <Volume2 className="w-12 h-12 text-gradient-mint" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    听写模式
                  </h3>
                  <p className="text-base text-gray-700 font-semibold mb-6 flex-1">
                    听音拼写，强化记忆，检验学习成果
                  </p>

                  <div className="clay-button-primary text-center py-3 font-black">
                    开始听写
                  </div>
                </div>
              </button>

              {/* 消消乐 */}
              <button
                onClick={() => handlePracticeModeClick('match-game')}
                className="group text-left"
              >
                <div className="clay-card-peach p-8 h-full flex flex-col shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
                  <div className="clay-icon p-4 mb-6 group-hover:scale-110 transition-transform">
                    <Gamepad2 className="w-12 h-12 text-gradient-peach" />
                  </div>

                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    消消乐
                  </h3>
                  <p className="text-base text-gray-700 font-semibold mb-6 flex-1">
                    趣味配对游戏，轻松学习，寓教于乐
                  </p>

                  <div className="clay-button-primary text-center py-3 font-black">
                    开始游戏
                  </div>
                </div>
              </button>
            </div>

            {/* 学习小贴士 */}
            <div className="clay-card-blue p-6 mt-6">
              <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                💡 学习小贴士
              </h3>
              <ul className="space-y-2 text-sm text-gray-700 font-semibold">
                <li>• 建议每天学习20-30个单词，保持连续性</li>
                <li>• 尝试不同练习模式，找到最适合你的方式</li>
                <li>• 标记"不认识"的单词会自动加入错题本</li>
                <li>• 定期复习错题本中的单词，巩固记忆</li>
              </ul>
            </div>
          </section>

          {/* 单词列表 */}
          <WordList
            initialWords={paginatedWords}
            bookId={book.id}
            globalHideChinese={globalHideChinese}
          />

          {/* 底部控制栏 - 仅在单词数 > 50 时显示 */}
          {filteredWords.length > WORDS_PER_PAGE && (
            <section className="clay-card p-4 md:p-6 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="text-sm text-gray-600">
                  显示 {startIndex + 1}-{Math.min(endIndex, filteredWords.length)} / 共 {filteredWords.length} 个单词
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    上一页
                  </button>
                  <span className="text-sm font-semibold text-gray-900 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-400 to-green-500 text-white text-sm font-semibold hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  >
                    下一页
                  </button>
                </div>
              </div>
            </section>
          )}

          {/* 筛选结果为空时的提示 */}
          {filteredWords.length === 0 && (
            <section className="clay-card p-12 text-center">
              <Filter className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-bold text-gray-700 mb-2">没有找到符合条件的单词</h3>
              <p className="text-gray-500">请尝试切换筛选条件</p>
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
    </div>
  )
}
