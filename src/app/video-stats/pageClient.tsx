'use client'

/**
 * 知识点页面 - 客户端组件
 *
 * 展示用户所有视频的知识点（词汇、短语、地道表达）
 * 按视频标题分组，支持展开查看详情和音频播放
 */

import { Suspense } from 'react'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'
import KnowledgePoints from '@/components/video/KnowledgePoints'

export function VideoStatsClient() {
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
          <h1 className="text-2xl font-black text-black dark:text-white">知识点</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            按视频查看你学习的词汇、短语和地道表达
          </p>
        </div>

        {/* 知识点组件 */}
        <Suspense fallback={<KnowledgePointsSkeleton />}>
          <KnowledgePoints />
        </Suspense>
      </div>
    </div>
  )
}

// 骨架屏
function KnowledgePointsSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border-[2px] lg:border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] overflow-hidden animate-pulse">
      <div className="bg-[#B4F416] border-b-[2px] lg:border-b-[3px] border-black dark:border-gray-600 p-2 lg:p-3">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 lg:w-6 lg:h-6 bg-black/20" />
          <div className="h-4 lg:h-5 w-16 lg:w-20 bg-black/20" />
        </div>
      </div>
      <div className="p-2 lg:p-3 space-y-2">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 lg:h-14 bg-gray-200 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-600" />
        ))}
      </div>
    </div>
  )
}
