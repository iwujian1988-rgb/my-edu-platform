import { Suspense } from 'react'
import { VideoWorkflowClient } from './pageClient'

export default function NewVideoPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent animate-spin rounded-full mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">加载中...</p>
        </div>
      </div>
    }>
      <VideoWorkflowClient />
    </Suspense>
  )
}
