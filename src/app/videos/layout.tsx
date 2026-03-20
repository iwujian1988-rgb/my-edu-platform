/**
 * 视频模块页面布局
 *
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 */

import { VideoLayout } from '@/components/video/layout/VideoLayout'

export default function VideosRootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <VideoLayout>{children}</VideoLayout>
}
