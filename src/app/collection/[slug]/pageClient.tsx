'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/CollectionPage.vue
 *
 * 合集详情页：
 *   - Breadcrumb（首页 / 合集 / 当前合集）
 *   - 合集 header（标题 + 描述 + 练习数 badge + 级别 pills）
 *   - 该合集下的全部练习网格
 *   - 返回链接
 *
 * 不存在的 slug：显示 EmptyState + 返回首页按钮。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../../parcours/components/Breadcrumb'
import {
  ExerciseCard,
  LevelPill,
  EmptyState,
  type ExerciseCardData,
} from '@/components/maxclass/ui'
import { getCollection, getExercisesByCollection } from '@/data/maxclass/mock'

export function CollectionPageClient({ slug }: { slug: string }) {
  const collection = getCollection(slug)
  const exerciseList = collection
    ? (getExercisesByCollection(collection.id) as ExerciseCardData[])
    : []

  usePageSeo({
    title: collection ? collection.title : t('common.notFound'),
    description: collection?.description ?? '',
  })

  if (!collection) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          title={t('common.notFound')}
          description={t('common.comingSoon')}
          icon={'📁'}
        >
          <Link href="/videos" className="btn-primary inline-block mt-4">
            {t('common.backToHome')}
          </Link>
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('nav.collections'), to: '/themes' },
          { label: collection.title },
        ]}
      />

      {/* Collection header */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 mb-8">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{collection.title}</h1>
            <p className="text-gray-500 mt-2">{collection.description}</p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <span className="bg-primary-100 text-primary-700 text-sm font-semibold px-3 py-1 rounded-full">
              {t('common.exercises', { count: exerciseList.length })}
            </span>
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          {collection.levels.map(l => (
            <LevelPill key={l} level={l} />
          ))}
        </div>
      </div>

      {/* Exercise grid */}
      {exerciseList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exerciseList.map(ex => (
            <ExerciseCard key={ex.id} exercise={ex} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('common.noResults')}
          description={t('common.comingSoon')}
          icon={'📝'}
        />
      )}

      {/* Back link */}
      <div className="mt-10 text-center">
        <Link
          href="/exercices"
          className="inline-flex items-center gap-2 text-primary-600 hover:text-primary-800 font-medium transition-colors"
        >
          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" />
          </svg>
          {t('common.backToExercises')}
        </Link>
      </div>
    </div>
  )
}
