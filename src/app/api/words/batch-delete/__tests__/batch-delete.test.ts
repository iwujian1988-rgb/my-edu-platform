/**
 * 批量删除单词 API 测试套件
 * 测试范围：POST /api/words/batch-delete
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

describe('Batch Delete Words API', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockWords = [
    { id: 'word-1', book_id: 'book-1', chapter_id: 'chapter-1' },
    { id: 'word-2', book_id: 'book-1', chapter_id: 'chapter-1' },
    { id: 'word-3', book_id: 'book-1', chapter_id: 'chapter-2' },
  ]

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

  describe('POST /api/words/batch-delete - 批量删除单词', () => {
    it('应该成功批量删除多个单词', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)
      mockSupabase.delete = vi.fn(() => mockSupabase)

      // Mock successful deletions
      mockSupabase.eq = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({ data: [{ id: 'book-1', created_by: 'test-user-id' }], error: null }) // Book permissions
        .mockResolvedValueOnce({ error: null }) // Delete word-1
        .mockResolvedValueOnce({ error: null }) // Delete word-2
        .mockResolvedValueOnce({ error: null }) // Delete word-3

      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1', 'word-2', 'word-3'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toBe(3)
      expect(data.data.failed).toBe(0)
    })

    it('应该支持部分成功场景', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)

      // Mock mixed success/failure
      mockSupabase.eq = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({ data: [{ id: 'book-1', created_by: 'test-user-id' }], error: null }) // Book permissions
        .mockResolvedValueOnce({ error: null }) // Delete word-1 (success)
        .mockResolvedValueOnce({ error: { message: 'Delete failed' } }) // Delete word-2 (failed)
        .mockResolvedValueOnce({ error: null }) // Delete word-3 (success)

      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1', 'word-2', 'word-3'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.deleted).toBe(2)
      expect(data.data.failed).toBe(1)
      expect(data.data.errors).toHaveLength(1)
    })

    it('应该返回400当wordIds不是数组', async () => {
      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: 'not-an-array' }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('应该返回400当wordIds为空数组', async () => {
      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: [] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('应该限制每次最多删除100个单词', async () => {
      const wordIds = Array.from({ length: 101 }, (_, i) => `word-${i}`)

      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('每次最多删除100个单词')
      expect(data.limit).toBe(100)
    })

    it('应该返回404当单词不存在', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn().mockResolvedValue({ data: [], error: null }) // No words found

      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['non-existent-word'] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })

    it('应该拒绝删除其他用户的单词', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({ data: [{ id: 'book-1', created_by: 'other-user-id' }], error: null }) // Not owner

      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1', 'word-2'] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('应该支持删除来自不同词库的单词（如果是同一用户）', async () => {
      const mixedWords = [
        { id: 'word-1', book_id: 'book-1', chapter_id: 'chapter-1' },
        { id: 'word-2', book_id: 'book-2', chapter_id: 'chapter-2' },
      ]

      mockSupabase.in = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn()
        .mockResolvedValueOnce({ data: mixedWords, error: null }) // Fetch words
        .mockResolvedValueOnce({
          data: [
            { id: 'book-1', created_by: 'test-user-id' },
            { id: 'book-2', created_by: 'test-user-id' },
          ],
          error: null,
        }) // Both books owned by user
        .mockResolvedValueOnce({ error: null }) // Delete word-1
        .mockResolvedValueOnce({ error: null }) // Delete word-2

      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1', 'word-2'] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.deleted).toBe(2)
    })

    it('应该异步更新词库统计（不阻塞响应）', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn()
        .mockResolvedValueOnce({ data: mockWords, error: null }) // Fetch words
        .mockResolvedValueOnce({ data: [{ id: 'book-1', created_by: 'test-user-id' }], error: null }) // Book permissions
        .mockResolvedValueOnce({ error: null }) // Delete word-1

      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1'] }),
      })

      const startTime = Date.now()
      const response = await POST(request)
      const endTime = Date.now()

      // Response should be fast (async stats update)
      expect(endTime - startTime).toBeLessThan(100)
      expect(response.status).toBe(200)
    })

    it('应该返回401当用户未认证', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1'] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('应该幂等（重复删除不会报错）', async () => {
      mockSupabase.in = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn()
        .mockResolvedValueOnce({ data: mockWords.slice(0, 1), error: null }) // Fetch words
        .mockResolvedValueOnce({ data: [{ id: 'book-1', created_by: 'test-user-id' }], error: null })
        .mockResolvedValueOnce({ error: null }) // Delete succeeds

      // First deletion
      const request1 = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1'] }),
      })
      const response1 = await POST(request1)

      // Second deletion (same word)
      const request2 = new Request('http://localhost:3000/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1'] }),
      })
      const response2 = await POST(request2)

      expect(response1.status).toBe(200)
      // Second request might get 404 (word already deleted) or 200 (success)
      expect([200, 404]).toContain(response2.status)
    })
  })
})
