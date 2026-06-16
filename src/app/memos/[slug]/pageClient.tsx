'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/MemoDetailPage.vue
 *
 * 备忘录详情页：
 *   - Breadcrumb（首页 / 备忘录 / 当前备忘录）
 *   - 标题 + 分类标签 + 级别 pill
 *   - HTML 内容（prose 排版）
 *   - 相关备忘录（同分类其他备忘录）
 *
 * 不存在的 slug：显示 EmptyState。
 */

import { useMemo } from 'react'
import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../../parcours/components/Breadcrumb'
import { LevelPill, EmptyState } from '@/components/maxclass/ui'
import { getMemo, memos, memoCategories } from '@/data/maxclass/mock'

interface Memo {
  id: number
  slug: string
  title: string
  category: string
  level: string
  content: string
}

export function MemoDetailPageClient({ slug }: { slug: string }) {
  const memo = getMemo(slug) as Memo | undefined

  const categoryIcon = useMemo(() => {
    if (!memo) return ''
    const cat = memoCategories.find(c => c.slug === memo.category)
    return cat ? cat.icon : ''
  }, [memo])

  const related = useMemo<Memo[]>(
    () =>
      memo
        ? (memos.filter(m => m.category === memo.category && m.id !== memo.id) as Memo[])
        : [],
    [memo],
  )

  usePageSeo({
    title: memo ? memo.title : t('pages.memoDetail.notFound'),
    description: memo ? memo.title : '',
  })

  if (!memo) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: '/videos' },
            { label: t('pages.memos.title'), to: '/memos' },
            { label: '' },
          ]}
        />
        <EmptyState
          title={t('pages.memoDetail.notFound')}
          description={t('pages.memoDetail.notFoundDesc')}
          icon={'📝'}
        />
      </div>
    )
  }

  // 分离 dangerouslySetInnerHTML 内容便于审查
  const memoContent = { __html: memo.content }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.memos.title'), to: '/memos' },
          { label: memo.title },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-2xl font-bold text-gray-800">{memo.title}</h1>
        <span className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">
          {categoryIcon} {memo.category}
        </span>
        <LevelPill level={memo.level} />
      </div>

      {/* Content */}
      <div
        className="bg-white rounded-lg shadow-sm p-6 mt-6 prose prose-sm max-w-none memo-content"
        dangerouslySetInnerHTML={memoContent}
      />

      {/* Related memos */}
      {related.length > 0 ? (
        <div className="mt-10">
          <h2 className="text-lg font-bold text-gray-800 mb-4">{t('pages.memoDetail.related')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {related.map(r => (
              <Link
                key={r.id}
                href={`/memos/${r.slug}`}
                className="card group cursor-pointer block p-4"
              >
                <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors text-sm">
                  {r.title}
                </h3>
                <div className="mt-2">
                  <LevelPill level={r.level} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
