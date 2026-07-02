/**
 * 演说家主页 - 客户端组件（包含导航）
 */

'use client'

import { AppSidebar } from './AppSidebar'
import { SpeakerPageContent } from './SpeakerPageContent'
import { MobileBottomNav } from './MobileBottomNav'
import type { SpeakerArticle } from '@/types/speaker'

interface SpeakerClientProps {
  initialArticles: SpeakerArticle[]
  initialLanguage?: string
  userId?: string
  userPermissions?: string[]
}

export function SpeakerClient({ initialArticles, initialLanguage, userId, userPermissions }: SpeakerClientProps) {
  return (
    <>
      {/* 桌面端侧边栏 */}
      <AppSidebar
        books={[]}  // 演说家不需要书籍数据
        userId={userId}
        userPermissions={userPermissions}
      />
      <div className="lg:ml-64 min-h-screen pb-20 lg:pb-0">
        <SpeakerPageContent initialArticles={initialArticles} initialLanguage={initialLanguage} />
      </div>
      {/* 移动端底部导航 */}
      <MobileBottomNav userId={userId} userPermissions={userPermissions} />
    </>
  )
}
