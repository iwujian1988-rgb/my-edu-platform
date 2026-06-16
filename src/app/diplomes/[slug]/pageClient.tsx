'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/DiplomaDetailPage.vue
 *
 * 文凭详情页：
 *   - Breadcrumb（首页 / 文凭 / 当前文凭）
 *   - 标题 + 描述 + 级别 pills
 *   - 备考建议（primary-50 卡片）
 *   - 相关练习（按级别匹配 exercises）
 *
 * 不存在的 slug：显示 EmptyState。
 */

import { useMemo } from 'react'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../../parcours/components/Breadcrumb'
import { LevelPill, ExerciseCard, EmptyState, type ExerciseCardData } from '@/components/maxclass/ui'
import { getDiploma, exercises } from '@/data/maxclass/mock'

interface Diploma {
  id: number
  slug: string
  title: string
  description: string
  levels: string[]
  level: string
}

export function DiplomaDetailPageClient({ slug }: { slug: string }) {
  const diploma = getDiploma(slug) as Diploma | undefined

  const relatedExercises = useMemo<ExerciseCardData[]>(
    () =>
      diploma
        ? (exercises.filter(e => diploma.levels.includes(e.level)) as unknown as ExerciseCardData[])
        : [],
    [diploma],
  )

  usePageSeo({
    title: diploma ? diploma.title : t('common.notFound'),
    description: diploma?.description ?? '',
  })

  if (!diploma) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: '/videos' },
            { label: t('pages.diplomas.title'), to: '/diplomes' },
            { label: '' },
          ]}
        />
        <EmptyState
          title={t('common.notFound')}
          description={t('common.comingSoon')}
          icon={'📜'}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.diplomas.title'), to: '/diplomes' },
          { label: diploma.title },
        ]}
      />

      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-800 mb-2">{diploma.title}</h1>
      <p className="text-gray-500 mb-3">{diploma.description}</p>
      <div className="flex items-center gap-2 mb-8">
        {diploma.levels.map(lvl => (
          <LevelPill key={lvl} level={lvl} />
        ))}
      </div>

      {/* Tips section */}
      <div className="bg-primary-50 rounded-lg p-6 mb-10">
        <h2 className="text-lg font-bold text-primary-800 mb-3">
          {t('pages.diplomas.preparationTips')}
        </h2>
        <ul className="text-primary-700 text-sm space-y-2 list-disc list-inside">
          <li>{t('pages.diplomas.preparationTips')}</li>
          <li>{t('pages.diplomas.relatedExercises')}</li>
        </ul>
      </div>

      {/* Related exercises */}
      {relatedExercises.length > 0 ? (
        <div>
          <h2 className="text-lg font-bold text-gray-800 mb-4">
            {t('pages.diplomas.relatedExercises')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {relatedExercises.map(ex => (
              <ExerciseCard key={ex.id} exercise={ex} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
