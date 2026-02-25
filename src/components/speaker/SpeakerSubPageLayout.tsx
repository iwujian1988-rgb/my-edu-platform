/**
 * 雯姐学习法子页面布局组件
 *
 * 为子页面（Step1-4、魔鬼生词本等）提供统一的底部导航
 */

'use client'

import { ReactNode } from 'react'
import { MobileBottomNav } from '@/components/MobileBottomNav'

interface SpeakerSubPageLayoutProps {
  children: ReactNode
  userId?: string
}

export function SpeakerSubPageLayout({ children, userId }: SpeakerSubPageLayoutProps) {
  return (
    <>
      {/* 主内容区域 - 添加底部padding避免被导航遮挡 */}
      <div className="pb-20 lg:pb-0">
        {children}
      </div>

      {/* 移动端底部导航 */}
      <MobileBottomNav userId={userId} />
    </>
  )
}
