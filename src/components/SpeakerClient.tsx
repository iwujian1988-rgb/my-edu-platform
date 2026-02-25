/**
 * 演说家主页 - 客户端组件（包含导航）
 */

'use client'

import { AppSidebar } from './AppSidebar'
import { SpeakerPageContent } from './SpeakerPageContent'

interface SpeakerClientProps {
  initialArticles: any[]
  userId?: string
}

export function SpeakerClient({ initialArticles, userId }: SpeakerClientProps) {
  return (
    <>
      <AppSidebar
        books={[]}  // 演说家不需要书籍数据
        userId={userId}
      />
      <div className="lg:ml-64 min-h-screen">
        <SpeakerPageContent initialArticles={initialArticles} />
      </div>
    </>
  )
}
