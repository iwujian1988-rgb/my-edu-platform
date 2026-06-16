'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/DiplomasPage.vue
 *
 * 文凭列表页：3 张 diploma 卡（标题 + 描述 + 级别 pills），跳 /diplomes/[slug]。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { LevelPill } from '@/components/maxclass/ui'
import { diplomas } from '@/data/maxclass/mock'

export function DiplomasPageClient() {
  usePageSeo({
    title: t('pages.diplomas.title'),
    description: '法语文凭备考资料。',
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.diplomas.title') },
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('pages.diplomas.title')}</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {diplomas.map(diploma => (
          <Link
            key={diploma.id}
            href={`/diplomes/${diploma.slug}`}
            className="card group cursor-pointer block p-5"
          >
            <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors mb-2">
              {diploma.title}
            </h3>
            <p className="text-sm text-gray-500 mb-3">{diploma.description}</p>
            <div className="flex items-center gap-2">
              {diploma.levels.map((lvl: string) => (
                <LevelPill key={lvl} level={lvl} size="sm" />
              ))}
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
