'use client'

import React, { useState, useMemo } from 'react'
import { BookCard } from '@/components/BookCard'
import { Search, Flame, BookOpen, Trophy, Zap, Globe } from 'lucide-react'

export type BookCategory = 'all' | 'hot' | 'domestic' | 'international' | 'k12' | 'university'
export type CoverType = 'cn' | 'global' | 'k12' | 'uni'

interface Book {
  id: string
  title: string
  description: string
  total_words: number
  cover_color: string
  cover_url: string | null
  isRecent?: boolean
  category?: BookCategory
  coverType?: CoverType
}

interface FilterableBookGridProps {
  books: Book[]
}

// 热门词库列表（针对大学生和研究生用户）
const HOT_BOOKS = [
  '考研',
  'IELTS',
  'TOEFL',
  'CET-4',  // 大学四六级，热门度次之
  'CET-6',
]

// 书名到分类的映射
const BOOK_CATEGORY_MAP: Record<string, BookCategory> = {
  // 热门推荐
  '考研': 'hot',
  'IELTS': 'hot',
  'TOEFL': 'hot',

  // 大学教材
  'CET-4': 'university',
  'CET-6': 'university',

  // 国内考试
  '专业英语四级': 'domestic',
  '专业英语八级': 'domestic',
  'PETS3': 'domestic',

  // 国外考试
  'GRE': 'international',
  'SAT': 'international',
  'GMAT': 'international',
  'BEC': 'international',
  'FCE': 'international',
  'PET': 'international',
  'PTE': 'international',
  'KET': 'international',

  // K12教材
  'PEP小学3年级': 'k12',
  'PEP小学4年级': 'k12',
  'PEP小学5年级': 'k12',
  'PEP小学6年级': 'k12',
  'PEP初中7年级': 'k12',
  'PEP初中8年级': 'k12',
  'PEP初中9年级': 'k12',
  'PEP高中英语': 'k12',
  '初中': 'k12',
  '高中': 'k12',
  '北京高中英语': 'k12',
  '外研社初中英语': 'k12',

  // 大学教材（未明确分类的默认归入大学教材）
}

// 获取书籍分类
export function getBookCategory(title: string): BookCategory {
  return BOOK_CATEGORY_MAP[title] || 'university'
}

// 获取分类显示标签
export function getCategoryLabel(category: BookCategory): string {
  const labels: Record<BookCategory, string> = {
    'all': '全部',
    'hot': '热门推荐',
    'domestic': '国内考试',
    'international': '国外考试',
    'k12': 'K12教材',
    'university': '大学教材'
  }
  return labels[category]
}

// 将BookCategory映射到CoverType
function getCoverType(category: BookCategory): CoverType {
  const coverMap: Partial<Record<BookCategory, CoverType>> = {
    'domestic': 'cn',
    'international': 'global',
    'k12': 'k12',
    'university': 'uni'
  }
  return coverMap[category] || 'uni'
}

// 从书名提取大字代码
function getBookCode(title: string): string {
  // 提取括号前的缩写
  const match = title.match(/^([A-Z]+-?[A-Z]*)/)
  if (match) {
    return match[1].replace('-', '')
  }

  // 特殊处理中文书名
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

  // 默认：取前2-3个大写字母
  return title.substring(0, 3).toUpperCase()
}

// 判断是否为热门词库
function isHotBook(title: string): boolean {
  return HOT_BOOKS.includes(title)
}

// 分类标签配置（新版设计）
const CATEGORY_TABS = [
  { value: 'all' as BookCategory, label: '全部资源', icon: <BookOpen size={14} /> },
  { value: 'hot' as BookCategory, label: '热门推荐', icon: <Flame size={14} /> },
  { value: 'domestic' as BookCategory, label: '国内考试', icon: <Trophy size={14} /> },
  { value: 'international' as BookCategory, label: '国外考试', icon: <Globe size={14} /> },
  { value: 'k12' as BookCategory, label: 'K12教材', icon: <Zap size={14} /> },
  { value: 'university' as BookCategory, label: '大学教材', icon: <BookOpen size={14} /> },
]

