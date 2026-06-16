'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/MaxtubeLandingPage.vue
 *
 * MAX TUBE 落地页（占位介绍页）：
 *   - Breadcrumb（首页 → MAX TUBE）
 *   - Hero（indigo→purple 渐变 + 标题 + 描述 + 3 个特性图标）
 *   - How it works（3 步说明）
 *   - Channel cards（3 个频道，全部 disabled「即将开放」）
 *   - Back to home 链接
 *
 * 与原版差异：
 *   - Vue <router-link to="/">；React <Link href="/videos">（项目 breadcrumb 约定）
 */

import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'

const CHANNEL_BG = [
  'bg-gradient-to-br from-blue-100 to-blue-200',
  'bg-gradient-to-br from-red-100 to-red-200',
  'bg-gradient-to-br from-amber-100 to-amber-200',
]

export function MaxtubeLandingPageClient() {
  usePageSeo({
    title: t('pages.maxtube.heroTitle'),
    description: t('pages.maxtube.heroDesc'),
  })

  const channels = [
    { name: 'Easy French', icon: '🇫🇷', desc: t('pages.maxtube.channelEf') },
    { name: t('pages.maxtube.channelTed'), icon: '🎤', desc: t('pages.maxtube.channelTedDesc') },
    { name: t('pages.maxtube.channelNews'), icon: '📰', desc: t('pages.maxtube.channelNewsDesc') },
  ]

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: 'MAX TUBE' },
        ]}
      />

      {/* Hero */}
      <div className="bg-gradient-to-br from-indigo-700 to-purple-800 text-white rounded-xl p-8 md:p-12 mb-10">
        <div className="max-w-3xl">
          <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm font-medium mb-4">
            MAX TUBE
          </span>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            {t('pages.maxtube.heroTitle')}
          </h1>
          <p className="text-indigo-200 text-lg leading-relaxed mb-6">
            {t('pages.maxtube.heroDesc')}
          </p>
          <div className="flex items-center gap-4 text-sm text-indigo-200">
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" />
              </svg>
              {t('pages.maxtube.featureVideos')}
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M3 5a2 2 0 012-2h10a2 2 0 012 2v8a2 2 0 01-2 2h-2.22l.123.489.804.804A1 1 0 0113 18H7a1 1 0 01-.707-1.707l.804-.804L7.22 15H5a2 2 0 01-2-2V5z"
                  clipRule="evenodd"
                />
              </svg>
              {t('pages.maxtube.featureSubtitles')}
            </span>
            <span className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              {t('pages.maxtube.featureMaterials')}
            </span>
          </div>
        </div>
      </div>

      {/* How it works */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {t('pages.maxtube.howItWorks')}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[0, 1, 2].map(i => (
            <div key={i} className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center mb-4">
                {i + 1}
              </div>
              <h3 className="font-bold text-gray-800 mb-2">
                {t(`pages.maxtube.step${i + 1}Title`)}
              </h3>
              <p className="text-sm text-gray-500 leading-relaxed">
                {t(`pages.maxtube.step${i + 1}Desc`)}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Channel cards */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">
          {t('pages.maxtube.channels')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {channels.map((ch, i) => (
            <div
              key={i}
              className="bg-white rounded-lg border border-gray-200 overflow-hidden"
            >
              <div className={`h-40 flex items-center justify-center text-5xl ${CHANNEL_BG[i]}`}>
                {ch.icon}
              </div>
              <div className="p-5">
                <h3 className="font-bold text-gray-800 mb-1">{ch.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{ch.desc}</p>
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

      {/* Back to home */}
      <div className="text-center">
        <Link
          href="/videos"
          className="text-primary-600 hover:text-primary-800 font-medium text-sm"
        >
          ← {t('common.backToHome')}
        </Link>
      </div>
    </div>
  )
}
