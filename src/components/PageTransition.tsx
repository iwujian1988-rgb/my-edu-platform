'use client'

import { ReactNode } from 'react'

interface PageTransitionProps {
  children: ReactNode
  className?: string
}

/**
 * 页面过渡动画组件
 * 为页面内容提供淡入和滑入动画效果
 */
export function PageTransition({ children, className = '' }: PageTransitionProps) {
  return (
    <div className={`animate-fade-in animate-slide-in ${className}`}>
      {children}
    </div>
  )
}
