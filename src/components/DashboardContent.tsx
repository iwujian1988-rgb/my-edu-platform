'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Target, Calendar, BookOpen, Plus, GraduationCap } from 'lucide-react'
import { PermissionWarningBanner } from './PermissionDisplay'
import { BookLibrary } from './BookLibrary'
import EmptyState from './EmptyState'
import { ProgressCardProps, MODE_CONFIG, SCOPE_LABELS } from '@/types/progress'
import { formatTimeAgo } from '@/lib/timeUtils'
import { useLoading } from '@/components/LoadingOverlay'

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

// --- 1. 修正后的统计块 (加了边框，加粗了外轮廓) ---
function StatBox({
  icon: Icon,
  label,
  value,
  unit,
  color,
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
    <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0px_0px_#000] dark:shadow-none lg:shadow-[4px_4px_0px_0px_#000] lg:dark:shadow-none flex flex-col lg:flex-row items-start lg:items-center gap-3 p-4 lg:p-4 h-full lg:h-auto hover:-translate-y-1 transition-transform cursor-pointer group">
      <div className={`w-10 h-10 lg:w-12 lg:h-12 ${color} border-2 border-black dark:border-gray-600 rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon size={22} className="text-black dark:text-white lg:w-6 lg:h-6" strokeWidth={2} />
      </div>

      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-bold uppercase tracking-wider leading-none mb-1 text-gray-400 dark:text-gray-500">{label}</p>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-3xl lg:text-4xl font-black text-gray-900 dark:text-gray-100">{value}</span>
          <span className="text-xs font-bold text-gray-900 dark:text-gray-100">{unit}</span>
        </div>
      </div>
    </div>
  )

  return (
    <Link href={href} onClick={handleClick}>
      {content}
    </Link>
  )
}

// --- 3. 工业风进度卡片组件 (Industrial Neo-Brutalism) ---
function ProgressCardComponent(props: ProgressCardProps) {
  const { bookTitle, mode, progress, scopeType, currentIndex, totalWords, learnedCount, lastStudyTime, continueURL, bookId } = props
  const { showLoading } = useLoading()

  const handleClick = () => {
    // 立即显示 loading，给用户即时反馈
    showLoading()
  }

  // 获取模式配置
  const modeConfig = MODE_CONFIG[mode]
  const ModeIcon = modeConfig.icon
  const modeLabel = modeConfig.label
  const themeColor = modeConfig.color
  const themeLight = modeConfig.light
  const themeDark = modeConfig.dark

  // 范围标签
  const scopeLabel = SCOPE_LABELS[scopeType]

  // 构建副标题：模式 + 范围
  const subText = `${modeLabel} · ${scopeLabel}`

  // 生成任务编号 (基于 bookId 的 hash，保持一致性)
  const taskNumber = `TASK-${String(bookId?.slice(0, 2) || '01').toUpperCase()}`

  return (
    <Link
      href={continueURL}
      onClick={handleClick}
      className="group block"
      data-testid="progress-card"
      data-book-id={bookId}
    >
      <div className="group relative w-full h-44 cursor-pointer active:scale-95 transition-transform">
        {/* A. 阴影层 (深色偏移，模拟厚度) */}
        <div className="absolute inset-0 bg-gray-900 dark:bg-black rounded-xl translate-x-2 translate-y-2 transition-transform group-hover:translate-x-3 group-hover:translate-y-3" />

        {/* B. 卡片主体 */}
        <div className="relative h-full bg-white dark:bg-gray-800 border-2 border-black dark:border-gray-600 rounded-xl overflow-hidden flex flex-col transition-transform group-hover:-translate-y-0.5 group-hover:-translate-x-0.5">

          {/* --- 顶部 Header: 工业编号栏 --- */}
          <div className="h-9 border-b-2 border-black dark:border-gray-600 flex items-center justify-between px-3 bg-gray-50 dark:bg-gray-700">
            {/* 装饰性编号 */}
            <span className="font-mono text-[10px] font-bold text-gray-400 dark:text-gray-500 tracking-widest">
              {taskNumber}
            </span>
            {/* 装饰性螺丝钉 */}
            <div className="flex gap-1.5">
              <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
              <div className="w-1 h-1 rounded-full bg-gray-300 dark:bg-gray-600"></div>
            </div>
          </div>

          {/* --- 中间 Content: 核心信息 --- */}
          <div className="p-4 flex-1 flex flex-col justify-between relative">

            {/* 1. 标题与右上角按键 */}
            <div className="flex justify-between items-start">
              <div className="flex-1 min-w-0 pr-2">
                {/* 标题 - 粗体无衬线 */}
                <h3 className="text-xl font-black text-black dark:text-white leading-none tracking-tight truncate">
                  {bookTitle}
                </h3>

                {/* 模式标签 (Badge 风格) */}
                <div className="mt-2 inline-flex items-center px-1.5 py-0.5 border border-black dark:border-gray-600 rounded bg-gray-100 dark:bg-gray-700">
                  <ModeIcon className="w-3 h-3 mr-1 text-gray-600 dark:text-gray-300" strokeWidth={2.5} />
                  <span className="text-[10px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                    {subText}
                  </span>
                </div>
              </div>

              {/* 右上角图标 (实体按键风格) */}
              <div className={`w-9 h-9 border-2 border-black dark:border-gray-600 rounded shadow-[2px_2px_0px_0px_#000] dark:shadow-none flex items-center justify-center shrink-0 ${themeLight} ${themeDark}`}>
                <ModeIcon className="w-5 h-5 text-black dark:text-white" strokeWidth={2} />
              </div>
            </div>

            {/* 2. 底部数据区 (精密仪表盘风格) */}
            <div className="flex items-end justify-between mt-2">
              {/* 左侧：巨大百分比 */}
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono mb-[-2px]">PROGRESS</span>
                <div className="text-4xl font-black text-black dark:text-white leading-none">
                  {progress}<span className="text-lg ml-1">%</span>
                </div>
              </div>

              {/* 右侧：详细数据 (等宽字体) */}
              <div className="text-right">
                <div className="font-mono text-xs font-bold text-black dark:text-white bg-gray-100 dark:bg-gray-700 px-1 border border-gray-200 dark:border-gray-600 rounded mb-1">
                  {learnedCount ?? 0} / {totalWords}
                </div>
                <div className="text-[10px] font-bold text-gray-400 dark:text-gray-500 flex items-center justify-end gap-1">
                  <div className={`w-1.5 h-1.5 rounded-full ${themeColor}`}></div>
                  <TimeLabel timestamp={lastStudyTime} />
                </div>
              </div>
            </div>

          </div>

          {/* 底部进度条 - 绝对定位贴边 */}
          <div className="absolute bottom-0 left-0 w-full h-1.5 bg-gray-100 dark:bg-gray-700 border-t-2 border-black dark:border-gray-600">
            <div
              className="h-full border-r-2 border-black dark:border-gray-600 transition-all duration-500"
              style={{ width: `${progress}%`, backgroundColor: mode === 'typing' ? '#ccff00' : '#000' }}
            />
          </div>

        </div>
      </div>
    </Link>
  )
}

// --- 2. 修正后的新建按钮 (白底黑圈) ---
function CreateButton() {
  return (
    <Link href="/library/new">
      <button className="w-full bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 rounded-xl shadow-[3px_3px_0px_0px_#000] dark:shadow-none lg:shadow-[4px_4px_0px_0px_#000] lg:dark:shadow-none flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 lg:p-4 h-full lg:h-auto gap-3 hover:-translate-y-1 transition-transform group relative overflow-hidden">
        <div className="relative z-10 text-left">
          <h3 className="font-black text-lg leading-none mb-1 text-gray-900 dark:text-gray-100">新建词库</h3>
          <p className="text-[10px] font-bold text-gray-600 dark:text-gray-400">自定义单词书</p>
        </div>

        {/* 圆形按钮 */}
        <div className="relative z-10 w-10 h-10 lg:w-12 lg:h-12 border-2 border-black dark:border-gray-600 rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform bg-[#B4F416]">
          <Plus size={24} strokeWidth={3} className="text-black dark:text-white" />
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
          const data = await mistakesRes.json()
          setMistakesCount(data.count || 0)
        }

        if (todayRes.ok) {
          const data = await todayRes.json()
          setTodayNewWordsCount(data.count || 0)
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
          const data = await res.json()
          if (data.success && data.data) {
            setLiveRecentBooks(data.data)
            console.log('🔄 [Dashboard] 更新最近访问:', data.data.length, '本书')
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
          <div className="flex items-center gap-4">
            {/* Logo Box - 仅在移动端和平板竖屏显示 */}
            <div className="block md:block lg:hidden w-12 h-12 md:w-14 md:h-14 bg-[#B4F416] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
              <GraduationCap size={28} strokeWidth={3} className="text-black" />
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

        {/* 2. Top Section - 控制台 (两行布局) */}
        <section className="mb-6 sm:mb-8 md:mb-12">
          {/* 第一行：移动端可横向滑动的最近学习卡片，桌面端显示3个 */}
          {progressCards.length > 0 ? (
            <div className="mb-6">
              {/* 区域标题：最近学习 */}
              <div className="flex items-center gap-2 mb-4">
                <div className="w-1 h-6 bg-black dark:bg-gray-100"></div>
                <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">最近学习</h2>
              </div>
              {/* Mobile: 横向滚动容器 */}
              <div className="lg:hidden relative">
                <div className="overflow-x-auto pb-4 -mx-4 px-4">
                  <div className="flex gap-4" style={{ width: 'max-content' }}>
                    {progressCards.map((card, index) => (
                      <div key={card.bookId} className="w-[calc(100vw-2rem)] max-w-[360px]">
                        <ProgressCardComponent {...card} />
                      </div>
                    ))}
                  </div>
                </div>
                {/* 右侧半透明渐变遮罩 */}
                <div
                  className="absolute top-0 right-0 bottom-0 w-16 pointer-events-none bg-gradient-to-l from-gray-50 via-gray-50/50 to-transparent dark:from-gray-900 dark:via-gray-900/50 dark:to-transparent"
                />
              </div>

              {/* Desktop: 3列网格，卡片固定宽度，左对齐 */}
              <div className="hidden lg:flex lg:gap-6">
                {progressCards.slice(0, 3).map((card, index) => (
                  <div key={card.bookId} className="w-[340px] max-w-[340px]">
                    <ProgressCardComponent {...card} />
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <EmptyState />
            </div>
          )}

          {/* 第二行：错题本、今日新增、新建词库 */}
          <div>
            {/* 区域标题：我的学习 */}
            <div className="flex items-center gap-2 mb-4">
              <div className="w-1 h-6 bg-black dark:bg-gray-100"></div>
              <h2 className="text-xl font-black text-gray-900 dark:text-gray-100 tracking-tight">我的学习</h2>
            </div>
            {/* 移动端：三个卡片一屏显示 */}
            <div className="lg:hidden grid grid-cols-3 gap-3">
              {/* StatBox 1 - 错题本待复习 */}
              <StatBox
                icon={BookOpen}
                label="错题本待复习"
                value={statsLoading ? '...' : mistakesCount}
                unit="词"
                color="bg-[#FF6B6B]"
                href="/mistakes"
              />

              {/* StatBox 2 - 今日新增单词 */}
              <StatBox
                icon={Calendar}
                label="今日新增单词"
                value={statsLoading ? '...' : todayNewWordsCount}
                unit="词"
                color="bg-[#4ECDC4]"
                href="/calendar"
              />

              {/* Create Button - 全品牌色 */}
              <CreateButton />
            </div>

            {/* PC/Pad：固定宽度2/3，居左显示 */}
            <div className="hidden lg:flex lg:gap-6">
              <div className="w-[227px] max-w-[227px]">
                <StatBox
                  icon={BookOpen}
                  label="错题本待复习"
                  value={statsLoading ? '...' : mistakesCount}
                  unit="词"
                  color="bg-[#FF6B6B]"
                  href="/mistakes"
                />
              </div>
              <div className="w-[227px] max-w-[227px]">
                <StatBox
                  icon={Calendar}
                  label="今日新增单词"
                  value={statsLoading ? '...' : todayNewWordsCount}
                  unit="词"
                  color="bg-[#4ECDC4]"
                  href="/calendar"
                />
              </div>
              <div className="w-[227px] max-w-[227px]">
                <CreateButton />
              </div>
            </div>
          </div>
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
          <div className="bg-white dark:bg-gray-800 border-[3px] border-black shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] rounded-xl px-6 md:px-8 py-4 md:py-6 text-center transition-colors duration-300">
            <p className="text-xs md:text-sm font-bold text-gray-600 dark:text-gray-400 transition-colors duration-300">
              🎓 MAX笔记 © 2026 · 智能英语学习平台
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
