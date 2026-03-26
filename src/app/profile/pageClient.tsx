'use client'

/**
 * 个人中心页面
 *
 * 包含学习日历等个人信息
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ChevronLeft, Headphones, LogOut } from 'lucide-react'
import LearningCalendar from '@/components/video/LearningCalendar'

export function ProfileClient() {
  const router = useRouter()

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 返回按钮 + 页面标题 */}
        <div className="mb-6">
          <Link
            href="/videos"
            className="inline-flex items-center gap-1.5 mb-4 text-sm font-bold text-gray-500 hover:text-black dark:hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>返回视频</span>
          </Link>
          <h1 className="text-2xl font-black text-black dark:text-white">我的</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            查看你的学习记录和进度
          </p>
        </div>

        {/* 学习日历 */}
        <div className="lg:hidden mb-6">
          <Suspense fallback={<CalendarSkeleton />}>
            <LearningCalendar />
          </Suspense>
        </div>

        {/* 功能菜单 */}
        <div className="space-y-3">
          {/* 联系客服 */}
          <button
            onClick={() => window.open('https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1', '_blank')}
            className="w-full flex items-center justify-between p-4 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#4ECDC4] border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                <Headphones size={20} className="text-white" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="font-black text-black dark:text-white">联系客服</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">需要帮助？随时联系我们</div>
              </div>
            </div>
            <span className="px-4 py-1.5 bg-[#B4F416] border-[2px] border-black font-black text-sm">联系</span>
          </button>

          {/* 退出登录 */}
          <button
            onClick={() => router.push('/logout')}
            className="w-full flex items-center justify-between p-4 border-[3px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:-translate-y-0.5 hover:shadow-[4px_4px_0px_0px_#000] transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#FFB800] border-[2px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_#000]">
                <LogOut size={20} className="text-black" strokeWidth={2.5} />
              </div>
              <div className="text-left">
                <div className="font-black text-black dark:text-white">退出登录</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">退出后需要重新登录</div>
              </div>
            </div>
            <span className="px-4 py-1.5 bg-[#FF6B6B] text-white border-[2px] border-black font-black text-sm">退出</span>
          </button>
        </div>
      </div>
    </div>
  )
}

function CalendarSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border-[2px] lg:border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden animate-pulse">
      <div className="bg-[#B4F416] border-b-[2px] lg:border-b-[3px] border-black dark:border-gray-600 p-2 lg:p-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 lg:w-6 lg:h-6 bg-black/20" />
          <div className="h-4 lg:h-5 w-20 bg-black/20" />
        </div>
      </div>
      <div className="p-4">
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 35 }).map((_, i) => (
            <div key={i} className="aspect-square bg-gray-200 dark:bg-gray-700 rounded" />
          ))}
        </div>
      </div>
    </div>
  )
}
