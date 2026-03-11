/**
 * 演说家主页 - 客户端组件（包含导航）
 */

'use client'

import { AppSidebar } from './AppSidebar'
import { SpeakerPageContent } from './SpeakerPageContent'
import { MobileBottomNav } from './MobileBottomNav'

interface SpeakerClientProps {
  initialArticles: any[]
  userId?: string
}

export function SpeakerClient({ initialArticles, userId }: SpeakerClientProps) {
  return (
    <>
      {/* 桌面端侧边栏 */}
      <AppSidebar
        books={[]}  // 演说家不需要书籍数据
        userId={userId}
      />
      <div className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <SpeakerPageContent initialArticles={initialArticles} />
      </div>
      {/* 移动端底部导航 */}
      <MobileBottomNav userId={userId} />
    </>
  )
}
