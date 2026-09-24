import { describe, expect, it } from 'vitest'
import { orderNovelReviewQueue } from '../novel-review-queue'

describe('orderNovelReviewQueue', () => {
  const now = Date.parse('2026-09-24T12:00:00.000Z')

  it('prioritizes overdue cards, then unseen words, then upcoming cards', () => {
    const words = [
      { word: 'demain' },
      { word: 'jamais' },
      { word: 'aujourd’hui' },
      { word: 'hier' },
    ]
    const progress = {
      demain: { next_review_at: '2026-09-25T12:00:00.000Z', repetition_count: 1 },
      jamais: { next_review_at: null, repetition_count: 0 },
      "aujourd'hui": { next_review_at: '2026-09-23T12:00:00.000Z', repetition_count: 2 },
      hier: { next_review_at: '2026-09-20T12:00:00.000Z', repetition_count: 1 },
    }

    expect(orderNovelReviewQueue(words, progress, now).map((word) => word.word)).toEqual([
      'hier',
      'aujourd’hui',
      'jamais',
      'demain',
    ])
  })

  it('deduplicates the same word regardless of case or apostrophe form', () => {
    const words = [{ word: 'Aujourd’hui' }, { word: "aujourd'hui" }, { word: 'demain' }]

    expect(orderNovelReviewQueue(words, {}, now).map((word) => word.word)).toEqual([
      'Aujourd’hui',
      'demain',
    ])
  })

  it('deduplicates inflected forms by canonical lemma and reads that lemma schedule', () => {
    const words = [
      { word: 'vais', lemma: 'aller' },
      { word: 'allons', lemma: 'aller' },
      { word: 'manger', lemma: 'manger' },
    ]
    const progress = {
      aller: { next_review_at: '2026-09-23T12:00:00.000Z', repetition_count: 2 },
    }

    expect(orderNovelReviewQueue(words, progress, now).map((word) => word.word)).toEqual([
      'vais',
      'manger',
    ])
  })

  it('keeps all words when no review schedule exists', () => {
    const words = [{ word: 'un' }, { word: 'deux' }]

    expect(orderNovelReviewQueue(words, {}, now)).toEqual(words)
  })
})
