'use client'

/**
 * 视频列表页 - 客户端组件
 *
 * 对应 PRD: VIDEO_MODULE_PRD.md - Section 4.1
 * 对应 Tech: VIDEO_MODULE_TECH.md v5.0 - Section 3.3.6
 *
 * 样式参考：/speaker 页面 Neo-brutalism 风格
 */

import React, { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import useSWR from 'swr'
import {
  Play,
  Clock,
  CheckCircle,
  BookOpen,
  Video,
  Repeat,
} from 'lucide-react'
import type { VideoListItem, VideoListResponse } from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, VIDEO_LANGUAGE_LABELS, formatDuration } from '@/types/video'

// 语言选项（从 API 动态获取，基于用户权限范围内的语言）
const buildLanguageOptions = (availableLanguages: string[] | undefined) => {
  if (!availableLanguages || availableLanguages.length === 0) {
    return [{ value: 'all', label: '全部语言' }]
  }
  return [
    { value: 'all', label: '全部语言' },
    ...availableLanguages.map(lang => ({
      value: lang,
      label: VIDEO_LANGUAGE_LABELS[lang as keyof typeof VIDEO_LANGUAGE_LABELS] || lang
    }))
  ]
}

// 难度选项
const DIFFICULTY_OPTIONS = [
  { value: 'all', label: '全部难度' },
  { value: 'beginner', label: '入门' },
  { value: 'intermediate', label: '进阶' },
  { value: 'advanced', label: '难' },
]

// 分页常量
const PAGE_SIZE = 12

// 获取难度等级的颜色
const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return 'bg-[#B4F416]'
    case 'intermediate':
      return 'bg-purple-400'
    case 'advanced':
      return 'bg-red-400'
    default:
      return 'bg-gray-400'
  }
}

