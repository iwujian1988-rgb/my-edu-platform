'use client'

/**
 * 播客专区组件
 *
 * 水平滚动播主卡片列表，Neo-brutalism 风格
 * 仅在视频列表页第一页、所有筛选器为"all"时显示
 */

import React from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { Podcast, Headphones } from 'lucide-react'
import type { PodcastCreatorListItem } from '@/types/video'

interface PodcastZoneResponse {
  items: PodcastCreatorListItem[]
}

const fetcher = async (url: string): Promise<PodcastZoneResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch podcast zone')
  const json = await res.json()
  return json.data
}

/** 过滤掉和头像相同的封面，避免重复展示 */
const dedupCovers = (covers: string[], avatarUrl: string | null): string[] => {
  if (!avatarUrl) return covers
  return covers.filter(cover => {
    /* 取 URL 路径部分比较，忽略 query 参数差异 */
    const stripQuery = (u: string) => {
      try { return new URL(u).pathname } catch { return u }
    }
    return stripQuery(cover) !== stripQuery(avatarUrl)
  })
}

export default function PodcastZone() {
  const { data, error } = useSWR<PodcastZoneResponse>(
    '/api/creators?action=podcast-zone',
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 30000 }
  )

  // 无数据或无播主时不渲染
  if (error || !data || data.items.length === 0) {
    return null
  }

  const { items: creators } = data

  return (
    <section className="mb-10">
      {/* Section Header */}
      <div className="flex items-center gap-3 mb-5">
        <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center rounded shadow-sm">
          <Podcast className="w-5 h-5 text-[#B4F416]" />
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wide text-black dark:text-white">
          播客专区
        </h2>
      </div>

      {/* 水平滚动行 */}
      <div
        className="overflow-x-auto pb-3 -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        <div className="flex gap-4" style={{ minWidth: 'min-content' }}>
          {creators.map((creator) => {
            const uniqueCovers = dedupCovers(creator.latest_covers, creator.avatar_url)

            return (
              <Link
                key={creator.id}
                href={`/videos/creators/${creator.id}`}
                className="group flex-shrink-0 w-[200px] md:w-[220px] bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-150 overflow-hidden"
              >
                {/* 顶部 banner：模糊头像做色彩背景 */}
                <div className="relative h-16 md:h-20 overflow-hidden">
                  {creator.avatar_url ? (
                    <div
                      className="absolute inset-0 scale-[1.5] blur-[20px] saturate-[1.4] brightness-[0.6]"
                      style={{ backgroundImage: `url(${creator.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    />
                  ) : (
                    <div className="w-full h-full bg-purple-200 dark:bg-purple-900" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/20" />
                </div>

                {/* 居中头像 — 叠加在 banner 底部 */}
                <div className="flex justify-center -mt-8 md:-mt-10 relative z-10">
                  <div className="w-16 h-16 md:w-20 md:h-20 rounded-full border border-gray-300 dark:border-gray-600 overflow-hidden bg-white dark:bg-gray-700 shadow-sm">
                    {creator.avatar_url ? (
                      <img src={creator.avatar_url} alt={creator.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-purple-100 dark:bg-purple-900">
                        <Headphones className="w-6 h-6 text-purple-500" />
                      </div>
                    )}
                  </div>
                </div>

                {/* 信息区 */}
                <div className="px-3 md:px-4 pt-2 pb-3 text-center">
                  <h3 className="text-sm md:text-base font-black text-black dark:text-white truncate group-hover:text-[#B4F416] transition-colors">
                    {creator.name}
                  </h3>

                  {creator.description && (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                      {creator.description}
                    </p>
                  )}

                  <div className="flex items-center justify-center gap-2 mt-2">
                    <div className="flex items-center gap-1">
                      <Podcast className="w-3 h-3 text-purple-500" />
                      <span className="text-[11px] font-black text-purple-600 dark:text-purple-400">
                        {creator.audio_count} 期
                      </span>
                    </div>
                    {creator.platform && (
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">
                        · {creator.platform}
                      </span>
                    )}
                  </div>

                  {/* 封面缩略图 — 去重后展示，最多 3 个 */}
                  {uniqueCovers.length > 0 && (
                    <div className="flex justify-center gap-1.5 mt-3">
                      {uniqueCovers.slice(0, 3).map((cover, idx) => (
                        <div
                          key={`${creator.id}-cover-${idx}`}
                          className="w-11 h-11 md:w-[52px] md:h-[52px] rounded border border-gray-200 dark:border-gray-600 overflow-hidden"
                        >
                          <img src={cover} alt="" loading="lazy" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hover 效果 */}
                <div className="h-[2px] md:h-[3px] bg-[#B4F416] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200" />
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
