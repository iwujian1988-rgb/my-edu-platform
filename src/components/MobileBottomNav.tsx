'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Library, Dumbbell, Settings, Mic } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLoading } from './LoadingOverlay'
import { BookSelectorModal } from './BookSelectorModal'
import type { Book } from '@/types/book'

interface NavItem {
  label: string
  href: string
  icon: any
  isPractice?: boolean // 标记是否为练习按钮
  disabled?: boolean // 标记是否禁用
  disabledMessage?: string // 禁用时显示的提示信息
}

const navItems: NavItem[] = [
  { label: '工作台', href: '/', icon: Home },
  { label: '词库', href: '/library', icon: Library },
  { label: '练习', href: '/practice', icon: Dumbbell, isPractice: true },
  { label: '演说家', href: '/speaker', icon: Mic, disabled: true, disabledMessage: '功能开发中，敬请期待！' },
  { label: '设置', icon: Settings }, // 特殊处理
]

interface MobileBottomNavProps {
  books?: Book[]
  userId?: string
  scopeStatsMap?: Record<string, any>
}

export function MobileBottomNav({ books = [], userId, scopeStatsMap }: MobileBottomNavProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, mounted } = useTheme()
  const { showLoading } = useLoading()
  const isDark = mounted && theme === 'dark'
  const [showBookSelector, setShowBookSelector] = useState(false)

  // 处理导航点击，立即显示加载状态
  const handleNavigation = (href: string) => {
    showLoading()
    router.push(href)
  }

  return (
    <>
      {/* 词库选择弹层 */}
      {showBookSelector && books.length > 0 && (
        <BookSelectorModal
          books={books}
          onClose={() => setShowBookSelector(false)}
          userId={userId}
          initialScopeStats={scopeStatsMap}
        />
      )}

      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 border-t-[3px] border-black transition-colors duration-300"
            style={{ backgroundColor: 'var(--card-bg)' }}>
        <div className="flex items-stretch">
          {navItems.map((item) => {
            const Icon = item.icon
            const isSettings = item.label === '设置'
            const isPractice = item.isPractice
            const isDisabled = item.disabled

            // 判断是否激活
            const isActive = isSettings ? pathname === '/settings' : pathname === item.href

            // 禁用项（演说家）
            if (isDisabled) {
              return (
                <button
                  key={item.label}
                  onClick={() => alert(item.disabledMessage || '功能开发中，敬请期待！')}
                  className="flex-1 flex flex-col items-center justify-center py-3 px-2 opacity-50 transition-all duration-200"
                  suppressHydrationWarning
                >
                  <div className="relative mb-2">
                    <div
                      className="w-12 h-12 rounded-lg border-[2px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition-all duration-200"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--text-secondary)',
                      }}
                    >
                      <Icon className="w-6 h-6" strokeWidth={2.5} />
                    </div>
                  </div>
                  <span
                    className="text-xs font-black"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {item.label}
                  </span>
                </button>
              )
            }

            // 练习按钮：打开弹层（如果有books）
            if (isPractice) {
              if (books && books.length > 0) {
                return (
                  <button
                    key={item.label}
                    onClick={() => setShowBookSelector(true)}
                    className="flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 active:scale-95"
                    suppressHydrationWarning
                  >
                    {/* Neo-Brutalism 图标容器 */}
                    <div className={`relative mb-2 transition-all duration-200 ${isActive ? '-translate-y-1' : ''}`}>
                      {isActive && (
                        <div className="absolute inset-0 bg-[#B4F416] rounded-lg translate-y-1 translate-x-1" />
                      )}
                      <div
                        className={`relative w-12 h-12 rounded-lg border-[2px] border-black flex items-center justify-center transition-all duration-200 ${
                          isActive ? 'shadow-[2px_2px_0px_0px_#000]' : 'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]'
                        }`}
                        style={{
                          backgroundColor: isActive ? '#B4F416' : 'var(--bg-secondary)',
                          color: isActive ? '#000' : 'var(--text-secondary)',
                        }}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                    </div>

                    {/* 文字标签 */}
                    <span
                      className={`text-xs font-black transition-all duration-200 ${isActive ? 'text-[#B4F416]' : ''}`}
                      style={{ color: isActive ? undefined : 'var(--text-secondary)' }}
                    >
                      {item.label}
                    </span>
                  </button>
                )
              } else {
                // 没有books时，跳转到practice页面
                return (
                  <button
                    key={item.label}
                    onClick={() => handleNavigation(item.href)}
                    className="flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 active:scale-95"
                    suppressHydrationWarning
                  >
                    <div className="relative mb-2">
                      <div
                        className="w-12 h-12 rounded-lg border-[2px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition-all duration-200"
                        style={{
                          backgroundColor: 'var(--bg-secondary)',
                          color: 'var(--text-secondary)',
                        }}
                      >
                        <Icon className="w-6 h-6" strokeWidth={2.5} />
                      </div>
                    </div>
                    <span
                      className="text-xs font-black"
                      style={{ color: 'var(--text-secondary)' }}
                    >
                      {item.label}
                    </span>
                  </button>
                )
              }
            }

            // 设置按钮：直接导航到/settings
            if (isSettings) {
              return (
                <button
                  key={item.label}
                  onClick={() => handleNavigation('/settings')}
                  className="flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 active:scale-95"
                  suppressHydrationWarning
                >
                {/* Neo-Brutalism 图标容器 */}
                <div className={`relative mb-2 transition-all duration-200 ${isActive ? '-translate-y-1' : ''}`}>
                  {isActive && (
                    <div className="absolute inset-0 bg-[#B4F416] rounded-lg translate-y-1 translate-x-1" />
                  )}
                  <div
                    className={`relative w-12 h-12 rounded-lg border-[2px] border-black flex items-center justify-center transition-all duration-200 ${
                      isActive ? 'shadow-[2px_2px_0px_0px_#000]' : 'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]'
                    }`}
                    style={{
                      backgroundColor: isActive ? '#B4F416' : 'var(--bg-secondary)',
                      color: isActive ? '#000' : 'var(--text-secondary)',
                    }}
                  >
                    <Icon className="w-6 h-6" strokeWidth={2.5} />
                  </div>
                </div>

                {/* 文字标签 */}
                <span
                  className={`text-xs font-black transition-all duration-200 ${isActive ? 'text-[#B4F416]' : ''}`}
                  style={{ color: isActive ? undefined : 'var(--text-secondary)' }}
                >
                  {item.label}
                </span>
              </button>
              )
            }

          // 普通导航：使用 button + router
          return (
            <button
              key={item.label}
              onClick={() => handleNavigation(item.href)}
              className="flex-1 flex flex-col items-center justify-center py-3 px-2 transition-all duration-200 active:scale-95"
              suppressHydrationWarning
            >
              {/* Neo-Brutalism 图标容器 */}
              <div className={`relative mb-2 transition-all duration-200 ${isActive ? '-translate-y-1' : ''}`}>
                {isActive && (
                  <div className="absolute inset-0 bg-[#B4F416] rounded-lg translate-y-1 translate-x-1" />
                )}
                <div
                  className={`relative w-12 h-12 rounded-lg border-[2px] border-black flex items-center justify-center transition-all duration-200 ${
                    isActive ? 'shadow-[2px_2px_0px_0px_#000]' : 'shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)]'
                  }`}
                  style={{
                    backgroundColor: isActive ? '#B4F416' : 'var(--bg-secondary)',
                    color: isActive ? '#000' : 'var(--text-secondary)',
                  }}
                >
                  <Icon className="w-6 h-6" strokeWidth={2.5} />
                </div>
              </div>

              {/* 文字标签 */}
              <span
                className={`text-xs font-black transition-all duration-200 ${isActive ? 'text-[#B4F416]' : ''}`}
                style={{ color: isActive ? undefined : 'var(--text-secondary)' }}
              >
                {item.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
    </>
  )
}
