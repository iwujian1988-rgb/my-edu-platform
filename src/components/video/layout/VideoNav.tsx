'use client'

/**
 * 视频模块顶部导航栏
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 4.1
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 *
 * 样式：Neo-brutalism 风格，与全站保持一致
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, RefreshCw, BarChart3, User, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

const NAV_ITEMS = [
  { href: '/videos', label: '首页', icon: Home },
  { href: '/video-flashcards', label: '复习', icon: RefreshCw },
  { href: '/video-stats', label: '统计', icon: BarChart3 },
]

export function VideoNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 items-center justify-between">
          {/* 导航项 - 直接放在左侧 */}
          <nav className="flex items-center gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href ||
                (item.href !== '/videos' && pathname?.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 text-sm font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all duration-150',
                    isActive
                      ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] text-black'
                      : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 text-black dark:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              )
            })}
          </nav>

          {/* 右侧：用户菜单 */}
          <div className="flex items-center gap-3">
            {/* 用户菜单 */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="relative h-9 w-9 rounded-full border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all p-0"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatar.png" alt="用户头像" />
                    <AvatarFallback className="bg-[#B4F416]">
                      <User className="h-4 w-4 text-black" />
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-56 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]"
                align="end"
                forceMount
              >
                <DropdownMenuItem asChild className="cursor-pointer font-bold">
                  <Link href="/profile">个人中心</Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-black dark:bg-gray-600 h-[2px]" />
                <DropdownMenuItem asChild className="cursor-pointer font-bold">
                  <Link href="/">返回主页</Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-5 w-5 text-black dark:text-white" />
              ) : (
                <Menu className="h-5 w-5 text-black dark:text-white" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800">
          <nav className="max-w-7xl mx-auto px-4 py-4 flex flex-col gap-2">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href ||
                (item.href !== '/videos' && pathname?.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 text-sm font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all duration-150',
                    isActive
                      ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] text-black'
                      : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] text-black dark:text-white'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
    </header>
  )
}
