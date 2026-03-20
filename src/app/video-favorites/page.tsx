/**
 * 视频收藏页面
 *
 * 展示用户收藏的视频列表
 */

import { Suspense } from 'react'
import { VideoFavoritesClient } from './pageClient'

// 禁用静态生成（页面需要用户认证）
export const dynamic = 'force-dynamic'

export default function VideoFavoritesPage() {
  return (
    <Suspense fallback={<div className="container py-6">加载中...</div>}>
      <VideoFavoritesClient />
    </Suspense>
  )
}
