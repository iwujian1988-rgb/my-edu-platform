'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Library, Dumbbell, Settings, Cat } from 'lucide-react'
import { BookSelectorModal } from './BookSelectorModal'
import type { Book } from '@/types/book'
import { useTheme } from '@/contexts/ThemeContext'
import { useLoading } from './LoadingOverlay'

interface NavItem {
  label: string
  href: string
  icon: any
  comingSoon?: boolean
}

interface AppSidebarProps {
  books?: Book[]
  userId?: string
  scopeStatsMap?: Record<string, any>  // 🔧 性能优化：缓存统计信息
}

const navItems: NavItem[] = [
  { label: '工作台', href: '/', icon: Home },
  { label: '系统词库', href: '/library', icon: Library },
  { label: '肌肉训练', href: '/practice', icon: Dumbbell },
  { label: '系统设置', href: '/settings', icon: Settings },
]

export function AppSidebar({ books, userId, scopeStatsMap }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showBookSelector, setShowBookSelector] = useState(false)
  const { theme, mounted } = useTheme()
  const { showLoading } = useLoading()
  const isDark = mounted && theme === 'dark'

  // 处理导航点击，立即显示加载状态
  const handleNavigation = (href: string) => {
    showLoading()
    router.push(href)
  }

  return (
    <>
      {/* Desktop/Pad Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-64 border-r-[3px] border-black flex-col z-50 transition-colors duration-300"
            style={{ backgroundColor: 'var(--bg-secondary)' }}>
        {/* Logo */}
        <div className="p-6 border-b-[3px] border-black transition-colors duration-300"
             style={{ backgroundColor: 'var(--card-bg)' }}>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#B4F416] border-[3px] border-black rounded-xl flex items-center justify-center shadow-[3px_3px_0px_0px_#000]">
              <Cat size={28} strokeWidth={3} className="text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">MAX笔记</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            const Icon = item.icon
            const isMuscleTraining = item.label === '肌肉训练'
            const isSettings = item.label === '系统设置'

            if (item.comingSoon) {
              return (
                <div
                  key={item.href}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] border-black bg-gray-100 opacity-60 cursor-not-allowed relative"
                >
                  <Icon size={24} strokeWidth={2} className="text-gray-400" />
                  <span className="font-bold text-gray-400">{item.label}</span>
                  <span className="absolute right-3 text-[10px] font-bold text-gray-400 bg-gray-200 px-2 py-0.5 rounded-md border border-gray-300">
                    敬请期待
                  </span>
                </div>
              )
            }

            // 肌肉训练：打开弹层
            if (isMuscleTraining && books && books.length > 0) {
              return (
                <button
                  key={item.href}
                  onClick={() => setShowBookSelector(true)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] transition-all font-bold duration-300 ${
                    isActive
                      ? 'bg-[#B4F416] border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                      : 'border-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000]'
                  }`}
                  style={{
                    backgroundColor: isActive ? undefined : 'var(--card-bg)'
                  }}
                  suppressHydrationWarning
                >
                  <Icon size={24} strokeWidth={2} style={{ color: isActive ? 'black' : 'var(--text-secondary)' }} />
                  <span style={{ color: isActive ? 'black' : 'var(--text-primary)' }}>{item.label}</span>
                </button>
              )
            }

            // 设置：直接导航到/settings页面
            if (isSettings) {
              return (
                <button
                  key={item.href}
                  onClick={() => handleNavigation(item.href)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] transition-all font-bold duration-300 ${
                    isActive
                      ? 'bg-[#B4F416] border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                      : 'border-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000]'
                  }`}
                  style={{
                    backgroundColor: isActive ? undefined : 'var(--card-bg)'
                  }}
                  suppressHydrationWarning
                >
                  <Icon size={24} strokeWidth={2} style={{ color: isActive ? 'black' : 'var(--text-secondary)' }} />
                  <span style={{ color: isActive ? 'black' : 'var(--text-primary)' }}>{item.label}</span>
                </button>
              )
            }

            // 其他导航项
            return (
              <button
                key={item.href}
                onClick={() => handleNavigation(item.href)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-[3px] transition-all font-bold duration-300 ${
                  isActive
                    ? 'bg-[#B4F416] border-black shadow-[3px_3px_0px_0px_#000] -translate-y-0.5'
                    : 'border-black hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_#000] active:scale-95'
                }`}
                style={{
                  backgroundColor: isActive ? undefined : 'var(--card-bg)'
                }}
                suppressHydrationWarning
              >
                  <Icon size={24} strokeWidth={2} style={{ color: isActive ? 'black' : 'var(--text-secondary)' }} />
                  <span style={{ color: isActive ? 'black' : 'var(--text-primary)' }}>{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t-[3px] border-black">
          <div className="border-[3px] border-black rounded-xl p-4 transition-colors duration-300"
               style={{ backgroundColor: 'var(--bg-tertiary)' }}>
            <p className="text-xs font-bold text-center transition-colors duration-300"
               style={{ color: 'var(--text-secondary)' }}>
              🎓 MAX笔记 © 2026
            </p>
          </div>
        </div>
      </aside>

      {/* BookSelector Modal - 只在有books时显示 */}
      {showBookSelector && books && books.length > 0 && (
        <BookSelectorModal
          books={books}
          onClose={() => setShowBookSelector(false)}
          userId={userId}
          initialScopeStats={scopeStatsMap}
        />
      )}
    </>
  )
}
