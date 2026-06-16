'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/CollectionCard.vue
 * 系列卡：方形渐变缩略 + 标题 + 描述 + 级别徽章 + 练习数；点击跳 /collection/{slug}。
 *
 * Vue 用 <router-link :to="'/collection/' + slug">；React 用 <Link href={...}>。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { LevelPill } from './LevelPill'

export interface CollectionCardData {
  slug: string
  title: string
  description?: string
  thumbnail?: string | null
  levels?: string[]
  exerciseCount?: number
}

export function CollectionCard({ collection }: { collection: CollectionCardData }) {
  return (
    <Link href={`/collection/${collection.slug}`} className="card group cursor-pointer block">
      <div className="aspect-square bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center relative">
        {collection.thumbnail ? (
          <div
            className="w-full h-full bg-cover bg-center"
            style={{ backgroundImage: `url(${collection.thumbnail})` }}
          />
        ) : (
          <svg className="w-16 h-16 text-primary-300" fill="currentColor" viewBox="0 0 24 24">
            <path d="M4 6H2v14c0 1.1.9 2 2 2h14v-2H4V6zm16-4H8c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-1 9h-4v4h-2v-4H9V9h4V5h2v4h4v2z" />
          </svg>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors">{collection.title}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{collection.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {(collection.levels ?? []).map(l => (
              <LevelPill key={l} level={l} size="sm" />
            ))}
          </div>
          <span className="text-xs text-gray-400">
            {t('pages.home.exerciseCount', { count: collection.exerciseCount ?? 0 })}
          </span>
        </div>
      </div>
    </Link>
  )
}
