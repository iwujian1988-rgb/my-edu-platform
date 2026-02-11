'use client'

import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, Library, Dumbbell, Settings, Mic } from 'lucide-react'
import { BookSelectorModal } from './BookSelectorModal'
import type { Book } from '@/types/book'
import { useTheme } from '@/contexts/ThemeContext'
import { useLoading } from './LoadingOverlay'
import { createClient } from '@/lib/supabase/client'

interface NavItem {
  label: string
  href: string
  icon: any
  comingSoon?: boolean
  requiresPermission?: string  // 需要的权限标识，如 'speaker'
}

interface AppSidebarProps {
  books?: Book[]
  userId?: string
  scopeStatsMap?: Record<string, any>  // 🔧 性能优化：缓存统计信息
  userPermissions?: string[]  // 用户权限列表，用于判断是否显示特定功能
}

const navItems: NavItem[] = [
  { label: '工作台', href: '/', icon: Home },
  { label: '系统词库', href: '/library', icon: Library },
  { label: '肌肉训练', href: '/practice', icon: Dumbbell },
  { label: '雯姐学习法', href: '/speaker', icon: Mic, requiresPermission: 'speaker' },
  { label: '系统设置', href: '/settings', icon: Settings },
]

export function AppSidebar({ books, userId, scopeStatsMap, userPermissions: propUserPermissions }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [showBookSelector, setShowBookSelector] = useState(false)
  const [userPermissions, setUserPermissions] = useState<string[]>(propUserPermissions || [])
  const { theme, mounted } = useTheme()
  const { showLoading } = useLoading()
  const isDark = mounted && theme === 'dark'

  // 获取用户权限
  // 优先级：用户自己设置的权限 > 套餐默认权限（通过 invitation_code 获取）
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
          if (isMounted) console.error('[AppSidebar] 获取用户权限失败:', error)
          return
        }

        if (!isMounted) return

        // 优先使用用户自己设置的权限（管理员在用户管理中单独设置的）
        if (data?.feature_permissions && data.feature_permissions.length > 0) {
          if (isMounted) {
            setUserPermissions(data.feature_permissions)
            console.log('[AppSidebar] 使用用户自定义权限:', data.feature_permissions)
          }
          return
        }

        // 如果用户没有单独设置权限，则通过 invitation_code 获取套餐权限
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
              if (isMounted) {
                setUserPermissions(packageData.feature_permissions)
                console.log('[AppSidebar] 使用套餐权限:', packageData.feature_permissions)
              }
            }
          }
        }
      } catch (error) {
        if (isMounted) console.error('[AppSidebar] 获取权限失败:', error)
      }
    }

    fetchUserPermissions()

    return () => {
      isMounted = false
    }
  }, [userId])

  // 检查用户是否有特定权限
  const hasPermission = (permission: string) => {
    // 🔥 优化1：如果用户已经在对应页面，说明肯定有权限
    if (permission === 'speaker' && pathname === '/speaker') {
      return true
    }
    // 🔥 优化2：权限还没加载完成（空数组 + 已登录），暂时显示所有菜单
    // 避免菜单闪烁，权限加载后会自动过滤
    if (userPermissions.length === 0 && userId) {
      return true
    }
    // 如果有明确的权限列表，按权限列表判断
    if (userPermissions.length > 0) {
      return userPermissions.includes(permission)
    }
    // 服务端渲染或未登录状态，不显示需要权限的菜单
    return false
  }

  // 处理导航点击，立即显示加载状态
  const handleNavigation = (href: string) => {
    // 防止在当前页面重复导航导致死循环
    if (pathname === href) {
      return
    }
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
            <div className="w-12 h-12 flex items-center justify-center">
              <img src="/icons/icon-512.png" alt="MAX笔记" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">MAX笔记</h1>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          {navItems.map((item) => {
            // 如果菜单项需要特定权限，而用户没有该权限，则不显示
            if (item.requiresPermission && !hasPermission(item.requiresPermission)) {
              return null
            }

            const isActive = pathname === item.href
            const Icon = item.icon
            const isMuscleTraining = item.label === '肌肉训练'
            const isSettings = item.label === '系统设置'

            if (item.comingSoon) {
              return (
                <button
                  key={item.href}
                  onClick={() => alert('功能开发中，敬请期待！')}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded border-[3px] border-black opacity-60 hover:opacity-80 transition-all relative cursor-not-allowed"
                  style={{ backgroundColor: 'var(--card-bg)' }}
                >
                  <Icon size={24} strokeWidth={2} style={{ color: 'var(--text-secondary)' }} />
                  <span className="font-bold" style={{ color: 'var(--text-secondary)' }}>{item.label}</span>
                  <span className="absolute right-3 text-[10px] font-bold px-2 py-0.5 rounded border-[2px]" style={{ backgroundColor: 'var(--bg-tertiary)', color: 'var(--text-secondary)', borderColor: 'var(--border)' }}>
                    敬请期待
                  </span>
                </button>
              )
            }

            // 肌肉训练：打开弹层
            if (isMuscleTraining && books && books.length > 0) {
              return (
                <button
                  key={item.href}
                  onClick={() => setShowBookSelector(true)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded border-[3px] transition-all font-bold duration-300 ${
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
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded border-[3px] transition-all font-bold duration-300 ${
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
                className={`w-full flex items-center gap-3 px-4 py-3 rounded border-[3px] transition-all font-bold duration-300 ${
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
          <div className="border-[3px] border-black rounded p-4 transition-colors duration-300"
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
