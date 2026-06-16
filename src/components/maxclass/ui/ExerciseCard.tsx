'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/ExerciseCard.vue
 * 练习卡：缩略图 + 级别徽章 + 时长 badge + 标题 + 描述 + 主题/系列标签；跳 /exercice/{id}。
 *
 * 注意：原版路由是 /exercice/{id}（法语拼写），1:1 保留。
 */

import Link from 'next/link'
import { LevelPill } from './LevelPill'

export interface ExerciseCardData {
  id: number | string
  title: string
  description?: string
  thumbnail?: string | null
  level: string
  theme?: string
  collection?: string
  collectionId?: number
  duration: number
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ExerciseCard({ exercise }: { exercise: ExerciseCardData }) {
  return (
    <Link href={`/exercice/${exercise.id}`} className="card group cursor-pointer block">
      <div className="h-40 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
        {exercise.thumbnail ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${exercise.thumbnail})` }}
          />
        ) : (
          <svg className="w-12 h-12 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        )}
        <span className="absolute top-3 left-3">
          <LevelPill level={exercise.level} />
        </span>
        <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
          {formatDuration(exercise.duration)}
        </span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors">{exercise.title}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{exercise.description}</p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {exercise.theme ? (
            <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">{exercise.theme}</span>
          ) : null}
          {exercise.collection ? (
            <span className="text-xs text-gray-400">{exercise.collection}</span>
          ) : null}
        </div>
      </div>
    </Link>
  )
}
