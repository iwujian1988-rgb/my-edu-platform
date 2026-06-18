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
import { Home, BarChart3, Menu, X, Video, BookOpen, User, Headphones, LogOut, ChevronDown, GraduationCap } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'

const NAV_ITEMS = [
  { href: '/videos', label: '首页', icon: Home },
  { href: '/parcours', label: '系统课程', icon: GraduationCap },
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
    <header className="sticky top-0 z-50 w-full border-b border-[#e7eaf2] bg-white/92 backdrop-blur-xl transition-colors duration-300 dark:border-[#273149] dark:bg-[#0f1424]/92">
      <div className="mx-auto max-w-[1480px] px-3 sm:px-6 lg:px-8">
        <div className="flex h-[68px] items-center justify-between">
          {/* 左侧：Logo + 导航项 */}
          <div className="flex items-center gap-2">
            {/* Logo */}
            <Link
              href="/videos"
              className="flex items-center gap-2.5 text-[20px] font-extrabold tracking-normal text-[#101426] transition-colors hover:text-[#2d39bb] dark:text-white dark:hover:text-[#bcc5ff]"
            >
              <span className="grid h-[34px] w-[34px] place-items-center rounded-[9px] bg-gradient-to-br from-[#4454ee] to-[#6752ff] text-white shadow-[0_8px_18px_rgba(68,82,238,0.2)]">
                <Video className="h-4 w-4" />
              </span>
              <span className="hidden sm:inline">视频首页</span>
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
                    'relative hidden h-[38px] items-center gap-1.5 rounded-[8px] px-3 text-sm font-bold tracking-normal transition-all duration-150 md:flex',
                    isActive
                      ? 'bg-[#f1f2ff] text-[#2d39bb] dark:bg-[#202a4d] dark:text-[#bcc5ff]'
                      : 'text-[#4f586d] hover:bg-[#f3f5fb] hover:text-[#2d39bb] dark:text-[#c5cce0] dark:hover:bg-[#202941] dark:hover:text-white'
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
              className="flex h-[38px] items-center gap-1.5 rounded-[9px] bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-3 text-white shadow-[0_8px_18px_rgba(48,56,196,0.22)] transition-all hover:-translate-y-0.5 hover:shadow-[0_10px_22px_rgba(48,56,196,0.26)]"
            >
              <BookOpen className="h-3.5 w-3.5" />
              <span className="text-xs font-bold">复习</span>
            </Link>

            {/* 用户下拉菜单 - PC和iPad显示 */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="hidden h-[38px] items-center gap-1.5 rounded-[9px] border border-[#e7eaf2] bg-white px-3 text-[#343947] shadow-[0_6px_14px_rgba(31,42,104,0.05)] transition-all hover:-translate-y-0.5 hover:border-[#d7dceb] hover:bg-[#f8faff] dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#c5cce0] dark:hover:bg-[#202941] md:flex"
              >
                <User className="h-3.5 w-3.5" />
                <span className="text-xs font-bold">我的</span>
                <ChevronDown className={cn("h-3 w-3 transition-transform", userMenuOpen && "rotate-180")} />
              </button>

              {/* 下拉菜单内容 */}
              {userMenuOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-[12px] border border-[#e7eaf2] bg-white shadow-[0_14px_34px_rgba(31,42,104,0.12)] dark:border-[#273149] dark:bg-[#141b2d]">
                  {/* 联系客服 */}
                  <button
                    onClick={() => {
                      window.open('https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1', '_blank')
                      setUserMenuOpen(false)
                    }}
                    className="flex w-full items-center gap-2 border-b border-[#e7eaf2] px-3 py-2.5 text-sm font-bold text-[#343947] transition-colors hover:bg-[#f1f2ff] hover:text-[#2d39bb] dark:border-[#273149] dark:text-[#c5cce0] dark:hover:bg-[#202a4d] dark:hover:text-white"
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
                    className="flex w-full items-center gap-2 px-3 py-2.5 text-sm font-bold text-[#343947] transition-colors hover:bg-[#fff0f0] hover:text-[#d43737] dark:text-[#c5cce0] dark:hover:bg-[#3a1e28] dark:hover:text-white"
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
              className="h-9 w-9 rounded-[9px] border border-[#e7eaf2] bg-white p-0 shadow-[0_6px_14px_rgba(31,42,104,0.05)] hover:bg-[#f8faff] dark:border-[#273149] dark:bg-[#141b2d] dark:hover:bg-[#202941] md:hidden"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-4 w-4 text-[#343947] dark:text-white" />
              ) : (
                <Menu className="h-4 w-4 text-[#343947] dark:text-white" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* 移动端下拉菜单 */}
      {mobileMenuOpen && (
        <div className="border-t border-[#e7eaf2] bg-white/96 shadow-[0_12px_24px_rgba(31,42,104,0.08)] dark:border-[#273149] dark:bg-[#0f1424]/96 md:hidden">
          <nav className="mx-auto flex max-w-[1480px] flex-col gap-2 px-4 py-3">
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
                    'flex items-center gap-3 rounded-[10px] px-4 py-2.5 text-sm font-bold tracking-normal transition-all duration-150',
                    isActive
                      ? 'bg-gradient-to-br from-[#2633a8] to-[#6550ff] text-white shadow-[0_8px_18px_rgba(48,56,196,0.2)]'
                      : 'bg-[#f3f5fb] text-[#343947] dark:bg-[#202941] dark:text-[#c5cce0]'
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
