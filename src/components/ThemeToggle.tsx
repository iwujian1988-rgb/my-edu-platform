"use client"

import { Moon, Sun, Monitor } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'

/**
 * 主题切换按钮组件
 *
 * 功能：
 * - 自动：18:00-6:00 夜间模式，其他时间日间模式
 * - 日间：强制日间模式
 * - 夜间：强制夜间模式
 */
export function ThemeToggle() {
  const { themeMode, setThemeMode, isNightTime } = useTheme()

  const modes = [
    { value: 'auto' as const, icon: Monitor, label: '自动' },
    { value: 'light' as const, icon: Sun, label: '日间' },
    { value: 'dark' as const, icon: Moon, label: '夜间' },
  ]

  return (
    <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
      {modes.map((mode) => {
        const Icon = mode.icon
        const isActive = themeMode === mode.value

        return (
          <button
            key={mode.value}
            onClick={() => setThemeMode(mode.value)}
            className={`
              relative flex items-center justify-center
              w-10 h-10 rounded-md
              transition-all duration-200
              ${isActive
                ? 'bg-white dark:bg-gray-700 shadow-sm'
                : 'hover:bg-gray-200 dark:hover:bg-gray-600'
              }
            `}
            title={mode.label}
          >
            <Icon
              className={`w-5 h-5 ${
                isActive
                  ? 'text-blue-600 dark:text-blue-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}
            />

            {/* 自动模式下显示夜间状态指示器 */}
            {mode.value === 'auto' && isNightTime && (
              <div
                className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full border-2 border-white dark:border-gray-800"
                title="当前为夜间时间"
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
