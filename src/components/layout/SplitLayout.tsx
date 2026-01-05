/**
 * SplitLayout - 左右分栏布局组件（iPad First）
 *
 * 用于登录页、注册页等需要左右分栏的页面
 * 在平板横屏上显示为左右两列，移动端显示为上下堆叠
 */

import React from 'react'

interface SplitLayoutProps {
  left: React.ReactNode
  right: React.ReactNode
  className?: string
}

export function SplitLayout({ left, right, className = '' }: SplitLayoutProps) {
  return (
    <div className={`grid grid-cols-1 lg:grid-cols-2 min-h-screen ${className}`}>
      {/* 左侧 - 品牌展示区域（平板横屏显示） */}
      <div className="hidden lg:flex flex-col justify-center p-12 lg:p-16 relative">
        {left}
      </div>

      {/* 右侧 - 表单/内容区域 */}
      <div className="flex flex-col justify-center p-6 lg:p-12 xl:p-16">
        {right}
      </div>
    </div>
  )
}
