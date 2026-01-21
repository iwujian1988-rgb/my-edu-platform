'use client'

import React, { useState, useMemo } from 'react'
import { BookCard } from '@/components/BookCard'
import { Search, Flame, BookOpen, Trophy, Zap, Globe } from 'lucide-react'
import type { Book } from '@/types/book'
import { useTheme } from '@/contexts/ThemeContext'

// 重新导出类型以保持兼容性
export type { Book } from '@/types/book'
export type BookCategory = 'all' | 'hot' | 'domestic' | 'international' | 'k12' | 'university'
export type CoverType = 'cn' | 'global' | 'k12' | 'uni'

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
  const { theme, mounted } = useTheme()

  // 服务器端和首次渲染使用浅色模式
  const isDark = mounted && theme === 'dark'

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
    <div className="min-h-screen font-sans transition-colors duration-300"
         style={{
           backgroundColor: 'var(--bg-secondary)',
           color: 'var(--text-primary)',
           backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
           backgroundSize: '20px 20px'
         }}>

      {/* --- Header 区域：顶部标题栏 --- */}
      <div className="max-w-7xl mx-auto mb-8">
        {/* 搜索框：硬核风格 */}
        {/* <div className="relative group hidden md:block">
          <div className="absolute inset-0 bg-black translate-x-1 translate-y-1 rounded-lg" />
          <div className="relative flex items-center border-2 border-black rounded-lg px-3 py-2 w-64 transition-colors duration-300"
               style={{ backgroundColor: 'var(--card-bg)' }}>
            <Search size={18} className="mr-2 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }} />
            <input
              type="text"
              placeholder="Search..."
              className="bg-transparent outline-none w-full font-mono text-sm transition-colors duration-300"
              style={{ color: 'var(--text-primary)' }}
              placeholder="Search..." />
            />
          </div>
        </div> */}

        {/* --- Hero Banner：展示平台优势 - 网格线框风格 --- */}
        <div className="relative w-full h-32 md:h-40 mb-4 md:mb-6">
          {/* 阴影 */}
          <div className="absolute inset-0 bg-black/50 rounded-xl translate-x-2 translate-y-2" />

          {/* 卡片主体：深色背景 + 酸性绿边框 */}
          <div className={`relative rounded-xl border-[2px] md:border-[3px] overflow-hidden flex flex-col justify-between p-4 md:p-6 group transition-colors duration-300 ${
            isDark
              ? 'bg-[#09090B] border-[#BEF264]'
              : 'bg-[#B4F416] border-black'
          }`}>

            {/* 背景网格 - 仅夜间模式显示 */}
            {isDark && (
              <div className="absolute inset-0 opacity-10 pointer-events-none"
                   style={{
                     backgroundImage: 'linear-gradient(#BEF264 1px, transparent 1px), linear-gradient(90deg, #BEF264 1px, transparent 1px)',
                     backgroundSize: '40px 40px'
                   }}>
              </div>
            )}

            {/* 上半部分：标题和版本 */}
            <div className="relative z-10 flex justify-between items-start">
              <div>
                <h1 className={`text-2xl md:text-3xl font-black tracking-tighter italic ${
                  isDark ? 'text-[#BEF264]' : 'text-black'
                }`}>28+ 精选词库</h1>
                <div className={`flex items-center gap-2 mt-2 ${
                  isDark ? 'text-[#BEF264]' : ''
                }`}>
                  <span className={`px-2 py-0.5 rounded text-xs md:text-sm font-mono border ${
                    isDark
                      ? 'bg-[#BEF264]/20 border-[#BEF264]/50 text-[#BEF264]'
                      : 'bg-white/50 border-black text-black/70'
                  }`}>v2.0.6</span>
                  <span className={`text-xs md:text-sm font-mono ${
                    isDark ? 'opacity-80' : 'text-black/80'
                  }`}>// SYSTEM_READY</span>
                </div>
              </div>

              {/* 右侧图标 */}
              <div className={`w-12 h-12 border flex items-center justify-center rounded-lg ${
                isDark
                  ? 'border-[#BEF264] bg-[#BEF264]/10'
                  : 'bg-black text-[#B4F416] border-black'
              }`}>
                <BookOpen size={24} className={isDark ? 'text-[#BEF264]' : ''} strokeWidth={3} />
              </div>
            </div>

            {/* 下半部分：状态信息 */}
            <div className={`relative z-10 flex items-center gap-3 md:gap-4 text-xs md:text-sm font-mono mt-3 md:mt-4 ${
              isDark ? 'text-[#BEF264]/70' : 'text-black/70'
            }`}>
              <div className="flex items-center gap-1 md:gap-2">
                <div className={`w-2 h-2 rounded-full animate-pulse ${
                  isDark ? 'bg-[#BEF264]' : 'bg-black'
                }`}></div>
                <span>STATUS: ONLINE</span>
              </div>
              <span>|</span>
              <div className={`hidden sm:block ${isDark ? 'text-[#BEF264]/70' : 'text-black/70'}`}>
                持续更新 · 覆盖全学段 · 智能学习
              </div>
            </div>

            {/* 日间模式装饰纹理 */}
            {!isDark && (
              <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 mix-blend-multiply pointer-events-none"
                   style={{ backgroundImage: 'radial-gradient(#000 2px, transparent 2px)', backgroundSize: '16px 16px' }} />
            )}
          </div>
        </div>

        {/* --- 终端风格状态栏 --- */}
        <div className="mb-6 hidden md:block">
          <div className="bg-black text-white font-mono text-xs px-4 py-2 border-2 border-black rounded-lg flex items-center justify-between shadow-[3px_3px_0px_0px_#B4F416]">
            <div className="flex items-center gap-4">
              <span className="text-[#B4F416] font-black">▶</span>
              <span>STATUS: <span className="text-[#B4F416]">ONLINE</span></span>
              <span className="transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>|</span>
              <span>BOOKS: {filteredBooks.length}</span>
              <span className="text-gray-500">|</span>
              <span>CATEGORY: {activeCategory.toUpperCase()}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-[#B4F416] rounded-full animate-pulse"></div>
              <span className="transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>LIVE</span>
            </div>
          </div>
        </div>

        {/* --- 筛选工具栏 (Control Bar) --- */}
        <div className="flex flex-wrap gap-1.5 sm:gap-2 md:gap-3 p-1">
          <div className="font-mono text-[10px] md:text-xs w-full mb-1 select-none transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
            // SELECT_CATEGORY_FILTER:
          </div>
          {CATEGORY_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setActiveCategory(tab.value)}
              className={`
                relative px-2 py-1 sm:px-3 sm:py-1.5 md:px-5 md:py-2.5 font-bold text-[10px] sm:text-xs md:text-sm border-2 rounded-md sm:rounded-lg transition-all duration-200
                flex items-center gap-1 sm:gap-1.5 md:gap-2
                ${activeCategory === tab.value
                  ? 'bg-[#B4F416] border-black text-black shadow-none translate-x-[1px] translate-y-[1px] sm:translate-x-[1.5px] sm:translate-y-[1.5px] md:translate-x-[2px] md:translate-y-[2px]'
                  : isDark
                  ? 'border-[#B4F264]/30 bg-[#B4F264]/10 text-[#B4F264] hover:bg-[#B4F264] hover:text-black hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,0.5)]'
                  : 'border-black text-black shadow-[2px_2px_0px_0px_#000] sm:shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] sm:hover:-translate-y-1 sm:hover:shadow-[5px_5px_0px_0px_#000] md:hover:-translate-y-1 md:hover:shadow-[6px_6px_0px_0px_#000]'
                }
              `}
              style={{
                backgroundColor: activeCategory === tab.value ? undefined : (isDark ? undefined : 'var(--card-bg)')
              }}
            >
              <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
              <span className="hidden sm:inline flex items-center gap-1 sm:gap-1.5 md:gap-2">
                {tab.icon}
                {tab.label}
              </span>
              {/* 数量标签 */}
              <span className={`font-mono text-[8px] sm:text-[9px] md:text-xs transition-colors duration-300`}
                    style={{
                      color: activeCategory === tab.value
                        ? 'rgba(0,0,0,0.7)'
                        : isDark
                        ? 'rgba(190, 242, 100, 0.7)'
                        : 'var(--text-tertiary)'
                    }}>
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
          <div className="text-center py-16 border-[3px] border-black rounded-xl relative overflow-hidden transition-colors duration-300"
               style={{ backgroundColor: 'var(--card-bg)' }}>
            {/* 终端风格的空状态 */}
            <div className="font-mono text-xs md:text-sm">
              <div className="mb-4 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
                <span className="text-[#B4F416]">$</span> error: category not found
              </div>
              <div className="mb-2 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
                Stack: <span>filter() → empty_result</span>
              </div>
              <div className="font-bold mt-6 transition-colors duration-300" style={{ color: 'var(--text-secondary)' }}>
                // 该分类下暂无词库
              </div>
              <div className="text-xs mt-2 transition-colors duration-300" style={{ color: 'var(--text-tertiary)' }}>
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
