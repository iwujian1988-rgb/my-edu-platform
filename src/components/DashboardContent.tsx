'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Target, Calendar, BookOpen, Plus, Cat } from 'lucide-react'
import { PermissionWarningBanner } from './PermissionDisplay'
import { BookLibrary } from './BookLibrary'
import EmptyState from './EmptyState'
import { ProgressCardProps, MODE_CONFIG, SCOPE_LABELS } from '@/types/progress'
import { formatTimeAgo } from '@/lib/timeUtils'
import { useLoading } from '@/components/LoadingOverlay'
import { useTheme } from '@/contexts/ThemeContext'
import { LearningPlanWorkspace } from './learning-plan'

/**
 * 客户端专用的时间显示组件
 * 避免 hydration 不匹配错误
 */
function TimeLabel({ timestamp }: { timestamp: number }) {
  const [timeLabel, setTimeLabel] = useState<string>('加载中')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setTimeLabel(formatTimeAgo(timestamp))

    // 每分钟更新一次
    const interval = setInterval(() => {
      setTimeLabel(formatTimeAgo(timestamp))
    }, 60000)

    return () => clearInterval(interval)
  }, [timestamp])

  // 在服务器端和首次客户端渲染前显示占位符
  if (!mounted) {
    return <span className="opacity-0">加载中</span>
  }

  return <span>{timeLabel}</span>
}

// 20条英语学习鸡汤文
const MOTIVATIONAL_QUOTES = [
  "The limits of my language mean the limits of my world. - 语言的界限就是我世界的界限。",
  "Learning a new language is becoming a new person. - 学习一门新语言就是成为新人。",
  "Every word you learn is a new world. - 你学的每个单词都是新世界。",
  "Fluency is not about perfection, it's about connection. - 流利不是为了完美，而是为了连接。",
  "Make mistakes, they are your best teachers. - 犯错吧，它们是最好的老师。",
  "Consistency beats intensity. - 坚持胜过强度。",
  "Small progress every day leads to big results. - 每天的小进步带来大成果。",
  "Don't fear mistakes, fear silence. - 别怕犯错，怕的是沉默。",
  "Speak from day one. - 从第一天就开始说。",
  "Immersion is the fastest path to fluency. - 沉浸式学习是流利之路。",
  "Your accent is your identity, wear it proudly. - 你的口音是你的身份，骄傲地展现它。",
  "Vocabulary grows like a tree, water it daily. - 词汇像树一样生长，每天浇水。",
  "Listening is the foundation of speaking. - 听是说的基础。",
  "Read what you love, love what you read. - 读你爱的，爱你读的。",
  "Think in English, dream in English. - 用英语思考，用英语做梦。",
  "Every expert was once a beginner. - 每个专家都曾是初学者。",
  "Practice makes progress, not perfect. - 练习带来进步，而非完美。",
  "Embrace the struggle, enjoy the journey. - 拥抱挣扎，享受旅程。",
  "Words have power, use them wisely. - 语言有力量，明智地使用。",
  "Today's effort is tomorrow's confidence. - 今天的努力是明天的自信。"
]

interface DashboardContentProps {
  books: any[]
  progressCards?: ProgressCardProps[]  // 添加可选
  mistakesCount?: number  // 🔧 改为可选，允许客户端异步加载
  todayNewWordsCount?: number  // 🔧 改为可选，允许客户端异步加载
  userEmail?: string  // 🔧 改为可选，兼容userPhone
  userPhone?: string  // ✅ 添加手机号支持
  userId?: string  // ✅ 添加用户ID
  recentBooks?: any[]  // 🔧 性能优化：从服务端传递最近访问的词库
}

