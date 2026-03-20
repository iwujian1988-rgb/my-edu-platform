'use client'

/**
 * 视频模块独立布局
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 4.2
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 *
 * 特点：
 * - 不复用旧的主导航
 * - 独立的顶部导航 + 移动端底部导航
 * - 语言筛选器（筛选视频列表，非全局切换）
 */

import { usePathname } from 'next/navigation'
import { VideoNav } from './VideoNav'
import { VideoMobileNav } from './VideoMobileNav'
import { cn } from '@/lib/utils'

interface VideoLayoutProps {
  children: React.ReactNode
}

export function VideoLayout({ children }: VideoLayoutProps) {
  const pathname = usePathname()

  // 判断是否为视频学习页（全屏播放）
  const isVideoLearningPage = pathname?.match(/^\/videos\/[^/]+$/)

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 - 非全屏学习页时显示 */}
      {!isVideoLearningPage && <VideoNav />}

      {/* 主内容区 */}
      <main
        className={cn(
          'pb-20 md:pb-0', // 移动端留出底部导航空间
          isVideoLearningPage && 'pb-0' // 学习页不需要底部空间
        )}
      >
        {children}
      </main>

      {/* 移动端底部导航 - 非全屏学习页时显示 */}
      {!isVideoLearningPage && (
        <div className="md:hidden">
          <VideoMobileNav />
        </div>
      )}
    </div>
  )
}
