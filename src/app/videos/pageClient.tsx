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
} from 'lucide-react'
import type { VideoListItem, VideoListResponse } from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, VIDEO_LANGUAGE_LABELS, CONTENT_TYPE_LABELS, formatDuration } from '@/types/video'
import LearningCalendar from '@/components/video/LearningCalendar'
import { VideoPromoPopup } from '@/components/video/VideoPromoPopup'
import { AudioCoverBackground } from '@/components/video/AudioCoverBackground'

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

// 视频卡片组件 - YouTube 风格
function VideoCard({ video }: { video: VideoListItem }) {
  const progress = video.user_progress
  const isAudio = video.content_type === 'audio'
  const coverImage = isAudio ? (video.cover_url || video.thumbnail_url) : video.thumbnail_url

  return (
    <Link
      href={`/videos/${video.id}`}
      className="neo-card neo-card-video group relative bg-white dark:bg-gray-800 border-[2px] md:border-[3px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] md:shadow-[4px_4px_0px_0px_#000] dark:md:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-0.5 transition-transform duration-150 cursor-pointer overflow-hidden block flex flex-col"
    >
      {/* 缩略图 - 移动端更大，PC端正常 */}
      <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden border-b-[2px] md:border-b-[3px] border-black dark:border-gray-600 flex-shrink-0 transition-colors duration-300">
        {isAudio && coverImage ? (
          /* 音频：主色调模糊背景 + 居中封面 */
          <>
            <AudioCoverBackground imageUrl={coverImage} />
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-20 h-20 md:w-24 md:h-24 rounded-lg border border-white/10 overflow-hidden shadow-[0_4px_20px_rgba(0,0,0,0.4)]"
                style={{ backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: '#222' }} />
            </div>
          </>
        ) : coverImage ? (
          <img
            src={coverImage}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isAudio ? (
              <Podcast className="w-10 h-10 md:w-12 md:h-12 text-purple-500 opacity-30" />
            ) : (
              <Video className="w-10 h-10 md:w-12 md:h-12 text-black dark:text-white opacity-20" />
            )}
          </div>
        )}

        {/* 内容类型标签 - PC端 */}
        <div className="hidden md:block absolute top-3 left-3">
          {isAudio ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transform -rotate-1">
              <Podcast className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-black tracking-tight">播客</span>
            </div>
          ) : (
            <div className="px-3 py-1 bg-[#B4F416] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transform -rotate-1">
              <span className="text-xs font-black tracking-tight flex items-center gap-1">
                <Play className="w-3 h-3" />
                视频
              </span>
            </div>
          )}
        </div>

        {/* 内容类型标签 - 移动端 */}
        <div className="md:hidden absolute top-2 left-2">
          {isAudio ? (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm border-[1px] border-black">
              <Podcast className="w-3 h-3 text-purple-600" />
              <span className="text-[10px] font-black">播客</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 bg-[#B4F416] border-[1px] border-black text-[10px] font-black flex items-center gap-0.5">
              <Play className="w-2.5 h-2.5" />
              视频
            </div>
          )}
        </div>

        {/* 难度标签 - PC端 */}
        <div className="hidden md:block absolute top-3 right-3">
          <div className={`px-3 py-1 ${getDifficultyColor(video.difficulty)} border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transform rotate-1`}>
            <span className="text-xs font-black tracking-tight">
              {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
            </span>
          </div>
        </div>

        {/* 难度标签 - 移动端 */}
        <div className="md:hidden absolute top-2 right-2">
          <div className={`px-2 py-0.5 ${getDifficultyColor(video.difficulty)} border-[1px] border-black text-[10px] font-black`}>
            {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
          </div>
        </div>

        {/* 时长 - PC端 */}
        <div className="hidden md:block absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs font-bold border-[2px] border-black">
          {formatDuration(video.duration)}
        </div>

        {/* 时长 - 移动端 */}
        <div className="md:hidden absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs font-bold">
          {formatDuration(video.duration)}
        </div>

        {/* 完成标记 - PC端 */}
        {progress?.is_completed && (
          <div className="hidden md:block absolute bottom-2 left-2">
            <div className="px-3 py-1.5 bg-[#B4F416] border-[2px] border-black shadow-[3px_3px_0px_0px_#000] transform rotate-2">
              <span className="text-xs font-black tracking-tight">✓ DONE</span>
            </div>
          </div>
        )}

        {/* 完成标记 - 移动端 */}
        {progress?.is_completed && (
          <div className="md:hidden absolute bottom-2 left-2">
            <div className="px-2 py-1 bg-[#B4F416] border-[1px] border-black text-[10px] font-black">
              ✓ 已完成
            </div>
          </div>
        )}

        {/* 进度条 - PC端 */}
        {progress && progress.max_progress > 0 && !progress.is_completed && (
          <div className="hidden md:block absolute bottom-0 left-0 right-0 h-[4px] bg-gray-300 dark:bg-gray-600">
            <div
              className="h-full bg-[#B4F416] transition-all duration-300"
              style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
            />
          </div>
        )}

        {/* 进度条 - 移动端 */}
        {progress && progress.max_progress > 0 && !progress.is_completed && (
          <div className="md:hidden absolute bottom-0 left-0 right-0 h-[3px] bg-gray-300 dark:bg-gray-600">
            <div
              className="h-full bg-[#B4F416] transition-all duration-300"
              style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 信息区 - 移动端更紧凑 */}
      <div className="flex-1 p-3 md:p-4 min-w-0">
        {/* 标题 */}
        <h3 className="text-base md:text-base font-black tracking-tight text-black dark:text-white mb-1 line-clamp-2 group-hover:text-[#B4F416] transition-colors">
          {video.title}
        </h3>

        {/* 描述 */}
        {video.description && (
          <p className="text-[11px] md:text-xs text-gray-400 dark:text-gray-500 mb-2 md:mb-3 line-clamp-1">
            {video.description}
          </p>
        )}

        {/* 语种和标签 - 移动端 */}
        <div className="flex md:hidden items-center gap-2 mb-1">
          <div className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border-[1px] border-gray-300 dark:border-gray-500">
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
              {VIDEO_LANGUAGE_LABELS[video.language]}
            </span>
          </div>
          {video.tags.slice(0, 2).map((tag) => (
            <div key={tag} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-700 border-[1px] border-gray-300 dark:border-gray-500">
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{tag}</span>
            </div>
          ))}
        </div>

        {/* 语种和标签 - PC端 */}
        <div className="hidden md:flex items-center gap-2 mb-3">
          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {VIDEO_LANGUAGE_LABELS[video.language]}
            </span>
          </div>
          {video.tags.slice(0, 1).map((tag) => (
            <div key={tag} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500">
              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{tag}</span>
            </div>
          ))}
        </div>

        {/* 进度 - 移动端 */}
        {progress && progress.max_progress > 0 && !progress.is_completed && (
          <div className="flex md:hidden items-center gap-1.5 text-xs font-mono font-bold text-gray-600 dark:text-gray-400">
            <Clock className="w-3.5 h-3.5" />
            <span>进度 {Math.min(Math.round(progress.max_progress), 100)}%</span>
          </div>
        )}

        {/* 进度 - PC端 */}
        {progress && progress.max_progress > 0 && !progress.is_completed && (
          <div className="hidden md:flex items-center gap-1 text-sm font-mono font-bold text-gray-600 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>进度 {Math.min(Math.round(progress.max_progress), 100)}%</span>
          </div>
        )}
      </div>

      {/* Hover 效果：荧光绿底部边框 - 仅PC端 */}
      <div className="hidden md:block absolute bottom-0 left-0 w-full h-[3px] bg-[#B4F416] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
    </Link>
  )
}

// 最新发布大卡（FeaturedCard）
function FeaturedCard({ video }: { video: VideoListItem }) {
  const progress = video.user_progress
  const isAudio = video.content_type === 'audio'
  const coverImage = isAudio ? (video.cover_url || video.thumbnail_url) : (video.thumbnail_url || video.cover_url)
  const hasProgress = progress && progress.max_progress > 0 && !progress.is_completed

  return (
    <section className="mb-8">
      {/* 区域标题 */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-[#B4F416] flex items-center justify-center text-black shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666]">
          <span className="font-bold text-sm">N</span>
        </div>
        <h2 className="text-xl font-black uppercase tracking-wide text-black dark:text-white">
          最新发布
        </h2>
      </div>

      <Link
        href={`/videos/${video.id}`}
        className="group block bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:-translate-y-1 transition-transform duration-200 overflow-hidden"
      >
        {/* PC端：横向布局 */}
        <div className="hidden md:flex">
          {/* 封面区 */}
          <div className="relative w-[360px] lg:w-[420px] flex-shrink-0 aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden border-r-[3px] border-black dark:border-gray-600">
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
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transform -rotate-1">
                  <Podcast className="w-4 h-4 text-purple-600" />
                  <span className="text-xs font-black tracking-tight">播客</span>
                </div>
              ) : (
                <div className="px-3 py-1.5 bg-[#B4F416] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transform -rotate-1">
                  <span className="text-xs font-black tracking-tight flex items-center gap-1">
                    <Play className="w-3 h-3" />
                    视频
                  </span>
                </div>
              )}
            </div>
            {/* 时长 */}
            <div className="absolute bottom-3 right-3 px-2 py-1 bg-black/80 text-white text-xs font-bold border-[2px] border-black">
              {formatDuration(video.duration)}
            </div>
            {/* 进度条 */}
            {hasProgress && (
              <div className="absolute bottom-0 left-0 right-0 h-[4px] bg-gray-300 dark:bg-gray-600">
                <div
                  className="h-full bg-[#B4F416] transition-all duration-300"
                  style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* 信息区 */}
          <div className="flex-1 p-6 lg:p-8 flex flex-col justify-center min-w-0">
            <h3 className="text-2xl font-black tracking-tight text-black dark:text-white mb-3 line-clamp-2 group-hover:text-[#B4F416] transition-colors">
              {video.title}
            </h3>

            {video.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 line-clamp-2">
                {video.description}
              </p>
            )}

            {/* 标签行 */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500">
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {VIDEO_LANGUAGE_LABELS[video.language]}
                </span>
              </div>
              <div className={`px-2 py-1 ${getDifficultyColor(video.difficulty)} border-[2px] border-black`}>
                <span className="text-xs font-bold">
                  {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
                </span>
              </div>
              <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {formatDuration(video.duration)}
                </span>
              </div>
            </div>

            {/* CTA 按钮 */}
            <div>
              <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B4F416] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] font-black text-sm group-hover:shadow-[2px_2px_0px_0px_#000] dark:group-hover:shadow-[2px_2px_0px_0px_#666] group-hover:-translate-y-0.5 transition-all">
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
          <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden border-b-[2px] border-black dark:border-gray-600">
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
                <div className="flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm border-[1px] border-black">
                  <Podcast className="w-3 h-3 text-purple-600" />
                  <span className="text-[10px] font-black">播客</span>
                </div>
              ) : (
                <div className="px-2 py-0.5 bg-[#B4F416] border-[1px] border-black text-[10px] font-black flex items-center gap-0.5">
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
                  className="h-full bg-[#B4F416] transition-all duration-300"
                  style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
                />
              </div>
            )}
          </div>

          {/* 信息区 */}
          <div className="p-4">
            <h3 className="text-lg font-black tracking-tight text-black dark:text-white mb-2 line-clamp-2 group-hover:text-[#B4F416] transition-colors">
              {video.title}
            </h3>

            {video.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 line-clamp-2">
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
              <div className={`px-2 py-0.5 ${getDifficultyColor(video.difficulty)} border-[1px] border-black text-[11px] font-black`}>
                {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
              </div>
            </div>

            {/* CTA 按钮 */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-[#B4F416] border-[2px] border-black shadow-[2px_2px_0px_0px_#000] font-black text-sm">
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

// 继续学习卡片
function ContinueLearningCard({ video }: { video: VideoListItem }) {
  const progress = video.user_progress

  if (!progress || progress.max_progress === 0 || progress.is_completed) {
    return null
  }

  const isAudio = video.content_type === 'audio'
  const coverImage = isAudio ? (video.cover_url || video.thumbnail_url) : video.thumbnail_url

  return (
    <Link
      href={`/videos/${video.id}`}
      className="neo-card neo-card-continue group flex items-center gap-4 p-4 bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[4px_4px_0px_0px_#000] dark:shadow-[4px_4px_0px_0px_#666] hover:-translate-y-0.5 transition-transform duration-150 rounded-sm"
    >
      {/* 缩略图 */}
      <div className="relative w-32 aspect-video rounded-sm overflow-hidden bg-gray-100 dark:bg-gray-700 flex-shrink-0 border-[2px] border-black dark:border-gray-600">
        {coverImage ? (
          <img
            src={coverImage}
            alt={video.title}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            {isAudio ? (
              <Podcast className="w-6 h-6 text-purple-500 opacity-30" />
            ) : (
              <Video className="w-6 h-6 text-black dark:text-white opacity-20" />
            )}
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
          进度 {Math.min(Math.round(progress.max_progress), 100)}%
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
  }, [language, difficulty, tag, learnStatus, contentType, page])

  // 获取视频列表
  const { data, error, isLoading, mutate } = useSWR<VideoListResponse>(
    buildQueryUrl(),
    fetcher,
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000, // 5秒内重复请求去重
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

  // 未登录时跳转到登录页
  useEffect(() => {
    if (error?.message === 'UNAUTHORIZED') {
      router.push(`/login?redirect=${encodeURIComponent(window.location.pathname)}`)
    }
  }, [error, router])

  // 筛选条件变化时重置页码
  useEffect(() => {
    setPage(1)
  }, [language, difficulty, tag, learnStatus, contentType])

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

  // 提取继续学习的视频
  const continueLearningVideos = (data?.items || [])
    .filter((v) => v.user_progress && v.user_progress.max_progress > 0 && !v.user_progress.is_completed)
    .slice(0, 1)

  // 最新发布（列表第一条，按 published_at 降序，服务端已排好）
  const featuredVideo = (data?.items && data.items.length > 0) ? data.items[0] : null
  const showFeatured = !!(featuredVideo && page === 1 && contentType === 'all' && difficulty === 'all' && language === 'all' && tag === 'all' && learnStatus === 'all')
  const gridItems = showFeatured ? (data?.items?.slice(1) || []) : (data?.items || [])

  // 动态语言选项（基于用户权限范围内的语言）
  const languageOptions = useMemo(() => {
    return buildLanguageOptions(data?.available_languages)
  }, [data?.available_languages])

  // 是否显示语言筛选（只有多种语言时才显示）
  const showLanguageFilter = (data?.available_languages?.length || 0) > 1

  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      {/* 注入跑马灯动画和镂空文字的自定义 CSS */}
      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
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
          @media (min-width: 768px) {
            .banner-content {
              min-height: 130px;
            }
          }
        `}
      </style>

      {/* 页面头部 - 紧凑版 Neo-brutalism 风格 */}
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative border-[3px] border-black bg-[#D4FF32] dark:bg-gray-800 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] dark:shadow-[6px_6px_0px_0px_#666] flex flex-col overflow-hidden transition-colors duration-300">

          {/* 背景水印层 — 统一 -20° 斜排，每行一种语言 */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-0" style={{ transform: 'rotate(-20deg)', transformOrigin: 'center', scale: '2', left: '20%' }}>
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
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 pt-8">

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
                          <span key={pkg.id} className="px-3 py-1.5 text-xs font-black bg-[#B4F416] border-[2px] border-black">
                            {pkg.name}
                          </span>
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
                          onClick={() => { setContentType(opt.value); setFilterDrawerOpen(false) }}
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
                          onClick={() => { setLearnStatus(opt.value); setFilterDrawerOpen(false) }}
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
                            onClick={() => { setLanguage(opt.value); setFilterDrawerOpen(false) }}
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
                          onClick={() => { setDifficulty(opt.value); setFilterDrawerOpen(false) }}
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
                          onClick={() => { setTag('all'); setFilterDrawerOpen(false) }}
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
                            onClick={() => { setTag(t.name); setFilterDrawerOpen(false) }}
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
        <div className="flex flex-col md:flex-row gap-4 md:gap-6">
          {/* 左侧：视频区域 */}
          <div className="flex-1 min-w-0">
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

            {/* 最新发布大卡 - 仅在首页(page=1)且无筛选时显示 */}
            {showFeatured && featuredVideo && (
              <FeaturedCard video={featuredVideo} />
            )}

            {/* PC端筛选工具栏 - 轻量样式 */}
            <div className="hidden md:flex flex-wrap items-center gap-6 mb-6 py-3 border-b border-gray-200 dark:border-gray-700">
              {/* 内容类型筛选 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">类型</span>
                <div className="flex gap-1">
                  {CONTENT_TYPE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setContentType(opt.value)}
                      className={`
                        px-2.5 py-1 text-xs font-bold transition-all
                        ${contentType === opt.value
                          ? 'bg-[#B4F416] text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                  <span className="text-xs font-medium text-gray-500">套餐</span>
                  {data.user_packages.map((pkg) => (
                    <span key={pkg.id} className="px-2 py-0.5 text-xs font-bold bg-[#B4F416]">
                      {pkg.name}
                    </span>
                  ))}
                </div>
              )}

              {/* 学习状态筛选 */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gray-500">状态</span>
                <div className="flex gap-1">
                  {LEARN_STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setLearnStatus(opt.value)}
                      className={`
                        px-2.5 py-1 text-xs font-bold transition-all
                        ${learnStatus === opt.value
                          ? 'bg-[#B4F416] text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                <div className="flex items-center gap-2">
                  <span className="text-xs font-medium text-gray-500">语言</span>
                  <div className="flex gap-1">
                    {languageOptions.slice(0, 4).map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setLanguage(opt.value)}
                        className={`
                          px-2.5 py-1 text-xs font-bold transition-all
                          ${language === opt.value
                            ? 'bg-[#B4F416] text-black'
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                <span className="text-xs font-medium text-gray-500">难度</span>
                <div className="flex gap-1">
                  {DIFFICULTY_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      onClick={() => setDifficulty(opt.value)}
                      className={`
                        px-2.5 py-1 text-xs font-bold transition-all
                        ${difficulty === opt.value
                          ? 'bg-[#B4F416] text-black'
                          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
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
                    onChange={(e) => setTag(e.target.value)}
                    className="px-2.5 py-1 text-xs font-bold bg-gray-100 dark:bg-gray-800 text-black dark:text-white border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] outline-none cursor-pointer appearance-none pr-6 bg-[url('data:image/svg+xml;charset=UTF-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22currentColor%22%20stroke-width%3D%223%22%3E%3Cpath%20d%3D%22m6%209%206%206-6%22%2F%3E%2Fsvg%3E')] bg-[length:10px] bg-[right_6px_center] bg-no-repeat"
                    style={tag !== 'all' ? { backgroundColor: '#B4F416' } : undefined}
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
                  }}
                  className="px-3 py-1 text-xs font-bold text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-all"
                >
                  ✕ 重置
                </button>
              )}
            </div>

            {/* 全部视频 */}
            <section>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
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
            {/* 移动端筛选按钮 */}
            {(() => {
              const hasActiveFilter = learnStatus !== 'all' || language !== 'all' || difficulty !== 'all' || tag !== 'all'
              return (
                <button
                  onClick={() => setFilterDrawerOpen(true)}
                  className={`
                    md:hidden flex items-center gap-1.5 px-3 py-1.5 border-[2px] border-black dark:border-gray-600 shadow-[2px_2px_0px_0px_#000] dark:shadow-[2px_2px_0px_0px_#666] font-bold text-sm active:translate-y-0.5 transition-colors
                    ${hasActiveFilter
                      ? 'bg-[#B4F416] text-black'
                      : 'bg-white dark:bg-gray-800 text-black dark:text-white'
                    }
                  `}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
                  筛选
                  {hasActiveFilter && <span className="w-2 h-2 bg-black rounded-full" />}
                </button>
              )
            })()}
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
                <div className="flex flex-col gap-4 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 md:gap-4 lg:gap-6">
                  {gridItems.map((video) => (
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

          {/* 右侧：知识点侧边栏 - 仅大屏显示 */}
          <aside className="hidden lg:block lg:w-[240px] xl:w-[280px] shrink-0">
            <div className="sticky top-4 space-y-3">
              {/* 学习日历组件 - 仅大屏显示 */}
              <div className="hidden lg:block">
                {/* 标题 */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-black dark:bg-white flex items-center justify-center text-white dark:text-black shadow-[4px_4px_0px_0px_#B4F416] dark:shadow-[4px_4px_0px_0px_#666]">
                    <span className="font-bold text-sm">📅</span>
                  </div>
                  <h2 className="text-xl font-black uppercase tracking-wide text-black dark:text-white">学习日历</h2>
                </div>
                <Suspense fallback={null}>
                  <LearningCalendar />
                </Suspense>
              </div>

              {/* 领取好礼模块 */}
              <div className="hidden lg:block mt-4">
                <div className="bg-[#D4FF00] border-[3px] border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden">
                  {/* 顶部跑马灯 */}
                  <div className="bg-black text-white py-1 border-b-[3px] border-black flex overflow-hidden whitespace-nowrap">
                    <div className="flex gap-4 items-center font-black text-[10px] tracking-widest animate-pulse">
                      <span>🔥 限时福利</span>
                      <span>///</span>
                      <span>好评免费送</span>
                      <span>///</span>
                      <span>🔥 限时福利</span>
                    </div>
                  </div>

                  {/* 主内容 */}
                  <div className="p-3">
                    {/* 标签 */}
                    <div className="bg-[#FF3366] text-white border-[2px] border-black px-2 py-0.5 -rotate-2 inline-block font-black text-xs shadow-[2px_2px_0px_0px_#000] mb-2">
                      0元白嫖！
                    </div>

                    {/* 标题 */}
                    <div className="bg-white border-[2px] border-black p-2 shadow-[3px_3px_0px_0px_#000]">
                      <h3 className="text-base font-black text-black leading-tight">
                        法语<span className="text-[#C084FC] underline decoration-2 underline-offset-2 decoration-black">原声大礼包</span>
                      </h3>
                      <div className="bg-black text-white font-bold text-[10px] px-2 py-0.5 mt-1 inline-block">
                        小红书好评 = 免费解锁 🔓
                      </div>
                    </div>

                    {/* 按钮 */}
                    <button
                      onClick={() => window.open('https://work.weixin.qq.com/kfid/kfc49c2602e3dbe2fc1', '_blank')}
                      className="w-full mt-3 bg-[#C084FC] border-[3px] border-black px-3 py-2 font-black text-sm text-black shadow-[3px_3px_0px_0px_#000] hover:translate-y-[2px] hover:translate-x-[2px] hover:shadow-[1px_1px_0px_0px_#000] transition-all flex items-center justify-center gap-2"
                    >
                      <span>🎁</span>
                      立即领取
                    </button>

                    {/* 稀缺感 */}
                    <div className="text-center font-black text-black text-[10px] mt-2 border-b-2 border-black border-dashed pb-0.5">
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
    </div>
  )
}

// 加载骨架屏
function VideoListSkeleton() {
  return (
    <div className="min-h-screen transition-colors duration-300" style={{ backgroundColor: 'var(--bg-secondary)' }}>
      <div className="bg-white dark:bg-gray-800 border-b-[3px] border-black dark:border-gray-600">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="h-12 w-48 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-sm" />
          <div className="h-4 w-64 bg-gray-200 dark:bg-gray-700 animate-pulse rounded-sm mt-2" />
        </div>
      </div>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-3 md:gap-6">
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
