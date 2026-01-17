/**
 * 批量删除单词API边界值和逻辑分支全覆盖测试
 * 测试范围：POST /api/words/batch-delete
 *
 * 测试策略：
 * 1. Happy Path：正常业务流程
 * 2. 边界值轰炸：wordIds数量边界、空数组、超长数组、混合权限
 * 3. 逻辑分支覆盖：所有if/else、try/catch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST } from '../route'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getCurrentUser: vi.fn(),
}))

describe('Batch Delete Words API - Boundary and Branch Coverage', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' }
  const mockBook = {
    id: 'test-book-id',
    created_by: 'test-user-id',
  }

  // Helper function to create mock Supabase client for batch-delete
  const createMockSupabaseForBatchDelete = (words: any[], books: any[] = [{ id: 'test-book-id', created_by: 'test-user-id' }]) => {
    return {
      from: vi.fn((table: string) => {
        const chain: any = {
          select: vi.fn(() => chain),
          insert: vi.fn(() => chain),
          update: vi.fn(() => chain),
          delete: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn((column: string) => {
            if (table === 'words') {
              return Promise.resolve({ data: words, error: null })
            }
            if (table === 'books') {
              return Promise.resolve({ data: books, error: null })
            }
            return Promise.resolve({ data: [], error: null })
          }),
          maybeSingle: vi.fn(),
          single: vi.fn(),
        }
        return chain
      }),
    }
  }

  const createMockSupabase = () => {
    // Create a smarter mock that handles all query patterns
    const createChain = () => {
      const chain: any = {
        from: vi.fn(() => chain),
        select: vi.fn((fields?: string | object) => {
          // Handle count queries: .select('*', { count: 'exact', head: true })
          if (typeof fields === 'object' && fields?.count) {
            const selectChain: any = {
              eq: vi.fn(() => Promise.resolve({ count: 5, error: null })),
            }
            return selectChain
          }
          return chain
        }),
        insert: vi.fn(() => chain),
        update: vi.fn(() => {
          const updateChain: any = {
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          }
          return updateChain
        }),
        delete: vi.fn(() => {
          const deleteChain: any = {
            eq: vi.fn(() => Promise.resolve({ data: null, error: null })),
          }
          return deleteChain
        }),
        eq: vi.fn(() => chain),
        in: vi.fn(() => chain),
        maybeSingle: vi.fn(),
        single: vi.fn(),
      }
      return chain
    }

    return createChain()
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/words/batch-delete - 批量删除单词', () => {
    // ============ Happy Path Tests ============
    describe('Happy Path - 正常业务流程', () => {
      it('应该成功删除单个单词', async () => {
        const mockWords = [
          { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
        ]

        const mockBooks = [
          { id: 'test-book-id', created_by: 'test-user-id' },
        ]

        // Mock createClient to return the same instance for all calls in one request
        const mockSupabase = {
          from: vi.fn((table: string) => {
            const chain: any = {
              select: vi.fn(() => chain),
              insert: vi.fn(() => chain),
              update: vi.fn(() => chain),
              delete: vi.fn(() => chain),
              eq: vi.fn(() => chain),
              in: vi.fn((column: string) => {
                if (table === 'words') {
                  return Promise.resolve({ data: mockWords, error: null })
                }
                if (table === 'books') {
                  return Promise.resolve({ data: mockBooks, error: null })
                }
                return Promise.resolve({ data: [], error: null })
              }),
            }
            return chain
          }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const request = new Request('http://localhost:3000/api/words/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ wordIds: ['word-1'] }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.data.deleted).toBe(1)
      })

      it('应该成功删除多个单词', async () => {
        const mockWords = [
          { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          { id: 'word-2', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          { id: 'word-3', book_id: 'test-book-id', chapter_id: 'chapter-1' },
        ]

        const mockBooks = [
          { id: 'test-book-id', created_by: 'test-user-id' },
        ]

        // Mock createClient to return the same instance for all calls
        const mockSupabase = {
          from: vi.fn((table: string) => {
            const chain: any = {
              select: vi.fn(() => chain),
              delete: vi.fn(() => chain),
              eq: vi.fn(() => {
                // Return success for delete operations
                return Promise.resolve({ error: null })
              }),
              in: vi.fn((column: string) => {
                if (table === 'words') {
                  return Promise.resolve({ data: mockWords, error: null })
                }
                if (table === 'books') {
                  return Promise.resolve({ data: mockBooks, error: null })
                }
                return Promise.resolve({ data: [], error: null })
              }),
            }
            return chain
          }),
        }

        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const request = new Request('http://localhost:3000/api/words/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ wordIds: ['word-1', 'word-2', 'word-3'] }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.deleted).toBe(3)
      })

      it('应该成功删除最大数量（100个）单词', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const words = Array.from({ length: 100 }, (_, i) => ({
          id: `word-${i}`,
          book_id: 'test-book-id',
          chapter_id: 'chapter-1',
        }))

        mockSupabase.select.mockReturnValueOnce({
          in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
        })
        mockSupabase.select.mockReturnValueOnce({
          in: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({ data: mockBook, error: null }),
            }),
          }),
        })
        mockSupabase.delete.mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })

        const wordIds = words.map(w => w.id)
        const request = new Request('http://localhost:3000/api/words/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ wordIds }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.deleted).toBe(100)
      })

      it('应该支持部分成功（部分删除失败）', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const words = [
          { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          { id: 'word-2', book_id: 'test-book-id', chapter_id: 'chapter-1' },
        ]

        mockSupabase.select.mockReturnValueOnce({
          in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
        })
        mockSupabase.select.mockReturnValueOnce({
          in: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({ data: mockBook, error: null }),
            }),
          }),
        })
        // word-1 删除成功，word-2 删除失败
        mockSupabase.delete.mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({ error: null }),
        })
        const deleteError = new Error('Delete failed')
        mockSupabase.delete.mockReturnValueOnce({
          eq: vi.fn().mockResolvedValueOnce({ error: deleteError }),
        })

        const request = new Request('http://localhost:3000/api/words/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ wordIds: ['word-1', 'word-2'] }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.data.deleted).toBe(1)
        expect(data.data.failed).toBe(1)
        expect(data.data.errors).toHaveLength(1)
      })
    })

    // ============ Boundary Value Tests ============
    describe('Boundary Value Tests - 边界值轰炸', () => {
      describe('WordIds数量边界', () => {
        it('应该拒绝空数组', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: [] }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('单词ID列表不能为空')
        })

        it('应该拒绝wordIds为null', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: null }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
        })

        it('应该拒绝wordIds为undefined', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: undefined }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝超过100个单词（101个）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const wordIds = Array.from({ length: 101 }, (_, i) => `word-${i}`)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('每次最多删除100个单词')
        })

        it('应该拒绝非常大的数量（1000个）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const wordIds = Array.from({ length: 1000 }, (_, i) => `word-${i}`)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.data.requested).toBe(1000)
          expect(data.data.limit).toBe(100)
        })

        it.each([
          [1, '1个单词（最小有效值）'],
          [50, '50个单词（中等值）'],
          [99, '99个单词（接近最大值）'],
          [100, '100个单词（最大有效值）'],
        ])('应该接受wordIds数量为 %s', async (count, description) => {
          const words = Array.from({ length: count }, (_, i) => ({
            id: `word-${i}`,
            book_id: 'test-book-id',
            chapter_id: 'chapter-1',
          }))

          const mockSupabase = createMockSupabaseForBatchDelete(words)
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const wordIds = Array.from({ length: count }, (_, i) => `word-${i}`)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.success).toBe(true)
          expect(data.data.deleted).toBe(count)
        })
      })

      describe('参数类型边界', () => {
        it('应该拒绝wordIds不是数组（字符串）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: 'not-an-array' }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝wordIds不是数组（对象）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: { id: 'word-1' } }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝wordIds不是数组（数字）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: 123 }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该处理包含空字符串的wordIds', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: mockBook, error: null }),
              }),
            }),
          })
          mockSupabase.delete.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1', '', '  '] }),
          })

          const response = await POST(request)

          // 可能成功（如果Supabase忽略空字符串）或失败
          expect([200, 404, 500]).toContain(response.status)
        })

        it('应该处理包含无效UUID的wordIds', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: mockBook, error: null }),
              }),
            }),
          })
          mockSupabase.delete.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1', 'invalid-uuid', 'not-a-uuid'] }),
          })

          const response = await POST(request)

          // 部分成功
          expect([200, 404]).toContain(response.status)
        })
      })
    })

    // ============ Logic Branch Coverage ============
    describe('Logic Branch Coverage - 逻辑分支覆盖', () => {
      describe('认证分支', () => {
        it('应该返回401当用户未登录', async () => {
          vi.mocked(getCurrentUser).mockResolvedValue(null)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1'] }),
          })

          const response = await POST(request)

          expect(response.status).toBe(401)
        })
      })

      describe('查询单词分支', () => {
        it('应该返回404当单词不存在', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: null, error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1'] }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(404)
          expect(data.error).toContain('没有找到')
        })

        it('应该返回500当查询单词失败', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1'] }),
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })

        it('应该返回空数组当查询结果为空数组', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1'] }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })
      })

      describe('权限验证分支', () => {
        it('应该返回403当单词属于其他用户的词库', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const otherBook = {
            id: 'other-book-id',
            created_by: 'other-user-id',
          }

          const words = [
            { id: 'word-1', book_id: 'other-book-id', chapter_id: 'chapter-1' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: otherBook, error: null }),
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1'] }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(403)
          expect(data.error).toContain('您只能删除')
        })

        it('应该处理单词来自多个词库的情况', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const userBook = {
            id: 'user-book-id',
            created_by: 'test-user-id',
          }
          const otherBook = {
            id: 'other-book-id',
            created_by: 'other-user-id',
          }

          const words = [
            { id: 'word-1', book_id: 'user-book-id', chapter_id: 'chapter-1' },
            { id: 'word-2', book_id: 'other-book-id', chapter_id: 'chapter-2' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          // 查询两个词库
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: [userBook, otherBook], error: null }),
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1', 'word-2'] }),
          })

          const response = await POST(request)

          expect(response.status).toBe(403)
        })
      })

      describe('删除操作分支', () => {
        it('应该处理所有单词删除失败的情况', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
            { id: 'word-2', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: mockBook, error: null }),
              }),
            }),
          })
          // 所有删除都失败
          const deleteError = new Error('Delete failed')
          mockSupabase.delete.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: deleteError }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1', 'word-2'] }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.data.deleted).toBe(0)
          expect(data.data.failed).toBe(2)
        })

        it('应该处理Promise.allSettled被拒绝的情况', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: mockBook, error: null }),
              }),
            }),
          })
          // 模拟 Promise rejected
          mockSupabase.delete.mockReturnValue({
            eq: vi.fn().mockImplementation(() => {
              throw new Error('Unexpected error')
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1'] }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(200)
          expect(data.data.failed).toBe(1)
        })
      })

      describe('JSON解析错误分支', () => {
        it('应该处理无效的JSON', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: 'invalid json{{{',
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })

        it('应该处理空body', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: '',
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })
      })

      describe('更新词库统计分支', () => {
        it('应该异步更新词库统计（不阻塞响应）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: mockBook, error: null }),
              }),
            }),
          })
          mockSupabase.delete.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1'] }),
          })

          const response = await POST(request)

          // 应该立即返回，不等待统计更新完成
          expect(response.status).toBe(200)
        })

        it('应该处理更新统计失败（不影响删除结果）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: mockBook, error: null }),
              }),
            }),
          })
          mockSupabase.delete.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })
          // 统计更新失败
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                head: vi.fn().mockResolvedValue({ error: { message: 'Count failed' } }),
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1'] }),
          })

          const response = await POST(request)

          // 删除仍然成功
          expect(response.status).toBe(200)
        })
      })

      describe('多词库单词分支', () => {
        it('应该处理单词来自同一用户的多个词库', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const book1 = { id: 'book-1', created_by: 'test-user-id' }
          const book2 = { id: 'book-2', created_by: 'test-user-id' }

          const words = [
            { id: 'word-1', book_id: 'book-1', chapter_id: 'chapter-1' },
            { id: 'word-2', book_id: 'book-2', chapter_id: 'chapter-2' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: [book1, book2], error: null }),
              }),
            }),
          })
          mockSupabase.delete.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-delete', {
            method: 'POST',
            body: JSON.stringify({ wordIds: ['word-1', 'word-2'] }),
          })

          const response = await POST(request)

          // 所有词库都属于当前用户，应该成功
          expect(response.status).toBe(200)
        })
      })
    })
  })
})
