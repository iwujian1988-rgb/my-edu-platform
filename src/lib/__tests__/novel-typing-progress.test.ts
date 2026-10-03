import { beforeEach, describe, expect, it, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/novel/[bookId]/progress/route'

const mocks = vi.hoisted(() => ({
  current: null as null | { id: string; repetition_count: number; easiness_factor: number; next_review_at: string | null },
  entry: { lemma: 'taxi' } as { lemma: string } | null,
  upsert: vi.fn(async () => ({ error: null })),
  access: vi.fn(async () => true),
}))
vi.mock('@/lib/novel-permissions', () => ({ hasNovelAccess: mocks.access }))
vi.mock('@/lib/learning-calendar', () => ({ updateLearningCalendar: vi.fn(async () => ({ success: true })) }))
vi.mock('@/lib/supabase/server', () => ({
  createClient: async () => ({ auth: { getUser: async () => ({ data: { user: { id: 'user-test' } } }) } }),
  createAdminClient: async () => ({ from: (table: string) => {
    const query = {
      select: () => query, eq: () => query, limit: () => query,
      maybeSingle: async () => ({ data: table === 'novel_lexicon' ? mocks.entry : table === 'novel_word_progress' ? mocks.current : null, error: null }),
      upsert: mocks.upsert,
    }
    return query
  } }),
}))

async function submit(quality: number) {
  return POST(new NextRequest('http://localhost/api/novel/book-test/progress', {
    method: 'POST', body: JSON.stringify({ action: 'typing', lemma: 'le taxi', quality }),
  }), { params: Promise.resolve({ bookId: 'book-test' }) })
}

beforeEach(() => {
  mocks.current = null; mocks.entry = { lemma: 'taxi' }; mocks.upsert.mockClear(); mocks.access.mockResolvedValue(true)
})
describe('novel typing progress', () => {
  it('records first success as consolidation, not known', async () => {
    expect((await submit(3)).status).toBe(200)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ lemma: 'taxi', status: 'vague', repetition_count: 1 }), expect.anything())
  })
  it('assisted success cannot increase successful repetitions', async () => {
    mocks.current = { id: 'p', repetition_count: 1, easiness_factor: 2.5, next_review_at: null }
    await submit(2)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'vague', repetition_count: 1 }), expect.anything())
  })
  it('a second due independent recall can become known', async () => {
    mocks.current = { id: 'p', repetition_count: 1, easiness_factor: 2.5, next_review_at: '2020-01-01T00:00:00Z' }
    await submit(3)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'known', repetition_count: 2 }), expect.anything())
  })
  it('early retries cannot advance the schedule', async () => {
    mocks.current = { id: 'p', repetition_count: 1, easiness_factor: 2.5, next_review_at: '2099-01-01T00:00:00Z' }
    expect((await submit(3)).status).toBe(200)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it('forgotten words reset successful repetitions', async () => {
    mocks.current = { id: 'p', repetition_count: 4, easiness_factor: 2.5, next_review_at: null }
    await submit(1)
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ status: 'unknown', repetition_count: 0 }), expect.anything())
  })
  it('rejects words not belonging to the book', async () => {
    mocks.entry = null
    expect((await submit(3)).status).toBe(400)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
  it('retains access and quality validation', async () => {
    expect((await submit(9)).status).toBe(400)
    mocks.access.mockResolvedValue(false)
    expect((await submit(3)).status).toBe(404)
    expect(mocks.upsert).not.toHaveBeenCalled()
  })
})
