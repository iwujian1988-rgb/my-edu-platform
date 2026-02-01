'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { X, Check, Search, ArrowRight, List, X as XIcon, Star, FilePlus, CheckCircle2, BookX } from 'lucide-react'
import type { Book } from '@/types/book'

// 最近记录类型
interface RecentRecord {
  id: string
  book_id: string
  book_title: string
  scope: string
  last_practice_at: string
  practice_count: number
}

// Neo-Brutalism 风格的 Icon 组件
function ScopeIcon({ type, isSelected }: { type: string; isSelected: boolean }) {
  const iconSize = isSelected ? 'w-8 h-8' : 'w-7 h-7'

  switch (type) {
    case 'all':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded`} />
          <div className={`relative bg-gray-100 border-2 border-black ${iconSize} rounded flex items-center justify-center`}>
            <List className="w-4 h-4 text-black" strokeWidth={3} />
          </div>
        </div>
      )

    case 'unknown':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded`} />
          <div className={`relative bg-red-100 border-2 border-black ${iconSize} rounded flex items-center justify-center`}>
            <XIcon className="w-4 h-4 text-red-600" strokeWidth={3.5} />
          </div>
        </div>
      )

    case 'fuzzy':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded`} />
          <div className={`relative bg-yellow-100 border-2 border-black ${iconSize} rounded flex items-center justify-center`}>
            <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" strokeWidth={3} />
          </div>
        </div>
      )

    case 'new':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded`} />
          <div className={`relative bg-blue-100 border-2 border-black ${iconSize} rounded flex items-center justify-center`}>
            <FilePlus className="w-4 h-4 text-blue-600" strokeWidth={3} />
          </div>
        </div>
      )

    case 'known':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded`} />
          <div className={`relative bg-green-100 border-2 border-black ${iconSize} rounded flex items-center justify-center`}>
            <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={3} />
          </div>
        </div>
      )

    case 'mistakes':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded`} />
          <div className={`relative bg-purple-100 border-2 border-black ${iconSize} rounded flex items-center justify-center`}>
            <BookX className="w-4 h-4 text-purple-600" strokeWidth={3} />
          </div>
        </div>
      )

    default:
      return null
  }
}

// 范围选项配置
const SCOPE_OPTIONS = [
  {
    key: 'all',
    label: '全部单词',
    description: '学习词库中的所有单词',
    bgColor: 'bg-gray-50',
    selectedBgColor: 'bg-[#B4F416]',
  },
  {
    key: 'unknown',
    label: '不认识',
    description: '标记为"不认识"的单词',
    bgColor: 'bg-red-50',
    selectedBgColor: 'bg-[#B4F416]',
    isDanger: true,
  },
  {
    key: 'fuzzy',
    label: '模糊的',
    description: '认识但不牢固的单词',
    bgColor: 'bg-yellow-50',
    selectedBgColor: 'bg-[#B4F416]',
  },
  {
    key: 'new',
    label: '未标注',
    description: '尚未标记状态的单词',
    bgColor: 'bg-blue-50',
    selectedBgColor: 'bg-[#B4F416]',
  },
  {
    key: 'known',
    label: '认识的',
    description: '已经掌握的单词',
    bgColor: 'bg-green-50',
    selectedBgColor: 'bg-[#B4F416]',
  },
  {
    key: 'mistakes',
    label: '错词本',
    description: '曾经出错的单词',
    bgColor: 'bg-purple-50',
    selectedBgColor: 'bg-[#B4F416]',
  },
]

interface BookSelectorModalProps {
  books: Book[]
  onClose: () => void
  userId?: string
  initialScopeStats?: Record<string, any>  // 🔧 性能优化：缓存统计信息
}

