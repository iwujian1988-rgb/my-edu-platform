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
  Video,
  Repeat,
  Zap,
  Star,
  Podcast,
  GraduationCap,
  ArrowRight,
} from 'lucide-react'
import type { VideoListItem, VideoListResponse } from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, CEFR_LEVEL_LABELS, VIDEO_LANGUAGE_LABELS, CONTENT_TYPE_LABELS, formatDuration } from '@/types/video'
import type { CefrLevel } from '@/types/video'
import LearningCalendar from '@/components/video/LearningCalendar'
import { VideoPromoPopup } from '@/components/video/VideoPromoPopup'
import { AudioCoverBackground } from '@/components/video/AudioCoverBackground'
import VideoCard from '@/components/video/VideoCard'
import { getDifficultyColor } from '@/components/video/VideoCard'
import PodcastZone from '@/components/video/PodcastZone'
import { ContinueLearningBar } from '@/components/video/ContinueLearningBar'
import { AppImportLinkButton } from '@/components/video/AppImportLinkButton'

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

// 学习状态选项
const LEARN_STATUS_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'learned', label: '已学习' },
  { value: 'unlearned', label: '未学习' },
]

// 内容类型选项
const CONTENT_TYPE_OPTIONS = [
  { value: 'all', label: '全部' },
  { value: 'video', label: '视频' },
  { value: 'audio', label: '播客' },
]

// 分页常量
const PAGE_SIZE = 12
const FRENCH_LANGUAGE = 'fr'

class UnauthorizedFetchError extends Error {
  status: number

  constructor() {
    super('UNAUTHORIZED')
    this.name = 'UnauthorizedFetchError'
    this.status = 401
  }
}

