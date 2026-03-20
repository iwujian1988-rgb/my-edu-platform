'use client'

/**
 * 管理后台布局组件
 * 包含侧边栏、顶部栏和主内容区域
 */

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  Users,
  Ticket,
  BookOpen,
  CheckSquare,
  BarChart,
  Shield,
  Settings,
  FileText,
  Menu,
  X,
  LogOut,
  Cat,
  Package,
  Mic,
  Video
} from 'lucide-react'
import { AdminUser } from '@/lib/admin-auth'

interface AdminLayoutProps {
  admin: AdminUser
  children: React.ReactNode
}

export function AdminLayoutComponent({ admin, children }: AdminLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // 根据角色显示不同的菜单
  const menuItems = getMenuItemsByRole(admin.role)

  const handleLogout = async () => {
    try {
      // 调用登出 API
      await fetch('/api/admin/auth/logout', { method: 'POST' })
      // 重定向到登录页
      router.push('/admin/login')
    } catch (error) {
      console.error('Logout error:', error)
      // 即使出错也尝试重定向
      router.push('/admin/login')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 侧边栏 */}
      <aside
        className={`
        fixed top-0 left-0 z-50 h-full w-72 bg-white border-r-[3px] border-black
        transform transition-transform duration-300 ease-in-out
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:translate-x-0
      `}
      >
        <div className="flex flex-col h-full">
          {/* Logo 区域 */}
          <div className="p-6 border-b-[2px] border-gray-200">
            <Link href="/admin/dashboard" className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded border-[3px] border-black shadow-[3px_3px_0px_0px_#000] flex items-center justify-center">
                <Cat size={24} className="text-white" strokeWidth={3} />
              </div>
              <div>
                <h1 className="text-xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
                  MAX笔记
                </h1>
                <p className="text-xs text-gray-500 font-semibold">管理后台</p>
              </div>
            </Link>
          </div>

          {/* 管理员信息 */}
          <div className="p-4 border-b-[2px] border-gray-200">
            <div className="bg-green-50 rounded p-3 border-[2px] border-green-200">
              <p className="text-sm font-bold text-gray-800">{admin.name}</p>
              <p className="text-xs text-gray-600">{getRoleDisplayName(admin.role)}</p>
              <p className="text-xs text-gray-500 mt-1">{admin.email}</p>
            </div>
          </div>

          {/* 导航菜单 */}
          <nav className="flex-1 overflow-y-auto p-4">
            <ul className="space-y-1">
              {menuItems.map((item) => {
                const isActive = pathname === item.path
                const Icon = item.icon
                const isDisabled = (item as any).disabled === true

                return (
                  <li key={item.path}>
                    {isDisabled ? (
                      <button
                        onClick={() => {
                          alert('功能开发中，敬请期待！')
                          setSidebarOpen(false)
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded font-semibold text-gray-400 cursor-not-allowed transition-all"
                        title="功能开发中"
                      >
                        <Icon size={20} strokeWidth={2.5} />
                        <span>{item.label}</span>
                      </button>
                    ) : (
                      <Link
                        href={item.path}
                        onClick={() => setSidebarOpen(false)}
                        className={`
                        flex items-center gap-3 px-4 py-3 rounded font-semibold transition-all
                        ${isActive
                          ? 'bg-green-500 text-white shadow-[3px_3px_0px_0px_#000]'
                          : 'text-gray-700 hover:bg-gray-100'
                        }
                      `}
                      >
                        <Icon size={20} strokeWidth={2.5} />
                        <span>{item.label}</span>
                      </Link>
                    )}
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* 底部操作 */}
          <div className="p-4 border-t-[2px] border-gray-200 space-y-2">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-3 rounded font-semibold text-red-600 hover:bg-red-50 transition-all"
            >
              <LogOut size={20} strokeWidth={2.5} />
              <span>退出登录</span>
            </button>
          </div>
        </div>
      </aside>

      {/* 主内容区域 */}
      <div className="lg:ml-72">
        {/* 顶部栏 */}
        <header className="sticky top-0 z-30 bg-white border-b-[3px] border-black shadow-sm">
          <div className="px-4 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              {/* 移动端菜单按钮 */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded hover:bg-gray-100 transition-colors"
              >
                {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
              </button>

              {/* 面包屑标题 */}
              <div className="flex-1 ml-4 lg:ml-0">
                <h2 className="text-xl font-bold text-gray-800">
                  {getPageTitle(pathname)}
                </h2>
              </div>

              {/* 右侧操作 */}
              <div className="flex items-center gap-4">
                <Link
                  href="/"
                  target="_blank"
                  className="hidden sm:inline-flex px-4 py-2 bg-gradient-to-br from-blue-400 to-blue-600 text-white font-semibold rounded border-[2px] border-black shadow-[2px_2px_0px_0px_#000] hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-y-0.5 transition-all text-sm"
                >
                  查看前台
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* 页面内容 */}
        <main className="p-4 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  )
}

/**
 * 根据角色返回菜单项
 */
function getMenuItemsByRole(role: AdminUser['role']) {
  const allItems = [
    {
      path: '/admin/dashboard',
      icon: LayoutDashboard,
      label: '仪表盘',
      roles: ['super_admin', 'content_admin', 'support']
    },
    {
      path: '/admin/users',
      icon: Users,
      label: '用户管理',
      roles: ['super_admin', 'content_admin', 'support']
    },
    {
      path: '/admin/invitation-codes',
      icon: Ticket,
      label: '邀请码管理',
      roles: ['super_admin', 'content_admin', 'support']
    },
    {
      path: '/admin/packages',
      icon: Package,
      label: '套餐管理',
      roles: ['super_admin', 'content_admin']
    },
    {
      path: '/admin/speaker/articles',
      icon: Mic,
      label: '雯姐学习法',
      roles: ['super_admin', 'content_admin']
    },
    {
      path: '/admin/videos',
      icon: Video,
      label: '视频管理',
      roles: ['super_admin', 'content_admin']
    },
    {
      path: '/admin/word-books',
      icon: BookOpen,
      label: '词库管理',
      roles: ['super_admin', 'content_admin']
    },
    {
      path: '/admin/reviews',
      icon: CheckSquare,
      label: '审核管理',
      roles: ['super_admin', 'content_admin'],
      disabled: true
    },
    {
      path: '/admin/statistics',
      icon: BarChart,
      label: '数据统计',
      roles: ['super_admin', 'content_admin', 'support'],
      disabled: true
    },
    {
      path: '/admin/administrators',
      icon: Shield,
      label: '管理员管理',
      roles: ['super_admin'],
      disabled: true
    },
    {
      path: '/admin/settings',
      icon: Settings,
      label: '系统设置',
      roles: ['super_admin'],
      disabled: true
    },
    {
      path: '/admin/audit-logs',
      icon: FileText,
      label: '操作日志',
      roles: ['super_admin', 'support'],
      disabled: true
    }
  ]

  return allItems.filter(item => item.roles.includes(role))
}

/**
 * 获取页面标题
 */
function getPageTitle(pathname: string): string {
  const titleMap: Record<string, string> = {
    '/admin/dashboard': '仪表盘',
    '/admin/users': '用户管理',
    '/admin/invitation-codes': '邀请码管理',
    '/admin/packages': '套餐管理',
    '/admin/speaker/articles': '雯姐学习法 - 文章管理',
    '/admin/videos': '视频管理',
    '/admin/word-books': '词库管理',
    '/admin/reviews': '审核管理',
    '/admin/statistics': '数据统计',
    '/admin/administrators': '管理员管理',
    '/admin/settings': '系统设置',
    '/admin/audit-logs': '操作日志'
  }

  // 精确匹配
  if (titleMap[pathname]) {
    return titleMap[pathname]
  }

  // 模糊匹配（用于详情页等）
  for (const [path, title] of Object.entries(titleMap)) {
    if (pathname.startsWith(path)) {
      return title
    }
  }

  return '管理后台'
}

/**
 * 获取角色显示名称
 */
function getRoleDisplayName(role: AdminUser['role']): string {
  const roleNames = {
    super_admin: '超级管理员',
    content_admin: '内容管理员',
    support: '客服人员'
  }
  return roleNames[role] || role
}
