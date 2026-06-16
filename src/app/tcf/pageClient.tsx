'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/TcfPage.vue
 *
 * TCF 备考页：
 *   - Breadcrumb（首页 / TCF）
 *   - 说明区（绿底，3 道考试项的时长+题数）
 *   - 练习网格（每张卡：标题 + 描述 + 时长 + 题数 + 级别 badge）
 *
 * 跳转到 /tcf/[slug]（每个练习测试）。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { tcfTests } from '@/data/maxclass/mock'

export function TcfPageClient() {
  usePageSeo({
    title: t('pages.tcf.title'),
    description: t('pages.tcf.description'),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('nav.tcf') },
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-800 mb-4">{t('pages.tcf.title')}</h1>

      {/* Explanation section */}
      <div className="bg-primary-50 rounded-lg p-6 mb-10">
        <h2 className="text-lg font-bold text-primary-800 mb-2">{t('pages.tcf.title')}</h2>
        <p className="text-primary-700 text-sm leading-relaxed mb-3">{t('pages.tcf.description')}</p>
        <h3 className="text-sm font-bold text-primary-800 mb-1">{t('pages.tcf.title')}</h3>
        <ul className="text-primary-700 text-sm list-disc list-inside space-y-1">
          <li>
            {t('exercise.listen')} : 25 min, 29 {t('pages.tcf.questions')}
          </li>
          <li>
            {t('pages.tcf.title')} : 15 min, 18 {t('pages.tcf.questions')}
          </li>
          <li>
            {t('exercise.look') || 'Compréhension écrite'} : 45 min, 29 {t('pages.tcf.questions')}
          </li>
        </ul>
      </div>

      {/* TCF test grid */}
      <h2 className="text-lg font-bold text-gray-800 mb-4">{t('pages.tcf.practice')}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {tcfTests.map(test => (
          <Link
            key={test.id}
            href={`/tcf/${test.slug}`}
            className="card group cursor-pointer block p-5"
          >
            <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors mb-2">
              {test.title}
            </h3>
            <p className="text-sm text-gray-500 mb-3">{test.description}</p>
            <div className="flex items-center gap-4 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {t('common.duration', { min: test.duration })}
              </span>
              <span className="flex items-center gap-1">
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {test.questionCount} {t('pages.tcf.questions')}
              </span>
            </div>
            <div className="mt-3">
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {test.level}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
