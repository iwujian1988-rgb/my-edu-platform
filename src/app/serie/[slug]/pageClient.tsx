'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/SeriesPage.vue
 *
 * 系列详情页（serie = 一个集合内的具体系列）：
 *   - Breadcrumb（首页 / 级别 / 当前系列）
 *   - SidebarLayout 主栏：系列 header + 编号练习列表（1, 2, 3...）
 *   - SidebarLayout 侧栏：同合集下的其他系列
 *
 * 不存在的 slug：显示 EmptyState + 返回首页。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../../parcours/components/Breadcrumb'
import { SidebarLayout } from '@/components/maxclass/layout/SidebarLayout'
import { LevelPill, EmptyState, type ExerciseCardData } from '@/components/maxclass/ui'
import {
  getSeriesBySlug,
  series as allSeries,
  collections,
  exercises,
} from '@/data/maxclass/mock'

interface SeriesData {
  id: number
  slug: string
  title: string
  level: string
  theme: string
  collectionId: number
  description: string
  exerciseIds: number[]
  thumbnail: string | null
}

export function SeriesPageClient({ slug }: { slug: string }) {
  const series = getSeriesBySlug(slug) as SeriesData | undefined
  const collectionObj = series ? collections.find(c => c.id === series.collectionId) : undefined

  const seriesExerciseList: ExerciseCardData[] = series
    ? series.exerciseIds
        .map(id => exercises.find(e => e.id === id))
        .filter((e): e is NonNullable<typeof e> => e !== undefined)
        .map(e => e as unknown as ExerciseCardData)
    : []

  const relatedSeries = series
    ? allSeries.filter(s => s.collectionId === series.collectionId && s.id !== series.id)
    : []

  usePageSeo({
    title: series ? series.title : t('common.notFound'),
    description: series?.description ?? '',
  })

  if (!series) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <EmptyState
          title={t('common.notFound')}
          description={t('common.comingSoon')}
          icon={'📺'}
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
          { label: series.level, to: '/exercices' },
          { label: series.title },
        ]}
      />

      <SidebarLayout
        sidebar={
          relatedSeries.length > 0 ? (
            <div className="bg-white rounded-lg border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-700 mb-4">{t('nav.collections')}</h3>
              <div className="space-y-3">
                {relatedSeries.map(s => (
                  <Link
                    key={s.id}
                    href={`/serie/${s.slug}`}
                    className="block p-3 rounded-lg hover:bg-gray-50 transition-colors group"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <LevelPill level={s.level} size="sm" />
                    </div>
                    <h4 className="text-sm font-medium text-gray-700 group-hover:text-primary-700 transition-colors">
                      {s.title}
                    </h4>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{s.description}</p>
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div />
          )
        }
      >
        {/* Series header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
            <LevelPill level={series.level} size="lg" />
            {collectionObj ? (
              <span className="text-sm text-gray-400">{collectionObj.title}</span>
            ) : null}
          </div>
          <h1 className="text-2xl font-bold text-gray-800">{series.title}</h1>
          <p className="text-gray-500 mt-2">{series.description}</p>
        </div>

        {/* Numbered exercise list */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">
            {t('pages.collection.exercises')} ({seriesExerciseList.length})
          </h2>
          {seriesExerciseList.map((ex, i) => (
            <div
              key={ex.id}
              className="flex items-center gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:border-primary-300 hover:shadow-sm transition-all"
            >
              <div className="w-10 h-10 rounded-full bg-primary-100 text-primary-700 font-bold flex items-center justify-center shrink-0">
                {i + 1}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-800">{ex.title}</h3>
                <p className="text-sm text-gray-500 mt-0.5 line-clamp-1">{ex.description}</p>
              </div>
              <Link
                href={`/exercice/${ex.id}`}
                className="btn-primary text-sm px-4 py-2 shrink-0"
              >
                {t('common.start')}
              </Link>
            </div>
          ))}
        </div>
      </SidebarLayout>
    </div>
  )
}
