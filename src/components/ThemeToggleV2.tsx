"use client"

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useState, useEffect } from 'react'

/**
 * 优化的主题切换按钮 v2
 *
 * 体验优化：
 * 1. 一键切换（最常用）
 * 2. 长按显示更多选项
 * 3. 记住用户偏好
 * 4. 平滑过渡动画
 */
export function ThemeToggleV2() {
  const { theme, themeMode, setThemeMode, isNightTime, mounted } = useTheme()
  const [showMenu, setShowMenu] = useState(false)

  // 从 localStorage 读取用户偏好
  useEffect(() => {
    const saved = localStorage.getItem('themeMode')
    if (saved && saved !== 'auto') {
      setThemeMode(saved as 'light' | 'dark')
    }
  }, [setThemeMode])

  // 保存用户偏好
  const handleSetTheme = (mode: 'auto' | 'light' | 'dark') => {
    setThemeMode(mode)
    localStorage.setItem('themeMode', mode)
    setShowMenu(false)
  }

  // 快速切换：在自动/日间/夜间间循环
  const handleQuickToggle = () => {
    const modes: ('auto' | 'light' | 'dark')[] = ['auto', 'light', 'dark']
    const currentIndex = modes.indexOf(themeMode)
    const nextMode = modes[(currentIndex + 1) % modes.length]
    handleSetTheme(nextMode)
  }

  if (!mounted) {
    return (
      <div className="relative w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 shadow-sm opacity-50" />
    )
  }

  return (
    <div className="relative">
      {/* 主按钮 - 一键切换 */}
      <button
        onClick={handleQuickToggle}
        onContextMenu={(e) => {
          e.preventDefault()
          setShowMenu(!showMenu)
        }}
        className="
          relative w-10 h-10 rounded-full
          bg-gray-100 dark:bg-gray-800
          hover:bg-gray-200 dark:hover:bg-gray-700
          transition-all duration-300
          flex items-center justify-center
          shadow-sm hover:shadow-md
        "
        title={`当前：${themeMode === 'auto' ? (isNightTime ? '夜间（自动）' : '日间（自动）') : (themeMode === 'dark' ? '夜间' : '日间')}\n右键点击查看更多选项`}
      >
        {/* 图标动画 */}
        <div className="relative">
          <Sun
            className={`
              w-5 h-5 absolute transition-all duration-300
              ${theme === 'dark' ? 'opacity-0 rotate-90 scale-0' : 'opacity-100 rotate-0 scale-100'}
              text-yellow-500
            `}
          />
          <Moon
            className={`
              w-5 h-5 absolute transition-all duration-300
              ${theme === 'dark' ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'}
              text-blue-400
            `}
          />
        </div>

        {/* 状态指示点 */}
        {themeMode === 'auto' && (
          <div
            className={`
              absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white dark:border-gray-800
              transition-colors duration-300
              ${isNightTime ? 'bg-blue-500' : 'bg-green-500'}
            `}
            title={isNightTime ? '夜间时间（18:00-6:00）' : '日间时间（6:00-18:00）'}
          />
        )}
      </button>

      {/* 右键菜单 - 更多选项 */}
      {showMenu && (
        <>
          {/* 遮罩层 */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowMenu(false)}
          />

          {/* 菜单 */}
          <div
            className="
              absolute right-0 top-12 z-50
              w-40 bg-white dark:bg-gray-800
              rounded shadow-lg
              border border-gray-200 dark:border-gray-700
              overflow-hidden
              animate-in fade-in slide-in-from-top-2 duration-200
            "
          >
            {/* 自动 */}
            <button
              onClick={() => handleSetTheme('auto')}
              className={`
                w-full px-4 py-3 flex items-center gap-3
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
                ${themeMode === 'auto' ? 'bg-gray-50 dark:bg-gray-750' : ''}
              `}
            >
              <Monitor className={`w-5 h-5 ${themeMode === 'auto' ? 'text-blue-500' : 'text-gray-500'}`} />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">自动</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  18:00-6:00 夜间
                </div>
              </div>
              {themeMode === 'auto' && (
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
              )}
            </button>

            {/* 日间 */}
            <button
              onClick={() => handleSetTheme('light')}
              className={`
                w-full px-4 py-3 flex items-center gap-3
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
                ${themeMode === 'light' ? 'bg-gray-50 dark:bg-gray-750' : ''}
              `}
            >
              <Sun className={`w-5 h-5 ${themeMode === 'light' ? 'text-yellow-500' : 'text-gray-500'}`} />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">日间模式</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  浅色背景
                </div>
              </div>
              {themeMode === 'light' && (
                <div className="w-2 h-2 bg-yellow-500 rounded-full" />
              )}
            </button>

            {/* 夜间 */}
            <button
              onClick={() => handleSetTheme('dark')}
              className={`
                w-full px-4 py-3 flex items-center gap-3
                hover:bg-gray-100 dark:hover:bg-gray-700
                transition-colors
                ${themeMode === 'dark' ? 'bg-gray-50 dark:bg-gray-750' : ''}
              `}
            >
              <Moon className={`w-5 h-5 ${themeMode === 'dark' ? 'text-blue-400' : 'text-gray-500'}`} />
              <div className="flex-1 text-left">
                <div className="text-sm font-medium">夜间模式</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  蓝黑背景
                </div>
              </div>
              {themeMode === 'dark' && (
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
              )}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
