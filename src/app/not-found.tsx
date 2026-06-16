'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/NotFoundPage.vue
 *
 * Next.js 16 全局 404 页面（not-found.tsx 约定）。
 * 原版 Vue 路由 `/:pathMatch(.*)*` 在 Next.js 中由 not-found.tsx 自动接管。
 * 此页面同时是 notFound() 调用（如 /admin/users/[userId]、/library/[id]）的回退视图。
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'

export default function NotFoundPage() {
  usePageSeo({
    title: t('pages.notFound.title'),
    description: t('pages.notFound.description'),
  })

  return (
    <div className="max-w-7xl mx-auto px-4 py-16 text-center">
      <div className="w-20 h-20 mx-auto mb-5 rounded-full bg-gray-100 flex items-center justify-center text-4xl">
        🔍
      </div>
      <h1 className="text-2xl font-bold text-gray-700 mb-3">{t('pages.notFound.title')}</h1>
      <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
        {t('pages.notFound.description')}
      </p>
      <Link
        href="/videos"
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-primary-600 text-white hover:bg-primary-700 transition-colors"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
        </svg>
        {t('common.backToHome')}
      </Link>
    </div>
  )
}
