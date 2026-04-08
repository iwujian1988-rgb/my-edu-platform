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

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { VideoNav } from './VideoNav'
import { VideoMobileNav } from './VideoMobileNav'
import { cn } from '@/lib/utils'

// 浅色模式的 CSS 变量
const LIGHT_MODE_VARS = {
  '--bg-primary': '#ffffff',
  '--bg-secondary': '#f9fafb',
  '--bg-tertiary': '#f3f4f6',
  '--text-primary': '#1f2937',
  '--text-secondary': '#6b7280',
  '--text-tertiary': '#9ca3af',
  '--accent': '#6366f1',
  '--border': '#e5e7eb',
  '--card-bg': '#ffffff',
  '--input-bg': '#F3F4F6',
}

interface VideoLayoutProps {
  children: React.ReactNode
}

export function VideoLayout({ children }: VideoLayoutProps) {
  const pathname = usePathname()

  // 强制浅色模式（只操作 DOM，不改变全局 ThemeContext 状态）
  const observerRef = useRef<MutationObserver | null>(null)
  const savedVarsRef = useRef<Record<string, string>>({})

  useEffect(() => {
    const html = document.documentElement

    // 保存原始状态
    const wasDark = html.classList.contains('dark')
    savedVarsRef.current = {}
    Object.keys(LIGHT_MODE_VARS).forEach((key) => {
      savedVarsRef.current[key] = html.style.getPropertyValue(key)
    })

    // 立即移除 dark 并设置浅色变量
    const applyLightMode = () => {
      html.classList.remove('dark')
      Object.entries(LIGHT_MODE_VARS).forEach(([key, value]) => {
        html.style.setProperty(key, value)
      })
    }

    applyLightMode()

    // 监听 class 和 style 变化，强制保持浅色
    observerRef.current = new MutationObserver(() => {
      if (html.classList.contains('dark')) {
        html.classList.remove('dark')
      }
      // 检查并修复 CSS 变量
      Object.entries(LIGHT_MODE_VARS).forEach(([key, value]) => {
        if (html.style.getPropertyValue(key) !== value) {
          html.style.setProperty(key, value)
        }
      })
    })

    observerRef.current.observe(html, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    })

    return () => {
      observerRef.current?.disconnect()
      // 恢复原来的状态
      if (wasDark) {
        html.classList.add('dark')
      }
      // 恢复原来的 CSS 变量
      Object.entries(savedVarsRef.current).forEach(([key, value]) => {
        if (value) {
          html.style.setProperty(key, value)
        } else {
          html.style.removeProperty(key)
        }
      })
    }
  }, [])

  // 判断是否为视频学习页（全屏播放）或播主详情页（沉浸式 banner）
  const isVideoLearningPage = pathname?.match(/^\/videos\/[^/]+$/)
  const isCreatorPage = pathname?.match(/^\/videos\/creators\//)
  const hideNav = isVideoLearningPage || isCreatorPage

  return (
    <div className="min-h-screen bg-background">
      {/* 顶部导航 - 沉浸式页面隐藏 */}
      {!hideNav && <VideoNav />}

      {/* 主内容区 */}
      <main
        className={cn(
          'pb-20 md:pb-0', // 移动端留出底部导航空间
          hideNav && 'pb-0' // 沉浸式页面不需要底部空间
        )}
      >
        {children}
      </main>

      {/* 移动端底部导航 - 沉浸式页面隐藏 */}
      {!hideNav && (
        <div className="md:hidden">
          <VideoMobileNav />
        </div>
      )}
    </div>
  )
}
