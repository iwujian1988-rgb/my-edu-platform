'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/ThemesPage.vue
 *
 * 主题总览页：4 列网格展示所有主题，每张卡片含 icon + 名称 + 练习数 + 级别 pills，
 * 点击跳转到 /themes/[slug]（topic 详情页）。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { LevelPill } from '@/components/maxclass/ui'
import { themes } from '@/data/maxclass/mock'

export function ThemesPageClient() {
  usePageSeo({
    title: t('pages.themes.title'),
    description: '法语学习主题总览 — 按兴趣选择练习。',
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.themes.title') },
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-800 mb-8">{t('pages.themes.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {themes.map(theme => (
          <Link
            key={theme.slug}
            href={`/themes/${theme.slug}`}
            className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow p-6 group block"
          >
            <div className="flex items-start gap-4">
              <span className="text-4xl">{theme.icon}</span>
              <div className="flex-1 min-w-0">
                <h2 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors">
                  {t(`themes.${theme.slug}`)}
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {t('pages.home.exerciseCount', { count: theme.exerciseCount })}
                </p>
                <div className="flex gap-1 mt-3 flex-wrap">
                  {theme.levels.map(l => (
                    <LevelPill key={l} level={l} size="sm" />
                  ))}
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
