import { Suspense } from 'react'
import ClearCachePageClient from './ClearCachePageClient'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default function ClearCachePage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#F8FAFC]">清除缓存中...</div>}>
      <ClearCachePageClient />
    </Suspense>
  )
}
