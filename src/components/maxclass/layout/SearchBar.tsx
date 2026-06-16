'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/components/layout/SearchBar.vue
 * 顶部搜索下拉：输入 + 实时结果（练习/词汇）+ 跳转 /recherche
 */

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useUiStore } from '@/lib/maxclass/uiStore'
import { t } from '@/lib/maxclass/i18n'
import { search } from '@/data/maxclass'

interface SearchResults {
  exercises: Array<{ id: number; title: string; level: string }>
  series: Array<{ id: number; title: string }>
  vocabulary: Array<{ id: number; term: string; definition: string; listTitle: string }>
  memos: Array<{ id: number; title: string; content: string }>
}

export function SearchBar() {
  const uiStore = useUiStore()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResults | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (uiStore.searchOpen) {
      const id = window.setTimeout(() => inputRef.current?.focus(), 0)
      return () => window.clearTimeout(id)
    } else {
      setQuery('')
      setResults(null)
    }
  }, [uiStore.searchOpen])

  useEffect(() => {
    if (query.length >= 2) {
      setResults(search(query) as SearchResults)
    } else {
      setResults(null)
    }
  }, [query])

  function doSearch(e: React.FormEvent) {
    e.preventDefault()
    if (query.length >= 2) {
      router.push(`/recherche?q=${encodeURIComponent(query)}`)
      uiStore.closeSearch()
    }
  }

  if (!uiStore.searchOpen) return null

  return (
    <div className="absolute top-full left-0 right-0 bg-white shadow-lg border-b z-40">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <form onSubmit={doSearch} className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              type="text"
              placeholder={t('pages.search.placeholder', '搜索练习、词汇...')}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-300 focus:border-primary-500 outline-none"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                type="button"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label="清空"
              >
                &times;
              </button>
            )}
          </div>
          <button type="submit" className="btn-primary">{t('nav.search', '搜索')}</button>
          <button
            onClick={() => uiStore.closeSearch()}
            type="button"
            className="text-gray-500 hover:text-gray-700 px-2"
            aria-label="关闭"
          >
            ✕
          </button>
        </form>
        {results && query.length >= 2 && (
          <div className="mt-3 space-y-3">
            {results.exercises.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  {t('nav.exercises', '练习')} ({results.exercises.length})
                </h4>
                {results.exercises.slice(0, 3).map((e) => (
                  <Link
                    key={e.id}
                    href={`/exercice/${e.id}`}
                    onClick={() => uiStore.closeSearch()}
                    className="block px-3 py-2 hover:bg-gray-50 rounded text-sm"
                  >
                    {e.title} <span className="text-gray-400">— {e.level}</span>
                  </Link>
                ))}
              </div>
            )}
            {results.vocabulary.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">
                  {t('nav.vocabulary', '词汇')} ({results.vocabulary.length})
                </h4>
                {results.vocabulary.slice(0, 3).map((w) => (
                  <div key={w.id} className="px-3 py-2 text-sm">
                    {w.term} <span className="text-gray-400">— {w.definition}</span>
                  </div>
                ))}
              </div>
            )}
            {results.exercises.length === 0 && results.vocabulary.length === 0 && (
              <div className="text-sm text-gray-400 py-2">{t('common.noResults', '没有结果')}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
