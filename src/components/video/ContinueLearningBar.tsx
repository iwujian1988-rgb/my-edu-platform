'use client'

/**
 * 继续学习 — 底部播放器栏
 *
 * PC 端：始终 fixed bottom-0，不受滚动影响
 * 移动端：
 *   - 页面顶部：single 栏(bottom-16) + VideoMobileNav(bottom-0) 分开
 *   - 向下滑动 > 阈值：compact 合并栏从底部弹出，同时 single + nav 滑出
 *   - 点 HOME：compact 滑出，single + nav 弹回
 *   - 滚回顶部：自动恢复
 *
 * 所有切换使用 CSS translate + 弹性贝塞尔曲线，不销毁 DOM
 */

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { Play, X, Clock, Video, Podcast, ChevronUp, ChevronDown, Home } from 'lucide-react'
import type { VideoListItem } from '@/types/video'
import { formatDuration } from '@/types/video'
import { useIsScrolled } from '@/hooks/useIsScrolled'

/** 弹性过渡曲线：overshoot 回弹 */
const SPRING_EASE = 'cubic-bezier(0.22, 1.68, 0.36, 1)'

const MAX_VISIBLE_ITEMS = 5
const SCROLL_COMPACT_THRESHOLD = 150
const COMPACT_NAV_ATTR = 'data-compact-nav'

type BarState = 'single' | 'list' | 'minimized'

interface ContinueLearningBarProps {
  videos: VideoListItem[]
}

function filterActiveVideos(videos: VideoListItem[]): VideoListItem[] {
  return videos.filter(
    (v) => v.user_progress && v.user_progress.max_progress > 0 && !v.user_progress.is_completed
  )
}

