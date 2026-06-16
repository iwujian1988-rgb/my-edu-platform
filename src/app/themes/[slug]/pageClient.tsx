'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/TopicPage.vue
 *
 * 主题详情页（topic = theme detail）：
 *   - Breadcrumb（首页 / 主题总览 / 当前主题）
 *   - 主题 header（icon + fullLabel + 练习数）
 *   - 该主题相关的 Collection 卡片网格（按 exerciseIds 命中集合）
 *   - 该主题下的全部练习网格
 */

import { useMemo } from 'react'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../../parcours/components/Breadcrumb'
import {
  ExerciseCard,
  CollectionCard,
  EmptyState,
  type ExerciseCardData,
} from '@/components/maxclass/ui'
import {
  collections,
  getThemeBySlug,
  getExercisesByTheme,
} from '@/data/maxclass/mock'

export function TopicPageClient({ slug }: { slug: string }) {
  const theme = getThemeBySlug(slug)
  const themeExercises = useMemo<ExerciseCardData[]>(
    () => (theme ? (getExercisesByTheme(slug) as ExerciseCardData[]) : []),
    [theme, slug],
  )

  const themeCollections = useMemo(() => {
    if (!theme) return []
    const exerciseIds = new Set(themeExercises.map(e => e.collectionId))
    return collections.filter(c => exerciseIds.has(c.id))
  }, [theme, themeExercises])

  usePageSeo({
    title: theme ? theme.fullLabel : t('pages.themes.title'),
    description: theme ? `${theme.label} — ${themeExercises.length} 个练习` : '',
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.themes.title'), to: '/themes' },
          { label: theme ? theme.label : '' },
        ]}
      />

      {/* Theme header */}
      {theme ? (
        <div className="flex items-center gap-4 mb-8">
          <span className="text-5xl">{theme.icon}</span>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{theme.fullLabel}</h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('pages.home.exerciseCount', { count: themeExercises.length })}
            </p>
          </div>
        </div>
      ) : null}

      {/* Collection cards for this theme */}
      {themeCollections.length > 0 ? (
        <section className="mb-10">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{t('nav.collections')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {themeCollections.map(col => (
              <CollectionCard key={col.id} collection={col} />
            ))}
          </div>
        </section>
      ) : null}

      {/* Exercise grid */}
      <section>
        <h2 className="text-lg font-bold text-gray-800 mb-4">{t('nav.allExercises')}</h2>
        {themeExercises.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {themeExercises.map(ex => (
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
      </section>
    </div>
  )
}
