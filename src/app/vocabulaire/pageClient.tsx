'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/VocabularyPage.vue
 *
 * 词汇书列表页：3 个难度 tabs（easy 🌱 / medium 🌿 / hard 🌳）+ 列表网格。
 * 每张卡显示标题 + 级别 pill + 单词数 + 主题标签。
 */

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { LevelPill, EmptyState } from '@/components/maxclass/ui'
import { vocabularyLists } from '@/data/maxclass/mock'

type DifficultyKey = 'easy' | 'medium' | 'hard'

interface VocabList {
  id: number
  slug: string
  title: string
  difficulty: string
  level: string
  theme: string
  words: { id: number; term: string; definition: string; partOfSpeech: string; example: string }[]
}

const TABS: { key: DifficultyKey; icon: string }[] = [
  { key: 'easy', icon: '🌱' },
  { key: 'medium', icon: '🌿' },
  { key: 'hard', icon: '🌳' },
]

export function VocabularyPageClient() {
  const [activeTab, setActiveTab] = useState<DifficultyKey>('easy')

  usePageSeo({
    title: t('nav.vocabulary'),
    description: '法语词汇书 — 按难度选择。',
  })

  const filtered = useMemo<VocabList[]>(
    () => vocabularyLists.filter(l => l.difficulty === activeTab) as VocabList[],
    [activeTab],
  )

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('nav.vocabulary') },
        ]}
      />

      <h1 className="text-2xl font-bold text-gray-800 mb-6">{t('nav.vocabulary')}</h1>

      {/* Difficulty tabs */}
      <div className="flex gap-2 mb-8">
        {TABS.map(tab => {
          const active = activeTab === tab.key
          const label = t(`pages.vocabulary.${tab.key}`)
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-2.5 rounded-full text-sm font-semibold transition-colors ${
                active
                  ? 'bg-primary-700 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.icon} {label}
            </button>
          )
        })}
      </div>

      {/* Vocabulary grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(list => (
            <Link
              key={list.id}
              href={`/vocabulaire/${list.slug}`}
              className="card group cursor-pointer block p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors">
                  {list.title}
                </h3>
                <LevelPill level={list.level} />
              </div>
              <p className="text-sm text-gray-500 mb-3">
                {list.words.length} {t('pages.vocabulary.words')}
              </p>
              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600">
                {list.theme}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          title={t('common.noResults')}
          description={t('common.comingSoon')}
          icon={'📚'}
        />
      )}
    </div>
  )
}
