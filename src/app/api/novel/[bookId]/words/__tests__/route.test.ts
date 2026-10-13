import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { GET } from '../route'

type Row = Record<string, string | number | boolean | null>
const state = vi.hoisted(() => ({ tables: {} as Record<string, Row[]>, batchSizes: [] as number[], failedTable: '' }))
vi.mock('@/lib/novel-permissions', () => ({ hasNovelAccess: async () => true }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'reader' } } }) } }),
  createAdminClient: async () => ({ from: (table: string) => new Query(table) }),
}))

// Model both a REST row cap and rejection of oversized URL filters.
class Query {
  filters: Array<(row: Row) => boolean> = []
  orders: string[] = []
  start = 0
  end = 499
  oversized = false
  constructor(private table: string) {}
  select() { return this }
  eq(key: string, value: string | number | boolean) { this.filters.push(row => row[key] === value); return this }
  in(key: string, values: string[]) {
    state.batchSizes.push(values.length)
    this.oversized = values.length > 80
    this.filters.push(row => values.includes(String(row[key])))
    return this
  }
  order(key: string) { this.orders.push(key); return this }
  range(start: number, end: number) { this.start = start; this.end = end; return this }
  then<TResult1 = { data: Row[] | null; error: { message: string } | null }, TResult2 = never>(
    onfulfilled?: ((value: { data: Row[] | null; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    const rows = (state.tables[this.table] || []).filter(row => this.filters.every(filter => filter(row)))
    rows.sort((a, b) => {
      for (const key of this.orders) {
        if (a[key] === b[key]) continue
        return (a[key] ?? '') < (b[key] ?? '') ? -1 : 1
      }
      return 0
    })
    const result = this.table === state.failedTable
      ? { data: null, error: { message: 'Database unavailable' } }
      : this.oversized
      ? { data: null, error: { message: 'Bad Request: filter URL too long' } }
      : { data: rows.slice(this.start, Math.min(this.end + 1, this.start + 500)), error: null }
    return Promise.resolve(result).then(onfulfilled, onrejected)
  }
}
const params = { params: Promise.resolve({ bookId: 'novel' }) }
function request(query = '') { return new NextRequest(`https://example.test/api/novel/novel/words${query}`) }

beforeEach(() => {
  state.tables = { novel_words: [], novel_lexicon: [], novel_word_progress: [] }
  state.batchSizes = []
  state.failedTable = ''
})

describe('novel review word API', () => {
  it('returns a failure rather than an empty queue when a lookup fails', async () => {
    state.tables.novel_words = [{ book_id: 'novel', word: 'bonjour', chapter_number: 1, order_index: 0 }]
    state.failedTable = 'novel_lexicon'
    const response = await GET(request(), params)
    expect(response.status).toBe(500)
    expect((await response.json()).data).toBeUndefined()
  })

  it('loads notebooks larger than one REST page without dropping saved words', async () => {
    const rows = Array.from({ length: 605 }, (_, i) => ({
      book_id: 'novel', user_id: 'reader', lemma: `mot-${String(i).padStart(4, '0')}`, in_notebook: true, next_review_at: null, repetition_count: 0,
    }))
    state.tables.novel_word_progress = rows
    state.tables.novel_words = rows.map((r, i) => ({ book_id: r.book_id, word: r.lemma, chapter_number: 1, order_index: i }))
    const response = await GET(request('?notebook=true'), params)
    expect(response.status).toBe(200)
    expect((await response.json()).data.words).toHaveLength(rows.length)
    expect(Math.max(...state.batchSizes)).toBeLessThanOrEqual(80)
  })

  it('loads the whole book and schedules without oversized URL filters or row truncation', async () => {
    const words = Array.from({ length: 1205 }, (_, i) => ({
      book_id: 'novel', word: `forme-${i}`, chapter_number: 1, order_index: i,
    }))
    state.tables.novel_words = words
    state.tables.novel_lexicon = words.map(w => ({ book_id: 'novel', form_key: w.word, lemma: `lemme-${w.order_index}` }))
    state.tables.novel_word_progress = words.map(w => ({
      book_id: 'novel', user_id: 'reader', lemma: `lemme-${w.order_index}`, next_review_at: '2099-01-01T00:00:00Z', repetition_count: 1,
    }))
    const response = await GET(request(), params)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.words).toHaveLength(words.length)
    expect(Object.keys(body.data.progress)).toHaveLength(words.length)
    expect(body.data.words.at(-1).lemma).toBe('lemme-1204')
    expect(Math.max(...state.batchSizes)).toBeLessThanOrEqual(80)
  })

  it('keeps notebook cards saved under a canonical lemma when the chapter uses an inflection', async () => {
    state.tables.novel_word_progress = [{ book_id: 'novel', user_id: 'reader', lemma: 'aller', in_notebook: true, next_review_at: null, repetition_count: 0 }]
    state.tables.novel_words = [{ book_id: 'novel', word: 'vais', chapter_number: 2, order_index: 0 }]
    state.tables.novel_lexicon = [{ book_id: 'novel', lemma: 'aller', display_form: 'vais', chapter_first: 2 }]
    const response = await GET(request('?notebook=true'), params)
    expect(response.status).toBe(200)
    const body = await response.json()
    expect(body.data.words).toHaveLength(1)
    expect(body.data.words[0].lemma).toBe('aller')
  })
})
