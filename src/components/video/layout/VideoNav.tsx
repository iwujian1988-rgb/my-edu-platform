'use client'

/**
 * 视频模块顶部导航栏
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 4.1
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Video, Home, RefreshCw, Star, BarChart3, User, Menu, X } from 'lucide-react'
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
import { useUserPackages } from '@/hooks/useUserPackages'
import { Skeleton } from '@/components/ui/skeleton'

const NAV_ITEMS = [
  { href: '/videos', label: '首页', icon: Home },
  { href: '/video-flashcards', label: '复习', icon: RefreshCw },
  { href: '/video-favorites', label: '收藏', icon: Star },
  { href: '/video-stats', label: '统计', icon: BarChart3 },
]

export function VideoNav() {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { packages, loading } = useUserPackages()

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        {/* Logo */}
        <Link href="/videos" className="flex items-center gap-2 mr-6">
          <Video className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg hidden sm:inline-block">视频学习</span>
        </Link>

        {/* 桌面端导航 */}
        <nav className="hidden md:flex items-center gap-1 flex-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href ||
              (item.href !== '/videos' && pathname?.startsWith(item.href))

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* 右侧：用户套餐 + 用户菜单 */}
        <div className="flex items-center gap-3 ml-auto">
          {/* 用户套餐标签 */}
          <div className="hidden lg:flex items-center gap-2">
            {loading ? (
              <Skeleton className="h-6 w-24" />
            ) : packages.length > 0 ? (
              packages.slice(0, 3).map((pkg) => (
                <span
                  key={pkg.id}
                  className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                >
                  {pkg.package?.name || '套餐'}
                </span>
              ))
            ) : null}
          </div>

          {/* 用户菜单 */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                <Avatar className="h-8 w-8">
                  <AvatarImage src="/avatar.png" alt="用户头像" />
                  <AvatarFallback>
                    <User className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuItem asChild>
                <Link href="/profile">个人中心</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/">返回主页</Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* 移动端菜单按钮 */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t bg-background">
          <nav className="container py-4 flex flex-col gap-2">
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
                    'flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {item.label}
                </Link>
              )
            })}

            {/* 移动端显示套餐 */}
            {packages.length > 0 && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2 px-3">我的套餐</p>
                <div className="flex flex-wrap gap-2 px-3">
                  {packages.map((pkg) => (
                    <span
                      key={pkg.id}
                      className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary"
                    >
                      {pkg.package?.name || '套餐'}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}
