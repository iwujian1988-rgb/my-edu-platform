'use client'

/**
 * 视频模块移动端底部导航
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 3.2
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, RefreshCw, Star, BarChart3, User } from 'lucide-react'

const MOBILE_NAV_ITEMS = [
  { href: '/videos', label: '首页', icon: Home },
  { href: '/video-flashcards', label: '复习', icon: RefreshCw },
  { href: '/video-favorites', label: '收藏', icon: Star },
  { href: '/video-stats', label: '统计', icon: BarChart3 },
  { href: '/profile', label: '我的', icon: User },
]

export function VideoMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex items-center justify-around h-16">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/videos' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[60px]',
                'transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive && 'text-primary')} />
              <span className={cn('text-xs', isActive && 'font-medium')}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
