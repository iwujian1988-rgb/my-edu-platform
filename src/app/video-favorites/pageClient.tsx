'use client'

/**
 * 视频收藏页 - 客户端组件
 *
 * 展示用户收藏的视频，支持取消收藏
 */

import { useState } from 'react'
import Link from 'next/link'
import useSWR, { mutate } from 'swr'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import {
  Heart,
  Play,
  Clock,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import type { VideoListItem, VideoListResponse } from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, formatDuration } from '@/types/video'

// SWR fetcher
const fetcher = async (url: string): Promise<VideoListResponse> => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  const json = await res.json()
  return json.data
}

// 收藏视频卡片
function FavoriteVideoCard({
  video,
  onRemove,
}: {
  video: VideoListItem
  onRemove: () => void
}) {
  const progress = video.user_progress

  return (
    <div className="group flex gap-4 p-4 rounded-lg border bg-card hover:shadow-md transition-all">
      {/* 缩略图 */}
      <Link
        href={`/videos/${video.id}`}
        className="relative w-48 aspect-video rounded overflow-hidden bg-muted flex-shrink-0"
      >
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Play className="w-10 h-10 text-muted-foreground/50" />
          </div>
        )}

        {/* 时长 */}
        <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {formatDuration(video.duration)}
        </div>

        {/* 进度条 */}
        {progress && progress.max_progress > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/30">
            <div
              className="h-full bg-primary"
              style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
            />
          </div>
        )}
      </Link>

      {/* 信息 */}
      <div className="flex-1 min-w-0 flex flex-col">
        <Link href={`/videos/${video.id}`}>
          <h3 className="font-medium line-clamp-2 hover:text-primary transition-colors">
            {video.title}
          </h3>
        </Link>

        <div className="flex items-center gap-2 mt-2">
          <Badge variant="outline" className="text-xs">
            {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
          </Badge>
          {video.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} variant="secondary" className="text-xs">
              {tag}
            </Badge>
          ))}
        </div>

        {progress && progress.max_progress > 0 && (
          <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>
              {progress.is_completed
                ? '已完成'
                : `进度 ${Math.round(progress.max_progress)}%`}
            </span>
          </div>
        )}

        <div className="mt-auto pt-4 flex items-center justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={onRemove}
          >
            <Heart className="w-4 h-4 mr-1 fill-current" />
            取消收藏
          </Button>
        </div>
      </div>
    </div>
  )
}

export function VideoFavoritesClient() {
  const [page, setPage] = useState(1)
  const pageSize = 10

  // 获取收藏列表
  const { data, error, isLoading } = useSWR<VideoListResponse>(
    `/api/user/video-favorites?page=${page}&limit=${pageSize}`,
    fetcher
  )

  // 取消收藏
  const handleRemoveFavorite = async (videoId: string) => {
    try {
      await fetch(`/api/user/video-favorites/${videoId}`, {
        method: 'DELETE',
      })
      // 刷新列表
      mutate(`/api/user/video-favorites?page=${page}&limit=${pageSize}`)
    } catch (error) {
      console.error('Failed to remove favorite:', error)
    }
  }

  return (
    <div className="container py-6 space-y-6">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">我的收藏</h1>
          <p className="text-muted-foreground mt-1">
            {data ? `共 ${data.total} 个收藏` : '加载中...'}
          </p>
        </div>
      </div>

      {/* 加载状态 */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-4 p-4 rounded-lg border">
              <Skeleton className="w-48 aspect-video rounded" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/4" />
                <Skeleton className="h-4 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 错误状态 */}
      {error && (
        <div className="text-center py-12">
          <p className="text-muted-foreground">加载失败</p>
          <Button
            variant="outline"
            className="mt-4"
            onClick={() =>
              mutate(`/api/user/video-favorites?page=${page}&limit=${pageSize}`)
            }
          >
            重试
          </Button>
        </div>
      )}

      {/* 空状态 */}
      {data && data.items.length === 0 && (
        <div className="text-center py-16">
          <Heart className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">暂无收藏</h3>
          <p className="text-muted-foreground mb-6">
            在视频页面点击收藏按钮，将喜欢的视频添加到这里
          </p>
          <Button asChild>
            <Link href="/videos">浏览视频</Link>
          </Button>
        </div>
      )}

      {/* 视频列表 */}
      {data && data.items.length > 0 && (
        <>
          <div className="space-y-4">
            {data.items.map((video) => (
              <FavoriteVideoCard
                key={video.id}
                video={video}
                onRemove={() => handleRemoveFavorite(video.id)}
              />
            ))}
          </div>

          {/* 分页 */}
          {data.total > pageSize && (
            <div className="flex items-center justify-center gap-4 pt-6">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 1}
                onClick={() => setPage(page - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                上一页
              </Button>
              <span className="text-sm text-muted-foreground">
                第 {page} / {Math.ceil(data.total / pageSize)} 页
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page * pageSize >= data.total}
                onClick={() => setPage(page + 1)}
              >
                下一页
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
