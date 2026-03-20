/**
 * 视频列表页（首页）
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 4.1
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 */

import VideoListClient from './pageClient'

// 禁用静态生成，因为页面包含用户个性化内容
export const dynamic = 'force-dynamic'

export default function VideosPage() {
  return <VideoListClient />
}