// 最新发布大卡（FeaturedCard）
function FeaturedCard({ video }: { video: VideoListItem }) {
  const progress = video.user_progress
  const isAudio = video.content_type === 'audio'
  const coverImage = isAudio ? (video.cover_url || video.thumbnail_url) : (video.thumbnail_url || video.cover_url)
  const hasProgress = progress && progress.max_progress > 0 && !progress.is_completed

  return (
    <section className="maxtube-featured mb-7">
      {/* 区域标题 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-gradient-to-br from-[#3140b5] to-[#6853ff] text-white shadow-[0_7px_14px_rgba(57,65,190,0.18)]">
          <span className="font-semibold text-sm">N</span>
        </div>
        <h2 className="text-xl font-bold uppercase tracking-wide text-black dark:text-white">
          最新发布
        </h2>
      </div>

      <Link
        href={`/videos/${video.id}`}
        className="group block overflow-hidden rounded-[15px] border border-[#e7eaf2] bg-white shadow-[0_12px_30px_rgba(31,42,104,0.055)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(31,42,104,0.10)] dark:border-[#273149] dark:bg-[#141b2d]"
      >
        {/* PC端：横向布局 */}
        <div className="hidden md:flex">
          {/* 封面区 */}
          <div className="relative w-[360px] lg:w-[420px] flex-shrink-0 aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden border-r border-[#e7eaf2] dark:border-[#273149]">
            {isAudio && coverImage ? (
              <>
                <AudioCoverBackground imageUrl={coverImage} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 lg:w-28 lg:h-28 rounded-lg border border-white/10 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                    style={{ backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#222' }} />
                </div>
              </>
            ) : coverImage ? (
              <img
                src={coverImage}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {isAudio ? (
                  <Podcast className="w-16 h-16 text-purple-500 opacity-30" />
                ) : (
                  <Video className="w-16 h-16 text-black dark:text-white opacity-20" />
                )}
              </div>
            )}
            {/* 类型标签 */}
            <div className="absolute top-3 left-3">
              {isAudio ? (
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-300 rounded shadow-sm transform -rotate-1">
                  <Podcast className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-semibold tracking-tight">播客</span>
                </div>
              ) : (
                <div className="rounded-[7px] bg-white/92 px-3 py-1.5 text-[#2d39bb] shadow-[0_6px_14px_rgba(31,42,104,0.12)] backdrop-blur-sm">
                  <span className="text-xs font-semibold tracking-tight flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    视频
                  </span>
                </div>
              )}
            </div>
            {/* 时长 */}
            <div className="absolute bottom-3 right-3 rounded-[6px] bg-black/75 px-2 py-1 text-xs font-bold text-white backdrop-blur-sm">
              {formatDuration(video.duration)}
            </div>
            {/* 进度条 */}
            {hasProgress && (
              <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gray-300 dark:bg-gray-600">
                <div
                  className="h-full bg-gradient-to-r from-[#2633a8] to-[#6550ff] transition-all duration-300"
                  style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* 信息区 */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center min-w-0">
            <h3 className="text-[23px] font-extrabold leading-snug tracking-[-0.01em] text-[#2639b1] dark:text-[#bcc5ff] mb-3 line-clamp-2 group-hover:text-[#3745df] transition-colors">
              {video.title}
            </h3>

            {video.description && (
              <p className="text-sm leading-7 text-[#5c6479] dark:text-[#a7b0c8] mb-4 line-clamp-2">
                {video.description}
              </p>
            )}

            {/* 标签行 */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500 rounded">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {VIDEO_LANGUAGE_LABELS[video.language]}
                </span>
              </div>
              <div className={`rounded-[7px] px-2 py-1 ${getDifficultyColor(video.difficulty)}`}>
                <span className="text-xs font-bold">
                  {video.cefr_level ? CEFR_LEVEL_LABELS[video.cefr_level as CefrLevel] : VIDEO_DIFFICULTY_LABELS[video.difficulty]}
                </span>
              </div>
              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500 rounded flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {formatDuration(video.duration)}
                </span>
              </div>
            </div>

            {/* CTA 按钮 */}
            <div>
              <div className="inline-flex h-[42px] items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-5 text-sm font-bold text-white shadow-[0_10px_24px_rgba(48,56,196,0.25)] transition-all group-hover:-translate-y-0.5 group-hover:shadow-[0_13px_28px_rgba(48,56,196,0.3)]">
                <Play className="w-4 h-4" fill="currentColor" />
                {hasProgress ? '继续学习' : '开始学习'}
              </div>
              {hasProgress && (
                <span className="ml-3 text-sm font-mono font-bold text-gray-500">
                  进度 {Math.min(Math.round(progress.max_progress), 100)}%
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 移动端：纵向布局 */}
        <div className="md:hidden">
          {/* 封面区 */}
          <div className="relative w-full aspect-video overflow-hidden border-b border-[#e7eaf2] bg-gray-100 dark:border-[#273149] dark:bg-gray-700">
            {isAudio && coverImage ? (
              <>
                <AudioCoverBackground imageUrl={coverImage} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-20 h-20 rounded-lg border border-white/10 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                    style={{ backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#222' }} />
                </div>
              </>
            ) : coverImage ? (
              <img
                src={coverImage}
                alt={video.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                {isAudio ? (
                  <Podcast className="w-12 h-12 text-purple-500 opacity-30" />
                ) : (
                  <Video className="w-12 h-12 text-black dark:text-white opacity-20" />
                )}
              </div>
            )}
            {/* 类型标签角标 */}
            <div className="absolute top-2 left-2">
              {isAudio ? (
                <div className="flex items-center gap-1 rounded-[6px] bg-white/92 px-2 py-0.5 shadow-[0_5px_12px_rgba(31,42,104,0.10)] backdrop-blur-sm">
                  <Podcast className="w-3 h-3 text-purple-600" />
                  <span className="text-[10px] font-black">播客</span>
                </div>
              ) : (
                <div className="flex items-center gap-0.5 rounded-[6px] bg-white/92 px-2 py-0.5 text-[10px] font-bold text-[#2d39bb] shadow-[0_5px_12px_rgba(31,42,104,0.10)] backdrop-blur-sm">
                  <Play className="w-2.5 h-2.5" />
                  视频
                </div>
              )}
            </div>
            {/* 时长 */}
            <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs font-bold">
              {formatDuration(video.duration)}
            </div>
            {/* 进度条 */}
            {hasProgress && (
              <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-gray-300 dark:bg-gray-600">
                <div
                  className="h-full bg-gradient-to-r from-[#2633a8] to-[#6550ff] transition-all duration-300"
                  style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* 信息区 */}
          <div className="p-4">
            <h3 className="text-lg font-extrabold tracking-[-0.01em] text-[#2639b1] dark:text-[#bcc5ff] mb-2 line-clamp-2 group-hover:text-[#3745df] transition-colors">
              {video.title}
            </h3>

            {video.description && (
              <p className="text-xs leading-5 text-[#5c6479] dark:text-[#a7b0c8] mb-3 line-clamp-2">
                {video.description}
              </p>
            )}

            {/* 标签行 */}
            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border-[1px] border-gray-300 dark:border-gray-500">
                <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
                  {VIDEO_LANGUAGE_LABELS[video.language]}
                </span>
              </div>
              <div className={`rounded-[6px] px-2 py-0.5 ${getDifficultyColor(video.difficulty)} text-[11px] font-bold`}>
                {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
              </div>
            </div>

            {/* CTA 按钮 */}
            <div className="inline-flex items-center gap-2 rounded-[10px] bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_18px_rgba(48,56,196,0.22)]">
              <Play className="w-3.5 h-3.5" fill="currentColor" />
              {hasProgress ? '继续学习' : '开始学习'}
            </div>
            {hasProgress && (
              <span className="ml-2 text-xs font-mono font-bold text-gray-500">
                {Math.min(Math.round(progress.max_progress), 100)}%
              </span>
            )}
          </div>
        </div>
      </Link>
    </section>
  )
}

function MaxClassEntryCard() {
  return (
    <section className="maxtube-course-hero mb-6 md:mb-7">
      <Link
        href="/parcours"
        className="group relative block min-h-[360px] overflow-hidden rounded-[22px] border border-[#e3e7f1] bg-white px-6 py-7 pb-[118px] shadow-[0_12px_34px_rgba(31,42,104,0.08)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_40px_rgba(31,42,104,0.12)] sm:min-h-[320px] md:min-h-0 md:pb-7 dark:border-[#29324a] dark:bg-[#12182a]"
      >
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_70%_35%,rgba(101,80,255,0.16),transparent_36%),linear-gradient(100deg,transparent,#f4f5ff)] dark:bg-[radial-gradient(circle_at_70%_35%,rgba(101,80,255,0.22),transparent_38%)]" />
        <img
          src="/maxtube/hero-illustration.png"
          alt="Arc de Triomphe and French flag"
          className="pointer-events-none absolute bottom-2 right-3 w-[250px] opacity-65 sm:bottom-3 sm:right-8 sm:w-[290px] md:bottom-auto md:right-[170px] md:top-1/2 md:w-[270px] md:-translate-y-1/2 md:opacity-100 lg:right-[190px] lg:w-[310px] dark:hidden"
        />
        <div className="relative z-10 flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-5">
            <div className="hidden h-[62px] w-[62px] shrink-0 place-items-center rounded-[13px] border border-[#edf0f7] bg-white text-[#4452ee] shadow-[0_8px_20px_rgba(68,82,238,0.08)] md:grid dark:border-[#2b3550] dark:bg-[#18213a] dark:text-[#9aa5ff]">
              <GraduationCap className="h-6 w-6" aria-hidden />
            </div>
            <div className="min-w-0 md:max-w-[620px] lg:max-w-[680px]">
              <p className="mb-2 text-xs font-extrabold tracking-wide text-[#2f43d8] dark:text-[#9aa5ff]">
                MaxClass
              </p>
              <h2 className="text-[25px] font-extrabold leading-tight tracking-[-0.02em] text-[#121729] md:text-[30px] dark:text-white">
                A1 Real French parcours
              </h2>
              <p className="mt-4 max-w-3xl text-sm leading-7 text-[#4d566f] dark:text-[#c5cce0]">
                Enter the structured French course from your video membership. Lessons, practice blocks,
                progress, and authentic video-based activities stay in one learning flow.
              </p>
              <div className="mt-6 flex flex-wrap gap-2.5">
                {['Structured course', 'Real practice', 'Progress tracking', 'Video lessons'].map((item) => (
                  <span key={item} className="rounded-full bg-[#f1f2ff] px-3.5 py-2 text-xs font-semibold text-[#3f4cdb] dark:bg-[#202a4d] dark:text-[#b8c0ff]">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
          <div className="relative z-20 inline-flex h-[52px] shrink-0 items-center justify-center gap-2 rounded-[10px] bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-6 text-sm font-bold text-white shadow-[0_10px_24px_rgba(48,56,196,0.25)] transition-all group-hover:shadow-[0_13px_28px_rgba(48,56,196,0.3)] md:h-[58px] md:text-base">
            Start class
            <ArrowRight className="h-4 w-4" aria-hidden />
          </div>
        </div>
      </Link>
    </section>
  )
}


// SWR fetcher
const fetcher = async (url: string): Promise<VideoListResponse> => {
  const res = await fetch(url)
  if (res.status === 401) {
    throw new UnauthorizedFetchError()
  }
  if (!res.ok) throw new Error('Failed to fetch')
  const json = await res.json()
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
  const [learnStatus, setLearnStatus] = useState<string>(
    searchParams.get('learnStatus') || 'all'
  )
  const [contentType, setContentType] = useState<string>(
    searchParams.get('contentType') || 'all'
  )
  const [page, setPage] = useState<number>(
    parseInt(searchParams.get('page') || '1')
  )
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)

  const updateFilter = useCallback((
    setter: React.Dispatch<React.SetStateAction<string>>,
    value: string
  ) => {
    setter(value)
    setPage(1)
  }, [])

  // 构建查询 URL
  const tzOffset = useMemo(() => String(new Date().getTimezoneOffset()), [])
  const buildQueryUrl = useCallback(() => {
    const params = new URLSearchParams()
    params.set('tz_offset', tzOffset)
    if (language && language !== 'all') {
      params.set('language', language)
    }
    if (difficulty && difficulty !== 'all') {
      params.set('difficulty', difficulty)
    }
    if (tag && tag !== 'all') {
      params.set('tag', tag)
    }
    if (learnStatus && learnStatus !== 'all') {
      params.set('learnStatus', learnStatus)
    }
    if (contentType && contentType !== 'all') {
      params.set('content_type', contentType)
    }
    // 分页参数
    const offset = (page - 1) * PAGE_SIZE
    params.set('limit', String(PAGE_SIZE))
    params.set('offset', String(offset))

    const queryString = params.toString()
    return `/api/videos${queryString ? `?${queryString}` : ''}`
  }, [language, difficulty, tag, learnStatus, contentType, page, tzOffset])

  // 获取视频列表
  const { data, error, isLoading, isValidating, mutate } = useSWR<VideoListResponse>(
    buildQueryUrl(),
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5秒内重复请求去重
      keepPreviousData: true, // 切换筛选时保留旧数据，避免闪烁
    }
  )

  // 获取标签列表（并行请求，不等待视频数据）
  const { data: tagsData } = useSWR<{ id: string; name: string; video_count: number }[]>(
    '/api/video-tags',
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed to fetch tags')
      const json = await res.json()
      return json.data || []
    },
    { revalidateOnFocus: false, dedupingInterval: 10000 }
  )

  // 继续学习：独立请求，不受分页/筛选影响，包含视频和播客
  const { data: continueLearningData } = useSWR<{ items: VideoListItem[] }>(
    '/api/videos/continue-learning',
    async (url) => {
      const res = await fetch(url)
      if (!res.ok) throw new Error('Failed')
      const json = await res.json()
      return json.data
    },
    { revalidateOnFocus: true, dedupingInterval: 10000 }
  )
  const continueLearningVideos = continueLearningData?.items || []

  // 未登录时跳转到登录页
  useEffect(() => {
    if (error?.message === 'UNAUTHORIZED') {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [error, router])

  // 翻页或切换筛选时回到页面顶部
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' })
  }, [page, language, difficulty, tag, learnStatus, contentType])

  // 翻页时正在加载新数据（非首次加载）
  const isPageChanging = isValidating && !!data

  // 更新 URL（统一处理筛选和分页）
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
    if (learnStatus && learnStatus !== 'all') {
      params.set('learnStatus', learnStatus)
    }
    if (contentType && contentType !== 'all') {
      params.set('contentType', contentType)
    }
    if (page > 1) {
      params.set('page', String(page))
    }

    const queryString = params.toString()
    const newUrl = queryString ? `?${queryString}` : window.location.pathname
    // 使用 setTimeout 确保状态更新后再更新 URL
    const timer = setTimeout(() => {
      router.replace(newUrl, { scroll: false })
    }, 0)
    return () => clearTimeout(timer)
  }, [language, difficulty, tag, learnStatus, contentType, page, router])

  // 最新发布（列表第一条，按 published_at 降序，服务端已排好）
  const featuredVideo = (data?.items && data.items.length > 0) ? data.items[0] : null
  const showFeatured = !!(featuredVideo && page === 1 && contentType === 'all' && difficulty === 'all' && language === 'all' && tag === 'all' && learnStatus === 'all')
  const showPodcastZone = page === 1 && contentType === 'all' && difficulty === 'all' && language === 'all' && tag === 'all' && learnStatus === 'all'
  const gridItems = showFeatured ? (data?.items?.slice(1) || []) : (data?.items || [])

  // 动态语言选项（基于用户权限范围内的语言）
  const languageOptions = useMemo(() => {
    return buildLanguageOptions(data?.available_languages)
  }, [data?.available_languages])

  // 是否显示语言筛选（只有多种语言时才显示）
  const showLanguageFilter = (data?.available_languages?.length || 0) > 1

  return (
    <div className="maxtube-home min-h-screen transition-colors duration-300">
      {/* 注入跑马灯动画和镂空文字的自定义 CSS */}
      <style>
        {`
          @keyframes marquee {
            0% { transform: translateX(0%); }
            100% { transform: translateX(-50%); }
          }
          .animate-marquee {
            animation: marquee 20s linear infinite;
          }
          .text-outline {
            color: rgba(0, 0, 0, 0.03);
          }
          .dark .text-outline {
            color: rgba(255, 255, 255, 0.03);
          }
          @keyframes slideInFromRight {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
          }
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          .slide-in-from-right {
            animation: slideInFromRight 0.3s ease-out forwards;
          }
          .fade-in {
            animation: fadeIn 0.2s ease-out forwards;
          }
          .banner-content {
            min-height: 80px;
          }
          @keyframes loading {
            0% { transform: translateX(-100%); }
            100% { transform: translateX(350%); }
          }
          .maxtube-home {
            --mt-bg: #f8faff;
            --mt-surface: #ffffff;
            --mt-text: #121729;
            --mt-muted: #68718a;
            --mt-line: #e7eaf2;
            --mt-soft: #f3f5fb;
            --mt-blue: #2d39bb;
            --mt-violet: #6550ff;
            --mt-shadow: 0 12px 34px rgba(31,42,104,.08);
            background: linear-gradient(180deg, #fbfcff 0%, #f7f9fd 100%);
            color: var(--mt-text);
          }
          .dark .maxtube-home {
            --mt-bg: #0f1424;
            --mt-surface: #141b2d;
            --mt-text: #edf1ff;
            --mt-muted: #a7b0c8;
            --mt-line: #273149;
            --mt-soft: #192238;
            background: linear-gradient(180deg, #101626 0%, #0c1120 100%);
          }
          .maxtube-home > div:first-of-type {
            display: none;
          }
          .maxtube-home .neo-card-video {
            border: 1px solid var(--mt-line) !important;
            border-radius: 12px !important;
            background: var(--mt-surface) !important;
            box-shadow: 0 9px 24px rgba(31,42,104,.06) !important;
          }
          .maxtube-home .neo-card-video:hover {
            transform: translateY(-3px) !important;
            box-shadow: 0 14px 30px rgba(31,42,104,.10) !important;
          }
          .maxtube-home .neo-card-video h3 {
            color: #2639b1;
            font-weight: 800;
            letter-spacing: 0;
          }
          .dark .maxtube-home .neo-card-video h3 {
            color: #bcc5ff;
          }
          .maxtube-home .neo-card-video:hover h3 {
            color: #3745df !important;
          }
          .maxtube-home .neo-card-video [class*="border-b"] {
            border-color: var(--mt-line) !important;
          }
          .maxtube-home .neo-card-video [class*="bg-gray-100"],
          .maxtube-home .neo-card-video [class*="dark:bg-gray-700"] {
            border-color: transparent !important;
            border-radius: 4px !important;
            background: #f2f3f6 !important;
            color: #424756 !important;
          }
          .dark .maxtube-home .neo-card-video [class*="bg-gray-100"],
          .dark .maxtube-home .neo-card-video [class*="dark:bg-gray-700"] {
            background: #202941 !important;
            color: #c5cce0 !important;
          }
          .maxtube-home .bottom-player,
          .maxtube-home [class*="fixed"][class*="bottom-0"] {
            border-color: var(--mt-line) !important;
            background: rgba(255,255,255,.96) !important;
            box-shadow: 0 -8px 28px rgba(40,47,94,.08) !important;
            backdrop-filter: blur(14px);
          }
          .dark .maxtube-home .bottom-player,
          .dark .maxtube-home [class*="fixed"][class*="bottom-0"] {
            background: rgba(15,20,36,.94) !important;
          }
          .maxtube-home .slide-in-from-right {
            border-left: 1px solid var(--mt-line);
            background: var(--mt-surface) !important;
            box-shadow: -12px 0 34px rgba(31,42,104,.12) !important;
          }
          .maxtube-home .slide-in-from-right [class*="border-black"] {
            border-color: var(--mt-line) !important;
          }
          .maxtube-home .slide-in-from-right [class*="shadow-"] {
            box-shadow: none !important;
          }
          .maxtube-home .slide-in-from-right button,
          .maxtube-home .slide-in-from-right span {
            border-radius: 8px;
          }
          .maxtube-home .slide-in-from-right [class*="bg-[#B4F416]"] {
            background: linear-gradient(135deg, #2633a8, #6550ff) !important;
            color: #fff !important;
          }
          .maxtube-home .slide-in-from-right [class*="bg-gray-100"] {
            background: #f3f5fb !important;
            color: #343947 !important;
          }
          .dark .maxtube-home .slide-in-from-right [class*="bg-gray-100"],
          .dark .maxtube-home .slide-in-from-right [class*="dark:bg-gray-800"] {
            background: #202941 !important;
            color: #c5cce0 !important;
          }
          @media (min-width: 768px) {
            .banner-content {
              min-height: 130px;
            }
          }
        `}
      </style>

      {/* 页面头部 - 紧凑版 Neo-brutalism 风格 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative border-[3px] border-black bg-[#D4FF32] dark:bg-gray-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_#666] rounded flex flex-col overflow-hidden transition-colors duration-300">

          {/* 背景水印层 — 统一 -20° 斜排，每行一种语言 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ transform: 'rotate(-20deg)', transformOrigin: 'center', scale: '2', left: '20%', willChange: 'transform' }}>
            <div className="flex flex-col gap-1 md:gap-1.5 whitespace-nowrap select-none">
              <div className="text-outline font-black text-[12px] md:text-[16px] leading-none tracking-wider">自然地学习 &nbsp; 地道外语沉浸 &nbsp; 自然地学习 &nbsp; 地道外语沉浸 &nbsp; 自然地学习 &nbsp; 地道外语沉浸 &nbsp; 自然地学习 &nbsp; 地道外语沉浸 &nbsp; 自然地学习 &nbsp; 地道外语沉浸 &nbsp; 自然地学习</div>
              <div className="text-outline font-black text-[12px] md:text-[16px] leading-none tracking-wider">&nbsp; LEARN NATURALLY &nbsp; SPEAK CONFIDENTLY &nbsp; LEARN NATURALLY &nbsp; SPEAK CONFIDENTLY &nbsp; LEARN NATURALLY &nbsp; SPEAK CONFIDENTLY &nbsp; LEARN NATURALLY &nbsp; SPEAK CONFIDENTLY &nbsp; LEARN NATURALLY</div>
              <div className="text-outline font-black text-[12px] md:text-[16px] leading-none tracking-wider">PARLEZ COURAMMENT &nbsp; ÉCOUTE CHAQUE JOUR &nbsp; PARLEZ COURAMMENT &nbsp; ÉCOUTE CHAQUE JOUR &nbsp; PARLEZ COURAMMENT &nbsp; ÉCOUTE CHAQUE JOUR &nbsp; PARLEZ COURAMMENT &nbsp; ÉCOUTE CHAQUE JOUR</div>
              <div className="text-outline font-black text-[12px] md:text-[16px] leading-none tracking-wider">&nbsp; 自然に学ぶ &nbsp; 毎日リスニング &nbsp; 自然に学ぶ &nbsp; 毎日リスニング &nbsp; 自然に学ぶ &nbsp; 毎日リスニング &nbsp; 自然に学ぶ &nbsp; 毎日リスニング &nbsp; 自然に学ぶ &nbsp; 毎日リスニング</div>
              <div className="text-outline font-black text-[12px] md:text-[16px] leading-none tracking-wider">APRENDE NATURALMENTE &nbsp; HABLA CON SEGURIDAD &nbsp; APRENDE NATURALMENTE &nbsp; HABLA CON SEGURIDAD &nbsp; APRENDE NATURALMENTE &nbsp; HABLA CON SEGURIDAD &nbsp; APRENDE NATURALMENTE &nbsp; HABLA CON SEGURIDAD</div>
              <div className="text-outline font-black text-[12px] md:text-[16px] leading-none tracking-wider">&nbsp; IMPARA NATURALMENTE &nbsp; PARLA CON FIDUCIA &nbsp; IMPARA NATURALMENTE &nbsp; PARLA CON FIDUCIA &nbsp; IMPARA NATURALMENTE &nbsp; PARLA CON FIDUCIA &nbsp; IMPARA NATURALMENTE &nbsp; PARLA CON FIDUCIA</div>
            </div>
          </div>

          {/* 前景内容层 - 紧凑 padding */}
          <div className="flex flex-col md:flex-row justify-center md:justify-start items-center w-full p-3 md:p-4 md:px-10 md:py-5 relative z-10 gap-2 md:gap-3 flex-1 banner-content">

            {/* 左侧：品牌信息 */}
            <div className="flex items-center justify-center gap-1.5 md:gap-2 w-full md:w-auto md:justify-start">
              {/* YouTube 风格播放图标 */}
              <div className="shrink-0">
                <svg viewBox="0 0 60 42" className="w-12 md:w-14 h-auto">
                  <defs>
                    <mask id="play-cutout">
                      <rect width="100%" height="100%" fill="white" />
                      <polygon points="23,13 23,29 39,21" fill="black" />
                    </mask>
                  </defs>
                  <path d="M58.6,6.6 C57.9,3.9 55.8,1.8 53.1,1.1 C48.4,0 30,0 30,0 C30,0 11.6,0 6.9,1.1 C4.2,1.8 2.1,3.9 1.4,6.6 C0.1,11.4 0,21 0,21 C0,21 0.1,30.6 1.4,35.4 C2.1,38.1 4.2,40.2 6.9,40.9 C11.6,42 30,42 30,42 C30,42 48.4,42 53.1,40.9 C55.8,40.2 57.9,38.1 58.6,35.4 C59.9,30.6 60,21 60,21 C60,21 59.9,11.4 58.6,6.6 Z" fill="black" className="dark:fill-white" mask="url(#play-cutout)" />
                </svg>
              </div>

              <span className="text-3xl md:text-4xl font-black tracking-tight text-black dark:text-white" style={{ fontFamily: 'Impact, "Arial Black", "Helvetica Neue", sans-serif', letterSpacing: '0.01em' }}>MaxTube</span>
            </div>

          </div>

          {/* 底部：跑马灯 - 变窄变轻 */}
          <div className="border-t-[2px] md:border-t-[3px] border-black dark:border-gray-600 bg-black text-[#D4FF32] dark:text-[#B4F416] overflow-hidden py-1 md:py-1.5 flex relative z-10 mt-auto">
            <div className="flex whitespace-nowrap font-black text-[9px] md:text-[10px] tracking-widest uppercase animate-marquee w-[200%]">
              <div className="flex-1 flex justify-around items-center">
                <span>✦ IMMERSIVE LEARNING</span>
                <span>✦ REAL-WORLD SCENARIOS</span>
                <span>✦ NATIVE PRONUNCIATION</span>
                <span>✦ SPACED REPETITION</span>
              </div>
              <div className="flex-1 flex justify-around items-center">
                <span>✦ IMMERSIVE LEARNING</span>
                <span>✦ REAL-WORLD SCENARIOS</span>
                <span>✦ NATIVE PRONUNCIATION</span>
                <span>✦ SPACED REPETITION</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区域 */}
      <div className="max-w-[1480px] mx-auto px-3 sm:px-6 lg:px-8 pt-6 pb-10">
        {page === 1 && (language === 'all' || language === FRENCH_LANGUAGE) && (
          <MaxClassEntryCard />
        )}

          {/* 移动端筛选抽屉 - 右侧滑出 */}
          {filterDrawerOpen && (
            <>
              {/* 遮罩层 */}
              <div
                className="fixed inset-0 bg-black/50 z-50 md:hidden fade-in"
                onClick={() => setFilterDrawerOpen(false)}
              />
              {/* 抽屉内容 - 右侧 */}
              <div className="fixed right-0 top-0 bottom-0 w-[280px] bg-white dark:bg-gray-900 z-50 md:hidden overflow-y-auto shadow-[-4px_0_0_0_#000] dark:shadow-[-4px_0_0_0_#666] slide-in-from-right">
                {/* 抽屉头部 */}
                <div className="flex items-center justify-between p-4 border-b-[3px] border-black dark:border-gray-600">
                  <span className="font-black text-lg text-black dark:text-white">筛选</span>
                  <button
                    onClick={() => setFilterDrawerOpen(false)}
                    className="w-8 h-8 flex items-center justify-center border-[2px] border-black dark:border-gray-600 font-black text-black dark:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* 筛选内容 */}
                <div className="p-4 space-y-5">
                  {/* 套餐标签 */}
                  {data?.user_packages && data.user_packages.length > 0 && (
                    <div>
                      <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">套餐</div>
                      <div className="flex gap-2 flex-wrap">
                        {data.user_packages.map((pkg) => (
                          <div key={pkg.id} className="inline-flex items-center gap-1.5">
                            <span className="px-3 py-1.5 text-xs font-black bg-[#B4F416] border-[2px] border-black">
                              {pkg.name}
                            </span>
                            <AppImportLinkButton packageId={pkg.id} compact />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 内容类型筛选 */}
                  <div>
                    <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">类型</div>
                    <div className="flex gap-2 flex-wrap">
                      {CONTENT_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { updateFilter(setContentType, opt.value); setFilterDrawerOpen(false) }}
                          className={`
                            px-3 py-1.5 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                            ${contentType === opt.value
                              ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                              : 'bg-white dark:bg-gray-800 text-black dark:text-white'
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 学习状态筛选 */}
                  <div>
                    <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">状态</div>
                    <div className="flex gap-2 flex-wrap">
                      {LEARN_STATUS_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { updateFilter(setLearnStatus, opt.value); setFilterDrawerOpen(false) }}
                          className={`
                            px-3 py-1.5 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                            ${learnStatus === opt.value
                              ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                              : 'bg-white dark:bg-gray-800 text-black dark:text-white'
                            }
                          `}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 语言筛选 */}
                  {showLanguageFilter && (
                    <div>
                      <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">语言</div>
                      <div className="flex gap-2 flex-wrap">
                        {languageOptions.slice(0, 5).map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => { updateFilter(setLanguage, opt.value); setFilterDrawerOpen(false) }}
                            className={`
                              px-3 py-1.5 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                              ${language === opt.value
                                ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                                : 'bg-white dark:bg-gray-800 text-black dark:text-white'
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
                  <div>
                    <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">难度</div>
                    <div className="flex gap-2 flex-wrap">
                      {DIFFICULTY_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { updateFilter(setDifficulty, opt.value); setFilterDrawerOpen(false) }}
                          className={`
                            px-3 py-1.5 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                            ${difficulty === opt.value
                              ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                              : 'bg-white dark:bg-gray-800 text-black dark:text-white'
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
                    <div>
                      <div className="text-sm font-black text-gray-700 dark:text-gray-300 mb-2">标签</div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => { updateFilter(setTag, 'all'); setFilterDrawerOpen(false) }}
                          className={`
                            px-3 py-1.5 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                            ${tag === 'all'
                              ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                              : 'bg-white dark:bg-gray-800 text-black dark:text-white'
                            }
                          `}
                        >
                          全部
                        </button>
                        {tagsData.slice(0, 8).map((t) => (
                          <button
                            key={t.id}
                            onClick={() => { updateFilter(setTag, t.name); setFilterDrawerOpen(false) }}
                            className={`
                              px-3 py-1.5 text-xs font-black tracking-tight border-[2px] border-black dark:border-gray-600 transition-all
                              ${tag === t.name
                                ? 'bg-[#B4F416] shadow-[2px_2px_0px_0px_#000]'
                                : 'bg-white dark:bg-gray-800 text-black dark:text-white'
                              }
                            `}
                          >
                            {t.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 重置筛选按钮 */}
                  <div className="pt-3 border-t-[2px] border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => {
                        setLearnStatus('all')
                        setLanguage('all')
                        setDifficulty('all')
                        setTag('all')
                        setPage(1)
                        setFilterDrawerOpen(false)
                      }}
                      className="w-full py-2.5 text-sm font-black tracking-tight border-[2px] border-black dark:border-gray-600 bg-gray-100 dark:bg-gray-800 text-black dark:text-white hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                    >
                      重置全部筛选
                    </button>
                  </div>
                </div>
              </div>
            </>
          )}

        {/* 主内容区：左侧视频 + 右侧日历 */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
          {/* 左侧：视频区域 */}
          <div className="flex-1 min-w-0">
            {/* 最新发布大卡 - 仅在首页(page=1)且无筛选时显示 */}
            {showFeatured && featuredVideo && (
              <FeaturedCard video={featuredVideo} />
            )}

            {/* PC端筛选工具栏 */}
            <section className="mb-5 hidden px-1 py-2 md:block">
              <div className="mb-3 flex flex-wrap items-center gap-2">
              {/* 内容类型筛选 */}
              <div className="flex items-center gap-2">
                <span className="mr-1 text-[13px] font-medium text-[#747b8d]">类型</span>
                <div className="flex gap-1">
                  {CONTENT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFilter(setContentType, opt.value)}
                      className={`
                        h-[31px] rounded-[7px] border border-transparent px-3 text-xs font-bold transition-all
                        ${contentType === opt.value
                          ? 'bg-gradient-to-br from-[#2633a8] to-[#6550ff] text-white shadow-[0_5px_12px_rgba(54,62,190,0.15)]'
                          : 'bg-[#f3f5f8] text-[#343947] hover:bg-[#e9ecf4] dark:bg-[#202941] dark:text-[#c5cce0] dark:hover:bg-[#26304b]'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 套餐标签 */}
              {data?.user_packages && data.user_packages.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="ml-3 mr-1 text-[13px] font-medium text-[#747b8d]">套餐</span>
                  {data.user_packages.map((pkg) => (
                    <span
                      key={pkg.id}
                      className="inline-flex h-[31px] items-center rounded-[7px] bg-[#f6f7fa] px-3 text-xs font-bold text-[#343947] dark:bg-[#202941] dark:text-[#c5cce0]"
                    >
                      {pkg.name}
                    </span>
                  ))}
                </div>
              )}
              </div>

              {/* 学习状态筛选 */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-1 text-[13px] font-medium text-[#747b8d]">状态</span>
                <div className="flex gap-1">
                  {LEARN_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFilter(setLearnStatus, opt.value)}
                      className={`
                        h-[31px] rounded-[7px] border border-transparent px-3 text-xs font-bold transition-all
                        ${learnStatus === opt.value
                          ? 'bg-gradient-to-br from-[#2633a8] to-[#6550ff] text-white shadow-[0_5px_12px_rgba(54,62,190,0.15)]'
                          : 'bg-[#f3f5f8] text-[#343947] hover:bg-[#e9ecf4] dark:bg-[#202941] dark:text-[#c5cce0] dark:hover:bg-[#26304b]'
                        }
                      `}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>

              {/* 语言筛选 */}
              {showLanguageFilter && (
                <div className="flex items-center gap-2">
                  <span className="ml-3 mr-1 text-[13px] font-medium text-[#747b8d]">语言</span>
                  <div className="flex gap-1">
                    {languageOptions.slice(0, 4).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateFilter(setLanguage, opt.value)}
                        className={`
                          h-[31px] rounded-[7px] border border-transparent px-3 text-xs font-bold transition-all
                           ${language === opt.value
                             ? 'bg-gradient-to-br from-[#2633a8] to-[#6550ff] text-white shadow-[0_5px_12px_rgba(54,62,190,0.15)]'
                             : 'bg-[#f3f5f8] text-[#343947] hover:bg-[#e9ecf4] dark:bg-[#202941] dark:text-[#c5cce0] dark:hover:bg-[#26304b]'
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
              <div className="flex items-center gap-2">
                <span className="ml-3 mr-1 text-[13px] font-medium text-[#747b8d]">难度</span>
                <div className="flex gap-1">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => updateFilter(setDifficulty, opt.value)}
                      className={`
                        h-[31px] rounded-[7px] border border-transparent px-3 text-xs font-bold transition-all
                        ${difficulty === opt.value
                          ? 'bg-gradient-to-br from-[#2633a8] to-[#6550ff] text-white shadow-[0_5px_12px_rgba(54,62,190,0.15)]'
                          : 'bg-[#f3f5f8] text-[#343947] hover:bg-[#e9ecf4] dark:bg-[#202941] dark:text-[#c5cce0] dark:hover:bg-[#26304b]'
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
                <div className="ml-auto">
                  <select
                    value={tag}
                    onChange={(e) => updateFilter(setTag, e.target.value)}
                    className="h-[34px] cursor-pointer appearance-none rounded-[8px] border border-[#e1e5ee] bg-white bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%234f586d%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206-6%22%2F%3E%3C%2Fsvg%3E')] bg-[length:10px] bg-[right_10px_center] bg-no-repeat px-3 pr-8 text-xs font-bold text-[#343947] outline-none transition-colors hover:bg-[#f8faff] dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#c5cce0] dark:hover:bg-[#202941]"
                  >
                    <option value="all">全部</option>
                    {tagsData.map((t) => (
                      <option key={t.id} value={t.name}>{t.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* 重置筛选 - PC端 */}
              {(learnStatus !== 'all' || language !== 'all' || difficulty !== 'all' || tag !== 'all') && (
                <button
                  onClick={() => {
                    setLearnStatus('all')
                    setLanguage('all')
                    setDifficulty('all')
                    setTag('all')
                    setPage(1)
                  }}
                  className="h-[31px] rounded-[7px] px-3 text-xs font-bold text-red-500 transition-all hover:bg-[#fff0f0] hover:text-red-600 dark:text-red-400 dark:hover:bg-[#3a1e28] dark:hover:text-red-300"
                >
                  重置
                </button>
              )}
              </div>
            </section>

            {/* 全部视频 */}
            <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] bg-gradient-to-br from-[#3140b5] to-[#6853ff] text-white shadow-[0_7px_14px_rgba(57,65,190,0.18)]">
                <span className="font-bold text-sm">V</span>
              </div>
              <h2 className="text-[19px] font-bold tracking-[-0.01em] text-[#121729] dark:text-white">
                全部资料
                {data && (
                  <span className="text-sm font-normal text-gray-500 ml-2">
                    ({data.total})
                  </span>
                )}
              </h2>
            </div>
            {/* 移动端筛选按钮 */}
            {(() => {
              const hasActiveFilter = learnStatus !== 'all' || language !== 'all' || difficulty !== 'all' || tag !== 'all'
              return (
                <button
                  onClick={() => setFilterDrawerOpen(true)}
                  className={`
                    md:hidden flex items-center gap-1.5 rounded-[9px] px-3 py-1.5 font-bold text-sm active:translate-y-0.5 transition-colors
                    ${hasActiveFilter
                      ? 'bg-gradient-to-br from-[#2633a8] to-[#6550ff] text-white shadow-[0_5px_12px_rgba(54,62,190,0.15)]'
                      : 'bg-white text-[#343947] shadow-[0_6px_16px_rgba(31,42,104,0.08)] dark:bg-[#141b2d] dark:text-[#c5cce0]'
                    }
                  `}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                  筛选
                    {hasActiveFilter && <span className="w-2 h-2 bg-white rounded-full" />}
                </button>
              )
            })()}
          </div>

          {/* 翻页加载进度条 */}
          {isPageChanging && (
            <div className="h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden rounded-full">
              <div className="h-full animate-[loading_1s_ease-in-out_infinite] bg-gradient-to-r from-[#2633a8] to-[#6550ff]" style={{ width: '40%' }} />
            </div>
          )}

          {/* 加载状态 - 仅首次无数据时显示全屏加载 */}
          {isLoading && !data && (
            <div className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="inline-block h-12 w-12 animate-spin rounded-full border-[3px] border-[#d7dceb] border-t-[#4454ee]"></div>
                <p className="mt-4 text-sm font-mono font-bold text-black dark:text-white">
                  加载中...
                </p>
              </div>
            </div>
          )}

          {/* 错误状态 */}
          {error && (
            <div className="rounded-[14px] border border-[#e7eaf2] bg-white p-6 shadow-[0_10px_28px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d]">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="flex h-12 w-12 items-center justify-center rounded-[10px] bg-[#fff0f0] text-[#d43737]">
                    <span className="text-2xl">⚠️</span>
                  </div>
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-black tracking-tighter text-black dark:text-white">
                    内容暂时没有加载出来，请稍后再试
                  </h3>
                  <p className="text-sm font-mono font-bold text-gray-600 dark:text-gray-400 mt-1">
                    请检查网络连接后重试
                  </p>
                </div>
                <button
                  onClick={() => mutate()}
                  className="ml-auto rounded-[9px] bg-gradient-to-br from-[#2633a8] to-[#6550ff] px-4 py-2 text-sm font-bold text-white shadow-[0_8px_18px_rgba(48,56,196,0.2)] transition-all hover:-translate-y-0.5"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {/* 视频网格 - 有数据就显示，翻页加载时半透明防闪烁 */}
          {data && (
            <div className={`transition-opacity duration-150 ${isPageChanging ? 'opacity-30 pointer-events-none' : 'opacity-100'}`}>
              {data.items.length === 0 ? (
                <div className="text-center py-16">
                  <div className="mb-4 inline-block rounded-[14px] border border-[#e7eaf2] bg-white p-6 shadow-[0_10px_28px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d]">
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
                <div className="grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {gridItems.map((video) => (
                    <VideoCard key={video.id} video={video} />
                  ))}
                </div>
              )}

              {/* 分页 */}
              {data && data.total > PAGE_SIZE && (
                <div className="flex items-center justify-center gap-2 mt-8 mb-24 md:mb-20">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className={`
                      rounded-[9px] px-4 py-2 text-sm font-bold tracking-normal
                      transition-all duration-150
                      ${page === 1
                        ? 'cursor-not-allowed bg-[#f3f5fb] text-[#a4abbc] dark:bg-[#202941] dark:text-[#68718a]'
                        : 'bg-white text-[#343947] shadow-[0_7px_18px_rgba(31,42,104,0.08)] hover:-translate-y-0.5 hover:text-[#2d39bb] dark:bg-[#141b2d] dark:text-[#c5cce0] dark:hover:text-white'
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
                              h-10 w-10 rounded-[9px] text-sm font-bold tracking-normal
                              transition-all duration-150
                              ${page === p
                                ? 'bg-gradient-to-br from-[#2633a8] to-[#6550ff] text-white shadow-[0_8px_18px_rgba(48,56,196,0.2)]'
                                : 'bg-white text-[#343947] shadow-[0_7px_18px_rgba(31,42,104,0.08)] hover:-translate-y-0.5 hover:text-[#2d39bb] dark:bg-[#141b2d] dark:text-[#c5cce0] dark:hover:text-white'
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
                      rounded-[9px] px-4 py-2 text-sm font-bold tracking-normal
                      transition-all duration-150
                      ${page >= Math.ceil(data.total / PAGE_SIZE)
                        ? 'cursor-not-allowed bg-[#f3f5fb] text-[#a4abbc] dark:bg-[#202941] dark:text-[#68718a]'
                        : 'bg-white text-[#343947] shadow-[0_7px_18px_rgba(31,42,104,0.08)] hover:-translate-y-0.5 hover:text-[#2d39bb] dark:bg-[#141b2d] dark:text-[#c5cce0] dark:hover:text-white'
                      }
                    `}
                  >
                    下一页
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

            {/* 播客专区 — 放在全部视频列表+分页的下方 */}
            {showPodcastZone && <div className="mt-6 md:mt-8"><PodcastZone /></div>}
          </div>

          {/* 右侧：知识点侧边栏 - 仅大屏显示 */}
          <aside className="hidden min-w-0 lg:block">
            <div className="sticky top-[92px] space-y-[18px]">
              {/* 学习日历组件 - 仅大屏显示 */}
              <div className="hidden lg:block">
                {/* 标题 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-[31px] w-[31px] items-center justify-center rounded-[8px] bg-gradient-to-br from-[#3140b5] to-[#6853ff] text-white shadow-[0_7px_14px_rgba(57,65,190,0.18)]">
                    <span className="font-bold text-sm">📅</span>
                  </div>
                  <h2 className="text-[19px] font-bold tracking-[-0.01em] text-[#121729] dark:text-white">学习日历</h2>
                </div>
                <Suspense fallback={null}>
                  <LearningCalendar />
                </Suspense>
              </div>

              {/* 领取好礼模块 */}
              <div className="hidden lg:block mt-4">
                <div className="overflow-hidden rounded-[14px] border border-[#e7eaf2] bg-white shadow-[0_10px_28px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d]">
                  {/* 顶部跑马灯 */}
                  <div className="flex overflow-hidden whitespace-nowrap bg-gradient-to-br from-[#5661ed] to-[#6a54f3] py-2 text-white">
                    <div className="flex items-center gap-4 text-[10px] font-bold tracking-wide">
                      <span>🔥 限时福利</span>
                      <span>{'///'}</span>
                      <span>好评免费送</span>
                      <span>{'///'}</span>
                      <span>🔥 限时福利</span>
                    </div>
                  </div>

                  {/* 主内容 */}
                  <div className="p-3">
                    {/* 标签 */}
                    <div className="mb-2 inline-block rounded-full bg-[#fff0f0] px-2.5 py-1 text-xs font-extrabold text-[#d43737]">
                      0元白嫖！
                    </div>

                    {/* 标题 */}
                    <div className="rounded-[10px] bg-gradient-to-br from-white to-[#f0efff] p-3 shadow-[inset_0_0_0_1px_rgba(231,234,242,0.9)] dark:from-[#18213a] dark:to-[#202a4d]">
                      <h3 className="text-base font-black text-black leading-tight">
                        法语<span className="text-[#5a45d6]">原声大礼包</span>
                      </h3>
                      <div className="mt-2 inline-block rounded-full bg-[#f1f2ff] px-2 py-1 text-[10px] font-bold text-[#2d39bb] dark:bg-[#202a4d] dark:text-[#bcc5ff]">
                        小红书好评 = 免费解锁 🔓
                      </div>
                    </div>

                    {/* 按钮 */}
                    <button
                      onClick={() => window.open('https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1', '_blank')}
                      className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-3 py-2.5 text-sm font-bold text-white shadow-[0_8px_18px_rgba(48,56,196,0.2)] transition-all hover:-translate-y-0.5"
                    >
                      <span>🎁</span>
                      立即领取
                    </button>

                    {/* 稀缺感 */}
                    <div className="mt-2 border-b border-dashed border-[#d7dceb] pb-1 text-center text-[10px] font-bold text-[#68718a] dark:border-[#273149] dark:text-[#a7b0c8]">
                      🔥 仅限前 100 名
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* 运营弹窗 */}
      <VideoPromoPopup />

      {/* 继续学习 — 底部播放器栏 */}
      <ContinueLearningBar videos={continueLearningVideos} />
    </div>
  )
}

// 加载骨架屏
function VideoListSkeleton() {
  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded mt-2" />
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] rounded overflow-hidden">
              <div className="h-40 bg-gray-200 dark:bg-gray-700 animate-pulse border-b-[3px] border-black dark:border-gray-600" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
                <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 animate-pulse rounded" />
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
