'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/ProgressPage.vue
 *
 * 学习进度页：
 *   - Breadcrumb（首页 / 学习进度）
 *   - 3 个统计卡（已完成 / 平均得分 / 收藏数）
 *   - 按级别细分（A1/A2/B1/B2 水平条）
 *
 * 无任何进度时显示 EmptyState。
 */

import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { EmptyState } from '@/components/maxclass/ui'
import { useProgressStore } from '@/lib/maxclass/progressStore'

type LevelCode = 'A1' | 'A2' | 'B1' | 'B2'

const ALL_LEVELS: LevelCode[] = ['A1', 'A2', 'B1', 'B2']

const LEVEL_COLOR: Record<LevelCode, string> = {
  A1: 'bg-green-500',
  A2: 'bg-blue-500',
  B1: 'bg-orange-500',
  B2: 'bg-purple-500',
}

export function ProgressPageClient() {
  const progress = useProgressStore()

  usePageSeo({
    title: t('pages.progress.title'),
    description: '您的法语学习进度。',
  })

  const hasProgress = progress.completedCount > 0 || progress.bookmarks.length > 0

  function levelBarWidth(lvl: LevelCode): number {
    const count = progress.levelProgress(lvl)
    const max = Math.max(progress.completedCount, 1)
    return Math.round((count / max) * 100)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.progress.title') },
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('pages.progress.title')}</h1>

      {hasProgress ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-10">
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-3xl font-bold text-primary-700">{progress.completedCount}</div>
              <p className="text-sm text-gray-500 mt-1">{t('pages.progress.completed')}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-3xl font-bold text-green-600">{progress.averageScore}%</div>
              <p className="text-sm text-gray-500 mt-1">{t('pages.progress.averageScore')}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-6 text-center">
              <div className="text-3xl font-bold text-orange-500">{progress.bookmarks.length}</div>
              <p className="text-sm text-gray-500 mt-1">{t('pages.progress.bookmarks')}</p>
            </div>
          </div>

          {/* Level breakdown */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4">{t('pages.progress.byLevel')}</h2>
            <div className="space-y-4">
              {ALL_LEVELS.map(lvl => (
                <div key={lvl} className="flex items-center gap-4">
                  <span className="w-8 text-sm font-bold text-gray-600">{lvl}</span>
                  <div className="flex-1 h-3 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${LEVEL_COLOR[lvl]}`}
                      style={{ width: `${levelBarWidth(lvl)}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-500 w-16 text-right">
                    {progress.levelProgress(lvl)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : (
        <EmptyState
          title={t('pages.progress.empty')}
          description={t('pages.progress.emptyDesc')}
          icon={'📊'}
        />
      )}
    </div>
  )
}
