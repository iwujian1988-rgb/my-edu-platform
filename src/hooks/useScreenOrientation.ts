/**
 * useScreenOrientation Hook
 *
 * 职责：检测屏幕方向
 *
 * 核心逻辑：
 * 1. 检测窗口宽高比判断屏幕方向
 * 2. 监听窗口大小变化
 * 3. 竖屏模式：宽度 <= 高度
 *
 * 单一职责：只负责屏幕方向检测
 */

import { useState, useEffect } from 'react'

export function useScreenOrientation() {
  const [isPortrait, setIsPortrait] = useState(true)
  const [screenSize, setScreenSize] = useState({ width: 0, height: 0 })

  useEffect(() => {
    // 检测屏幕方向
    const checkOrientation = () => {
      const width = window.innerWidth
      const height = window.innerHeight
      setScreenSize({ width, height })

      // 竖屏判断：宽度 <= 高度
      const portrait = width <= height
      setIsPortrait(portrait)

      console.log(`📱 Screen: ${width}x${height}, isPortrait: ${portrait}`)
    }

    // 初始检测
    checkOrientation()

    // 监听窗口大小变化
    window.addEventListener('resize', checkOrientation)

    return () => window.removeEventListener('resize', checkOrientation)
  }, [])

  return {
    isPortrait,
    screenSize
  }
}
