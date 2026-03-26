'use client'

/**
 * 视频模块移动端底部导航
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 3.2
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 *
 * 样式：Neo-brutalism 风格，与全站保持一致
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, BarChart3, User } from 'lucide-react'

const MOBILE_NAV_ITEMS = [
  { href: '/videos', label: '首页', icon: Home },
  { href: '/video-stats', label: '知识点', icon: BarChart3 },
  { href: '/profile', label: '我的', icon: User },
]

export function VideoMobileNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-800 border-t-[3px] border-black dark:border-gray-600 transition-colors duration-300">
      <div className="flex items-center justify-around h-16 px-2">
        {MOBILE_NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href ||
            (item.href !== '/videos' && item.href !== '/profile' && pathname?.startsWith(item.href))

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex flex-col items-center justify-center gap-1 py-2 px-3 min-w-[56px] border-[2px] transition-all duration-150',
                isActive
                  ? 'border-black dark:border-gray-600 bg-[#B4F416] shadow-[2px_2px_0px_0px_#000] -translate-y-1'
                  : 'border-transparent text-gray-600 dark:text-gray-400'
              )}
            >
              <Icon className={cn('h-5 w-5', isActive ? 'text-black' : 'text-gray-600 dark:text-gray-400')} />
              <span className={cn(
                'text-xs font-bold',
                isActive ? 'text-black' : 'text-gray-600 dark:text-gray-400'
              )}>
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