// --- 1. StatBox (统一黑夜模式边框) ---
function StatBox({
  icon: Icon,
  label,
  value,
  unit,
  color, // 传入的颜色类名，例如 "bg-[#FF6B6B]"
  href
}: {
  icon: any
  label: string
  value: string | number
  unit: string
  color: string
  href: string
}) {
  const { showLoading } = useLoading()

  const handleClick = () => {
    // 立即显示 loading，给用户即时反馈
    showLoading()
  }

  const content = (
    <div className="
      relative h-full
      bg-white dark:bg-gray-800 // 🌙 统一卡片底色（与系统词库一致）
      border-[3px] border-black dark:border-gray-700 // 🌙 统一边框（与系统词库一致）
      shadow-[4px_4px_0px_0px_#000] dark:shadow-none

      hover:translate-x-[2px] hover:translate-y-[2px]
      hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-none
      transition-all duration-200 group
      flex flex-col justify-center p-4
    ">
      <div className="flex items-center gap-3">
        <div className={`
          w-12 h-12 shrink-0
          border-[3px] border-black dark:border-gray-700 // 🌙 统一边框（与系统词库一致）
          flex items-center justify-center
          shadow-[2px_2px_0px_0px_#000] dark:shadow-none
          ${color}
        `}>
          <Icon className="w-6 h-6 text-black" strokeWidth={3} />
        </div>
        <div className="flex flex-col">
          <span className="text-xs font-black text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-1">
            {label}
          </span>
          <div className="flex items-baseline gap-1 leading-none">
            <span className="text-3xl font-black text-black dark:text-slate-100">
              {value}
            </span>
            <span className="text-xs font-bold text-gray-400 dark:text-slate-500">
              {unit}
            </span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <Link href={href} onClick={handleClick} className="block h-full">
      {content}
    </Link>
  )
}

// --- 3. ProgressCardComponent (浏览记录 - 统一边框，降低高度弱化) ---
function ProgressCardComponent(props: ProgressCardProps & { isFirstCard?: boolean }) {
  const { bookTitle, mode, progress, totalWords, learnedCount, lastStudyTime, continueURL, bookId } = props
  const { showLoading } = useLoading()
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'

  const handleClick = () => {
    showLoading()
  }

  // 获取模式配置
  const modeConfig = MODE_CONFIG[mode]
  const ModeIcon = modeConfig.icon
  const themeColor = modeConfig.color

  return (
    <Link href={continueURL} onClick={handleClick} className="group block" data-testid="progress-card" data-book-id={bookId}>
      <div className={`
        relative w-full cursor-pointer overflow-hidden flex flex-col transition-all duration-200
        bg-white dark:bg-gray-800 // 🌙 统一卡片底色（与系统词库一致）

        // 🌙 统一边框逻辑（与系统词库一致）
        border-[3px] border-black dark:border-gray-700

        shadow-[6px_6px_0px_0px_#000] dark:shadow-none

        hover:translate-x-[2px] hover:translate-y-[2px]
        hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-none
        dark:hover:bg-gray-800 // Hover 变亮一点（与系统词库一致）
        min-h-[110px] rounded-sm // 🌟 降低高度：从 140px -> 110px
      `}>
        {/* ... 内容保持不变，只改内部文字颜色 ... */}
        <div className="p-2 flex flex-col h-full">
          <div className="flex items-start justify-between mb-1.5">
            <h3 className="font-black text-sm text-black dark:text-slate-100 line-clamp-1">{bookTitle}</h3>
            <span className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-700 text-[9px] font-bold text-gray-600 dark:text-slate-400 rounded-sm">
              {mode}
            </span>
          </div>

          <div className="mt-auto">
            <div className="flex justify-between items-end mb-1">
              <span className="text-xl font-black text-black dark:text-slate-100">{progress}%</span>
              <span className="text-[9px] font-mono text-gray-500 dark:text-slate-500">{learnedCount}/{totalWords}</span>
            </div>
            {/* 进度条槽 */}
            <div className="h-1 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
              <div className="h-full bg-[#B4F416]" style={{width: `${Math.max(progress, 5)}%`}}></div>
            </div>
            {/* 时间标签 */}
            <div className="mt-1 flex items-center gap-1 text-[8px] font-bold text-gray-400 dark:text-slate-600">
              <div className="w-1 h-1 rounded-full bg-purple-500"></div>
              <TimeLabel timestamp={lastStudyTime} />
            </div>
          </div>
        </div>
      </div>
    </Link>
  )
}

// --- 2. CreateButton (统一黑夜模式边框) ---
function CreateButton() {
  const { showLoading } = useLoading()

  const handleClick = () => {
    showLoading()
  }

  return (
    <Link href="/library/new" onClick={handleClick} className="block h-full">
      <button className="
        w-full h-full
        bg-white dark:bg-gray-800 // 🌙 统一卡片底色（与系统词库一致）
        border-[3px] border-black dark:border-gray-700 // 🌙 统一边框（与系统词库一致）
        shadow-[4px_4px_0px_0px_#000] dark:shadow-none

        hover:translate-x-[2px] hover:translate-y-[2px]
        hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-none
        transition-all duration-200 group
        p-4 flex items-center justify-between
      ">
        <div className="text-left">
          <h3 className="text-base font-black text-black dark:text-slate-100 leading-tight">新建词库</h3>
          <p className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mt-1">CUSTOM DECK</p>
        </div>
        <div className="
          w-10 h-10 shrink-0 bg-[#B4F416]
          border-[3px] border-black dark:border-gray-700 // 🌙 统一边框（与系统词库一致）
          flex items-center justify-center
          shadow-[2px_2px_0px_0px_#000] dark:shadow-none
          group-hover:rotate-90 transition-transform duration-300
        ">
          <Plus className="w-5 h-5 text-black" strokeWidth={3} />
        </div>
      </button>
    </Link>
  )
}

export function DashboardContent({
  books,
  progressCards = [],  // 添加默认值
  mistakesCount: initialMistakesCount,
  todayNewWordsCount: initialTodayNewWordsCount,
  userEmail,
  userPhone,
  userId,
  recentBooks = [],  // 🔧 性能优化：默认空数组
}: DashboardContentProps) {
  // 在客户端随机获取一条鸡汤文，避免 Hydration 错误
  const [randomQuote, setRandomQuote] = useState(MOTIVATIONAL_QUOTES[0])

  // 🔥 性能优化：客户端异步加载统计数据，不阻塞页面渲染
  const [mistakesCount, setMistakesCount] = useState(initialMistakesCount ?? 0)
  const [todayNewWordsCount, setTodayNewWordsCount] = useState(initialTodayNewWordsCount ?? 0)
  const [statsLoading, setStatsLoading] = useState(!initialMistakesCount || !initialTodayNewWordsCount)

  // 🔧 动态高度对齐：获取右侧面板高度并传递给左侧
  const rightPanelRef = useRef<HTMLDivElement>(null)
  const [rightPanelHeight, setRightPanelHeight] = useState<number | null>(null)

  useEffect(() => {
    // 等待 DOM 完全渲染后再获取高度
    const timer = setTimeout(() => {
      if (rightPanelRef.current) {
        const height = rightPanelRef.current.offsetHeight
        console.log('[DashboardContent] 右侧面板高度:', height)
        setRightPanelHeight(height)
      }
    }, 100) // 延迟100ms确保DOM渲染完成

    return () => clearTimeout(timer)
  }, [statsLoading]) // 依赖statsLoading，确保数据加载完后再测量

  // 🔄 实时更新：客户端轮询最近访问的词库
  const [liveRecentBooks, setLiveRecentBooks] = useState(recentBooks)

  useEffect(() => {
    const randomIndex = Math.floor(Math.random() * MOTIVATIONAL_QUOTES.length)
    setRandomQuote(MOTIVATIONAL_QUOTES[randomIndex])
  }, [])

  // 🚀 异步加载统计数据（如果服务端没有提供）
  useEffect(() => {
    if (initialMistakesCount !== undefined && initialTodayNewWordsCount !== undefined) {
      // 服务端已提供，无需再次加载
      return
    }

    const loadStats = async () => {
      try {
        setStatsLoading(true)

        // 并行加载两个统计数据
        const [mistakesRes, todayRes] = await Promise.all([
          fetch('/api/stats/mistakes'),
          fetch('/api/stats/today-new')
        ])

        if (mistakesRes.ok) {
          try {
            const data = await mistakesRes.json()
            setMistakesCount(data.count || 0)
          } catch (e) {
            console.error('[Dashboard] Failed to parse mistakes response:', e)
          }
        }

        if (todayRes.ok) {
          try {
            const data = await todayRes.json()
            setTodayNewWordsCount(data.count || 0)
          } catch (e) {
            console.error('[Dashboard] Failed to parse today-new response:', e)
          }
        }
      } catch (error) {
        console.error('[Dashboard] Failed to load stats:', error)
      } finally {
        setStatsLoading(false)
      }
    }

    loadStats()
  }, [initialMistakesCount, initialTodayNewWordsCount])

  // 🔄 实时轮询：每30秒获取最近访问的词库
  useEffect(() => {
    // 使用 Page Visibility API，只在页面可见时轮询
    const loadRecentBooks = async () => {
      try {
        const res = await fetch('/api/recent-books')
        if (res.ok) {
          try {
            const data = await res.json()
            if (data.success && data.data) {
              setLiveRecentBooks(data.data)
              console.log('🔄 [Dashboard] 更新最近访问:', data.data.length, '本书')
            }
          } catch (e) {
            console.error('[Dashboard] Failed to parse recent-books response:', e)
          }
        }
      } catch (error) {
        console.error('[Dashboard] 轮询最近访问失败:', error)
      }
    }

    // 立即执行一次
    loadRecentBooks()

    // 设置定时器：每30秒轮询一次
    const interval = setInterval(() => {
      // 只在页面可见时轮询
      if (!document.hidden) {
        loadRecentBooks()
      }
    }, 30000) // 30秒

    // 清理函数
    return () => clearInterval(interval)
  }, []) // 空依赖数组，只在组件挂载时执行一次

  return (
    <div
      className="min-h-screen font-sans p-4 md:p-8 lg:ml-64 transition-colors duration-300"
      style={{
        backgroundColor: 'var(--bg-secondary)',
        color: 'var(--text-primary)',
        backgroundImage: 'radial-gradient(var(--border) 1px, transparent 1px)',
        backgroundSize: '20px 20px'
      }}
    >
      <div className="max-w-7xl mx-auto">
        {/* 1. Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-10 gap-4">
          <div className="flex items-center gap-4 w-full md:w-auto">
            {/* Logo Box - 仅在移动端和平板竖屏显示 */}
            <div className="block md:block lg:hidden w-12 h-12 md:w-14 md:h-14 bg-[#B4F416] border-[3px] border-black rounded flex items-center justify-center shadow-[3px_3px_0px_0px_#000] flex-shrink-0 p-0">
              <div className="flex items-center justify-center w-full h-full">
                <Cat size={28} strokeWidth={3} className="text-black" />
              </div>
            </div>
            <div>
              {/* 标题 - 仅在移动端和平板竖屏显示 */}
              <h1 className="text-2xl md:text-3xl font-black tracking-tight lg:hidden text-gray-900 dark:text-gray-100">MAX笔记</h1>
              <p className="text-xs md:text-sm font-bold text-gray-600 dark:text-gray-400 transition-colors duration-300">
                {randomQuote}
              </p>
            </div>
          </div>
        </header>

        {/* Permission Warning Banner */}
        <PermissionWarningBanner />

        {/* 2. Top Section - 控制台 (增强间距呼吸感) */}
        <section className="mb-8 sm:mb-10 md:mb-14">
          {/* 第一行：每日计划（左）+ 我的学习（右） */}
          <div className="mb-8 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* 左侧：每日计划（占8列） */}
            <div className="lg:col-span-8">
              <LearningPlanWorkspace books={books} />
            </div>

            {/* 右侧：我的学习（占4列） */}
            <div className="lg:col-span-4 flex flex-col">
              {/* 区域标题：我的学习（加装饰方块） */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-4 h-8 bg-[#B4F416] border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000]"></div>
                <h2 className="text-xl font-black text-black dark:text-white tracking-tighter uppercase italic">
                  我的学习
                </h2>
              </div>

              {/* 移动端：三个卡片横向排列 */}
              <div className="lg:hidden grid grid-cols-3 gap-3">
                <div className="h-28">
                  <StatBox
                    icon={BookOpen}
                    label="错题本"
                    value={statsLoading ? '...' : mistakesCount}
                    unit="词"
                    color="bg-[#FF6B6B]"
                    href="/mistakes"
                  />
                </div>

                <div className="h-28">
                  <StatBox
                    icon={Calendar}
                    label="今日新增"
                    value={statsLoading ? '...' : todayNewWordsCount}
                    unit="词"
                    color="bg-[#4CC9F0]"
                    href="/calendar"
                  />
                </div>

                <div className="h-28">
                  <CreateButton />
                </div>
              </div>

              {/* PC/Pad：三个按钮垂直排列 */}
              <div className="hidden lg:flex flex-col gap-4">
                <div className="h-28">
                  <StatBox
                    icon={BookOpen}
                    label="错题本"
                    value={statsLoading ? '...' : mistakesCount}
                    unit="词"
                    color="bg-[#FF6B6B]"
                    href="/mistakes"
                  />
                </div>

                <div className="h-28">
                  <StatBox
                    icon={Calendar}
                    label="今日新增"
                    value={statsLoading ? '...' : todayNewWordsCount}
                    unit="词"
                    color="bg-[#4CC9F0]"
                    href="/calendar"
                  />
                </div>

                <div className="h-28">
                  <CreateButton />
                </div>
              </div>
            </div>
          </div>

          {/* 第二行：移动端可横向滑动的浏览记录卡片，桌面端显示6个（可横向滚动） */}
          {progressCards.length > 0 ? (
            <div className="mb-8">
              {/* 区域标题：浏览记录（加装饰方块） */}
              <div className="flex items-center gap-3 mb-6">
                <div className="w-4 h-8 bg-[#B4F416] border-2 border-black dark:border-white shadow-[2px_2px_0px_0px_#000]"></div>
                <h2 className="text-xl font-black text-black dark:text-white tracking-tighter uppercase italic">
                  浏览记录
                </h2>
              </div>
              {/* Mobile: 横向滚动容器 */}
              <div className="lg:hidden relative">
                <div className="overflow-x-auto pb-4 -mx-4 px-4">
                  <div className="flex gap-3" style={{ width: 'max-content' }}>
                    {progressCards.map((card, index) => (
                      <div key={card._uniqueKey || card.bookId} className="w-[calc(100vw-2rem)] max-w-[360px]">
                        <ProgressCardComponent {...card} isFirstCard={index === 0} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* 右侧半透明渐变遮罩 */}
                <div
                  className="absolute top-0 right-0 bottom-0 w-16 pointer-events-none bg-gradient-to-l from-gray-50 via-gray-50/50 to-transparent dark:from-gray-900 dark:via-gray-900/50 dark:to-transparent"
                />
              </div>

              {/* Desktop: 横向滚动容器，显示6个卡片 */}
              <div
                className="hidden lg:block relative group"
                onMouseEnter={() => {
                  // 鼠标进入时显示箭头
                  const container = (window as any).desktopBrowseScrollRef as HTMLDivElement
                  if (!container) return

                  const scrollLeft = container.scrollLeft
                  const scrollWidth = container.scrollWidth
                  const clientWidth = container.clientWidth

                  const leftBtn = (window as any).desktopBrowseLeftBtn
                  const rightBtn = (window as any).desktopBrowseRightBtn

                  if (leftBtn) {
                    leftBtn.style.opacity = scrollLeft > 0 ? '1' : '0'
                    leftBtn.style.pointerEvents = scrollLeft > 0 ? 'auto' : 'none'
                  }

                  if (rightBtn) {
                    rightBtn.style.opacity = scrollLeft < scrollWidth - clientWidth - 1 ? '1' : '0'
                    rightBtn.style.pointerEvents = scrollLeft < scrollWidth - clientWidth - 1 ? 'auto' : 'none'
                  }
                }}
                onMouseLeave={() => {
                  // 鼠标离开时隐藏所有箭头
                  const leftBtn = (window as any).desktopBrowseLeftBtn
                  const rightBtn = (window as any).desktopBrowseRightBtn

                  if (leftBtn) {
                    leftBtn.style.opacity = '0'
                    leftBtn.style.pointerEvents = 'none'
                  }

                  if (rightBtn) {
                    rightBtn.style.opacity = '0'
                    rightBtn.style.pointerEvents = 'none'
                  }
                }}
              >
                <div
                  ref={(el) => {
                    if (el) {
                      (window as any).desktopBrowseScrollRef = el
                    }
                  }}
                  className="flex gap-4 overflow-x-auto scroll-smooth pb-4"
                  style={{
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none' // IE/Edge
                  }}
                  onScroll={(e) => {
                    const target = e.target as HTMLDivElement
                    const scrollLeft = target.scrollLeft
                    const scrollWidth = target.scrollWidth
                    const clientWidth = target.clientWidth

                    // 控制左右箭头的显示/隐藏（仅在鼠标悬停时）
                    const leftBtn = (window as any).desktopBrowseLeftBtn
                    const rightBtn = (window as any).desktopBrowseRightBtn

                    if (leftBtn) {
                      leftBtn.style.opacity = scrollLeft > 0 ? '1' : '0'
                      leftBtn.style.pointerEvents = scrollLeft > 0 ? 'auto' : 'none'
                    }

                    if (rightBtn) {
                      rightBtn.style.opacity = scrollLeft < scrollWidth - clientWidth - 1 ? '1' : '0'
                      rightBtn.style.pointerEvents = scrollLeft < scrollWidth - clientWidth - 1 ? 'auto' : 'none'
                    }
                  }}
                >
                  <style jsx>{`
                    div::-webkit-scrollbar {
                      display: none;
                    }
                  `}</style>
                  {progressCards.map((card, index) => (
                    <div key={card._uniqueKey || card.bookId} className="w-[250px] max-w-[250px] flex-shrink-0">
                      <ProgressCardComponent {...card} isFirstCard={index === 0} />
                    </div>
                  ))}
                </div>

                {/* 左箭头按钮 */}
                <button
                  ref={(el) => {
                    if (el) {
                      (window as any).desktopBrowseLeftBtn = el
                    }
                  }}
                  onClick={() => {
                    const container = (window as any).desktopBrowseScrollRef as HTMLDivElement
                    if (container) {
                      container.scrollBy({ left: -264, behavior: 'smooth' }) // 卡片宽度(250) + 间距(4) + 边框(10)
                    }
                  }}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 z-10 w-10 h-10 bg-white dark:bg-slate-800 border-[3px] border-black dark:border-slate-600 rounded shadow-[4px_4px_0px_0px_#000] dark:shadow-none flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-200 hover:bg-[#B4F416] hover:-translate-x-2"
                  style={{ opacity: 0, pointerEvents: 'none' }}
                >
                  <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* 右箭头按钮 */}
                <button
                  ref={(el) => {
                    if (el) {
                      (window as any).desktopBrowseRightBtn = el
                    }
                  }}
                  onClick={() => {
                    const container = (window as any).desktopBrowseScrollRef as HTMLDivElement
                    if (container) {
                      container.scrollBy({ left: 264, behavior: 'smooth' })
                    }
                  }}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1 z-10 w-10 h-10 bg-white dark:bg-slate-800 border-[3px] border-black dark:border-slate-600 rounded shadow-[4px_4px_0px_0px_#000] dark:shadow-none flex items-center justify-center opacity-0 pointer-events-none transition-opacity duration-200 hover:bg-[#B4F416] hover:translate-x-2"
                  style={{ opacity: 0, pointerEvents: 'none' }}
                >
                  <svg className="w-5 h-5 text-black dark:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
          ) : (
            <div className="mb-8">
              <EmptyState />
            </div>
          )}
        </section>

        {/* 3. Library Grid - 书架 (三个 Tab) */}
        <BookLibrary
          userBooks={books}
          userPhone={userPhone || userEmail || '未设置'}
          userId={userId}
          recentBooks={liveRecentBooks}
        />

        {/* Footer */}
        <footer className="mt-12 md:mt-16 mb-8">
          <div className="bg-white dark:bg-gray-800 border-[3px] border-black shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] rounded px-6 md:px-8 py-4 md:py-6 text-center transition-colors duration-300">
            <p className="text-xs md:text-sm font-bold text-gray-600 dark:text-gray-400 transition-colors duration-300">
              🎓 MAX笔记 © 2026 · 智能英语学习平台
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
