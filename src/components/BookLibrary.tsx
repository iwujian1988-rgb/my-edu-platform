'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { BookOpen, ArrowRight } from 'lucide-react'
import { BookCard } from '@/components/BookCard'
import { getBookCategory, getCategoryLabel, type CoverType } from '@/components/FilterableBookGrid'
import type { Book } from '@/types/book'

type TabType = 'recent' | 'my' | 'all'

interface BookLibraryProps {
  userBooks: Book[]
  userEmail: string
  userId?: string  // ✅ 添加用户ID
  recentBooks?: Book[]  // 🔧 性能优化：从服务端传递最近访问的词库
}

export function BookLibrary({ userBooks, userEmail, userId, recentBooks: initialRecentBooks = [] }: BookLibraryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('recent')
  const [recentBooks, setRecentBooks] = useState<Book[]>(initialRecentBooks)
  const [loading, setLoading] = useState(false)  // 🔧 性能优化：已经有数据，不需要loading

  // 🔧 性能优化：使用传入的最近访问数据，避免重复请求
  useEffect(() => {
    setRecentBooks(initialRecentBooks)
    setLoading(false)
  }, [initialRecentBooks])

  // Tab 切换时更新 loading 状态
  useEffect(() => {
    if (activeTab !== 'recent') {
      setLoading(false)
    }
  }, [activeTab])

  // 辅助函数：将BookCategory映射到CoverType
  const getCoverType = (category: string): CoverType => {
    const coverMap: Record<string, CoverType> = {
      'domestic': 'cn',
      'international': 'global',
      'k12': 'k12',
      'university': 'uni',
      'hot': 'uni'
    }
    return coverMap[category] || 'uni'
  }

  // 辅助函数：从书名提取大字代码
  const getBookCode = (title: string | undefined): string => {
    // 处理 undefined 或空字符串
    if (!title) {
      return 'BK'
    }

    const match = title.match(/^([A-Z]+-?[A-Z]*)/)
    if (match) {
      return match[1].replace('-', '')
    }

    const codeMap: Record<string, string> = {
      '考研': 'KY',
      '专业英语四级': 'TEM-4',
      '专业英语八级': 'TEM-8',
      'PETS3': 'PETS-3',
      'CET-4': 'CET-4',
      'CET-6': 'CET-6'
    }

    if (codeMap[title]) {
      return codeMap[title]
    }

    return title.substring(0, 3).toUpperCase()
  }

  // 为所有书籍添加完整的显示信息
  const enrichedUserBooks = useMemo(() => {
    return userBooks.map(book => {
      // 兼容 name 和 title 两种字段
      const bookTitle = book.title || book.name || ''
      const category = getBookCategory(bookTitle)
      return {
        ...book,
        title: bookTitle, // 确保有 title 字段
        category,
        coverType: getCoverType(category),
        code: getBookCode(bookTitle),
        categoryLabel: getCategoryLabel(category)
      }
    })
  }, [userBooks])

  // 为最近访问的书籍添加完整的显示信息
  const enrichedRecentBooks = useMemo(() => {
    return recentBooks.map(book => {
      // 兼容 name 和 title 两种字段
      const bookTitle = book.title || book.name || ''
      const category = getBookCategory(bookTitle)
      return {
        ...book,
        title: bookTitle, // 确保有 title 字段
        category,
        coverType: getCoverType(category),
        code: getBookCode(bookTitle),
        categoryLabel: getCategoryLabel(category),
        isRecent: true
      }
    })
  }, [recentBooks])

  // 根据当前 Tab 获取显示的词库
  const getDisplayBooks = (): Book[] => {
    switch (activeTab) {
      case 'recent':
        return enrichedRecentBooks
      case 'my':
        // ✅ 修复：使用userId而不是userEmail进行比较
        return enrichedUserBooks.filter(book => {
          if (!userId) return false
          return book.created_by === userId
        })
      case 'all':
        return enrichedUserBooks
      default:
        return []
    }
  }

  const displayBooks = getDisplayBooks()

  return (
    <section>
      {/* Tab 切换按钮 */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-black flex items-center gap-2">
          <BookOpen size={28} strokeWidth={3} className="text-[#B4F416]" />
          词库资源
        </h2>
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('recent')}
            className={`px-4 py-1.5 rounded-[3px] border-[3px] font-bold text-sm transition-all ${
              activeTab === 'recent'
                ? 'bg-[#B4F416] border-black text-black shadow-[2px_2px_0px_0px_#000]'
                : 'bg-white border-black text-gray-600 hover:bg-gray-50'
            }`}
          >
            最近
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-4 py-1.5 rounded-[3px] border-[3px] font-bold text-sm transition-all ${
              activeTab === 'my'
                ? 'bg-[#B4F416] border-black text-black shadow-[2px_2px_0px_0px_#000]'
                : 'bg-white border-black text-gray-600 hover:bg-gray-50'
            }`}
          >
            我的
          </button>
          <Link
            href="/library"
            className={`px-4 py-1.5 rounded-[3px] border-[3px] font-bold text-sm transition-all ${
              'bg-white border-black text-gray-600 hover:bg-gray-50 hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
            }`}
          >
            全部 →
          </Link>
        </div>
      </div>

      {/* 词库列表 */}
      {loading && activeTab === 'recent' ? (
        <div className="text-center py-12">
          <p className="text-gray-500 font-bold">加载中...</p>
        </div>
      ) : displayBooks.length === 0 ? (
        <div className="text-center py-12 bg-white border-[3px] border-black rounded-xl">
          {activeTab === 'recent' && (
            <>
              <p className="text-gray-500 font-bold mb-4">还没有访问过任何词库</p>
              <p className="text-sm text-gray-400">从"我的"或"全部"中选择一个词库开始学习吧！</p>
            </>
          )}
          {activeTab === 'my' && (
            <>
              <p className="text-gray-500 font-bold mb-4">还没有创建任何自定义词库</p>
              <Link
                href="/library/new"
                className="inline-block px-6 py-2 bg-[#B4F416] border-[3px] border-black rounded-xl font-bold hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                创建我的第一个词库
              </Link>
            </>
          )}
          {activeTab === 'all' && (
            <>
              <p className="text-gray-500 font-bold mb-4">还没有可用的词库</p>
              <p className="text-sm text-gray-400">请联系管理员获取词库权限</p>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 md:gap-4 lg:gap-6">
          {displayBooks.map((book, index) => (
            <BookCard key={book.id} book={book} index={index} />
          ))}
        </div>
      )}
    </section>
  )
}
