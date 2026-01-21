'use client'

import { AppSidebar } from './AppSidebar'
import { DashboardContent } from './DashboardContent'
import { MobileBottomNav } from './MobileBottomNav'
import type { Book } from '@/types/book'
import type { ProgressCardProps } from '@/types/progress'

interface DashboardClientProps {
  books: Book[]
  userId: string
  scopeStatsMap: Record<string, any>
  progressCards: ProgressCardProps[]
  lastStudyBook: any
  mistakesCount?: number  // 🔧 改为可选
  todayNewWordsCount?: number  // 🔧 改为可选
  userPhone: string
  recentBooks: any[]
}

export function DashboardClient({
  books,
  userId,
  scopeStatsMap,
  progressCards,
  lastStudyBook,
  mistakesCount,
  todayNewWordsCount,
  userPhone,
  recentBooks
}: DashboardClientProps) {
  return (
    <>
      <AppSidebar
        books={books}
        userId={userId}
        scopeStatsMap={scopeStatsMap}
      />
      <DashboardContent
        books={books}
        progressCards={progressCards}
        lastStudyBook={lastStudyBook}
        // 🔥 性能优化：不传递统计数字，让DashboardContent异步加载
        userPhone={userPhone}
        userId={userId}
        recentBooks={recentBooks}
      />
      <MobileBottomNav
        books={books}
        userId={userId}
        scopeStatsMap={scopeStatsMap}
      />
    </>
  )
}
