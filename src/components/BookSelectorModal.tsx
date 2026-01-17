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
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded-md`} />
          <div className={`relative bg-gray-100 border-2 border-black ${iconSize} rounded-md flex items-center justify-center`}>
            <List className="w-4 h-4 text-black" strokeWidth={3} />
          </div>
        </div>
      )

    case 'unknown':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded-md`} />
          <div className={`relative bg-red-100 border-2 border-black ${iconSize} rounded-md flex items-center justify-center`}>
            <XIcon className="w-4 h-4 text-red-600" strokeWidth={3.5} />
          </div>
        </div>
      )

    case 'fuzzy':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded-md`} />
          <div className={`relative bg-yellow-100 border-2 border-black ${iconSize} rounded-md flex items-center justify-center`}>
            <Star className="w-4 h-4 text-yellow-600 fill-yellow-600" strokeWidth={3} />
          </div>
        </div>
      )

    case 'new':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded-md`} />
          <div className={`relative bg-blue-100 border-2 border-black ${iconSize} rounded-md flex items-center justify-center`}>
            <FilePlus className="w-4 h-4 text-blue-600" strokeWidth={3} />
          </div>
        </div>
      )

    case 'known':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded-md`} />
          <div className={`relative bg-green-100 border-2 border-black ${iconSize} rounded-md flex items-center justify-center`}>
            <CheckCircle2 className="w-4 h-4 text-green-600" strokeWidth={3} />
          </div>
        </div>
      )

    case 'mistakes':
      return (
        <div className="relative">
          <div className={`absolute inset-0 bg-black translate-x-1 translate-y-1 ${iconSize} rounded-md`} />
          <div className={`relative bg-purple-100 border-2 border-black ${iconSize} rounded-md flex items-center justify-center`}>
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
  const router = useRouter()
  const [selectedBook, setSelectedBook] = useState<Book | null>(null)
  const [selectedScope, setSelectedScope] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [recentRecords, setRecentRecords] = useState<RecentRecord[]>([])
  const [scopeWordCounts, setScopeWordCounts] = useState<Record<string, number>>({})

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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
      onClick={onClose}
    >
      {/* 主弹窗容器 */}
      <div
        className="relative bg-white overflow-hidden"
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
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 cursor-pointer hover:bg-red-50 transition-all rounded-lg w-10 h-10 flex items-center justify-center border-2 border-black bg-white hover:translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_0px_#000] active:shadow-none"
        >
          <X style={{ width: '20px', height: '20px', color: '#000' }} strokeWidth={2.5} />
        </button>

        {/* 左侧：词库列表 */}
        <div
          style={{
            width: '320px',
            background: '#fff',
            borderRight: '3px solid #000',
            display: 'flex',
            flexDirection: 'column',
            padding: '24px',
          }}
        >
          {/* 搜索框 */}
          <div style={{ position: 'relative', marginBottom: '20px' }}>
            <Search
              style={{
                position: 'absolute',
                left: '14px',
                top: '50%',
                transform: 'translateY(-50%)',
                width: '20px',
                height: '20px',
                color: '#000',
              }}
            />
            <input
              type="text"
              placeholder="搜索词库"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-12 border-2 border-black rounded-lg pl-12 pr-4 text-base font-bold outline-none bg-white placeholder:text-gray-400 transition-all focus:shadow-[2px_2px_0px_0px_#000] focus:bg-[#B4F416] focus:placeholder:text-black"
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
                  className="font-black text-sm mb-3 text-black"
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
                      className="w-full flex items-center justify-between p-3 mb-2 bg-white border-2 border-black rounded-lg cursor-pointer transition-all hover:bg-gray-200 hover:-translate-y-0.5 active:translate-y-0 shadow-[2px_2px_0px_0px_#000] active:shadow-none"
                    >
                      <div className="flex flex-col flex-1 text-left">
                        <div className="font-black text-sm text-black">
                          {record.book_title}
                        </div>
                        <div className="font-mono text-xs text-gray-600 mt-1">
                          {scopeLabel}
                        </div>
                      </div>
                      <div className="w-7 h-7 flex items-center justify-center bg-black text-white rounded">
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
            className="font-black text-sm mb-3 text-black"
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
                className={`w-full p-4 border-2 rounded-lg mb-3 cursor-pointer transition-all text-left hover:-translate-y-0.5 active:translate-y-0 ${
                  selectedBook?.id === book.id
                    ? 'bg-[#B4F416] border-black shadow-[2px_2px_0px_0px_#000] active:shadow-none'
                    : 'bg-white border-black hover:bg-gray-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="font-black text-base text-black leading-tight">
                    {book.title || '未命名'}
                  </div>
                  {selectedBook?.id === book.id && (
                    <Check style={{ width: '20px', height: '20px', color: '#000' }} strokeWidth={3} />
                  )}
                </div>
                <div className="font-mono text-xs text-gray-600 mt-2">
                  ${book.total_words?.toLocaleString() || 0} words
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 右侧：配置区域 */}
        <div
          style={{
            flex: 1,
            padding: '28px',
            display: 'flex',
            flexDirection: 'column',
            background: '#fafafa',
          }}
        >
          {/* 标题：请先选择词库 */}
          <div
            className="font-black text-2xl mb-5 text-black"
            style={{ letterSpacing: '-0.02em' }}
          >
            选择学习范围
          </div>

          {/* 顶部选中信息 */}
          {selectedBook ? (
            <div
              className="flex items-center gap-4 mb-5 pb-4 border-b-2 border-black"
            >
              <div
                className="w-16 h-16 bg-[#B4F416] border-2 border-black rounded-lg flex items-center justify-center font-black text-3xl text-black"
              >
                {getBookCode(selectedBook.title)}
              </div>
              <div>
                <h2 className="font-black text-lg text-black leading-tight m-0">
                  {selectedBook.title}
                </h2>
                <p className="font-mono text-sm text-gray-600 m-0 mt-1.5">
                  {selectedBook.total_words?.toLocaleString() || 0} 个单词
                </p>
              </div>
            </div>
          ) : (
            <div
              className="flex items-center gap-4 mb-5 pb-4 border-b-2 border-black"
              style={{ minHeight: '88px' }}
            >
              <p className="font-bold text-base text-gray-500">
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
                  className={`p-4 border-2 rounded-lg flex flex-col items-center gap-3 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
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
              className={`w-full h-14 border-2 rounded-lg font-black text-lg cursor-pointer flex items-center justify-center gap-2 transition-all hover:-translate-y-0.5 active:translate-y-0 ${
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
  )
}
