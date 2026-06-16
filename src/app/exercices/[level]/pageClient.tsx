'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/LevelPage.vue
 *
 * 级别页（A1/A2/B1/B2）：
 *   - 简易 breadcrumb（首页 / 当前级别）
 *   - level-badge + 标题 + 可用数量
 *   - ExerciseCard 网格
 *   - 空态回退到首页
 *
 * 与原版差异：
 *   - Vue defineProps({ level: String })；React function 参数
 *   - breadcrumb 首页指 /videos；路由前缀 `/exercices/[level]`（法语拼写 1:1 保留）
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { ExerciseCard, EmptyState, type ExerciseCardData } from '@/components/maxclass/ui'
import { getExercisesByLevel, getLevelBySlug } from '@/data/maxclass/mock'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

export function LevelPageClient({ level }: { level: string }) {
  const levelInfo = getLevelBySlug(level)
  const exerciseList = getExercisesByLevel(level) as ExerciseCardData[]

  usePageSeo({
    title: levelInfo ? `${levelInfo.code} — ${levelInfo.label}` : t('nav.allExercises'),
    description: levelInfo ? `${levelInfo.code} 级别 — ${exerciseList.length} 个练习` : '',
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      {/* Breadcrumb */}
      <nav className="text-sm text-gray-500 mb-6">
        <Link href="/videos" className="hover:text-primary-700">
          {t('nav.home')}
        </Link>
        <span className="mx-2">/</span>
        <span className="text-gray-800">{levelInfo?.label ?? level}</span>
      </nav>

      <div className="flex items-center gap-4 mb-8">
        {levelInfo ? (
          <span className={`level-badge text-lg px-5 py-2 level-${levelInfo.code}`}>
            {levelInfo.code}
          </span>
        ) : null}
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            {t('pages.level.level', { code: levelInfo?.code ?? level })} — {levelInfo?.label}
          </h1>
          <p className="text-gray-500 mt-1">
            {exerciseList.length} {t('pages.level.available')}
          </p>
        </div>
      </div>

      {exerciseList.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {exerciseList.map(ex => (
            <Link
              key={ex.id}
              href={`/exercice/${ex.id}`}
              className="card group cursor-pointer block"
            >
              <div className="h-36 bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center relative overflow-hidden">
                {ex.thumbnail ? (
                  <div
                    className="w-full h-full bg-cover bg-center"
                    style={{ backgroundImage: `url(${ex.thumbnail})` }}
                  />
                ) : (
                  <svg className="w-10 h-10 text-gray-300" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
                <span className="absolute bottom-3 right-3 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  {formatDuration(ex.duration)}
                </span>
              </div>
              <div className="p-4">
                <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors">
                  {ex.title}
                </h3>
                <p className="text-sm text-gray-500 mt-1">{ex.description}</p>
                <div className="flex items-center gap-2 mt-3">
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                    {ex.theme}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('common.noResults')}
          description={t('common.clearFilters')}
          icon={'🔍'}
        >
          <Link href="/videos" className="btn-primary inline-block mt-4">
            {t('common.backToHome')}
          </Link>
        </EmptyState>
      )}
    </div>
  )
}
