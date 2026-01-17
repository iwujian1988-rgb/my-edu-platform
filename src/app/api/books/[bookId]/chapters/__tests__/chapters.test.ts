/**
 * 章节管理 API 测试套件
 * 测试范围：GET /api/books/[bookId]/chapters (list), POST /api/books/[bookId]/chapters (create)
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, GET } from '../route'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getCurrentUser: vi.fn(),
}))

describe('Chapter Management API', () => {
  const mockUser = {
    id: 'test-user-id',
    email: 'test@example.com',
  }

  const mockBook = {
    id: 'test-book-id',
    created_by: 'test-user-id',
    is_official: false,
  }

  // 创建完整的mock对象，支持链式调用
  const createMockSupabase = () => {
    const createQueryBuilder = () => {
      const query: any = {
        from: vi.fn(() => query),
        select: vi.fn(() => query),
        insert: vi.fn(() => query),
        update: vi.fn(() => query),
        delete: vi.fn(() => query),
        eq: vi.fn(() => query),
        in: vi.fn(() => query),
        neq: vi.fn(() => query),
        order: vi.fn(() => query),
        limit: vi.fn(() => query),
        gte: vi.fn(() => query),
        range: vi.fn(() => query),
        single: vi.fn(),
        maybeSingle: vi.fn(),
      }
      return query
    }

    const supabase: any = createQueryBuilder()
    supabase.auth = {
      getUser: vi.fn(),
      admin: { deleteUser: vi.fn() },
    }
    return supabase
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('GET /api/books/[bookId]/chapters - 获取章节列表', () => {
    it('应该成功获取章节列表（不包含单词数）', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const mockChapters = [
        { id: 'ch-1', title: 'Chapter 1', order_index: 1, book_id: 'test-book-id' },
        { id: 'ch-2', title: 'Chapter 2', order_index: 2, book_id: 'test-book-id' },
      ]

      // Mock book check
      mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })

      // Mock chapters query - from().select().eq().order()
      mockSupabase.from.mockReturnValueOnce({
        select: vi.fn().mockReturnValueOnce({
          eq: vi.fn().mockReturnValueOnce({
            order: vi.fn().mockResolvedValueOnce({ data: mockChapters, error: null })
          })
        })
      } as any)

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters')
      const response = await GET(request, { params: { bookId: 'test-book-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toEqual(mockChapters)
    })

    it('应该成功获取章节列表（包含单词数统计）', async () => {
      const mockChapters = [
        { id: 'ch-1', title: 'Chapter 1', order_index: 1 },
        { id: 'ch-2', title: 'Chapter 2', order_index: 2 },
      ]

      // Book check chain
      const bookCheckChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockBook, error: null })
            })
          })
        })
      }

      // Chapters query chain
      const chaptersQueryChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: mockChapters, error: null })
            })
          })
        })
      }

      // Words count query chains (one for each chapter)
      const wordsCountChain1 = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 50, error: null })
          })
        })
      }

      const wordsCountChain2 = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ count: 30, error: null })
          })
        })
      }

      // Mock createClient to return different chains for each call
      vi.mocked(createClient)
        .mockResolvedValueOnce(bookCheckChain as any)
        .mockResolvedValueOnce(chaptersQueryChain as any)
        .mockResolvedValueOnce(wordsCountChain1 as any)
        .mockResolvedValueOnce(wordsCountChain2 as any)

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters?includeWordCount=true')
      const response = await GET(request, { params: { bookId: 'test-book-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data).toBeDefined()
      expect(data.data).toHaveLength(2)
      expect(data.data[0]).toHaveProperty('word_count', 50)
      expect(data.data[1]).toHaveProperty('word_count', 30)
    })

    it('应该返回401当用户未认证', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters')
      const response = await GET(request, { params: { bookId: 'test-book-id' } })

      expect(response.status).toBe(401)
    })

    it('应该返回404当词库不存在', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      mockSupabase.single.mockResolvedValueOnce({ data: null, error: { message: 'Not found' } })

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters')
      const response = await GET(request, { params: { bookId: 'test-book-id' } })

      expect(response.status).toBe(404)
    })

    it('应该返回403当用户无权限', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const otherBook = { ...mockBook, created_by: 'other-user-id', is_official: false }
      // Mock book check
      mockSupabase.single.mockResolvedValueOnce({ data: otherBook, error: null })
      // Mock chapters query (虽然应该返回403，但可能继续执行)
      mockSupabase.order.mockReturnValueOnce({
        data: [],
        error: null
      })

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters')
      const response = await GET(request, { params: { bookId: 'test-book-id' } })

      expect(response.status).toBe(403)
    })
  })

  describe('POST /api/books/[bookId]/chapters - 创建章节', () => {
    it('应该成功创建新章节', async () => {
      // Create separate mock chains for each query
      const bookCheckChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockBook, error: null })
            })
          })
        })
      }

      const duplicateCheckChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      }

      const maxOrderChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: null, error: null }) // No existing chapters
                })
              })
            })
          })
        })
      }

      const insertChain = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'ch-new', title: 'New Chapter', order_index: 1, book_id: 'test-book-id' },
                error: null
              })
            })
          })
        })
      }

      // Mock createClient to return different chains for each call
      vi.mocked(createClient)
        .mockResolvedValueOnce(bookCheckChain as any)
        .mockResolvedValueOnce(duplicateCheckChain as any)
        .mockResolvedValueOnce(maxOrderChain as any)
        .mockResolvedValueOnce(insertChain as any)

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters', {
        method: 'POST',
        body: JSON.stringify({ title: 'New Chapter' }),
      })

      const response = await POST(request, { params: { bookId: 'test-book-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveProperty('id', 'ch-new')
      expect(data.data).toHaveProperty('title', 'New Chapter')
    })

    it('应该自动计算order_index（添加到最后）', async () => {
      const bookCheckChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockBook, error: null })
            })
          })
        })
      }

      const duplicateCheckChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null })
              })
            })
          })
        })
      }

      const maxOrderChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              order: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: { order_index: 2 }, error: null }) // Max order is 2
                })
              })
            })
          })
        })
      }

      const insertChain = {
        from: vi.fn().mockReturnValue({
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'ch-new', title: 'New', order_index: 3, book_id: 'test-book-id' },
                error: null
              })
            })
          })
        })
      }

      vi.mocked(createClient)
        .mockResolvedValueOnce(bookCheckChain as any)
        .mockResolvedValueOnce(duplicateCheckChain as any)
        .mockResolvedValueOnce(maxOrderChain as any)
        .mockResolvedValueOnce(insertChain as any)

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters', {
        method: 'POST',
        body: JSON.stringify({ title: 'New' }),
      })

      const response = await POST(request, { params: { bookId: 'test-book-id' } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.order_index).toBe(3)
    })

    it('应该拒绝创建重复标题的章节', async () => {
      const bookCheckChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: mockBook, error: null })
            })
          })
        })
      }

      const duplicateCheckChain = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: { title: 'Duplicate Chapter' }, error: null })
              })
            })
          })
        })
      }

      vi.mocked(createClient)
        .mockResolvedValueOnce(bookCheckChain as any)
        .mockResolvedValueOnce(duplicateCheckChain as any)

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters', {
        method: 'POST',
        body: JSON.stringify({ title: 'Duplicate Chapter' }),
      })

      const response = await POST(request, { params: { bookId: 'test-book-id' } })

      expect(response.status).toBe(400)
      const data = await response.json()
      expect(data.error).toContain('已存在')
    })

    it('应该验证标题长度（1-50字符）', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })

      // Test empty title
      const request1 = new Request('http://localhost:3000/api/books/test-book-id/chapters', {
        method: 'POST',
        body: JSON.stringify({ title: '' }),
      })

      const response1 = await POST(request1, { params: { bookId: 'test-book-id' } })
      expect(response1.status).toBe(400)

      // Test title too long
      mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
      const request2 = new Request('http://localhost:3000/api/books/test-book-id/chapters', {
        method: 'POST',
        body: JSON.stringify({ title: 'a'.repeat(51) }),
      })

      const response2 = await POST(request2, { params: { bookId: 'test-book-id' } })
      expect(response2.status).toBe(400)
    })

    it('应该返回401当用户未认证', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      })

      const response = await POST(request, { params: { bookId: 'test-book-id' } })

      expect(response.status).toBe(401)
    })

    it('应该返回403当用户无权限', async () => {
      const mockSupabase = createMockSupabase()
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

      const otherBook = { ...mockBook, created_by: 'other-user-id' }

      // Mock book check - 权限验证
      mockSupabase.single.mockResolvedValueOnce({ data: otherBook, error: null })

      // Mock duplicate title check
      mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

      const request = new Request('http://localhost:3000/api/books/test-book-id/chapters', {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      })

      const response = await POST(request, { params: { bookId: 'test-book-id' } })

      expect(response.status).toBe(403)
    })
  })
})
