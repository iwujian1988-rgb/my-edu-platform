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
import { usePathname, useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Home, BarChart3, Menu, X, Video, BookOpen, User, Headphones, LogOut, ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/videos', label: '首页', icon: Home },
  { href: '/video-stats', label: '知识点', icon: BarChart3 },
]

export function VideoNav() {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-12 items-center justify-between">
          {/* 左侧：Logo + 导航项 */}
          <div className="flex items-center gap-2">
            {/* Logo */}
            <Link
              href="/videos"
              className="flex items-center gap-2 px-3 py-1.5 bg-[#B4F416] dark:bg-gray-700 border-[2px] border-black dark:border-gray-600 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all font-black text-sm tracking-tight text-black dark:text-white"
            >
              <Video className="w-4 h-4" />
              <span className="hidden sm:inline">MAX笔记</span>
            </Link>

            {/* 导航项 */}
            {NAV_ITEMS.slice(1).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href ||
                (item.href !== '/videos' && pathname?.startsWith(item.href))

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all duration-150',
                    isActive
                      ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000] text-black'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-black dark:text-white'
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              )
            })}
          </div>

          {/* 右侧：卡片复习 + 用户下拉 + 移动端菜单 */}
          <div className="flex items-center gap-2">
            {/* 卡片复习按钮 */}
            <Link
              href="/video-flashcards"
              className="flex items-center gap-1.5 px-2 py-1.5 bg-[#B4F416] border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
            >
              <BookOpen className="h-3.5 w-3.5 text-black" />
              <span className="text-xs font-black text-black">复习</span>
            </Link>

            {/* 用户下拉菜单 - PC和iPad显示 */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="hidden md:flex items-center gap-1.5 px-2 py-1.5 bg-white dark:bg-gray-800 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] hover:shadow-[1px_1px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                <User className="h-3.5 w-3.5 text-black dark:text-white" />
                <span className="text-xs font-black text-black dark:text-white">我的</span>
                <ChevronDown className={cn("h-3 w-3 text-black dark:text-white transition-transform", userMenuOpen && "rotate-180")} />
              </button>

              {/* 下拉菜单内容 */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] z-50">
                  {/* 联系客服 */}
                  <button
                    onClick={() => {
                      window.open('https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1', '_blank')
                      setUserMenuOpen(false)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-black dark:text-white hover:bg-[#B4F416] transition-colors border-b-[2px] border-black dark:border-gray-600"
                  >
                    <Headphones className="h-4 w-4" />
                    联系客服
                  </button>
                  {/* 退出登录 */}
                  <button
                    onClick={() => {
                      setUserMenuOpen(false)
                      router.push('/logout')
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-bold text-black dark:text-white hover:bg-[#FF6B6B] hover:text-white transition-colors"
                  >
                    <LogOut className="h-4 w-4" />
                    退出登录
                  </button>
                </div>
              )}
            </div>

            {/* 移动端菜单按钮 */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-8 w-8 border-[2px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 p-0"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4 text-black dark:text-white" />
              ) : (
                <Menu className="h-4 w-4 text-black dark:text-white" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800">
          <nav className="max-w-[1600px] mx-auto px-4 py-3 flex flex-col gap-2">
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
                    'flex items-center gap-3 px-4 py-2.5 text-sm font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all duration-150',
                    isActive
                      ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] text-black'
                      : 'bg-white dark:bg-gray-800 text-black dark:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
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