export function BookSelectorModal({ books, onClose, userId, initialScopeStats }: BookSelectorModalProps) {
  // Mobile responsive modal with two-step wizard
  const router = useRouter()
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedScope, setSelectedScope] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([])
  const [scopeWordCounts, setScopeWordCounts] = useState<Record<string, number>>({})

  // 📱 移动端分步交互：step 1 = 选择词库, step 2 = 选择范围
  const [mobileStep, setMobileStep] = useState<1 | 2>(1)

  // 获取最近打字记录（限制为3个）
  useEffect(() => {
    const fetchRecentRecords = async () => {
      if (!userId) return

      try {
        const response = await fetch('/api/typing/recent')
        if (!response.ok) return

        const data = await response.json()
        // 🔧 只取前2个
        setRecentRecords((data.records || []).slice(0, 2))
      } catch (error) {
        console.error('[RecentRecords] Failed to fetch:', error)
      }
    }

    fetchRecentRecords()
  }, [userId])

  // 当选中书籍时，获取各scope的单词数量
  useEffect(() => {
    if (!selectedBook) return

    // 🔧 性能优化：优先使用缓存的统计信息
    if (initialScopeStats && initialScopeStats[selectedBook.id]) {
      setScopeWordCounts(initialScopeStats[selectedBook.id])
      return
    }

    const fetchScopeCounts = async () => {
      try {
        const res = await fetch(`/api/books/${selectedBook.id}/words/scope-stats`)

        if (res.ok) {
          const data = await res.json()
          if (data.success && data.data) {
            setScopeWordCounts(data.data)
          } else {
            setScopeWordCounts({ all: selectedBook.total_words || 0 })
          }
        } else {
          setScopeWordCounts({ all: selectedBook.total_words || 0 })
        }
      } catch (error) {
        console.error('[ScopeCounts] Error:', error)
        setScopeWordCounts({ all: selectedBook.total_words || 0 })
      }
    }

    fetchScopeCounts()
  }, [selectedBook, initialScopeStats])

  // 辅助函数：从书名提取大字代码
  const getBookCode = (title: string | undefined): string => {
    if (!title) return 'BK'
    const match = title.match(/^([A-Z]+-?[A-Z]*)/)
    if (match) return match[1].replace('-', '')
    return title.substring(0, 2).toUpperCase()
  }

  // 过滤书籍
  const filteredBooks = useMemo(() => {
    if (!searchQuery) return books
    const query = searchQuery.toLowerCase()
    return books.filter(book =>
      book.title?.toLowerCase().includes(query) ||
      book.description?.toLowerCase().includes(query)
    )
  }, [books, searchQuery])

  // 📱 移动端：选择词库后进入第二步
  const handleMobileSelectBook = (book: Book) => {
    setSelectedBook(book)
    setMobileStep(2)
  }

  // 📱 移动端：返回第一步
  const handleMobileBack = () => {
    setMobileStep(1)
    setSelectedScope('all')
  }

  // 开始学习
  const handleStartLearning = async () => {
    if (!selectedBook) return

    // 保存最近打字记录
    if (userId) {
      try {
        await fetch('/api/typing/recent', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookId: selectedBook.id,
            scope: selectedScope
          })
        })
      } catch (error) {
        console.error('[RecentRecords] Failed to save:', error)
      }
    }

    const url = `/practice?bookId=${selectedBook.id}&scope=${selectedScope}`
    onClose()
    router.push(url)
  }

  return (
    <>
      {/* 📱 移动端：全屏分步式交互 */}
      <div className="lg:hidden fixed inset-0 z-50 bg-white dark:bg-gray-900 flex flex-col">
        {/* 移动端头部 */}
        <div className="flex items-center justify-between p-4 border-b-2 border-black bg-[#B4F416] dark:bg-lime-600">
          {mobileStep === 2 && (
            <button onClick={handleMobileBack} className="p-2 mr-2 border-2 border-black bg-white dark:bg-gray-800 rounded text-black dark:text-white">
              ← 返回
            </button>
          )}
          <h2 className="font-black text-lg flex-1 text-center text-black dark:text-white">
            {mobileStep === 1 ? '选择词库' : '选择范围'}
          </h2>
          <button onClick={onClose} className="p-2 border-2 border-black bg-white dark:bg-gray-800 rounded text-black dark:text-white">
            ✕
          </button>
        </div>

        {/* 移动端内容区 */}
        <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-900">
          {mobileStep === 1 ? (
            <>
              {/* 第一步：词库列表 */}
              {/* 最近学习区域 */}
              {recentRecords.length > 0 && (
                <>
                  <div className="mb-4">
                    <div className="font-black text-sm mb-3 text-gray-900 dark:text-gray-100">
                      最近学习
                    </div>
                    <div className="space-y-3">
                      {recentRecords.map((record) => {
                        const scopeOption = SCOPE_OPTIONS.find(opt => opt.key === record.scope)
                        const scopeLabel = scopeOption?.label || record.scope

                        return (
                          <button
                            key={record.id}
                            onClick={async () => {
                              const book = books.find(b => b.id === record.book_id)
                              if (book) {
                                // 保存最近打字记录
                                if (userId) {
                                  try {
                                    await fetch('/api/typing/recent', {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        bookId: book.id,
                                        scope: record.scope
                                      })
                                    })
                                  } catch (error) {
                                    console.error('[RecentRecords] Failed to save:', error)
                                  }
                                }
                                // 直接跳转到练习页面
                                onClose()
                                router.push(`/practice?bookId=${book.id}&scope=${record.scope}`)
                              }
                            }}
                            className="w-full flex items-center justify-between p-3 border-2 border-black dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all"
                          >
                            <div className="flex flex-col flex-1 text-left">
                              <div className="font-black text-sm text-gray-900 dark:text-gray-100">
                                {record.book_title}
                              </div>
                              <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-1">
                                {scopeLabel}
                              </div>
                            </div>
                            <div className="w-7 h-7 flex items-center justify-center bg-black dark:bg-lime-500 text-white rounded">
                              <ArrowRight className="w-4 h-4" strokeWidth={3} />
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}

              {/* 全部词库区域 */}
              <div>
                <div className="font-black text-sm mb-3 text-gray-900 dark:text-gray-100">
                  全部词库
                </div>
                <div className="space-y-3">
                  {filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => handleMobileSelectBook(book)}
                      className="w-full p-4 border-2 border-black dark:border-gray-600 rounded bg-white dark:bg-gray-800 hover:bg-[#B4F416] dark:hover:bg-lime-500/20 text-left transition-all"
                    >
                      <div className="font-black text-base text-gray-900 dark:text-gray-100">{book.title}</div>
                      <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {book.total_words?.toLocaleString() || 0} 词
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 第二步：选择范围 */}
              <div className="mb-4 p-3 bg-gray-50 dark:bg-gray-800 border-2 border-black dark:border-gray-600 rounded">
                <div className="font-black text-sm text-gray-900 dark:text-gray-100">{selectedBook?.title}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {SCOPE_OPTIONS.map((scope) => {
                  const wordCount = scopeWordCounts[scope.key] ?? 0
                  const isSelected = selectedScope === scope.key
                  return (
                    <button
                      key={scope.key}
                      onClick={() => setSelectedScope(scope.key)}
                      disabled={wordCount === 0}
                      className={`p-4 border-2 border-black dark:border-gray-600 rounded flex flex-col items-center gap-2 transition-all ${
                        isSelected ? 'bg-[#B4F416] dark:bg-lime-500/30 shadow-[2px_2px_0px_0px_#000]' : 'bg-white dark:bg-gray-800'
                      } ${wordCount === 0 ? 'opacity-50' : ''}`}
                    >
                      <ScopeIcon type={scope.key} isSelected={isSelected} />
                      <div className="font-black text-sm text-gray-900 dark:text-gray-100">{scope.label}</div>
                      <div className="font-mono text-xs text-gray-600 dark:text-gray-400">
                        {wordCount} 词
                      </div>
                    </button>
                  )
                })}
              </div>
              <button
                onClick={handleStartLearning}
                disabled={!selectedBook || scopeWordCounts[selectedScope] === 0}
                className="w-full mt-4 h-14 bg-[#B4F416] dark:bg-lime-500 border-2 border-black dark:border-gray-600 rounded font-black text-lg text-black dark:text-white disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:cursor-not-allowed shadow-[3px_3px_0px_0px_#000]"
              >
                开始学习 →
              </button>
            </>
          )}
        </div>
      </div>

      {/* 💻 PC端：弹层（居中+黑暗模式适配） */}
      <div className="hidden lg:flex fixed inset-0 z-50 items-center justify-center p-4">
        {/* 背景遮罩 - 黑暗模式适配 */}
        <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

        {/* 主弹窗容器 - 黑暗模式适配 */}
        <div
          className="relative bg-white dark:bg-gray-800 overflow-hidden border-2 border-gray-200 dark:border-gray-700"
          style={{
            width: '900px',
            height: '600px',
            borderRadius: '12px',
            boxShadow: '4px 4px 0px 0px #000',
            border: '3px solid #000',
          display: 'flex',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 关闭按钮 - 黑暗模式适配 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/30 transition-all rounded w-10 h-10 flex items-center justify-center border-2 border-black dark:border-gray-600 bg-white dark:bg-gray-700 hover:translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_0px_#000] dark:shadow-none active:shadow-none"
        >
          <X style={{ width: '20px', height: '20px', color: '#000' }} className="dark:text-white" strokeWidth={2.5} />
        </button>

        {/* 左侧：词库列表 - 黑暗模式适配 */}
        <div
          className="bg-white dark:bg-gray-800"
          style={{
            width: '320px',
            borderRight: '3px solid #000',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
          }}
        >
          {/* 搜索框 */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search
              className="text-gray-900 dark:text-gray-300"
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
              }}
            />
            <input
              type="text"
              placeholder="搜索词库"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 border-2 border-black dark:border-gray-600 rounded pl-12 pr-4 text-base font-bold outline-none bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 transition-all focus:shadow-[2px_2px_0px_0px_#000] focus:bg-[#B4F416] dark:focus:bg-lime-500/20 focus:placeholder:text-black dark:focus:placeholder:text-lime-400"
              style={{
                fontFamily: 'monospace',
              }}
            />
          </div>

          {/* 最近打字区域 */}
          {recentRecords.length > 0 && (
            <>
              <div style={{ marginBottom: '16px' }}>
                <div
                  className="font-black text-sm mb-3 text-gray-900 dark:text-gray-100"
                  style={{ letterSpacing: '0.05em' }}
                >
                  最近学习
                </div>
                {recentRecords.map((record) => {
                  const scopeOption = SCOPE_OPTIONS.find(opt => opt.key === record.scope)
                  const scopeLabel = scopeOption?.label || record.scope

                  return (
                    <button
                      key={record.id}
                      onClick={async () => {
                        const book = books.find(b => b.id === record.book_id)
                        if (book) {
                          // 保存最近打字记录
                          if (userId) {
                            try {
                              await fetch('/api/typing/recent', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  bookId: book.id,
                                  scope: record.scope
                                })
                              })
                            } catch (error) {
                              console.error('[RecentRecords] Failed to save:', error)
                            }
                          }
                          // 直接跳转到练习页面
                          onClose()
                          router.push(`/practice?bookId=${book.id}&scope=${record.scope}`)
                        }
                      }}
                      className="w-full flex items-center justify-between p-3 mb-2 bg-white dark:bg-gray-700 border-2 border-black dark:border-gray-600 rounded cursor-pointer transition-all hover:bg-gray-200 dark:hover:bg-gray-600 hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_0px_#000] active:shadow-none"
                    >
                      <div className="flex flex-col flex-1 text-left">
                        <div className="font-black text-sm text-gray-900 dark:text-gray-100">
                          {record.book_title}
                        </div>
                        <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {scopeLabel}
                        </div>
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center bg-black dark:bg-lime-500 text-white rounded">
                        <ArrowRight className="w-4 h-4" strokeWidth={3} />
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* 分隔线 */}
              <div
                className="border-t-2 border-black"
                style={{ margin: '16px 0' }}
              />
            </>
          )}

          {/* 全部词库标题 */}
          <div
            className="font-black text-sm mb-3 text-gray-900 dark:text-gray-100"
            style={{ letterSpacing: '0.05em' }}
          >
            全部词库
          </div>

          {/* 词库列表 */}
          <div
            style={{
              flex: 1,
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {filteredBooks.map((book) => (
              <button
                key={book.id}
                onClick={() => setSelectedBook(book)}
                className={`w-full p-4 border-2 rounded mb-3 cursor-pointer transition-all text-left hover:-translate-y-0.5 active:translate-y-0 ${
                  selectedBook?.id === book.id
                    ? 'bg-[#B4F416] dark:bg-lime-500/30 border-black dark:border-lime-400 shadow-[2px_2px_0px_0px_#000] dark:shadow-none active:shadow-none'
                    : 'bg-white dark:bg-gray-700 border-black dark:border-gray-600 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-black text-base text-gray-900 dark:text-gray-100 leading-tight">
                    {book.title || '未命名'}
                  </div>
                  {selectedBook?.id === book.id && (
                    <Check style={{ width: '20px', height: '20px', color: '#000' }} className="dark:text-lime-400" strokeWidth={3} />
                  )}
                </div>
                <div className="font-mono text-xs text-gray-600 dark:text-gray-400 mt-2">
                  ${book.total_words?.toLocaleString() || 0} words
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：配置区域 - 黑暗模式适配 */}
        <div
          className="bg-gray-50 dark:bg-gray-900/50"
          style={{
            flex: 1,
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          {/* 标题：请先选择词库 */}
          <div
            className="font-black text-2xl mb-5 text-gray-900 dark:text-gray-100"
            style={{ letterSpacing: '-0.02em' }}
          >
            选择学习范围
          </div>

          {/* 顶部选中信息 */}
          {selectedBook ? (
            <div
              className="flex items-center gap-4 mb-5 pb-4 border-b-2 border-black dark:border-gray-600"
            >
              <div
                className="w-16 h-16 bg-[#B4F416] dark:bg-lime-500/30 border-2 border-black dark:border-lime-400 rounded flex items-center justify-center font-black text-3xl text-black dark:text-lime-400"
              >
                {getBookCode(selectedBook.title)}
              </div>
              <div>
                <h2 className="font-black text-lg text-gray-900 dark:text-gray-100 leading-tight m-0">
                  {selectedBook.title}
                </h2>
                <p className="font-mono text-sm text-gray-600 dark:text-gray-400 m-0 mt-1.5">
                  {selectedBook.total_words?.toLocaleString() || 0} 个单词
                </p>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-4 mb-5 pb-4 border-b-2 border-black dark:border-gray-600"
              style={{ minHeight: '88px' }}
            >
              <p className="font-bold text-base text-gray-500 dark:text-gray-400">
                ← 请先选择词库
              </p>
            </div>
          )}

          {/* 范围选择网格：3列 × 2行 */}
          <div
            className="grid grid-cols-3 gap-3 mb-auto"
          >
            {SCOPE_OPTIONS.map((scope) => {
              const wordCount = scopeWordCounts[scope.key] ?? 0
              const isSelected = selectedScope === scope.key
              const isDisabled = !selectedBook || wordCount === 0

              return (
                <button
                  key={scope.key}
                  onClick={() => !isDisabled && setSelectedScope(scope.key)}
                  disabled={isDisabled}
                  className={`p-4 border-2 rounded flex flex-col items-center gap-3 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                    isDisabled
                      ? 'bg-gray-100 border-gray-300 cursor-not-allowed opacity-50'
                      : isSelected
                      ? 'bg-[#B4F416] border-black shadow-[2px_2px_0px_0px_#000] active:shadow-none'
                      : 'bg-white border-black hover:bg-gray-50 cursor-pointer'
                  }`}
                >
                  {/* Neo-Brutalism Icon */}
                  <ScopeIcon type={scope.key} isSelected={isSelected} />

                  {/* 标题 */}
                  <div className="font-black text-sm text-black">
                    {scope.label}
                  </div>

                  {/* 数量 */}
                  <div className="font-mono text-xs text-gray-600">
                    {wordCount > 0 ? `${wordCount}词` : '无'}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 底部开始按钮 */}
          <div style={{ marginTop: '20px' }}>
            <button
              onClick={handleStartLearning}
              disabled={!selectedBook || (scopeWordCounts[selectedScope] ?? 0) === 0}
              className={`w-full h-14 border-2 rounded font-black text-lg cursor-pointer flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
                !selectedBook || (scopeWordCounts[selectedScope] ?? 0) === 0
                  ? 'bg-gray-300 border-gray-400 text-gray-500 cursor-not-allowed'
                  : 'bg-[#B4F416] border-black text-black shadow-[3px_3px_0px_0px_#000] active:shadow-none'
              }`}
            >
              <span>开始学习</span>
              <ArrowRight className="w-5 h-5" strokeWidth={3} />
            </button>
          </div>
        </div>
      </div>
    </div>
    </>
  )
}
