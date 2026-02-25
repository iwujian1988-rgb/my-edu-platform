'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Library, Dumbbell, Settings, Mic } from 'lucide-react'
import { useTheme } from '@/contexts/ThemeContext'
import { useLoading } from './LoadingOverlay'
import { BookSelectorModal } from './BookSelectorModal'
import type { Book } from '@/types/book'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  label: string
  href: string
  icon: any
  isPractice?: boolean // 标记是否为练习按钮
  requiresPermission?: string // 需要的权限标识
}

const navItems: NavItem[] = [
  { label: '工作台', href: '/', icon: Home },
  { label: '词库', href: '/library', icon: Library },
  { label: '练习', href: '/practice', icon: Dumbbell, isPractice: true },
  { label: '雯姐', href: '/speaker', icon: Mic, requiresPermission: 'speaker' },
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
  const [userPermissions, setUserPermissions] = useState<string[]>([])

  // 获取用户权限
  useEffect(() => {
    let isMounted = true

    const fetchUserPermissions = async () => {
      if (!userId) return

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('users')
          .select('feature_permissions, invitation_code_id')
          .eq('id', userId)
          .single()

        if (error) {
          if (isMounted) console.error('[MobileBottomNav] 获取用户权限失败:', error)
          return
        }

        if (!isMounted) return

        // 优先使用用户自己设置的权限
        if (data?.feature_permissions && data.feature_permissions.length > 0) {
          if (isMounted) setUserPermissions(data.feature_permissions)
          return
        }

        // 通过 invitation_code 获取套餐权限
        if (data?.invitation_code_id) {
          const { data: codeData } = await supabase
            .from('invitation_codes')
            .select('package_id')
            .eq('id', data.invitation_code_id)
            .single()

          if (!isMounted) return

          if (codeData?.package_id) {
            const { data: packageData } = await supabase
              .from('invitation_packages')
              .select('feature_permissions')
              .eq('id', codeData.package_id)
              .single()

            if (!isMounted) return

            if (packageData?.feature_permissions) {
              if (isMounted) setUserPermissions(packageData.feature_permissions)
            }
          }
        }
      } catch (error) {
        if (isMounted) console.error('[MobileBottomNav] 获取权限失败:', error)
      }
    }

    fetchUserPermissions()

    return () => {
      isMounted = false
    }
  }, [userId])

  // 检查用户是否有特定权限
  const hasPermission = (permission: string) => {
    // 如果用户已经在对应页面，说明肯定有权限
    if (permission === 'speaker' && pathname === '/speaker') {
      return true
    }
    // 权限还没加载完成，暂时显示所有菜单
    if (userPermissions.length === 0 && userId) {
      return true
    }
    // 如果有明确的权限列表，按权限列表判断
    if (userPermissions.length > 0) {
      return userPermissions.includes(permission)
    }
    return false
  }

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

            // 判断是否激活
            const isActive = isSettings ? pathname === '/settings' : pathname === item.href

            // 权限检查：如果需要权限但用户没有，则不显示
            if (item.requiresPermission && !hasPermission(item.requiresPermission)) {
              return null
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
                        <div className="absolute inset-0 bg-[#B4F416] rounded translate-y-1 translate-x-1" />
                      )}
                      <div
                        className={`relative w-12 h-12 rounded border-[2px] border-black flex items-center justify-center transition-all duration-200 ${
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
                        className="w-12 h-12 rounded border-[2px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] transition-all duration-200"
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
                    <div className="absolute inset-0 bg-[#B4F416] rounded translate-y-1 translate-x-1" />
                  )}
                  <div
                    className={`relative w-12 h-12 rounded border-[2px] border-black flex items-center justify-center transition-all duration-200 ${
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
                  <div className="absolute inset-0 bg-[#B4F416] rounded translate-y-1 translate-x-1" />
                )}
                <div
                  className={`relative w-12 h-12 rounded border-[2px] border-black flex items-center justify-center transition-all duration-200 ${
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