// 视频卡片组件
function VideoCard({ video }: { video: VideoListItem }) {
  const progress = video.user_progress

  return (
    <Link
      href={`/videos/${video.id}`}
      className="group relative bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[8px_8px_0px_0px_#000] dark:hover:shadow-[8px_8px_0px_0px_#666] hover:-translate-y-1 transition-all duration-150 cursor-pointer overflow-hidden rounded-sm block"
    >
      {/* 缩略图 */}
      <div className="relative h-40 bg-gray-100 dark:bg-gray-700 overflow-hidden border-b-[3px] border-black dark:border-gray-600 transition-colors duration-300">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-12 h-12 text-black dark:text-white opacity-20" />
          </div>
        )}

        {/* 难度标签 - 贴纸样式 */}
        <div className="absolute top-3 left-3">
          <div className={`px-3 py-1 ${getDifficultyColor(video.difficulty)} border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transform -rotate-1`}>
            <span className="text-xs font-black tracking-tight">
              {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
            </span>
          </div>
        </div>

        {/* 时长 */}
        <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs font-bold border-[2px] border-black">
          {formatDuration(video.duration)}
        </div>

        {/* 完成标记 */}
        {progress?.is_completed && (
          <div className="absolute top-3 right-3">
            <div className="px-3 py-1.5 bg-[#B4F416] border-[2px] border-black shadow-[3px_3px_0px_0px_#000] transform rotate-2">
              <span className="text-xs font-black tracking-tight">✓ DONE</span>
            </div>
          </div>
        )}

        {/* 进度条 */}
        {progress && progress.max_progress > 0 && !progress.is_completed && (
          <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gray-300 dark:bg-gray-600">
            <div
              className="h-full bg-[#B4F416] transition-all duration-300"
              style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 信息 */}
      <div className="p-4">
        {/* 标题 */}
        <h3 className="text-base font-black tracking-tight text-black dark:text-white mb-3 line-clamp-2 group-hover:text-[#B4F416] transition-colors">
          {video.title}
        </h3>

        {/* 语种和标签 */}
        <div className="flex items-center gap-2 mb-3">
          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500 rounded transition-colors duration-300">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {VIDEO_LANGUAGE_LABELS[video.language]}
            </span>
          </div>
          {video.tags.slice(0, 1).map((tag) => (
            <div key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500 rounded transition-colors duration-300">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{tag}</span>
            </div>
          ))}
        </div>

        {/* 进度 */}
        {progress && progress.max_progress > 0 && !progress.is_completed && (
          <div className="flex items-center gap-1 text-sm font-mono font-bold text-gray-600 dark:text-gray-400 transition-colors duration-300">
            <Clock className="w-4 h-4" />
            <span>进度 {Math.round(progress.max_progress)}%</span>
          </div>
        )}
      </div>

      {/* Hover 效果：荧光绿底部边框 */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#B4F416] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
    </Link>
  )
}

// 继续学习卡片
function ContinueLearningCard({ video }: { video: VideoListItem }) {
  const progress = video.user_progress

  if (!progress || progress.max_progress === 0 || progress.is_completed) {
    return null
  }

  return (
    <Link
      href={`/videos/${video.id}`}
      className="group flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[6px_6px_0px_0px_#000] dark:hover:shadow-[6px_6px_0px_0px_#666] hover:-translate-y-0.5 transition-all duration-150 rounded-sm"
    >
      {/* 缩略图 */}
      <div className="relative w-32 aspect-video rounded-sm overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border-[2px] border-black dark:border-gray-600">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt={video.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Video className="w-6 h-6 text-black dark:text-white opacity-20" />
          </div>
        )}

        {/* 进度条 */}
        <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-300 dark:bg-gray-600">
          <div
            className="h-full bg-[#B4F416]"
            style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
          />
        </div>
      </div>

      {/* 信息 */}
      <div className="flex-1 min-w-0">
        <h3 className="font-black text-black dark:text-white line-clamp-1 group-hover:text-[#B4F416] transition-colors">
          {video.title}
        </h3>
        <div className="flex items-center gap-2 mt-1 text-sm font-mono font-bold text-gray-600 dark:text-gray-400">
          <Clock className="w-4 h-4" />
          <span>{formatDuration(video.duration)}</span>
          <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500 rounded text-xs">
            {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
          </span>
        </div>
        <p className="text-sm font-mono font-bold text-[#B4F416] mt-1">
          进度 {Math.round(progress.max_progress)}%
        </p>
      </div>

      {/* 继续按钮 */}
      <div className="flex-shrink-0 px-4 py-2 bg-[#B4F416] border-[3px] border-black shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 transition-all group-hover:bg-[#a3e014]">
        <span className="font-black text-sm flex items-center gap-1">
          <Play className="w-4 h-4" />
          继续
        </span>
      </div>
    </Link>
  )
}

// SWR fetcher
const fetcher = async (url: string): Promise<VideoListResponse> => {
  console.log('[fetcher] Fetching:', url)
  const res = await fetch(url)
  console.log('[fetcher] Status:', res.status)
  if (res.status === 401) {
    // 未登录，抛出特殊错误
    const error = new Error('UNAUTHORIZED')
    ;(error as any).status = 401
    throw error
  }
  if (!res.ok) throw new Error('Failed to fetch')
  const json = await res.json()
  console.log('[fetcher] Response:', json)
  return json.data
}

// 内部组件 - 使用 useSearchParams
function VideoListContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  // 筛选状态 - 从 URL 初始化
  const [language, setLanguage] = useState<string>(
    searchParams.get('language') || 'all'
  )
  const [difficulty, setDifficulty] = useState<string>(
    searchParams.get('difficulty') || 'all'
  )
  const [tag, setTag] = useState<string>(
    searchParams.get('tag') || 'all'
  )
  const [page, setPage] = useState<number>(
    parseInt(searchParams.get('page') || '1')
  )

  // 构建查询 URL
  const buildQueryUrl = useCallback(() => {
    const params = new URLSearchParams()
    if (language && language !== 'all') {
      params.set('language', language)
    }
    if (difficulty && difficulty !== 'all') {
      params.set('difficulty', difficulty)
    }
    if (tag && tag !== 'all') {
      params.set('tag', tag)
    }
    // 分页参数
    const offset = (page - 1) * PAGE_SIZE
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(offset))

    const queryString = params.toString()
    return `/api/videos${queryString ? `?${queryString}` : ''}`
  }, [language, difficulty, tag, page])

  // 获取视频列表
  const { data, error, isLoading, mutate } = useSWR<VideoListResponse>(
    buildQueryUrl(),
    fetcher,
    {
      revalidateOnFocus: false,
    }
  )

  // 获取标签列表（延迟加载，等视频数据加载完成后再请求）
  const { data: tagsData } = useSWR<{ id: string; name: string; video_count: number }[]>(
    data ? '/api/video-tags' : null,  // 条件请求：等视频数据就绪
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch tags')
      const json = await res.json()
      return json.data || []
    },
    { revalidateOnFocus: false }
  )

  // 获取学习统计（延迟加载，低优先级）
  const { data: statsData } = useSWR<{
    overview: {
      total_cards: number
      known_cards: number
      learning_cards: number
    }
  }>(
    data ? '/api/user/video-stats' : null,  // 条件请求：等视频数据就绪
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch')
      const json = await res.json()
      return json.data
    },
    { revalidateOnFocus: false }
  )

  // 待复习卡片数 = 学习中的卡片
  const pendingReviewCount = statsData?.overview?.learning_cards || 0

  // 未登录时跳转到登录页
  useEffect(() => {
    if (error?.message === 'UNAUTHORIZED') {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [error, router])

  // 筛选条件变化时重置页码
  useEffect(() => {
    setPage(1)
  }, [language, difficulty, tag])

  // 更新 URL
  useEffect(() => {
    const params = new URLSearchParams()
    if (language && language !== 'all') {
      params.set('language', language)
    }
    if (difficulty && difficulty !== 'all') {
      params.set('difficulty', difficulty)
    }
    if (tag && tag !== 'all') {
      params.set('tag', tag)
    }
    if (page > 1) {
      params.set('page', String(page))
    }

    const queryString = params.toString()
    const newUrl = queryString ? `?${queryString}` : window.location.pathname
    router.replace(newUrl, { scroll: false })
  }, [language, difficulty, tag, page, router])

  // 提取继续学习的视频
  const continueLearningVideos = (data?.items || [])
    .filter((v) => v.user_progress && v.user_progress.max_progress > 0 && !v.user_progress.is_completed)
    .slice(0, 1)

  // 动态语言选项（基于用户权限范围内的语言）
  const languageOptions = useMemo(() => {
    return buildLanguageOptions(data?.available_languages)
  }, [data?.available_languages])

  // 是否显示语言筛选（只有多种语言时才显示）
  const showLanguageFilter = (data?.available_languages?.length || 0) > 1

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* 页面头部 */}
      <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter italic text-black dark:text-white transition-colors duration-300">
                视频学习
              </h1>
              <p className="mt-2 text-sm font-mono font-bold text-gray-600 dark:text-gray-300 transition-colors duration-300">
                真实场景视频，地道口语表达，系统化学习
              </p>
            </div>

            {/* 卡片复习入口 */}
            <a
              href="/video-flashcards"
              className="hidden md:flex items-center gap-2 px-6 py-3 bg-[#B4F416] hover:bg-[#a3e014] border-[3px] border-black dark:border-gray-600 rounded-sm shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5 transition-all group relative"
            >
              <BookOpen className="w-5 h-5 text-black" />
              <span className="font-black text-black text-base">卡片复习</span>
              {pendingReviewCount > 0 && (
                <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center border-[2px] border-black animate-pulse">
                  {pendingReviewCount > 99 ? '99+' : pendingReviewCount}
                </span>
              )}
            </a>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* PC端筛选工具栏 - 紧凑布局 */}
        <div className="hidden md:block mb-8">
          <div className="flex flex-wrap items-center gap-6">
            {/* 套餐标签 */}
            {data?.user_packages && data.user_packages.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">套餐</span>
                {data.user_packages.map((pkg) => (
                  <span key={pkg.id} className="px-2 py-1 text-xs font-black bg-[#B4F416] border-[2px] border-black shadow-[2px_2px_0px_0px_#000]">
                    {pkg.name}
                  </span>
                ))}
              </div>
            )}

            {/* 难度筛选 */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-500">难度</span>
              {DIFFICULTY_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setDifficulty(opt.value)}
                  className={`
                    px-3 py-1 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                    ${difficulty === opt.value
                      ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-black dark:text-white'
                    }
                  `}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* 标签筛选 */}
            {tagsData && tagsData.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-500">标签</span>
                <button
                  onClick={() => setTag('all')}
                  className={`
                    px-3 py-1 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                    ${tag === 'all'
                      ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                      : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-black dark:text-white'
                    }
                  `}
                >
                  全部
                </button>
                {tagsData.slice(0, 8).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTag(t.name)}
                    className={`
                      px-3 py-1 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                      ${tag === t.name
                        ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                        : 'bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-black dark:text-white'
                      }
                    `}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

          {/* 移动端 */}
          <div className="md:hidden">
            {/* 语言筛选（只有多种语言时才显示） */}
            {showLanguageFilter && (
              <div className="mb-4">
                <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">语言：</div>
                <div className="flex gap-2 flex-wrap">
                  {languageOptions.slice(0, 5).map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLanguage(opt.value)}
                      className={`
                        px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                        border-[2px] border-black dark:border-gray-600
                        transition-all duration-150
                        ${language === opt.value
                          ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                          : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 难度筛选 */}
            <div className="mb-4">
              <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">难度：</div>
              <div className="flex gap-2 flex-wrap">
                {DIFFICULTY_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setDifficulty(opt.value)}
                    className={`
                      px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                      border-[2px] border-black dark:border-gray-600
                      transition-all duration-150
                      ${difficulty === opt.value
                        ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                        : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 标签筛选 */}
            {tagsData && tagsData.length > 0 && (
              <div className="mb-4">
                <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">标签：</div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setTag('all')}
                    className={`
                      px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                      border-[2px] border-black dark:border-gray-600
                      transition-all duration-150
                      ${tag === 'all'
                        ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                        : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                      }
                    `}
                  >
                    全部
                  </button>
                  {tagsData.slice(0, 6).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTag(t.name)}
                      className={`
                        px-3 py-1.5 rounded-sm text-xs font-black tracking-tight
                        border-[2px] border-black dark:border-gray-600
                        transition-all duration-150
                        ${tag === t.name
                          ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                          : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[3px_3px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-1 text-black dark:text-white'
                        }
                      `}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

        {/* 继续学习 */}
        {continueLearningVideos.length > 0 && (
          <section className="mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-[4px_4px_0px_0px_#B4F416] dark:shadow-[4px_4px_0px_0px_#666]">
                <span className="font-bold text-sm">▶</span>
              </div>
              <h2 className="text-xl font-black uppercase tracking-wide text-black dark:text-white">继续学习</h2>
            </div>
            <div className="space-y-3">
              {continueLearningVideos.map((video) => (
                <ContinueLearningCard key={video.id} video={video} />
              ))}
            </div>
          </section>
        )}

        {/* 全部视频 */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-[4px_4px_0px_0px_#B4F416] dark:shadow-[4px_4px_0px_0px_#666]">
              <span className="font-bold text-sm">V</span>
            </div>
            <h2 className="text-xl font-black uppercase tracking-wide text-black dark:text-white">
              全部视频
              {data && (
                <span className="text-sm font-normal text-gray-500 ml-2">
                  ({data.total})
                </span>
              )}
            </h2>
          </div>

          {/* 加载状态 */}
          {isLoading && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-block animate-spin rounded-sm h-12 w-12 border-[3px] border-black dark:border-gray-500 border-t-[#B4F416]"></div>
                <p className="mt-4 text-sm font-mono font-bold text-black dark:text-white">
                  加载中...
                </p>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm p-6">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-12 h-12 bg-red-500 border-[3px] border-black rounded-sm flex items-center justify-center">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-black tracking-tighter text-black dark:text-white">
                    加载失败
                  </h3>
                  <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400 mt-1">
                    请检查网络连接后重试
                  </p>
                </div>
                <button
                  onClick={() => mutate()}
                  className="ml-auto px-4 py-2 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] dark:hover:shadow-[2px_2px_0px_0px_#666] hover:-translate-y-0.5 text-sm font-black transition-all"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 视频网格 */}
          {data && !isLoading && (
            <>
              {data.items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="inline-block p-6 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm mb-4">
                    <span className="text-6xl">📭</span>
                  </div>
                  <h3 className="text-xl font-black tracking-tighter text-black dark:text-white mb-2">
                    暂无视频
                  </h3>
                  <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400">
                    当前筛选条件下没有可用的视频
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
                  {data?.items.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              )}

              {/* 分页 */}
              {data && data.total > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`
                      px-4 py-2 text-sm font-black tracking-tight border-[3px] border-black dark:border-gray-600
                      transition-all duration-150
                      ${page === 1
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 text-black dark:text-white'
                      }
                    `}
                  >
                    上一页
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.ceil(data.total / PAGE_SIZE) }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === Math.ceil(data.total / PAGE_SIZE) || Math.abs(p - page) <= 1)
                      .map((p, idx, arr) => (
                        <React.Fragment key={p}>
                          {idx > 0 && arr[idx - 1] !== p - 1 && (
                            <span className="px-2 text-gray-400">...</span>
                          )}
                          <button
                            onClick={() => setPage(p)}
                            className={`
                              w-10 h-10 text-sm font-black tracking-tight border-[2px] border-black dark:border-gray-600
                              transition-all duration-150
                              ${page === p
                                ? 'bg-[#B4F416] shadow-[3px_3px_0px_0px_#000] text-black'
                                : 'bg-white dark:bg-gray-800 shadow-[3px_3px_0px_0px_#000] dark:shadow-[3px_3px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 text-black dark:text-white'
                              }
                            `}
                          >
                            {p}
                          </button>
                        </React.Fragment>
                      ))}
                  </div>

                  <button
                    onClick={() => setPage(p => Math.min(Math.ceil(data.total / PAGE_SIZE), p + 1))}
                    disabled={page >= Math.ceil(data.total / PAGE_SIZE)}
                    className={`
                      px-4 py-2 text-sm font-black tracking-tight border-[3px] border-black dark:border-gray-600
                      transition-all duration-150
                      ${page >= Math.ceil(data.total / PAGE_SIZE)
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
                        : 'bg-white dark:bg-gray-800 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5 text-black dark:text-white'
                      }
                    `}
                  >
                    下一页
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </div>
    </div>
  )
}

// 加载骨架屏
function VideoListSkeleton() {
  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-sm" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-sm mt-2" />
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded-sm overflow-hidden">
              <div className="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse border-b-[3px] border-black dark:border-gray-600" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-sm" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// 导出组件 - 包装 Suspense
export default function VideoListClient() {
  return (
    <Suspense fallback={<VideoListSkeleton />}>
      <VideoListContent />
    </Suspense>
  )
}
