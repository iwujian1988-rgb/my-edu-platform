import { Suspense } from 'react'
import MatchGamePageClient from './pageClient'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default function MatchGamePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F8F5F2' }}>加载中...</div>}>
      <MatchGamePageClient />
    </Suspense>
  )
}
