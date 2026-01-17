'use client'

import Link from 'next/link'
import { Target, Calendar, BookOpen, Plus, Cat, LogOut, GraduationCap, PenTool, Gamepad2 } from 'lucide-react'
import { PermissionWarningBanner } from './PermissionDisplay'
import { BookLibrary } from './BookLibrary'
import EmptyState from './EmptyState'
import { ProgressCardProps, MODE_CONFIG, SCOPE_LABELS } from '@/types/progress'
import { formatTimeAgo } from '@/lib/timeUtils'

interface DashboardContentProps {
  books: any[]
  progressCards?: ProgressCardProps[]  // 添加可选
  mistakesCount: number
  todayNewWordsCount: number
  userEmail: string
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
  const content = (
    <div className="bg-white border-[3px] border-black rounded-xl shadow-[3px_3px_0px_0px_#000] lg:shadow-[4px_4px_0px_0px_#000] flex flex-col lg:flex-row items-start lg:items-center gap-3 p-4 lg:p-4 h-full lg:h-auto hover:-translate-y-1 transition-transform cursor-pointer group">
      {/* 关键修正：这里加了 border-2 border-black */}
      <div className={`w-10 h-10 lg:w-12 lg:h-12 ${color} border-2 border-black rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
        <Icon size={22} className="text-black lg:w-6 lg:h-6" strokeWidth={2} />
      </div>

      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider leading-none mb-1">{label}</p>
        <div className="flex items-baseline gap-1 leading-none">
          <span className="text-3xl lg:text-4xl font-black text-black">{value}</span>
          <span className="text-xs font-bold text-black">{unit}</span>
        </div>
      </div>
    </div>
  )

  return <Link href={href}>{content}</Link>
}

// --- 3. 进度卡片组件（支持多本书）---
function ProgressCardComponent(props: ProgressCardProps) {
  const { bookTitle, mode, progress, scopeType, currentIndex, totalWords, lastStudyTime, continueURL } = props

  // 获取模式配置
  const modeConfig = MODE_CONFIG[mode]
  const ModeIcon = modeConfig.icon
  const modeLabel = modeConfig.label
  const modeColor = modeConfig.color

  // 范围标签
  const scopeLabel = SCOPE_LABELS[scopeType]

  // 时间标签
  const timeLabel = formatTimeAgo(lastStudyTime)

  return (
    <Link href={continueURL} className="group">
      <div className="bg-white border-[3px] border-black rounded-xl shadow-[3px_3px_0px_0px_#000] lg:shadow-[4px_4px_0px_0px_#000] flex flex-col gap-3 p-4 h-full hover:-translate-y-1 transition-transform cursor-pointer">
        {/* Header: 书名 + 模式图标 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className="font-black text-base text-black leading-tight mb-1 truncate">{bookTitle}</h3>
            <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold">
              <span className="flex items-center gap-1">
                <ModeIcon size={12} className={modeColor.replace('bg-', 'text-')} />
                {modeLabel}
              </span>
              <span>•</span>
              <span>{scopeLabel}</span>
            </div>
          </div>
          <div className={`w-10 h-10 ${modeColor} border-2 border-black rounded-lg flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform`}>
            <ModeIcon size={20} className="text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Progress: 进度百分比 + 位置信息 */}
        <div>
          <div className="flex items-baseline gap-1 leading-none mb-2">
            <span className="text-3xl lg:text-4xl font-black text-black">{progress}</span>
            <span className="text-sm font-bold text-black">%</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 font-semibold">
            <span>{currentIndex + 1}/{totalWords}</span>
            <span>•</span>
            <span>{timeLabel}</span>
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
      <button className="w-full bg-[#B4F416] border-[3px] border-black rounded-xl shadow-[3px_3px_0px_0px_#000] lg:shadow-[4px_4px_0px_0px_#000] flex flex-col lg:flex-row items-start lg:items-center justify-between p-4 lg:p-4 h-full lg:h-auto gap-3 hover:-translate-y-1 transition-transform group relative overflow-hidden">
        <div className="relative z-10 text-left">
          <h3 className="font-black text-lg text-black leading-none mb-1">新建词库</h3>
          <p className="text-[10px] font-bold text-black/70">自定义单词书</p>
        </div>

        {/* 关键修正：bg-white, text-black, border-2 border-black */}
        <div className="relative z-10 w-10 h-10 lg:w-12 lg:h-12 bg-white text-black border-2 border-black rounded-full flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
          <Plus size={24} strokeWidth={3} />
        </div>
      </button>
    </Link>
  )
}

export function DashboardContent({
  books,
  progressCards = [],  // 添加默认值
  mistakesCount,
  todayNewWordsCount,
  userEmail,
  userId,
  recentBooks = []  // 🔧 性能优化：默认空数组
}: DashboardContentProps) {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-black font-sans p-4 md:p-8 lg:ml-64">
      <div className="max-w-7xl mx-auto">
        {/* 1. Header */}
        <header className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-10 gap-4">
          <div className="flex items-center gap-4">
            {/* Logo Box */}
            <div className="w-12 h-12 md:w-14 md:h-14 bg-[#B4F416] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
              <Cat size={28} strokeWidth={3} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-black tracking-tight">喵喵笔记</h1>
              <p className="text-xs md:text-sm font-bold text-gray-500 font-mono">{userEmail}</p>
            </div>
          </div>

          <Link
            href="/logout"
            className="px-5 py-2 bg-white border-[3px] border-black rounded-xl font-bold text-sm hover:bg-red-50 hover:-translate-y-0.5 transition-all flex items-center gap-2 shadow-[2px_2px_0px_0px_#000]"
          >
            <LogOut size={18} strokeWidth={3} />
            退出登录
          </Link>
        </header>

        {/* Permission Warning Banner */}
        <PermissionWarningBanner />

        {/* 2. Top Section - 控制台 (Mobile: 2x2 Grid, Desktop: 1x4 Row) */}
        <section className="mb-8 md:mb-12">
          {/* Mobile: 2x2 Grid | Desktop: 1x4 Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
            {/* StatBox 1-N - 最近学习进度卡片（最多3本） */}
            {progressCards.length > 0 ? (
              progressCards.slice(0, 3).map((card, index) => (
                <ProgressCardComponent key={card.bookId} {...card} />
              ))
            ) : (
              <EmptyState />
            )}

            {/* StatBox 2 - 错题本待复习 */}
            <StatBox
              icon={BookOpen}
              label="错题本待复习"
              value={mistakesCount}
              unit="词"
              color="bg-[#FF6B6B]"
              href="/mistakes"
            />

            {/* StatBox 3 - 今日新增单词 */}
            <StatBox
              icon={Calendar}
              label="今日新增单词"
              value={todayNewWordsCount}
              unit="词"
              color="bg-[#4ECDC4]"
              href="/calendar"
            />

            {/* Create Button - 全品牌色 */}
            <CreateButton />
          </div>
        </section>

        {/* 3. Library Grid - 书架 (三个 Tab) */}
        <BookLibrary userBooks={books} userEmail={userEmail} userId={userId} recentBooks={recentBooks} />

        {/* Footer */}
        <footer className="mt-12 md:mt-16 mb-8">
          <div className="bg-white border-[3px] border-black shadow-[3px_3px_0px_0px_#000] md:shadow-[4px_4px_0px_0px_#000] rounded-xl px-6 md:px-8 py-4 md:py-6 text-center">
            <p className="text-xs md:text-sm text-gray-600 font-bold">
              🎓 喵喵笔记 © 2026 · Premium Neo-Brutalism Design
            </p>
          </div>
        </footer>
      </div>
    </div>
  )
}
