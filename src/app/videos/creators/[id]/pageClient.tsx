'use client'

/**
 * 播主详情页 - Apple Music 风格
 *
 * 头部：提取封面主色 → 高斯模糊渐变背景
 * 列表：窄列居中，每集一行， 展示全部播主数据
 */

import React, { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import { ArrowLeft, Play, Podcast, Headphones, Users, Hash, Globe } from 'lucide-react'
import type { CreatorContentResponse, CreatorSortMode, VideoListItem, CreatorInfo } from '@/types/video'
import { CREATOR_PLATFORM_LABELS, formatDuration } from '@/types/video'

const PAGE_SIZE = 20

interface Props {
  creatorId: string
}

/* ---- fetcher ---- */
const fetcher = async (url: string): Promise<CreatorContentResponse> => {
  const res = await fetch(url)
  if (res.status === 401) throw new Error('UNAUTHORIZED')
  if (!res.ok) throw new Error('Failed to fetch')
  return (await res.json()).data
}

/* ---- 播主元信息行 ---- */
function CreatorMetaRows({ creator }: { creator: CreatorInfo | null | undefined }) {
  if (!creator) return null
  const metaItems: Array<{ icon: React.ReactNode; label: string; value: string | number }> = []

  if (creator.platform && CREATOR_PLATFORM_LABELS[creator.platform]) {
    metaItems.push({
      icon: <Hash className="w-3.5 h-3" />,
      label: CREATOR_PLATFORM_LABELS[creator.platform],
      value: creator.platform,
    })
  }
  if (creator.follower_count > 0) {
    metaItems.push({
      icon: <Users className="w-3.5 h-3" />,
      label: `${creator.follower_count.toLocaleString()}+ 粉丝`,
      value: String(creator.follower_count),
    })
  }
  if (creator.audio_count > 0) {
    metaItems.push({
      icon: <Podcast className="w-3.5 h-3" />,
      label: `${creator.audio_count} 期播客`,
      value: String(creator.audio_count),
    })
  }
  if (creator.video_count > 0) {
    metaItems.push({
      icon: <Play className="w-3.5 h-3" />,
      label: `${creator.video_count} 个视频`,
      value: String(creator.video_count)
    })
  }
  if (creator.platform_user_id) {
    metaItems.push({
      icon: <Globe className="w-3.5 h-3" />,
      label: creator.platform_user_id,
      value: creator.platform_user_id,
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-x-2 md:gap-3 py-1">
      {metaItems.map((m) => (
        <div key={m.label} className="flex items-center gap-1.5 text-[11px] text-white/40">
          {m.icon}
          <span className="font-mono text-white/50">{m.value}</span>
        </div>
      ))}
    </div>
  )
}

/* ---- 单集行组件 ---- */
function EpisodeRow({ item }: { item: VideoListItem }) {
  const isAudio = item.content_type === 'audio'
  const progress = item.user_progress

  return (
    <Link
      href={`/videos/${item.id}`}
      className="group flex items-center gap-3 md:gap-5 py-3 md:py-4 border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors"
    >
      <div className="w-8 flex-shrink-0 text-center">
        <span className="group-hover:hidden">
          {isAudio
            ? <Podcast className="w-4 h-4 mx-auto text-gray-300 dark:text-gray-600" />
            : <Play className="w-4 h-4 mx-auto text-gray-300" />
          }
        </span>
        <span className="hidden group-hover:block">
          <Play className="w-4 h-4 mx-auto text-black dark:text-white" fill="currentColor" />
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="text-sm md:text-base font-bold text-black dark:text-white line-clamp-1 group-hover:text-[#B4F416] transition-colors">
          {item.title}
        </h3>
        <div className="flex items-center gap-2 mt-0.5 text-[11px] text-gray-400">
          {item.published_at && <span>{new Date(item.published_at).toLocaleDateString()}</span>}
          {progress?.is_completed && (
            <span className="text-[#B4F416] font-bold">已完成</span>
          )}
          {progress && progress.max_progress > 0 && !progress.is_completed && (
            <span className="text-purple-500 font-bold">{Math.min(Math.round(progress.max_progress), 100)}%</span>
          )}
        </div>
      </div>

      <span className="text-xs md:text-sm font-mono text-gray-400 flex-shrink-0">
        {formatDuration(item.duration)}
      </span>
    </Link>
  )
}

/* =============================================
   主页面
   ============================================= */
export default function CreatorDetailClient({ creatorId }: Props) {
  const router = useRouter()
  const [sort, setSort] = useState<CreatorSortMode>('time')
  const [page, setPage] = useState(1)

  const buildUrl = useCallback(() => {
    const offset = (page - 1) * PAGE_SIZE
    return `/api/creators/${creatorId}?sort=${sort}&limit=${PAGE_SIZE}&offset=${offset}`
  }, [creatorId, sort, page])

  const { data, error, isLoading } = useSWR<CreatorContentResponse>(buildUrl(), fetcher, {
    revalidateOnFocus: false,
    dedupingInterval: 5000
  })
  const creator = data?.creator
  const items = data?.items || []
  const total = data?.total || 0
  const totalPages = Math.ceil(total / PAGE_SIZE)

  useEffect(() => {
    if (error?.message === 'UNAUTHORIZED') {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [error, router])
  /* 排序切换：原子更新 sort + page，避免双重请求 */
  const handleSortChange = useCallback((newSort: CreatorSortMode) => {
    setSort(newSort)
    setPage(1)
  }, [])

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* ---- Apple Music 风格头部 ---- */}
      <div className="relative overflow-hidden">
        {/* Layer 1: 模糊头像放大铺满 — 天然携带图片全部色彩 */}
        {creator?.avatar_url && (
          <div
            className="absolute inset-0 scale-[2] blur-[60px] saturate-[1.4] brightness-[0.7]"
            style={{ backgroundImage: `url(${creator.avatar_url})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
          />
        )}
        {/* Layer 2: 暗色 scrim — 上轻下重，保证白色文字在任何图片上都可读 */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/60" />

        <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-6 md:pb-10">
          {/* 返回 */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-2 mb-4 text-sm font-bold text-white/50 hover:text-white/80 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            返回
          </button>

          {/* 播主卡片 */}
          <div className="flex flex-col md:flex-row items-center md:items-end gap-5 md:gap-8">
            {/* 头像 */}
            <div className="w-28 h-28 md:w-36 md:h-36 rounded-2xl overflow-hidden flex-shrink-0 shadow-2xl border border-white/10">
              {creator?.avatar_url ? (
                <img src={creator.avatar_url} alt={creator?.name || ''} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-white/10">
                  <Headphones className="w-14 h-14 text-white/40" />
                </div>
              )}
            </div>

            {/* 文字 */}
            <div className="flex-1 text-center md:text-left min-w-0 pb-1">
              <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight mb-2">
                {creator?.name || '加载中...'}
              </h1>
              {creator?.description && (
                <p className="text-sm text-white/50 line-clamp-2 max-w-xl mb-3">{creator.description}</p>
              )}
              <CreatorMetaRows creator={creator ?? null} />
            </div>
          </div>
        </div>
      </div>

      {/* ---- 内容区 — 居中窄列 ---- */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* 排序 */}
        <div className="flex items-center gap-3 py-4 border-b border-gray-200 dark:border-gray-700 mb-2">
          {([
            { key: 'time' as CreatorSortMode, label: '最新发布' },
            { key: 'episode' as CreatorSortMode, label: '学习顺序' },
          ]).map(({ key, label }) => (
            <button
              key={key}
              onClick={() => handleSortChange(key)}
              className={`px-3 py-1.5 text-sm font-bold rounded-full transition-all ${
                sort === key
                  ? 'bg-black dark:bg-white text-white dark:text-black'
                  : 'text-gray-400 hover:text-black dark:hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
          <span className="text-xs text-gray-400 ml-auto">共 {total} 集</span>
        </div>

        {/* 列表 */}
        {isLoading ? (
          <div className="py-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 py-4 animate-pulse">
                <div className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded" />
                <div className="flex-1">
                  <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded mb-2" />
                  <div className="h-3 w-1/3 bg-gray-200 dark:bg-gray-700 rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20">
            <Podcast className="w-16 h-16 mx-auto text-gray-300 mb-4" />
            <p className="text-lg font-bold text-gray-400">暂无内容</p>
          </div>
        ) : (
          <div>
            {items.map((item) => (
              <EpisodeRow key={item.id} item={item} />
            ))}
          </div>
        )}

        {/* 分页 */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 py-8">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${
                page === 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              上一页
            </button>
            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                .map((p, idx, arr) => (
                  <React.Fragment key={p}>
                    {idx > 0 && arr[idx - 1] !== p - 1 && <span className="px-1 text-gray-400 text-sm">...</span>}
                    <button
                      onClick={() => setPage(p)}
                      className={`w-9 h-9 text-sm font-bold rounded-full transition-all ${
                        page === p
                          ? 'bg-black dark:bg-white text-white dark:text-black'
                          : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                      }`}
                    >
                      {p}
                    </button>
                  </React.Fragment>
                ))}
            </div>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className={`px-4 py-2 text-sm font-bold rounded-full transition-all ${
                page === totalPages ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              下一页
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
