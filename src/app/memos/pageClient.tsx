'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/MemosPage.vue
 *
 * 语法备忘录列表页：分类 pills + memo 卡片网格。
 * 每张卡显示分类图标 + 分类标签 + 标题 + 内容预览（去掉 HTML 标签的纯文本）+ 级别 pill。
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { LevelPill, EmptyState } from '@/components/maxclass/ui'
import { memos, memoCategories } from '@/data/maxclass/mock'

interface Memo {
  id: number
  slug: string
  title: string
  category: string
  level: string
  content: string
}

const FALLBACK_ICON = '📄'

function categoryIcon(category: string): string {
  const cat = memoCategories.find(c => c.slug === category)
  return cat ? cat.icon : FALLBACK_ICON
}

function preview(html: string): string {
  const text = html.replace(/<[^>]*>/g, '')
  return text.length > 120 ? text.slice(0, 120) + '...' : text
}

export function MemosPageClient() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  usePageSeo({
    title: t('pages.memos.title'),
    description: '法语语法与发音备忘录。',
  })

  const filtered = useMemo<Memo[]>(
    () =>
      activeCategory
        ? (memos.filter(m => m.category === activeCategory) as Memo[])
        : (memos as Memo[]),
    [activeCategory],
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.memos.title') },
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('pages.memos.title')}</h1>

      {/* Category filter pills */}
      <div className="flex gap-2 mb-8 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveCategory(null)}
          className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
            activeCategory === null
              ? 'bg-primary-700 text-white'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          {t('pages.memos.all')}
        </button>
        {memoCategories.map(cat => {
          const active = activeCategory === cat.slug
          return (
            <button
              key={cat.slug}
              type="button"
              onClick={() => setActiveCategory(cat.slug)}
              className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.icon} {cat.label}
            </button>
          )
        })}
      </div>

      {/* Memo grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(memo => (
            <Link
              key={memo.id}
              href={`/memos/${memo.slug}`}
              className="card group cursor-pointer block p-5"
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="text-lg">{categoryIcon(memo.category)}</span>
                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500">
                  {memo.category}
                </span>
              </div>
              <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors mb-2">
                {memo.title}
              </h3>
              <p className="text-sm text-gray-500 line-clamp-2">{preview(memo.content)}</p>
              <div className="mt-3">
                <LevelPill level={memo.level} />
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('common.noResults')}
          description={t('common.comingSoon')}
          icon={'📝'}
        />
      )}
    </div>
  )
}
