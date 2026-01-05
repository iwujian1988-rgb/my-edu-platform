/**
 * PageContainer - 标准页面容器
 *
 * 用于大多数页面的外层容器
 * 提供统一的背景色、最大宽度和内边距
 */

import React from 'react'

interface PageContainerProps {
  children: React.ReactNode
  className?: string
}

export function PageContainer({ children, className = '' }: PageContainerProps) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F8F5F2' }}>
      <div className={`w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 ${className}`}>
        {children}
      </div>
    </div>
  )
}
