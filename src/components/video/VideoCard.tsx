'use client'

/**
 * VideoCard 共享组件
 *
 * 从 src/app/videos/pageClient.tsx 提取，
 * 供视频列表页和播主详情页共用。
 */

import React from 'react'
import Link from 'next/link'
import {
  Play,
  Clock,
  Video,
  Podcast,
} from 'lucide-react'
import type { VideoListItem } from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, VIDEO_LANGUAGE_LABELS, formatDuration } from '@/types/video'
import { AudioCoverBackground } from '@/components/video/AudioCoverBackground'

// 获取难度等级的颜色
export const getDifficultyColor = (difficulty: string) => {
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

interface VideoCardProps {
  video: VideoListItem
}

export default function VideoCard({ video }: VideoCardProps) {
  const progress = video.user_progress
  const isAudio = video.content_type === 'audio'
  const coverImage = isAudio ? (video.cover_url || video.thumbnail_url) : video.thumbnail_url

  return (
    <Link
      href={`/videos/${video.id}`}
      className="neo-card neo-card-video group relative bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-150 cursor-pointer overflow-hidden block flex flex-col"
    >
      {/* 缩略图 - 移动端更大，PC端正常 */}
      <div className="relative w-full aspect-video bg-gray-100 dark:bg-gray-700 overflow-hidden border-b border-gray-200 dark:border-gray-700 flex-shrink-0 transition-colors duration-300">
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
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/90 backdrop-blur-sm border border-gray-300 rounded shadow-sm transform -rotate-1">
              <Podcast className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold tracking-tight">播客</span>
            </div>
          ) : (
            <div className="px-3 py-1 bg-[#B4F416] border border-[#99CC00] rounded shadow-sm transform -rotate-1">
              <span className="text-xs font-semibold tracking-tight flex items-center gap-1">
                <Play className="w-3 h-3" />
                视频
              </span>
            </div>
          )}
        </div>

        {/* 内容类型标签 - 移动端 */}
        <div className="md:hidden absolute top-2 left-2">
          {isAudio ? (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/90 backdrop-blur-sm border border-gray-300 rounded">
              <Podcast className="w-3 h-3 text-purple-600" />
              <span className="text-[10px] font-semibold">播客</span>
            </div>
          ) : (
            <div className="px-2 py-0.5 bg-[#B4F416] border border-[#99CC00] rounded text-[10px] font-semibold flex items-center gap-0.5">
              <Play className="w-2.5 h-2.5" />
              视频
            </div>
          )}
        </div>

        {/* 难度标签 - PC端 */}
        <div className="hidden md:block absolute top-3 right-3">
          <div className={`px-3 py-1 ${getDifficultyColor(video.difficulty)} border border-gray-800 dark:border-gray-600 rounded shadow-sm transform rotate-1`}>
            <span className="text-xs font-semibold tracking-tight">
              {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
            </span>
          </div>
        </div>

        {/* 难度标签 - 移动端 */}
        <div className="md:hidden absolute top-2 right-2">
          <div className={`px-2 py-0.5 ${getDifficultyColor(video.difficulty)} border border-gray-800 dark:border-gray-600 rounded text-[10px] font-semibold`}>
            {VIDEO_DIFFICULTY_LABELS[video.difficulty]}
          </div>
        </div>

        {/* 时长 - PC端 */}
        <div className="hidden md:block absolute bottom-2 right-2 px-2 py-1 bg-black/80 text-white text-xs font-semibold rounded">
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
