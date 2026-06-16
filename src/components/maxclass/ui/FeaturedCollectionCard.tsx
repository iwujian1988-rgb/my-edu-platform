'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/ui/FeaturedCollectionCard.vue
 * 精选系列卡：横向渐变 banner + 标题 + 描述 + 级别 + 「探索」按钮（不同于普通 CollectionCard 的方形）。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { LevelPill } from './LevelPill'
import type { CollectionCardData } from './CollectionCard'

export function FeaturedCollectionCard({ collection }: { collection: CollectionCardData }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="h-32 bg-gradient-to-br from-primary-200 to-primary-300 relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl opacity-50">📚</span>
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-gray-800">{collection.title}</h3>
        <p className="text-sm text-gray-500 mt-1 line-clamp-2">{collection.description}</p>
        <div className="flex items-center justify-between mt-3">
          <div className="flex gap-1">
            {(collection.levels ?? []).map(l => (
              <LevelPill key={l} level={l} size="sm" />
            ))}
          </div>
          <span className="text-xs text-gray-400">{collection.exerciseCount ?? 0} ex.</span>
        </div>
        <Link
          href={`/collection/${collection.slug}`}
          className="btn-primary text-sm mt-3 block text-center"
        >
          {t('pages.home.discover')}
        </Link>
      </div>
    </div>
  )
}
