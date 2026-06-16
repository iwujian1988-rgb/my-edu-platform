'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/views/VocabDetailPage.vue
 *
 * 词汇书详情页（单词卡）：
 *   - Breadcrumb（首页 / 词汇书 / 当前书）
 *   - 标题 + 级别 + 单词数
 *   - 进度条（已学 / 总数）
 *   - 3D 翻转单词卡（前：词性 + 单词；后：单词 + 释义 + 例句）
 *   - 两个动作按钮：markKnown (绿) / markReview (橙)
 *   - 单词导航：每个单词一个圆形按钮，已学的绿色、当前的深蓝、未学的灰色
 *
 * 3D 翻转：parent 用 transform-style: preserve-3d + rotateY，前后两面 absolute + backface-visibility: hidden。
 */

import { useMemo, useState } from 'react'
import { t } from '@/lib/maxclass/i18n'
import { usePageSeo } from '@/lib/parcours/usePageSeo'
import { Breadcrumb } from '../../parcours/components/Breadcrumb'
import { LevelPill, EmptyState } from '@/components/maxclass/ui'
import { getVocabularyList } from '@/data/maxclass/mock'

interface VocabWord {
  id: number
  term: string
  definition: string
  partOfSpeech: string
  example: string
}
interface VocabList {
  id: number
  slug: string
  title: string
  level: string
  words: VocabWord[]
}

export function VocabDetailPageClient({ slug }: { slug: string }) {
  const list = getVocabularyList(slug) as VocabList | undefined

  const [currentIndex, setCurrentIndex] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [seenWords, setSeenWords] = useState<Set<number>>(new Set())

  usePageSeo({
    title: list ? list.title : t('pages.vocabulary.notFound'),
    description: list ? `${list.title} — ${list.words.length} 个单词` : '',
  })

  const currentWord: VocabWord | undefined = useMemo(
    () => list?.words[currentIndex],
    [list, currentIndex],
  )
  const seenCount = seenWords.size
  const progressPercent =
    list && list.words.length > 0
      ? Math.round((seenCount / list.words.length) * 100)
      : 0

  function goToWord(i: number) {
    setCurrentIndex(i)
    setFlipped(false)
  }

  function advance() {
    if (!list) return
    if (currentIndex < list.words.length - 1) {
      setCurrentIndex(i => i + 1)
      setFlipped(false)
    }
  }

  function markKnown() {
    if (!currentWord) return
    setSeenWords(prev => {
      const next = new Set(prev)
      next.add(currentWord.id)
      return next
    })
    advance()
  }

  function markReview() {
    if (!currentWord) return
    setSeenWords(prev => {
      const next = new Set(prev)
      next.add(currentWord.id)
      return next
    })
    advance()
  }

  if (!list) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <Breadcrumb
          items={[
            { label: t('nav.home'), to: '/videos' },
            { label: t('nav.vocabulary'), to: '/vocabulaire' },
            { label: '' },
          ]}
        />
        <EmptyState
          title={t('pages.vocabulary.notFound')}
          description={t('pages.vocabulary.notFoundDesc')}
          icon={'📚'}
        />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <Breadcrumb
        items={[
          { label: t('nav.home'), to: '/videos' },
          { label: t('nav.vocabulary'), to: '/vocabulaire' },
          { label: list.title },
        ]}
      />

      {/* Header */}
      <div className="flex items-center gap-4 mb-2">
        <h1 className="text-2xl font-bold text-gray-800">{list.title}</h1>
        <LevelPill level={list.level} />
      </div>
      <p className="text-gray-500 mb-6">
        {list.words.length} {t('pages.vocabulary.words')}
      </p>

      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-500">{t('pages.vocabulary.progress')}</span>
          <span className="text-sm font-medium text-primary-700">
            {seenCount} / {list.words.length}
          </span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-600 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="flex justify-center mb-6">
        <button
          type="button"
          onClick={() => setFlipped(f => !f)}
          className="w-full max-w-lg cursor-pointer relative text-left"
          style={{ perspective: '1000px' }}
          aria-label={t('pages.vocabulary.flip')}
        >
          <div
            className="relative w-full transition-transform duration-500"
            style={{
              transformStyle: 'preserve-3d',
              transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
            }}
          >
            {/* Front */}
            <div
              className="bg-white rounded-lg shadow-md p-8 text-center"
              style={{ backfaceVisibility: 'hidden' }}
            >
              {currentWord ? (
                <>
                  <span className="text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-500 mb-4 inline-block">
                    {currentWord.partOfSpeech}
                  </span>
                  <h2 className="text-3xl font-bold text-gray-800 mt-4">{currentWord.term}</h2>
                  <p className="text-sm text-gray-400 mt-6">
                    {t('pages.vocabulary.clickFlip')}
                  </p>
                </>
              ) : null}
            </div>
            {/* Back */}
            <div
              className="absolute inset-0 bg-primary-50 rounded-lg shadow-md p-8 text-center"
              style={{
                backfaceVisibility: 'hidden',
                transform: 'rotateY(180deg)',
              }}
            >
              {currentWord ? (
                <>
                  <h3 className="text-xl font-bold text-primary-800 mb-3">
                    {currentWord.term}
                  </h3>
                  <p className="text-gray-700 mb-4">{currentWord.definition}</p>
                  <p className="text-sm text-primary-600 italic">
                    « {currentWord.example} »
                  </p>
                </>
              ) : null}
            </div>
          </div>
        </button>
      </div>

      {/* Action buttons */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          type="button"
          onClick={markKnown}
          className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-5 rounded transition-colors"
        >
          {t('pages.vocabulary.markKnown')}
        </button>
        <button
          type="button"
          onClick={markReview}
          className="bg-orange-500 hover:bg-orange-600 text-white font-medium py-2 px-5 rounded transition-colors"
        >
          {t('pages.vocabulary.markReview')}
        </button>
      </div>

      {/* Word navigation */}
      <div className="flex items-center justify-center gap-2 flex-wrap">
        {list.words.map((word, i) => {
          const isCurrent = i === currentIndex
          const isSeen = seenWords.has(word.id)
          return (
            <button
              key={word.id}
              type="button"
              onClick={() => goToWord(i)}
              className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${
                isCurrent
                  ? 'bg-primary-700 text-white'
                  : isSeen
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {i + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}
