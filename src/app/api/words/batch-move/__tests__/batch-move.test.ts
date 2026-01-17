/**
 * 批量移动单词 API 测试套件
 * 测试范围：POST /api/words/batch-move
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '../route'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getCurrentUser: vi.fn(),
}))

describe('Batch Move Words API', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockWords = [
    { id: 'word-1', book_id: 'book-1', chapter_id: 'chapter-1' },
    { id: 'word-2', book_id: 'book-1', chapter_id: 'chapter-1' },
    { id: 'word-3', book_id: 'book-1', chapter_id: 'chapter-2' },
  ]

  const mockTargetChapter = {
    id: 'chapter-target',
    book_id: 'book-1',
    title: 'Target Chapter',
  }

  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    in: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
    maybeSingle: vi.fn(() => mockSupabase),
    limit: vi.fn(() => mockSupabase),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/words/batch-move - 批量移动单词', () => {
    it('应该成功批量移动单词到目标章节', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({ data: { id: 'book-1', created_by: 'test-user-id' }, error: null }) // Book permission
        .mockResolvedValueOnce({ data: mockTargetChapter, error: null }) // Target chapter
        .mockResolvedValueOnce({ data: { title: 'Target Chapter' }, error: null }) // Chapter title fetch

      mockSupabase.update = vi.fn(() => mockSupabase)
      mockSupabase.select = vi.fn(() => mockSupabase)

      // Mock word count queries
      mockSupabase.eq = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Update result

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1', 'word-2', 'word-3'],
          targetChapterId: 'chapter-target',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.moved).toBe(3)
      expect(data.data.message).toContain('Target Chapter')
    })

    it('应该成功移动单词到默认章节（null）', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({ data: { id: 'book-1', created_by: 'test-user-id' }, error: null }) // Book permission

      mockSupabase.update = vi.fn(() => mockSupabase)
      mockSupabase.select = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn().mockResolvedValueOnce({ data: mockWords, error: null }) // Update result

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1', 'word-2'],
          targetChapterId: null,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.message).toContain('默认章节')
    })

    it('应该拒绝移动来自不同词库的单词', async () => {
      const mixedBookWords = [
        { id: 'word-1', book_id: 'book-1', chapter_id: 'chapter-1' },
        { id: 'word-2', book_id: 'book-2', chapter_id: 'chapter-2' },
      ]

      mockSupabase.in = vi.fn(() => mockSupabase)
      mockSupabase.single = vi.fn().mockResolvedValueOnce({ data: mixedBookWords, error: null })

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1', 'word-2'],
          targetChapterId: 'chapter-target',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('所有单词必须属于同一词库')
    })

    it('应该返回400当wordIds不是数组或为空', async () => {
      // Empty array
      const request1 = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({ wordIds: [], targetChapterId: 'chapter-target' }),
      })
      const response1 = await POST(request1)
      expect(response1.status).toBe(400)

      // Not an array
      const request2 = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({ wordIds: 'not-array', targetChapterId: 'chapter-target' }),
      })
      const response2 = await POST(request2)
      expect(response2.status).toBe(400)
    })

    it('应该限制每次最多移动100个单词', async () => {
      const wordIds = Array.from({ length: 101 }, (_, i) => `word-${i}`)

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({ wordIds, targetChapterId: 'chapter-target' }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('每次最多移动100个单词')
      expect(data.limit).toBe(100)
    })

    it('应该返回404当单词不存在', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)
      mockSupabase.single = vi.fn().mockResolvedValueOnce({ data: [], error: null })

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['non-existent-word'],
          targetChapterId: 'chapter-target',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('应该拒绝移动其他用户词库的单词', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({
          data: { id: 'book-1', created_by: 'other-user-id' },
          error: null,
        }) // Not owner

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1', 'word-2'],
          targetChapterId: 'chapter-target',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('应该返回404当目标章节不存在', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({
          data: { id: 'book-1', created_by: 'test-user-id' },
          error: null,
        }) // Book permission
        .mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }) // Target chapter not found

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1', 'word-2'],
          targetChapterId: 'non-existent-chapter',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('应该拒绝移动到不同词库的章节', async () => {
      const otherBookChapter = {
        id: 'chapter-other',
        book_id: 'book-2', // Different book
        title: 'Other Book Chapter',
      }

      mockSupabase.in = vi.fn(() => mockSupabase)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words (book-1)
        .mockResolvedValueOnce({
          data: { id: 'book-1', created_by: 'test-user-id' },
          error: null,
        }) // Book permission
        .mockResolvedValueOnce({ data: otherBookChapter, error: null }) // Target chapter (book-2)

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1', 'word-2'],
          targetChapterId: 'chapter-other',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('应该更新源章节和目标章节的单词计数', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)

      mockSupabase.update = vi.fn(() => mockSupabase)
      mockSupabase.select = vi.fn(() => mockSupabase)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({
          data: { id: 'book-1', created_by: 'test-user-id' },
          error: null,
        }) // Book permission
        .mockResolvedValueOnce({ data: mockTargetChapter, error: null }) // Target chapter
        .mockResolvedValueOnce({ data: { title: 'Target Chapter' }, error: null }) // Chapter title

      // Mock chapter word count updates
      let chapterCount = 0
      mockSupabase.eq = vi.fn()
        .mockImplementationOnce(() => {
          return mockSupabase
        })
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Update words
        .mockImplementationOnce(() => mockSupabase) // Count query
        .mockResolvedValueOnce({ count: 5, error: null }) // Chapter count result
        .mockImplementationOnce(() => mockSupabase) // Update chapter
        .mockResolvedValueOnce({ data: null, error: null })

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1', 'word-2'],
          targetChapterId: 'chapter-target',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)
      expect(mockSupabase.from).toHaveBeenCalledWith('chapters')
    })

    it('应该返回401当用户未认证', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1'],
          targetChapterId: 'chapter-target',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('应该处理全有或全无事务（all-or-nothing）', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)

      mockSupabase.update = vi.fn(() => mockSupabase)
      mockSupabase.select = vi.fn(() => mockSupabase)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({
          data: { id: 'book-1', created_by: 'test-user-id' },
          error: null,
        }) // Book permission
        .mockResolvedValueOnce({ data: mockTargetChapter, error: null }) // Target chapter
        .mockResolvedValueOnce({ data: { title: 'Target Chapter' }, error: null })

      // Simulate update failure
      mockSupabase.eq = vi.fn().mockResolvedValueOnce({
        data: null,
        error: { message: 'Update failed' },
      })

      const request = new Request('http://localhost:3000/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: ['word-1', 'word-2', 'word-3'],
          targetChapterId: 'chapter-target',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(500)
    })
  })
})
