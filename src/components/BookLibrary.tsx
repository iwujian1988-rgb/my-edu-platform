'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { BookOpen, ArrowRight, GraduationCap } from 'lucide-react'

type TabType = 'recent' | 'my' | 'all'

interface Book {
  id: string
  title: string
  description: string
  total_words: number
  cover_url?: string
  cover_color?: string
}

interface BookLibraryProps {
  userBooks: Book[]
  userEmail: string
}

// 用于检测页面可见性变化，支持浏览器返回
const useVisibilityChange = (callback: () => void, deps: any[] = []) => {
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        callback()
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, deps)
}

// CoverArt 组件（复用之前的代码）
function CoverArt({
  variant,
  title,
  color
}: {
  variant: 'typo' | 'stripes' | 'grid' | 'default'
  title: string
  color: string
}) {
  const shortTitle = title.slice(0, 2).toUpperCase()

  const Container = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
    <div className={`w-full h-full relative overflow-hidden ${className}`}>
      {children}
    </div>
  )

  const colorMap: Record<string, string> = {
    'bg-[#B4F416]': '#B4F416',
    'bg-[#FF6B6B]': '#FF6B6B',
    'bg-[#4ECDC4]': '#4ECDC4',
    'bg-[#A29BFE]': '#A29BFE'
  }

  const hexColor = colorMap[color] || '#B4F416'

  switch (variant) {
    case 'stripes':
      return (
        <Container className="bg-white">
          <div className="absolute inset-0 opacity-40"
               style={{ backgroundImage: `repeating-linear-gradient(45deg, ${hexColor} 0, ${hexColor} 10px, #f3f4f6 10px, #f3f4f6 20px)` }}>
          </div>
          <div className={`absolute bottom-3 right-3 ${color} border-[3px] border-black px-2 py-0.5 text-[10px] font-black shadow-[2px_2px_0px_0px_#000] z-10`}>
            SPRINT
          </div>
        </Container>
      )
    case 'typo':
      return (
        <Container className={color}>
          <h1 className="text-9xl font-black text-black opacity-10 absolute -bottom-8 -right-8 select-none leading-none scale-150 transform">
            {shortTitle}
          </h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <h1 className="text-6xl font-black text-black tracking-tighter leading-none relative z-10 drop-shadow-sm">
              {shortTitle}
            </h1>
          </div>
        </Container>
      )
    case 'grid':
      return (
        <Container className="bg-white">
          <div className="absolute inset-0"
               style={{ backgroundImage: 'radial-gradient(#000 1.5px, transparent 1.5px)', backgroundSize: '12px 12px', opacity: 0.15 }}>
          </div>
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 ${color} border-[3px] border-black rounded-full flex items-center justify-center shadow-[2px_2px_0px_0px_#000]`}>
            <GraduationCap size={32} strokeWidth={2} />
          </div>
        </Container>
      )
    default:
      return (
        <Container className="bg-white">
          <div className={`absolute top-0 right-0 w-32 h-32 ${color} rounded-bl-full border-l-[3px] border-b-[3px] border-black`}></div>
          <div className="absolute bottom-4 left-4 font-black text-6xl opacity-10">Aa</div>
        </Container>
      )
  }
}

function BookCard({ book, index }: { book: Book; index: number }) {
  const router = useRouter()
  const variants = [
    { variant: 'typo' as const, color: 'bg-[#B4F416]', tag: '考试' },
    { variant: 'stripes' as const, color: 'bg-[#FF6B6B]', tag: '场景' },
    { variant: 'grid' as const, color: 'bg-[#4ECDC4]', tag: '教材' },
    { variant: 'default' as const, color: 'bg-[#A29BFE]', tag: '其他' }
  ]

  const config = variants[index % variants.length]

  // 记录点击到最近访问
  const handleClick = () => {
    // 异步发送请求，不等待结果，让Link正常跳转
    fetch('/api/recent-books', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bookId: book.id })
    }).catch(error => {
      console.error('Failed to record book access:', error)
    })
  }

  return (
    <Link href={`/library/${book.id}`} className="group" onClick={handleClick}>
      <div className="flex flex-col bg-white border-[3px] border-black rounded-xl overflow-hidden shadow-[3px_3px_0px_0px_#000] lg:shadow-[4px_4px_0px_0px_#000] hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-all cursor-pointer h-full">
        <div className="h-32 border-b-[3px] border-black relative bg-gray-50">
          <CoverArt variant={config.variant} title={book.title || '书'} color={config.color} />
          <div className="absolute top-2 left-2">
            <span className="bg-white text-black border-[3px] border-black text-[10px] font-bold px-2 py-0.5 rounded-md shadow-[2px_2px_0px_0px_#000]">
              {config.tag}
            </span>
          </div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-3">
          <div>
            <h3 className="font-black text-lg leading-tight text-black mb-1 line-clamp-1">{book.title || '未命名词书'}</h3>
            <p className="text-xs font-bold text-gray-400 line-clamp-2">{book.description || '暂无描述'}</p>
          </div>

          <div className="flex items-center justify-between mt-auto pt-3 border-t-2 border-gray-100">
            <div className="flex items-center gap-1.5">
              <BookOpen size={14} className="text-black" strokeWidth={2} />
              <span className="text-xs font-black text-black">{book.total_words?.toLocaleString() || 0} 词</span>
            </div>

            <div className="w-8 h-8 rounded-lg bg-black text-white border-[3px] border-black flex items-center justify-center transition-all group-hover:bg-[#B4F416] group-hover:text-black">
              <ArrowRight size={18} strokeWidth={3} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

export function BookLibrary({ userBooks, userEmail }: BookLibraryProps) {
  const [activeTab, setActiveTab] = useState<TabType>('recent')
  const [recentBooks, setRecentBooks] = useState<Book[]>([])
  const [loading, setLoading] = useState(true)

  // 获取最近访问的词库
  const fetchRecentBooks = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/recent-books')
      const data = await response.json()
      setRecentBooks(data.books || [])
    } catch (error) {
      console.error('Failed to fetch recent books:', error)
    } finally {
      setLoading(false)
    }
  }

  // 初始加载和 tab 切换时获取数据
  useEffect(() => {
    if (activeTab === 'recent') {
      fetchRecentBooks()
    } else {
      setLoading(false)
    }
  }, [activeTab])

  // 根据当前 Tab 获取显示的词库
  const getDisplayBooks = (): Book[] => {
    switch (activeTab) {
      case 'recent':
        return recentBooks
      case 'my':
        return userBooks.filter(book => book.created_by === userEmail)
      case 'all':
        return userBooks
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          {displayBooks.map((book, index) => (
            <BookCard key={book.id} book={book} index={index} />
          ))}
        </div>
      )}
    </section>
  )
}
