import { normForm } from '@/lib/novel-forms'

export interface NovelReviewSchedule {
  next_review_at: string | null
  repetition_count: number
}

/** Keep every eligible word, but put overdue cards first and scheduled future cards last. */
export function orderNovelReviewQueue<T extends { word: string }>(
  words: T[],
  progress: Record<string, NovelReviewSchedule>,
  now = Date.now()
): T[] {
  const seen = new Set<string>()
  const uniqueWords = words.filter((word) => {
    const key = normForm('lemma' in word && typeof word.lemma === 'string' ? word.lemma : word.word)
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })

  const getSchedule = (word: T): NovelReviewSchedule | undefined =>
    progress[normForm('lemma' in word && typeof word.lemma === 'string' ? word.lemma : word.word)]

  const getPriority = (word: T): { group: number; timestamp: number; word: T } => {
    const schedule = getSchedule(word)
    const timestamp = schedule?.next_review_at
      ? Date.parse(schedule.next_review_at)
      : Number.NaN

    if (Number.isFinite(timestamp) && timestamp <= now) {
      return { group: 0, timestamp, word }
    }
    if (!Number.isFinite(timestamp)) {
      return { group: 1, timestamp: 0, word }
    }
    return { group: 2, timestamp, word }
  }

  return uniqueWords
    .map((word, originalIndex) => ({ ...getPriority(word), originalIndex }))
    .sort((a, b) => {
      if (a.group !== b.group) return a.group - b.group
      if (a.group !== 1 && a.timestamp !== b.timestamp) return a.timestamp - b.timestamp
      return a.originalIndex - b.originalIndex
    })
    .map(({ word }) => word)
}
