"use client"

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

type ThemeMode = 'light' | 'dark' | 'auto'

interface ThemeContextType {
  theme: 'light' | 'dark'
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  isNightTime: boolean
  mounted: boolean // 🔥 添加 mounted 状态，避免 hydration 不匹配
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  // 🔥 添加 mounted 状态，确保服务器端和客户端首次渲染一致
  const [mounted, setMounted] = useState(false)

  // 🔥 从 localStorage 读取保存的主题模式，如果没有则默认为 'auto'
  const [themeMode, setThemeMode] = useState<ThemeMode>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('themeMode')
      if (saved === 'light' || saved === 'dark' || saved === 'auto') {
        return saved
      }
    }
    return 'auto'
  })

  // 检查是否是夜间时间（18:00-6:00）
  const checkNightTime = () => {
    const now = new Date()
    const hour = now.getHours()
    return hour >= 18 || hour < 6
  }

  // 🔥 优化：初始化时就计算正确的主题，避免闪烁
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window === 'undefined') {
      return 'light' // SSR 时默认值
    }

    const savedMode = localStorage.getItem('themeMode') || 'auto'
    const isNight = checkNightTime()

    if (savedMode === 'dark' || (savedMode === 'auto' && isNight)) {
      return 'dark'
    }
    return 'light'
  })

  const [isNightTime, setIsNightTime] = useState(checkNightTime())

  // 🔥 组件挂载后设置 mounted
  useEffect(() => {
    setMounted(true)
  }, [])

  // 💾 保存 themeMode 到 localStorage
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('themeMode', themeMode)
    }
  }, [themeMode])

  // 更新主题
  useEffect(() => {
    const updateTheme = () => {
      const night = checkNightTime()
      setIsNightTime(night)

      // 根据模式决定主题
      if (themeMode === 'auto') {
        setTheme(night ? 'dark' : 'light')
      } else {
        setTheme(themeMode)
      }
    }

    updateTheme()

    // 每分钟检查一次（自动切换）
    const interval = setInterval(updateTheme, 60000)

    return () => clearInterval(interval)
  }, [themeMode])

  // 🔥 立即应用主题到 DOM（无闪烁）
  useEffect(() => {
    const root = document.documentElement

    if (theme === 'dark') {
      // 添加 dark 类以启用 Tailwind 的 dark: 前缀
      root.classList.add('dark')

      // 蓝黑色夜间主题
      root.style.setProperty('--bg-primary', '#111827')      // 深灰黑
      root.style.setProperty('--bg-secondary', '#1f2937')    // 次级背景
      root.style.setProperty('--bg-tertiary', '#374151')     // 第三级背景
      root.style.setProperty('--text-primary', '#f9fafb')    // 主文字（纯白 - 更亮）
      root.style.setProperty('--text-secondary', '#d1d5db')  // 次要文字（亮白 - 更亮）
      root.style.setProperty('--text-tertiary', '#9ca3af')   // 三级文字（浅灰白 - 更亮）
      root.style.setProperty('--accent', '#818cf8')          // 强调色（蓝色）
      root.style.setProperty('--border', '#374151')          // 边框色
      root.style.setProperty('--card-bg', '#1f2937')         // 卡片背景
    } else {
      // 移除 dark 类
      root.classList.remove('dark')

      // 日间主题（保持原有颜色）
      root.style.setProperty('--bg-primary', '#ffffff')
      root.style.setProperty('--bg-secondary', '#f9fafb')
      root.style.setProperty('--bg-tertiary', '#f3f4f6')
      root.style.setProperty('--text-primary', '#1f2937')
      root.style.setProperty('--text-secondary', '#6b7280')
      root.style.setProperty('--text-tertiary', '#9ca3af')
      root.style.setProperty('--accent', '#6366f1')
      root.style.setProperty('--border', '#e5e7eb')
      root.style.setProperty('--card-bg', '#ffffff')
    }
  }, [theme])

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, isNightTime, mounted }}>
      {children}
    </ThemeContext.Provider>
  )
}

// 便捷 Hook
export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return context
}
