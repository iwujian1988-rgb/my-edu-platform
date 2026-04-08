'use client'

import { useState, useEffect, useRef } from 'react'

/** 滚动阈值：超过此值视为"已滚动" */
const SCROLL_THRESHOLD = 150

/**
 * 检测页面是否滚动超过阈值
 *
 * 使用 requestAnimationFrame 节流，避免 scroll 事件频繁触发重渲染。
 * 向下滚动超过阈值返回 true，回到顶部附近返回 false。
 */
export function useIsScrolled(threshold: number = SCROLL_THRESHOLD): boolean {
  const [isScrolled, setIsScrolled] = useState(false)
  const rafId = useRef<number>(0)

  useEffect(() => {
    const handleScroll = () => {
      if (rafId.current) return
      rafId.current = requestAnimationFrame(() => {
        setIsScrolled(window.scrollY > threshold)
        rafId.current = 0
      })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    // 初始检测
    setIsScrolled(window.scrollY > threshold)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (rafId.current) cancelAnimationFrame(rafId.current)
    }
  }, [threshold])

  return isScrolled
}
