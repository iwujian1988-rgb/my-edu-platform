/**
 * 智能导入 API 测试套件
 * 测试范围：POST /api/smart-import (import), GET (quota)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, GET } from '../route'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'
import { getCachedWordData, cacheWordData, isRedisAvailable } from '@/lib/utils/cache'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getCurrentUser: vi.fn(),
}))

vi.mock('@/lib/utils/cache', () => ({
  getCachedWordData: vi.fn(),
  cacheWordData: vi.fn(),
  isRedisAvailable: vi.fn(),
}))

// Mock fetch for Youdao API
global.fetch = vi.fn()

describe('Smart Import API', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockBook = {
    id: 'test-book-id',
    created_by: 'test-user-id',
    is_official: false,
    total_words: 10,
    total_chapters: 1,
  }

  const mockChapter = {
    id: 'test-chapter-id',
    title: 'Test Chapter',
    book_id: 'test-book-id',
  }

  const mockYoudaoResponse = {
    simple: {
      word: [
        {
          ukphone: '/ˈtest/',
          usphone: '/ˈtest/',
          phone: '/ˈtest/',
        },
      ],
    },
    ec: {
      word: [
        {
          trs: [
            {
              tr: [
                {
                  l: {
                    i: ['测试'],
                  },
                },
              ],
            },
          ],
        },
      ],
    },
    ee: {
      word: [
        {
          trs: [
            {
              tr: [
                {
                  l: {
                    i: 'a examination or trial',
                  },
                },
              ],
            },
          ],
        },
      ],
    },
  }

  const mockSupabase = {
    from: vi.fn(() => mockSupabase),
    select: vi.fn(() => mockSupabase),
    insert: vi.fn(() => mockSupabase),
    update: vi.fn(() => mockSupabase),
    delete: vi.fn(() => mockSupabase),
    eq: vi.fn(() => mockSupabase),
    order: vi.fn(() => mockSupabase),
    single: vi.fn(() => mockSupabase),
    maybeSingle: vi.fn(() => mockSupabase),
    limit: vi.fn(() => mockSupabase),
    rpc: vi.fn(() => mockSupabase),
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
    vi.mocked(isRedisAvailable).mockResolvedValue(false)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/smart-import - 智能导入单词', () => {
    it('应该成功导入单词（不使用缓存）', async () => {
      vi.mocked(isRedisAvailable).mockResolvedValue(false)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockYoudaoResponse,
      } as Response)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockBook, error: null }) // Book check
        .mockResolvedValueOnce({ data: null, error: null }) // Chapter not specified
        .mockResolvedValueOnce({ data: null, error: null }) // No existing chapter
        .mockResolvedValueOnce({ data: mockChapter, error: null }) // Created chapter
        .mockResolvedValueOnce({ data: mockChapter, error: null }) // Chapter title fetch

      mockSupabase.insert = vi.fn(() => mockSupabase)
      mockSupabase.order = vi.fn(() => mockSupabase)
      mockSupabase.update = vi.fn(() => mockSupabase)

      mockSupabase.eq = vi.fn()
        .mockResolvedValueOnce({ data: null, error: null }) // Insert words
        .mockResolvedValueOnce({ data: null, error: null }) // Update book
        .mockResolvedValueOnce({ data: null, error: null }) // Upsert quota

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test'],
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.imported).toBe(1)
    })

    it('应该使用Redis缓存（如果可用）', async () => {
      vi.mocked(isRedisAvailable).mockResolvedValue(true)
      vi.mocked(getCachedWordData).mockResolvedValue({
        word: 'test',
        phonetic: 'ˈtest',
        uk_phonetic: 'ˈtest',
        us_phonetic: 'ˈtest',
        definition: '测试',
        definition_en: 'a examination',
        collocation: '',
        collocation_en: '',
        example_sentence: '',
        example_sentence_en: '',
        part_of_speech: 'n.',
        success: true,
      })

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockBook, error: null })
        .mockResolvedValueOnce({ data: mockChapter, error: null }) // Chapter specified
        .mockResolvedValueOnce({ data: mockChapter, error: null }) // Chapter title fetch

      mockSupabase.insert = vi.fn(() => mockSupabase)
      mockSupabase.update = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn().mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test'],
          bookId: 'test-book-id',
          chapterId: 'test-chapter-id',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(getCachedWordData).toHaveBeenCalledWith('test')
      expect(fetch).not.toHaveBeenCalled() // Should not call API if cache hit
    })

    it('应该支持指定目标章节', async () => {
      vi.mocked(isRedisAvailable).mockResolvedValue(false)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockYoudaoResponse,
      } as Response)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockBook, error: null })
        .mockResolvedValueOnce({ data: mockChapter, error: null }) // Target chapter exists
        .mockResolvedValueOnce({ data: mockChapter, error: null })

      mockSupabase.insert = vi.fn(() => mockSupabase)
      mockSupabase.update = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn().mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test'],
          bookId: 'test-book-id',
          chapterId: 'test-chapter-id', // Explicit chapter
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.chapterId).toBe('test-chapter-id')
    })

    it('应该自动创建默认章节（如果未指定）', async () => {
      vi.mocked(isRedisAvailable).mockResolvedValue(false)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockYoudaoResponse,
      } as Response)

      mockSupabase.order = vi.fn(() => mockSupabase)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockBook, error: null })
        .mockResolvedValueOnce({ data: null, error: null }) // No existing chapter
        .mockResolvedValueOnce({ data: mockChapter, error: null }) // Created default chapter
        .mockResolvedValueOnce({ data: mockChapter, error: null })

      mockSupabase.insert = vi.fn(() => mockSupabase)
      mockSupabase.update = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn().mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test'],
          bookId: 'test-book-id',
          // No chapterId provided
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(mockSupabase.insert).toHaveBeenCalledWith(
        expect.objectContaining({
          title: '默认章节',
          is_default: true,
        })
      )
    })

    it('应该验证并去重单词列表', async () => {
      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test', 'test', 'test'], // Duplicates
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('单词列表包含重复')
    })

    it('应该限制每次最多导入100个单词', async () => {
      const words = Array.from({ length: 101 }, (_, i) => `word${i}`)

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words,
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('每次最多导入100个单词')
    })

    it('应该验证单词格式（只允许字母和连字符）', async () => {
      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test123', 'valid-word', 'hello@world'], // Invalid formats
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('单词格式不正确')
    })

    it('应该拒绝导入官方词库', async () => {
      const officialBook = { ...mockBook, is_official: true }

      mockSupabase.single = vi.fn().mockResolvedValueOnce({ data: officialBook, error: null })

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test'],
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('应该拒绝非词库创建者导入', async () => {
      const otherBook = { ...mockBook, created_by: 'other-user-id' }

      mockSupabase.single = vi.fn().mockResolvedValueOnce({ data: otherBook, error: null })

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test'],
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(403)
    })

    it('应该检查每日配额限制（500词/天）', async () => {
      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockBook, error: null })
        .mockResolvedValueOnce({
          data: { count: 450 }, // Already used 450
          error: null,
        })

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: Array.from({ length: 60 }, (_, i) => `word${i}`), // Try to import 60 more
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(429)
      expect(data.error).toContain('超过每日配额限制')
    })

    it('应该更新每日配额使用量', async () => {
      vi.mocked(isRedisAvailable).mockResolvedValue(false)
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
        json: async () => mockYoudaoResponse,
      } as Response)

      mockSupabase.single = vi.fn()
        .mockResolvedValueOnce({ data: mockBook, error: null })
        .mockResolvedValueOnce({ data: { count: 10, quota_date: '2026-01-15' }, error: null })
        .mockResolvedValueOnce({ data: null, error: null })
        .mockResolvedValueOnce({ data: mockChapter, error: null })
        .mockResolvedValueOnce({ data: mockChapter, error: null })

      mockSupabase.insert = vi.fn(() => mockSupabase)
      mockSupabase.update = vi.fn(() => mockSupabase)
      mockSupabase.eq = vi.fn().mockResolvedValue({ data: null, error: null })

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test'],
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.remaining).toBe(489) // 500 - 10 - 1
    })

    it('应该返回401当用户未认证', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/smart-import', {
        method: 'POST',
        body: JSON.stringify({
          words: ['test'],
          bookId: 'test-book-id',
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })
  })

  describe('GET /api/smart-import - 获取今日配额', () => {
    it('应该返回今日配额使用情况', async () => {
      mockSupabase.single = vi.fn().mockResolvedValue({
        data: { count: 50 },
        error: null,
      })

      const request = new Request('http://localhost:3000/api/smart-import')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.used).toBe(50)
      expect(data.remaining).toBe(450)
      expect(data.limit).toBe(500)
    })

    it('应该返回0当今日未使用配额', async () => {
      mockSupabase.single = vi.fn().mockResolvedValue({
        data: null,
        error: null,
      })

      const request = new Request('http://localhost:3000/api/smart-import')
      const response = await GET(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.used).toBe(0)
      expect(data.remaining).toBe(500)
    })

    it('应该返回401当用户未认证', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/smart-import')
      const response = await GET(request)

      expect(response.status).toBe(401)
    })
  })
})
