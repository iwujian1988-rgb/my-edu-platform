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
import type { VideoListItem, CefrLevel } from '@/types/video'
import { VIDEO_DIFFICULTY_LABELS, CEFR_LEVEL_LABELS, VIDEO_LANGUAGE_LABELS, formatDuration } from '@/types/video'
import { AudioCoverBackground } from '@/components/video/AudioCoverBackground'

// 获取难度显示文本
export const getDifficultyLabel = (video: VideoListItem) => {
  if (video.cefr_level) return CEFR_LEVEL_LABELS[video.cefr_level as CefrLevel]
  return VIDEO_DIFFICULTY_LABELS[video.difficulty]
}

// 获取难度等级的颜色
export const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case 'beginner':
      return 'bg-[#eef1ff] text-[#2d39bb]'
    case 'intermediate':
      return 'bg-[#f0efff] text-[#5a45d6]'
    case 'advanced':
      return 'bg-[#fff0f0] text-[#d43737]'
    default:
      return 'bg-[#f3f5fb] text-[#4f586d]'
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
      className="neo-card-video group relative flex cursor-pointer flex-col overflow-hidden rounded-[12px] border border-[#e7eaf2] bg-white shadow-[0_9px_24px_rgba(31,42,104,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(31,42,104,0.10)] dark:border-[#273149] dark:bg-[#141b2d]"
    >
      {/* 缩略图 - 移动端更大，PC端正常 */}
      <div className="relative w-full aspect-video flex-shrink-0 overflow-hidden border-b border-[#e7eaf2] bg-gray-100 transition-colors duration-300 dark:border-[#273149] dark:bg-[#202941]">
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
            <div className="rounded-[7px] bg-white/92 px-3 py-1 text-[#2d39bb] shadow-[0_6px_14px_rgba(31,42,104,0.12)] backdrop-blur-sm">
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
            <div className="flex items-center gap-0.5 rounded-[6px] bg-white/92 px-2 py-0.5 text-[10px] font-semibold text-[#2d39bb] shadow-[0_5px_12px_rgba(31,42,104,0.10)] backdrop-blur-sm">
              <Play className="w-2.5 h-2.5" />
              视频
            </div>
          )}
        </div>

        {/* 难度标签 - PC端 */}
        <div className="hidden md:block absolute top-3 right-3">
          <div className={`rounded-[7px] px-3 py-1 shadow-[0_6px_14px_rgba(31,42,104,0.12)] ${getDifficultyColor(video.difficulty)}`}>
            <span className="text-xs font-semibold tracking-tight">
              {getDifficultyLabel(video)}
            </span>
          </div>
        </div>

        {/* 难度标签 - 移动端 */}
        <div className="md:hidden absolute top-2 right-2">
          <div className={`rounded-[6px] px-2 py-0.5 text-[10px] font-semibold shadow-[0_5px_12px_rgba(31,42,104,0.10)] ${getDifficultyColor(video.difficulty)}`}>
            {getDifficultyLabel(video)}
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
            <div className="rounded-[7px] bg-[#f1f2ff] px-3 py-1.5 text-[#2d39bb] shadow-[0_6px_14px_rgba(31,42,104,0.12)]">
              <span className="text-xs font-black tracking-tight">✓ DONE</span>
            </div>
          </div>
        )}

        {/* 完成标记 - 移动端 */}
        {progress?.is_completed && (
          <div className="md:hidden absolute bottom-2 left-2">
            <div className="rounded-[6px] bg-[#f1f2ff] px-2 py-1 text-[10px] font-black text-[#2d39bb] shadow-[0_5px_12px_rgba(31,42,104,0.10)]">
              ✓ 已完成
            </div>
          </div>
        )}

        {/* 进度条 - PC端 */}
        {progress && progress.max_progress > 0 && !progress.is_completed && (
          <div className="hidden md:block absolute bottom-0 left-0 right-0 h-[4px] bg-gray-300 dark:bg-gray-600">
            <div
              className="h-full bg-gradient-to-r from-[#2633a8] to-[#6550ff] transition-all duration-300"
              style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
            />
          </div>
        )}

        {/* 进度条 - 移动端 */}
        {progress && progress.max_progress > 0 && !progress.is_completed && (
          <div className="md:hidden absolute bottom-0 left-0 right-0 h-[3px] bg-gray-300 dark:bg-gray-600">
            <div
              className="h-full bg-gradient-to-r from-[#2633a8] to-[#6550ff] transition-all duration-300"
              style={{ width: `${Math.min(progress.max_progress, 100)}%` }}
            />
          </div>
        )}
      </div>

      {/* 信息区 - 移动端更紧凑 */}
      <div className="min-w-0 flex-1 p-[15px]">
        {/* 标题 */}
        <h3 className="mb-1 line-clamp-2 text-base font-extrabold tracking-normal text-[#2639b1] transition-colors group-hover:text-[#3745df] dark:text-[#bcc5ff]">
          {video.title}
        </h3>

        {/* 描述 */}
        {video.description && (
          <p className="mb-2 line-clamp-1 text-[11px] text-[#68718a] dark:text-[#a7b0c8] md:mb-3 md:text-xs">
            {video.description}
          </p>
        )}

        {/* 语种和标签 - 移动端 */}
        <div className="flex md:hidden items-center gap-2 mb-1">
          <div className="rounded-[5px] bg-[#f3f5fb] px-2 py-0.5 dark:bg-[#202941]">
            <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">
              {VIDEO_LANGUAGE_LABELS[video.language]}
            </span>
          </div>
          {video.tags.slice(0, 2).map((tag) => (
            <div key={tag} className="rounded-[5px] bg-[#f3f5fb] px-2 py-0.5 dark:bg-[#202941]">
              <span className="text-[11px] font-bold text-gray-700 dark:text-gray-300">{tag}</span>
            </div>
          ))}
        </div>

        {/* 语种和标签 - PC端 */}
        <div className="hidden md:flex items-center gap-2 mb-3">
          <div className="rounded-[5px] bg-[#f3f5fb] px-2 py-1 dark:bg-[#202941]">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {VIDEO_LANGUAGE_LABELS[video.language]}
            </span>
          </div>
          {video.tags.slice(0, 1).map((tag) => (
            <div key={tag} className="rounded-[5px] bg-[#f3f5fb] px-2 py-1 dark:bg-[#202941]">
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
      <div className="absolute bottom-0 left-0 hidden h-[3px] w-full origin-left scale-x-0 bg-gradient-to-r from-[#2633a8] to-[#6550ff] transition-transform duration-200 group-hover:scale-x-100 md:block"></div>
    </Link>
  )
}
