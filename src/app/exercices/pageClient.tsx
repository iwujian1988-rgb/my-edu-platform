'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/AllExercisesPage.vue
 *
 * 全部练习页：
 *   - Breadcrumb（首页 → 全部练习）
 *   - Header（标题 + 数量）
 *   - 级别 pills（A1/A2/B1/B2，可切换）
 *   - FilterPanel（主题 chips + 系列 chips + 排序）
 *   - ExerciseCard 网格（9/页）
 *   - Pagination
 *
 * 与原版差异：
 *   - Vue v-model + computed；React useState + useMemo
 *   - breadcrumb 首页指向 /videos（项目约定）
 *   - skeleton 用 mounted 替代 usePageReady（此页内容简单，沿用 ready 控制）
 */

import { useEffect, useMemo, useState } from 'react'
import { t } from '@/lib/maxclass/i18n'
import { usePageReady } from '@/lib/parcours/usePageReady'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import {
  ExerciseCard,
  FilterPanel,
  Pagination,
  EmptyState,
  SkeletonLoader,
  type FilterValue,
} from '@/components/maxclass/ui'
import { exercises, levels, themes } from '@/data/maxclass/mock'
import type { ExerciseCardData } from '@/components/maxclass/ui'

const PER_PAGE = 9

const LEVEL_BG: Record<string, string> = {
  A1: 'bg-green-600',
  A2: 'bg-blue-600',
  B1: 'bg-orange-500',
  B2: 'bg-purple-600',
}

export function AllExercisesPageClient() {
  const ready = usePageReady()
  usePageSeo({
    title: t('nav.allExercises'),
    description: '法语练习总览 — 按级别、主题、系列筛选。',
  })

  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState<FilterValue>({
    level: null,
    theme: null,
    collection: null,
    sort: 'default',
  })

  // 筛选改变时重置页码 — 等价 Vue watch(filters, ..., { deep: true })
  useEffect(() => {
    setPage(1)
  }, [filters])

  const filtered = useMemo<ExerciseCardData[]>(() => {
    let result: ExerciseCardData[] = [...exercises]

    if (filters.level) {
      result = result.filter(e => e.level === filters.level)
    }
    if (filters.theme) {
      const theme = themes.find(t2 => t2.slug === filters.theme)
      if (theme) {
        result = result.filter(e => e.theme === theme.label)
      }
    }
    if (filters.collection) {
      const cid = filters.collection
      result = result.filter(e => e.collectionId === cid)
    }
    if (filters.sort === 'newest') {
      result = [...result].reverse()
    }
    // 'default' / 'oldest' 保留原顺序
    return result
  }, [filters])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE))
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE)

  function toggleLevel(code: string) {
    setFilters(prev => ({ ...prev, level: prev.level === code ? null : code }))
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('nav.allExercises') },
        ]}
      />

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{t('nav.allExercises')}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {t('pages.home.exerciseCount', { count: filtered.length })}
          </p>
        </div>
      </div>

      {!ready ? (
        <>
          <div className="h-10 mb-6">
            <SkeletonLoader type="pill" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[0, 1, 2, 3, 4, 5].map(n => (
              <SkeletonLoader key={n} type="card" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Level pills */}
          <div className="flex items-center gap-2 mb-6 flex-wrap">
            <span className="text-sm text-gray-500">{t('common.seeLevel')}</span>
            {levels.map(lvl => {
              const active = filters.level === lvl.code
              return (
                <button
                  key={lvl.code}
                  type="button"
                  onClick={() => toggleLevel(lvl.code)}
                  className={`px-3 py-1.5 rounded-full text-sm font-bold transition-colors ${
                    active
                      ? `text-white ${LEVEL_BG[lvl.code] ?? 'bg-gray-500'}`
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {lvl.code}
                </button>
              )
            })}
          </div>

          {/* Filter panel */}
          <div className="mb-8">
            <FilterPanel
              value={filters}
              onChange={setFilters}
              showThemes={true}
              showCollections={true}
            />
          </div>

          {/* Exercise grid */}
          {paginated.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginated.map(ex => (
                <ExerciseCard key={ex.id} exercise={ex} />
              ))}
            </div>
          ) : (
            <EmptyState
              title={t('common.noResults')}
              description={t('common.clearFilters')}
              icon="🔍"
            />
          )}

          {/* Pagination */}
          <div className="mt-8">
            <Pagination value={page} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}
    </div>
  )
}