function VideoItem({ video }: { video: VideoListItem }) {
  const progress = video.user_progress!
  const progressPercent = Math.min(Math.round(progress.max_progress), 100)
  const isAudio = video.content_type === 'audio'
  const coverImage = isAudio ? (video.cover_url || video.thumbnail_url) : video.thumbnail_url

  return (
    <Link
      href={`/videos/${video.id}`}
      className="flex items-center gap-3 md:gap-4 py-2 group hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
    >
      <div className="relative w-9 h-9 md:w-11 md:h-11 rounded-sm overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border-[2px] border-black dark:border-gray-600">
        {coverImage ? (
          <img src={coverImage} alt={video.title} loading="lazy" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isAudio ? (
              <Podcast className="w-4 h-4 text-purple-500 opacity-40" />
            ) : (
              <Video className="w-4 h-4 text-black dark:text-white opacity-30" />
            )}
          </div>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-300 dark:bg-gray-600">
          <div className="h-full bg-[#B4F416]" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-black text-xs md:text-sm text-black dark:text-white truncate group-hover:text-[#B4F416] transition-colors">
          {video.title}
        </p>
        <div className="flex items-center gap-1.5 text-[10px] md:text-xs font-mono font-bold text-gray-400 dark:text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{formatDuration(video.duration)}</span>
          <span className="text-[#B4F416]">{progressPercent}%</span>
        </div>
      </div>

      <div className="flex-shrink-0 px-2 py-1 md:px-3 md:py-1.5 bg-[#B4F416] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] group-hover:shadow-[1px_1px_0px_0px_#000] group-hover:-translate-y-px transition-all">
        <span className="font-black text-[10px] md:text-xs flex items-center gap-0.5">
          <Play className="w-3 h-3" />
          继续
        </span>
      </div>
    </Link>
  )
}

export function ContinueLearningBar({ videos }: ContinueLearningBarProps) {
  const [barState, setBarState] = useState<BarState>('single')
  const [manualExpand, setManualExpand] = useState(false)

  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const mql = window.matchMedia('(max-width: 767px)')
    setIsMobile(mql.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])

  const isScrolled = useIsScrolled(SCROLL_COMPACT_THRESHOLD)
  const activeVideos = filterActiveVideos(videos)

  const shouldCompact = isMobile && activeVideos.length > 0 && isScrolled && !manualExpand && barState !== 'minimized'

  // 同步 compact 状态到 body data 属性
  useEffect(() => {
    if (shouldCompact) {
      document.body.setAttribute(COMPACT_NAV_ATTR, 'true')
    } else {
      document.body.removeAttribute(COMPACT_NAV_ATTR)
    }
    return () => document.body.removeAttribute(COMPACT_NAV_ATTR)
  }, [shouldCompact])

  // 滚回顶部时重置 manualExpand
  useEffect(() => {
    if (!isScrolled && manualExpand) {
      setManualExpand(false)
    }
  }, [isScrolled, manualExpand])

  if (activeVideos.length === 0) return null

  // 折叠态：浮动按钮（独立，不参与 compact 动画）
  if (barState === 'minimized') {
    return (
      <button
        onClick={() => setBarState('single')}
        className="fixed z-40 w-12 h-12 rounded-full bg-black dark:bg-white text-[#B4F416] dark:text-black flex items-center justify-center border-[2px] border-black dark:border-gray-600 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all duration-400 bottom-20 md:bottom-4 right-4"
        aria-label="展开继续学习"
      >
        <Play className="w-5 h-5 fill-current" />
      </button>
    )
  }

  const video = activeVideos[0]
  const progress = video.user_progress!
  const progressPercent = Math.min(Math.round(progress.max_progress), 100)
  const isAudio = video.content_type === 'audio'
  const coverImage = isAudio ? (video.cover_url || video.thumbnail_url) : video.thumbnail_url
  const hasMore = activeVideos.length > 1

  return (
    <>
      {/* ========== Compact 合并栏（仅移动端） ========== */}
      <div
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 md:hidden',
          'transition-transform duration-400 pointer-events-auto',
        )}
        style={{
          transitionTimingFunction: SPRING_EASE,
          transform: shouldCompact ? 'translateY(0)' : 'translateY(100%)',
        }}
        aria-hidden={!shouldCompact}
      >
        <div className="bg-white dark:bg-gray-800 border-t-[3px] border-black dark:border-gray-600">
          <div className="flex items-center h-14 gap-2 px-2">
            <button
              onClick={() => setManualExpand(true)}
              className="flex-shrink-0 flex flex-col items-center justify-center w-11 h-10 border-[2px] border-black dark:border-gray-600 bg-white dark:bg-gray-800 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] active:translate-y-px active:shadow-none transition-all rounded-sm"
              aria-label="展开导航"
            >
              <Home className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              <span className="text-[9px] font-bold text-gray-500 dark:text-gray-400 leading-none mt-0.5">首页</span>
            </button>

            <div className="relative w-9 h-9 rounded-sm overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border-[2px] border-black dark:border-gray-600">
              {coverImage ? (
                <img src={coverImage} alt={video.title} loading="lazy" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  {isAudio ? (
                    <Podcast className="w-4 h-4 text-purple-500 opacity-40" />
                  ) : (
                    <Video className="w-4 h-4 text-black dark:text-white opacity-30" />
                  )}
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-300 dark:bg-gray-600">
                <div className="h-full bg-[#B4F416]" style={{ width: `${progressPercent}%` }} />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-black text-xs text-black dark:text-white truncate">{video.title}</p>
              <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-gray-400 dark:text-gray-500">
                <Clock className="w-3 h-3" />
                <span>{formatDuration(video.duration)}</span>
                <span className="text-[#B4F416]">{progressPercent}%</span>
              </div>
            </div>

            <Link
              href={`/videos/${video.id}`}
              className="flex-shrink-0 px-2 py-1 bg-[#B4F416] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] active:shadow-[1px_1px_0px_0px_#000] active:translate-y-px transition-all"
            >
              <span className="font-black text-[10px] flex items-center gap-0.5">
                <Play className="w-3 h-3" />
                继续
              </span>
            </Link>
          </div>
        </div>
      </div>

      {/* ========== Normal 栏（single / list） ========== */}
      <div
        className={cn(
          'fixed bottom-16 md:bottom-0 left-0 right-0 z-40',
          'transition-transform duration-400',
        )}
        style={{
          transitionTimingFunction: SPRING_EASE,
          // 移动端 compact 激活时滑出，PC 端始终 translate-y-0
          transform: shouldCompact ? 'translateY(100%)' : 'translateY(0)',
          pointerEvents: shouldCompact ? 'none' : 'auto',
        }}
        aria-hidden={shouldCompact}
      >
        <div className="bg-white dark:bg-gray-800 border-t-[3px] border-black dark:border-gray-600 transition-colors duration-400 max-h-[50vh] flex flex-col">
          {/* 列表态标题行 */}
          {barState === 'list' && (
            <div className="flex items-center justify-between px-3 md:px-6 py-2 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-[2px_2px_0px_0px_#B4F416] dark:shadow-[2px_2px_0px_0px_#666]">
                  <span className="font-bold text-[10px]">▶</span>
                </div>
                <h3 className="font-black text-sm uppercase tracking-wide text-black dark:text-white">
                  继续学习
                </h3>
                <span className="text-xs font-mono font-bold text-gray-400">
                  {activeVideos.length}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setBarState('single')}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  aria-label="收起列表"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setBarState('minimized')}
                  className="p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  aria-label="关闭继续学习"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {/* 列表内容 */}
          {barState === 'list' && (
            <div className="overflow-y-auto overscroll-contain px-2 md:px-4">
              {activeVideos.slice(0, MAX_VISIBLE_ITEMS).map((v) => (
                <VideoItem key={v.id} video={v} />
              ))}
            </div>
          )}

          {/* 单行内容 */}
          {barState === 'single' && (
            <div className="flex items-center h-14 md:h-16 px-3 md:px-6 gap-3 md:gap-4">
              {/* 封面 */}
              <div className="relative w-9 h-9 md:w-12 md:h-12 rounded-sm overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border-[2px] border-black dark:border-gray-600">
                {coverImage ? (
                  <img src={coverImage} alt={video.title} loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {isAudio ? (
                      <Podcast className="w-4 h-4 text-purple-500 opacity-40" />
                    ) : (
                      <Video className="w-4 h-4 text-black dark:text-white opacity-30" />
                    )}
                  </div>
                )}
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-300 dark:bg-gray-600">
                  <div className="h-full bg-[#B4F416]" style={{ width: `${progressPercent}%` }} />
                </div>
              </div>

              {/* 标题 + 元信息 */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm md:text-base text-black dark:text-white truncate">
                  {video.title}
                </p>
                <div className="flex items-center gap-2 text-xs font-mono font-bold text-gray-500 dark:text-gray-400">
                  <Clock className="w-3 h-3" />
                  <span>{formatDuration(video.duration)}</span>
                  <span className="text-[#B4F416]">{progressPercent}%</span>
                </div>
              </div>

              {/* 继续 */}
              <Link
                href={`/videos/${video.id}`}
                className="flex-shrink-0 px-3 py-1.5 md:px-4 md:py-2 bg-[#B4F416] border-[2px] md:border-[3px] border-black shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all"
              >
                <span className="font-black text-xs md:text-sm flex items-center gap-1">
                  <Play className="w-3.5 h-3.5 md:w-4 md:h-4" />
                  <span className="hidden sm:inline">继续</span>
                </span>
              </Link>

              {hasMore && (
                <button
                  onClick={() => setBarState('list')}
                  className="flex-shrink-0 p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                  aria-label={`展开全部 ${activeVideos.length} 个`}
                >
                  <ChevronUp className="w-4 h-4 md:w-5 md:h-5" />
                </button>
              )}

              <button
                onClick={() => setBarState('minimized')}
                className="flex-shrink-0 p-1 text-gray-400 hover:text-black dark:hover:text-white transition-colors"
                aria-label="折叠继续学习"
              >
                <X className="w-4 h-4 md:w-5 md:h-5" />
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
