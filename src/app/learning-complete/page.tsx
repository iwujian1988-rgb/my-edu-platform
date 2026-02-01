import { Suspense } from 'react'
import LearningCompleteClient from './pageClient'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default function LearningCompletePageWrapper() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <p className="font-mono text-sm" style={{ color: 'var(--text-secondary)' }}>
            加载中...
          </p>
        </div>
      </div>
    }>
      <LearningCompleteClient />
    </Suspense>
  )
}
