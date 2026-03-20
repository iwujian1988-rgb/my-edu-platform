/**
 * 视频学习统计页面
 *
 * 展示用户的学习进度、统计数据等
 */

import { Suspense } from 'react'
import { VideoStatsClient } from './pageClient'

// 禁用静态生成（页面需要用户认证）
export const dynamic = 'force-dynamic'

export default function VideoStatsPage() {
  return (
    <Suspense fallback={<div className="container py-6">加载中...</div>}>
      <VideoStatsClient />
    </Suspense>
  )
}
