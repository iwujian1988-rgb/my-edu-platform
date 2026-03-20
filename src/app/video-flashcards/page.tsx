/**
 * 视频卡片复习页面
 *
 * 基于 SM-2 算法的间隔重复复习
 */

import { Suspense } from 'react'
import { VideoFlashcardsClient } from './pageClient'

// 禁用静态生成（页面需要用户认证）
export const dynamic = 'force-dynamic'

export default function VideoFlashcardsPage() {
  return (
    <Suspense fallback={<div className="container py-6">加载中...</div>}>
      <VideoFlashcardsClient />
    </Suspense>
  )
}
