'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/ResourcesPage.vue
 *
 * 学习资源页（teal 渐变 hero + 3 个内部工具入口 + 外部链接 grid + 3 个 coming soon 分类）
 *
 * 与原版差异：
 *   - Vue <router-link to="/vocabulaire">；React <Link href="/vocabulaire">
 *   - breadcrumb 首页指向 /videos（项目约定）
 *   - skeleton 用 mounted 状态替代 usePageReady
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageReady } from '@/lib/parcours/usePageReady'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { SkeletonLoader } from '@/components/maxclass/ui'
import { getResources } from '@/data/maxclass/contentManifest'

const CAT_BG = [
  'bg-gradient-to-br from-blue-100 to-blue-200',
  'bg-gradient-to-br from-purple-100 to-purple-200',
  'bg-gradient-to-br from-orange-100 to-orange-200',
]

export function ResourcesPageClient() {
  const ready = usePageReady()
  usePageSeo({
    title: t('pages.resources.title'),
    description: '法语学习资源：PDF 资料、电子书、TCF 备考、外部学习工具推荐。',
  })

  const categories = [
    { name: t('pages.resources.catPdf'), icon: '📄', desc: t('pages.resources.catPdfDesc') },
    { name: t('pages.resources.catEbook'), icon: '📚', desc: t('pages.resources.catEbookDesc') },
    { name: t('pages.resources.catExam'), icon: '🎯', desc: t('pages.resources.catExamDesc') },
  ]
  const externalLinks = getResources()

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.resources.title') },
        ]}
      />

      {!ready ? (
        <>
          <SkeletonLoader type="hero" />
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 my-12">
            {[0, 1, 2].map(n => (
              <SkeletonLoader key={n} type="card" />
            ))}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[0, 1, 2, 3, 4, 5].map(n => (
              <SkeletonLoader key={n} type="block" />
            ))}
          </div>
        </>
      ) : (
        <>
          {/* Hero */}
          <div className="bg-gradient-to-br from-teal-600 to-emerald-700 text-white rounded-xl p-8 md:p-12 mb-10">
            <div className="max-w-3xl">
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
                {t('pages.resources.badge')}
              </span>
              <h1 className="text-3xl md:text-4xl font-bold mb-4">
                {t('pages.resources.heroTitle')}
              </h1>
              <p className="text-teal-100 text-lg leading-relaxed">
                {t('pages.resources.heroDesc')}
              </p>
            </div>
          </div>

          {/* Learning Tools */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {t('pages.resources.availableNow')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <Link
                href="/vocabulaire"
                className="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group"
              >
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-1">{t('nav.vocabulary')}</h3>
                <p className="text-sm text-gray-500">{t('pages.resources.vocabDesc')}</p>
                <span className="text-sm text-primary-600 font-medium mt-3 inline-block group-hover:translate-x-1 transition-transform">
                  {t('pages.home.discover')} →
                </span>
              </Link>

              <Link
                href="/memos"
                className="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group"
              >
                <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-1">{t('nav.memos')}</h3>
                <p className="text-sm text-gray-500">{t('pages.resources.memoDesc')}</p>
                <span className="text-sm text-primary-600 font-medium mt-3 inline-block group-hover:translate-x-1 transition-transform">
                  {t('pages.home.discover')} →
                </span>
              </Link>

              <Link
                href="/tcf"
                className="block bg-white rounded-lg border border-gray-200 p-5 hover:shadow-md transition-shadow group"
              >
                <div className="w-10 h-10 rounded-lg bg-orange-50 flex items-center justify-center mb-3">
                  <svg
                    className="w-5 h-5 text-orange-600"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
                    />
                  </svg>
                </div>
                <h3 className="font-bold text-gray-800 mb-1">{t('nav.tcf')}</h3>
                <p className="text-sm text-gray-500">{t('pages.resources.tcfDesc')}</p>
                <span className="text-sm text-primary-600 font-medium mt-3 inline-block group-hover:translate-x-1 transition-transform">
                  {t('pages.home.discover')} →
                </span>
              </Link>
            </div>
          </div>

          {/* External Learning Resources */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {t('pages.resources.extResources')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {externalLinks.map(link => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-4 bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow group"
                >
                  <div
                    className={`w-10 h-10 rounded-lg shrink-0 flex items-center justify-center ${link.iconBg}`}
                  >
                    <span className="text-lg">{link.icon}</span>
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-gray-800 text-sm group-hover:text-primary-600 transition-colors">
                      {link.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{link.desc}</p>
                  </div>
                  <svg
                    className="w-4 h-4 text-gray-400 shrink-0 mt-1 group-hover:text-primary-500 transition-colors"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={2}
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </div>

          {/* Coming soon: PDF / Ebook / Exam */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">
              {t('pages.resources.categories')}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {categories.map((cat, i) => (
                <div
                  key={i}
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden"
                >
                  <div className={`h-32 flex items-center justify-center text-4xl ${CAT_BG[i]}`}>
                    {cat.icon}
                  </div>
                  <div className="p-5">
                    <h3 className="font-bold text-gray-800 mb-1">{cat.name}</h3>
                    <p className="text-sm text-gray-500 mb-4">{cat.desc}</p>
                    <button
                      type="button"
                      disabled
                      className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-400 text-sm font-medium cursor-not-allowed"
                    >
                      {t('pages.maxtube.comingSoon')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Back */}
          <div className="text-center">
            <Link
              href="/videos"
              className="text-primary-600 hover:text-primary-800 font-medium text-sm"
            >
              ← {t('common.backToHome')}
            </Link>
          </div>
        </>
      )}
    </div>
  )
}
