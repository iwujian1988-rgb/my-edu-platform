/**
 * 演说家模块 - 文章卡片组件
 *
 * 功能：
 * 1. 显示文章封面图、标题、难度等级、时长
 * 2. 点击跳转到文章时间轴页面
 * 3. 支持深色/浅色模式
 *
 * 参考：
 * - shangwenjie.md 第 2.1 节（演说家首页）
 * - src/components/BookCard.tsx（样式参考）
 */

'use client'

import { useRouter } from 'next/navigation'
import { Clock, BookOpen, CheckCircle2 } from 'lucide-react'
import type { SpeakerArticle, SpeakerCardProps } from '@/types/speaker'

export function SpeakerCard({ article, showStatus = true }: SpeakerCardProps) {
  const router = useRouter()

  // 格式化时长显示（秒 → 分钟:秒）
  const formatDuration = (seconds: number | null): string => {
    if (!seconds) return '--:--'
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, '0')}`
  }

  // 获取难度等级的标签样式（贴纸效果）
  const getLevelBadge = (level: number) => {
    const badges = {
      1: { color: 'bg-yellow-400', rotate: '-rotate-2' },
      2: { color: 'bg-[#B4F416]', rotate: 'rotate-1' },
      3: { color: 'bg-purple-400', rotate: '-rotate-1' },
      4: { color: 'bg-orange-400', rotate: 'rotate-2' },
      5: { color: 'bg-red-400', rotate: '-rotate-2' }
    }

    const badge = badges[level as keyof typeof badges] || badges[3]

    return (
      <div className={`px-3 py-1 ${badge.color} border-[2px] border-black shadow-[2px_2px_0px_0px_#000] transform ${badge.rotate}`}>
        <span className="text-xs font-black tracking-tight">L{level}</span>
      </div>
    )
  }

  // 点击卡片跳转到时间轴页面
  const handleClick = () => {
    router.push(`/speaker/timeline?id=${article.id}`)
  }

  return (
    <div
      onClick={handleClick}
      className="group relative bg-white dark:bg-gray-800 border-[3px] border-black dark:border-gray-600 shadow-[6px_6px_0px_0px_#000] dark:shadow-[6px_6px_0px_0px_#666] hover:shadow-[8px_8px_0px_0px_#000] dark:hover:shadow-[8px_8px_0px_0px_#666] hover:-translate-y-1 transition-all duration-150 cursor-pointer overflow-hidden rounded-sm"
    >
      {/* 封面图片区域 */}
      <div className="relative h-48 bg-gray-100 dark:bg-gray-700 overflow-hidden border-b-[3px] border-black dark:border-gray-600 transition-colors duration-300">
        {article.image_url ? (
          <img
            src={article.image_url}
            alt={article.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-16 h-16 text-black dark:text-white opacity-20" />
          </div>
        )}

        {/* 难度等级标签 - 贴纸样式 */}
        <div className="absolute top-3 left-3">
          {getLevelBadge(article.level)}
        </div>

        {/* 完成状态印章（如果需要显示）- 印章效果 */}
        {showStatus && article.progress?.isCompleted && (
          <div className="absolute top-3 right-3">
            <div className="px-3 py-1.5 bg-[#B4F416] border-[2px] border-black shadow-[3px_3px_0px_0px_#000] transform -rotate-3">
              <span className="text-xs font-black tracking-tight">✓ DONE</span>
            </div>
          </div>
        )}
      </div>

      {/* 文章信息区域 */}
      <div className="p-4">
        {/* 标题 */}
        <h3 className="text-lg font-black tracking-tight text-black dark:text-white mb-3 line-clamp-2 group-hover:text-[#B4F416] transition-colors">
          {article.title}
        </h3>

        {/* 语种和分类标签 */}
        <div className="flex items-center gap-2 mb-3">
          {/* 语种标签 */}
          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500 rounded transition-colors duration-300">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {article.language.toUpperCase()}
            </span>
          </div>

          {/* 分类标签 */}
          <div className="px-2 py-1 bg-gray-100 dark:bg-gray-700 border-[2px] border-gray-300 dark:border-gray-500 rounded transition-colors duration-300">
            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {article.category}
            </span>
          </div>
        </div>

        {/* 元数据 - 使用等宽字体 */}
        <div className="flex items-center justify-between text-sm font-mono font-bold text-gray-600 dark:text-gray-400 transition-colors duration-300">
          {/* 时长 */}
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(article.duration_seconds)}</span>
          </div>

          {/* 句子数量 */}
          <div className="flex items-center gap-1">
            <BookOpen className="w-4 h-4" />
            <span>{article.total_sentences}句</span>
          </div>
        </div>

        {/* 词汇量（如果有） */}
        {article.word_count && (
          <div className="mt-2 text-sm font-mono font-bold text-gray-600 dark:text-gray-400 transition-colors duration-300">
            词汇：{article.word_count}
          </div>
        )}
      </div>

      {/* Hover 效果：荧光绿边框 */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-[#B4F416] transform scale-x-0 group-hover:scale-x-100 transition-transform duration-200"></div>
    </div>
  )
}
