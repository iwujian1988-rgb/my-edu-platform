'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/SearchResultsPage.vue
 *
 * 搜索页：输入框（>=2 字符触发）+ tabs（exercises/vocabulary/memos）+ 各类结果列表。
 *
 * 与原版差异：
 *   - Vue useRoute().query.q → React useSearchParams()
 *   - Vue watch(route.query.q) → useEffect 监听 searchParams
 *   - Vue <router-link :to="{ name: 'memoDetail', params: { slug } }"> →
 *     React <Link href={`/memos/${slug}`}>
 *   - Suspense 包裹：Next.js 16 要求 useSearchParams 必须在 Suspense 边界内
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { t } from '@/lib/maxclass/i18n'
import { search as searchFn } from '@/data/maxclass/mock'
import { Breadcrumb } from '../parcours/components/Breadcrumb'
import { ExerciseCard, type ExerciseCardData } from '@/components/maxclass/ui'
import { LevelPill } from '@/components/maxclass/ui'
import { EmptyState } from '@/components/maxclass/ui'

interface VocabResult {
  id: string | number
  term: string
  definition: string
  partOfSpeech: string
  listTitle?: string
}
interface MemoResult {
  id: string | number
  title: string
  category: string
  level: string
  slug: string
}

interface SearchResults {
  exercises: ExerciseCardData[]
  series: unknown[]
  vocabulary: VocabResult[]
  memos: MemoResult[]
}

type TabKey = 'exercises' | 'vocabulary' | 'memos'

const EMPTY_RESULTS: SearchResults = {
  exercises: [],
  series: [],
  vocabulary: [],
  memos: [],
}

export function SearchResultsPageClient() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const initialQ = searchParams.get('q') ?? ''

  const [query, setQuery] = useState(initialQ)
  const [querySearched, setQuerySearched] = useState('')
  const [activeTab, setActiveTab] = useState<TabKey>('exercises')
  const [results, setResults] = useState<SearchResults>(EMPTY_RESULTS)

  function onSearch(q: string) {
    if (q.length >= 2) {
      setQuerySearched(q)
      const fresh = searchFn(q) as SearchResults
      setResults(fresh)
      if (!fresh.exercises.length && fresh.vocabulary.length) {
        setActiveTab('vocabulary')
      } else if (
        !fresh.exercises.length &&
        !fresh.vocabulary.length &&
        fresh.memos.length
      ) {
        setActiveTab('memos')
      } else {
        setActiveTab('exercises')
      }
    } else {
      setResults(EMPTY_RESULTS)
      setQuerySearched('')
    }
  }

  // 同步 URL ?q= 到本地 query（用户从外部链接跳来时）
  useEffect(() => {
    if (initialQ && initialQ !== query) {
      setQuery(initialQ)
      onSearch(initialQ)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQ])

  const hasResults =
    results.exercises.length > 0 ||
    results.vocabulary.length > 0 ||
    results.memos.length > 0

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'exercises', label: t('nav.exercises'), count: results.exercises.length },
    { key: 'vocabulary', label: t('nav.vocabulary'), count: results.vocabulary.length },
    { key: 'memos', label: t('pages.memos.title'), count: results.memos.length },
  ]

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const next = e.target.value
    setQuery(next)
    onSearch(next)
    // 同步到 URL（不带 history 堆叠噪音，用 replace）
    const params = new URLSearchParams(searchParams.toString())
    if (next) params.set('q', next)
    else params.delete('q')
    router.replace(`/recherche?${params.toString()}`, { scroll: false })
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('pages.search.title') },
        ]}
      />

      {/* Search input */}
      <div className="mb-8">
        <div className="relative max-w-xl">
          <input
            value={query}
            onChange={onInputChange}
            type="text"
            placeholder={t('pages.search.placeholder')}
            className="w-full border-2 border-gray-200 rounded-lg px-4 py-3 pr-10 focus:border-primary-600 focus:outline-none transition-colors"
          />
          <svg
            className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* Tabs */}
      {hasResults ? (
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? 'border-primary-700 text-primary-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      ) : null}

      {/* Empty states */}
      {!hasResults && querySearched ? (
        <EmptyState
          title={t('common.noResults')}
          description={t('pages.search.noResults', { query: querySearched })}
          icon={'🔍'}
        />
      ) : !hasResults ? (
        <EmptyState
          title={t('pages.search.title')}
          description={t('pages.search.placeholder')}
          icon={'🔍'}
        />
      ) : (
        <>
          {/* Exercises tab */}
          {activeTab === 'exercises' && results.exercises.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {results.exercises.map(ex => (
                <ExerciseCard key={ex.id} exercise={ex} />
              ))}
            </div>
          ) : null}

          {/* Vocabulary tab */}
          {activeTab === 'vocabulary' && results.vocabulary.length > 0 ? (
            <div className="space-y-3">
              {results.vocabulary.map(word => (
                <div
                  key={word.id}
                  className="bg-white rounded-lg shadow-sm p-4 flex items-start justify-between"
                >
                  <div>
                    <h3 className="font-bold text-gray-800">{word.term}</h3>
                    <p className="text-sm text-gray-500">{word.definition}</p>
                  </div>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-600 shrink-0 ml-4">
                    {word.partOfSpeech}
                  </span>
                </div>
              ))}
            </div>
          ) : null}

          {/* Memos tab */}
          {activeTab === 'memos' && results.memos.length > 0 ? (
            <div className="space-y-3">
              {results.memos.map(memo => (
                <Link
                  key={memo.id}
                  href={`/memos/${memo.slug}`}
                  className="bg-white rounded-lg shadow-sm p-4 flex items-center justify-between group hover:shadow-md transition-shadow block"
                >
                  <div>
                    <h3 className="font-bold text-gray-800 group-hover:text-primary-700 transition-colors">
                      {memo.title}
                    </h3>
                    <p className="text-sm text-gray-500">{memo.category}</p>
                  </div>
                  <LevelPill level={memo.level} size="sm" />
                </Link>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
