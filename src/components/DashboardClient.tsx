'use client'

import { AppSidebar } from './AppSidebar'
import { DashboardContent } from './DashboardContent'
import { MobileBottomNav } from './MobileBottomNav'
import { PromoPopup } from './PromoPopup'
import type { Book } from '@/types/book'
import type { ProgressCardProps } from '@/types/progress'

interface DashboardClientProps {
  books: Book[]
  userId: string
  scopeStatsMap: Record<string, any>
  progressCards: ProgressCardProps[]
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
        userPhone={userPhone}
        userId={userId}
        recentBooks={recentBooks}
      />
      <MobileBottomNav
        books={books}
        userId={userId}
        scopeStatsMap={scopeStatsMap}
      />
      {/* 运营弹窗 */}
      <PromoPopup />
    </>
  )
}