// 智能排序函数
function sortBooks(books: Book[]): Book[] {
  return [...books].sort((a, b) => {
    // 1. 最近访问的优先（由服务器端标记 isRecent）
    if (a.isRecent && !b.isRecent) return -1
    if (!a.isRecent && b.isRecent) return 1

    // 2. 热门词库优先（按热门度排序）
    const aHotIndex = HOT_BOOKS.indexOf(a.title)
    const bHotIndex = HOT_BOOKS.indexOf(b.title)

    if (aHotIndex !== -1 && bHotIndex !== -1) {
      return aHotIndex - bHotIndex // 都在热门列表，按热门度排序
    }
    if (aHotIndex !== -1 && bHotIndex === -1) return -1 // a在热门列表，优先
    if (aHotIndex === -1 && bHotIndex !== -1) return 1 // b在热门列表，优先

    // 3. 其他按单词数量降序（词数多的在前）
    return b.total_words - a.total_words
  })
}

export function FilterableBookGrid({ books }: FilterableBookGridProps) {
  const [activeCategory, setActiveCategory] = useState<BookCategory>('all')

  // 智能排序后的词库列表
  const sortedBooks = useMemo(() => sortBooks(books), [books])

  // 为每个词库添加 categoryLabel 和 coverType
  const booksWithFlags = useMemo(() =>
    sortedBooks.map(book => {
      const category = getBookCategory(book.title)
      const coverType = getCoverType(category)
      return {
        ...book,
        category,
        coverType,
        code: getBookCode(book.title),
        categoryLabel: getCategoryLabel(category)
      }
    }),
    [sortedBooks]
  )

  // 计算每个分类的数量
  const categoryCounts = books.reduce((acc, book) => {
    const category = getBookCategory(book.title)
    acc.all++
    acc[category]++
    return acc
  }, { all: 0, hot: 0, domestic: 0, international: 0, k12: 0, university: 0 })

  // 更新标签配置中的数量
  const tabs = CATEGORY_TABS.map(tab => ({
    ...tab,
    count: categoryCounts[tab.value]
  }))

  // 根据选中的分类过滤书籍
  const filteredBooks = activeCategory === 'all'
    ? booksWithFlags
    : booksWithFlags.filter(book => getBookCategory(book.title) === activeCategory)

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">

      {/* --- Header 区域：顶部标题栏 --- */}
      <div className="max-w-7xl mx-auto mb-8">
        {/* 搜索框：硬核风格 */}
        {/* <div className="relative group hidden md:block">
          <div className="absolute inset-0 bg-black translate-x-1 translate-y-1 rounded-lg" />
          <div className="relative flex items-center border-2 border-black bg-white rounded-lg px-3 py-2 w-64">
            <Search size={18} className="mr-2 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none w-full font-mono text-sm placeholder:text-gray-300"
            />
          </div>
        </div> */}

        {/* --- Hero Banner：展示平台优势 --- */}
        <div className="relative w-full h-24 md:h-32 mb-4 md:mb-6">
          {/* 阴影 */}
          <div className="absolute inset-0 bg-black rounded-xl translate-x-2 translate-y-2" />

          {/* 卡片主体：使用黑白 + 酸性绿 */}
          <div className="absolute inset-0 bg-[#B4F416] rounded-xl border-[3px] border-black p-3 md:p-6 flex items-center justify-between overflow-hidden">

            {/* 左侧文字 */}
            <div className="relative z-10 flex items-center gap-4 md:gap-8">
              <div className="flex flex-col justify-center">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-xl md:text-3xl font-black tracking-tighter text-black">28+ 精选词库</h2>
                  <span className="hidden sm:inline-block font-mono text-[10px] md:text-xs text-black/70 bg-white/50 px-2 py-0.5 rounded border-2 border-black">v2.0.6</span>
                </div>
                <div className="font-mono text-[10px] md:text-sm text-black/80 flex items-center gap-2">
                  <span className="hidden sm:inline">$</span>
                  <span>持续更新 · 覆盖全学段 · 智能学习</span>
                </div>
              </div>
            </div>

            {/* 右侧装饰：书库图标 */}
            <div className="relative z-10 pr-3 md:pr-6 hidden sm:block">
              <div className="w-10 h-10 md:w-16 md:h-16 bg-black text-[#B4F416] border-[3px] border-black rounded-lg flex items-center justify-center shadow-[4px_4px_0px_0px_#000]">
                <BookOpen className="w-5 h-5 md:w-8 md:h-8" strokeWidth={3} />
              </div>
            </div>

            {/* 背景装饰纹理 + 终端风格装饰 */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 mix-blend-multiply" style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }} />
            <div className="absolute bottom-2 right-4 font-mono text-[8px] md:text-[10px] text-black/40 font-black select-none pointer-events-none">
              // SYSTEM_READY
            </div>
          </div>
        </div>

        {/* --- 终端风格状态栏 --- */}
        <div className="mb-6 hidden md:block">
          <div className="bg-black text-white font-mono text-xs px-4 py-2 border-2 border-black rounded-lg flex items-center justify-between shadow-[3px_3px_0px_0px_#B4F416]">
            <div className="flex items-center gap-4">
              <span className="text-[#B4F416] font-black">▶</span>
              <span>STATUS: <span className="text-[#B4F416]">ONLINE</span></span>
              <span className="text-gray-500">|</span>
              <span>BOOKS: {filteredBooks.length}</span>
              <span className="text-gray-500">|</span>
              <span>CATEGORY: {activeCategory.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#B4F416] rounded-full animate-pulse"></div>
              <span className="text-gray-400">LIVE</span>
            </div>
          </div>
        </div>

        {/* --- 筛选工具栏 (Control Bar) --- */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3 p-1">
          <div className="font-mono text-[10px] md:text-xs text-gray-500 w-full mb-1 select-none">
            // SELECT_CATEGORY_FILTER:
          </div>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={`
                relative px-2 py-1 sm:px-3 sm:py-1.5 md:px-5 md:py-2.5 font-bold text-[10px] sm:text-xs md:text-sm border-2 border-black rounded-md sm:rounded-lg transition-all duration-200
                flex items-center gap-1 sm:gap-1.5 md:gap-2
                ${activeCategory === tab.value
                  ? 'bg-[#B4F416] text-black shadow-none translate-x-[1px] translate-y-[1px] sm:translate-x-[1.5px] sm:translate-y-[1.5px] md:translate-x-[2px] md:translate-y-[2px]'
                  : 'bg-white text-black shadow-[2px_2px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] hover:bg-gray-50 sm:hover:-translate-y-1 sm:hover:shadow-[5px_5px_0px_0px_#000] md:hover:-translate-y-1 md:hover:shadow-[6px_6px_0px_0px_#000]'
                }
              `}
            >
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              <span className="hidden sm:inline flex items-center gap-1 sm:gap-1.5 md:gap-2">
                {tab.icon}
                {tab.label}
              </span>
              {/* 数量标签 */}
              <span className={`font-mono text-[8px] sm:text-[9px] md:text-xs ${activeCategory === tab.value ? 'text-black/70' : 'text-gray-400'}`}>
                [{categoryCounts[tab.value]}]
              </span>
              {/* 选中时的角标装饰 */}
              {activeCategory === tab.value && (
                <div className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 sm:w-2 sm:h-2 md:w-2 md:h-2 bg-black border border-black rounded-full" />
              )}
            </button>
          ))}
        </div>

      </div>

      {/* --- 列表区域 --- */}
      <div className="max-w-7xl mx-auto px-2 sm:px-0">
        {filteredBooks.length === 0 ? (
          <div className="text-center py-16 bg-white border-[3px] border-black rounded-xl relative overflow-hidden">
            {/* 终端风格的空状态 */}
            <div className="font-mono text-xs md:text-sm">
              <div className="text-gray-400 mb-4">
                <span className="text-[#B4F416]">$</span> error: category not found
              </div>
              <div className="text-gray-500 mb-2">
                Stack: <span className="text-gray-400">filter() → empty_result</span>
              </div>
              <div className="text-gray-600 font-bold mt-6">
                // 该分类下暂无词库
              </div>
              <div className="text-gray-400 text-xs mt-2">
                <span className="text-[#B4F416]">$</span> 请尝试其他分类筛选
              </div>
            </div>
            {/* 装饰性闪烁光标 */}
            <div className="absolute bottom-4 right-6 font-mono text-[#B4F416] text-lg animate-pulse hidden md:block">
              █
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-10 xl:gap-8">
            {filteredBooks.map((book, index) => (
              <BookCard key={book.id} book={book} index={index} />
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
