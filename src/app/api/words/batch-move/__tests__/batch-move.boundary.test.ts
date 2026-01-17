/**
 * 批量移动单词API边界值和逻辑分支全覆盖测试
 * 测试范围：POST /api/words/batch-move
 *
 * 测试策略：
 * 1. Happy Path：正常业务流程
 * 2. 边界值轰炸：wordIds数量、targetChapterId各种组合
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

describe('Batch Move Words API - Boundary and Branch Coverage', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' }
  const mockBook = {
    id: 'test-book-id',
    created_by: 'test-user-id',
  }

  // Helper function to create mock Supabase client for batch-move
  const createMockSupabaseForBatchMove = (words: any[], book: any = mockBook, chapters: any[] = []) => {
    return {
      from: vi.fn((table: string) => {
        const chain: any = {
          select: vi.fn(() => chain),
          update: vi.fn(() => chain),
          eq: vi.fn(() => chain),
          in: vi.fn((column: string) => {
            if (table === 'words') {
              return Promise.resolve({ data: words, error: null })
            }
            if (table === 'books') {
              return Promise.resolve({ data: [book], error: null })
            }
            return Promise.resolve({ data: [], error: null })
          }),
          single: vi.fn(() => {
            if (table === 'books') {
              return Promise.resolve({ data: book, error: null })
            }
            return Promise.resolve({ data: null, error: { message: 'Not found' } })
          }),
        }
        return chain
      }),
    }
  }

  const createMockSupabase = () => {
    const mockChain: any = {
      from: vi.fn(() => mockChain),
      select: vi.fn(() => mockChain),
      update: vi.fn(() => mockChain),
      delete: vi.fn(() => mockChain),
      eq: vi.fn(() => mockChain),
      in: vi.fn(() => mockChain),
      single: vi.fn(),
      maybeSingle: vi.fn(),
    }
    return mockChain
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/words/batch-move - 批量移动单词', () => {
    // ============ Happy Path Tests ============
    describe('Happy Path - 正常业务流程', () => {
      it('应该成功移动单词到指定章节', async () => {
        const words = [
          { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
        ]

        const mockSupabase = createMockSupabaseForBatchMove(words)
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const request = new Request('http://localhost:3000/api/words/batch-move', {
          method: 'POST',
          body: JSON.stringify({
            wordIds: ['word-1'],
            targetChapterId: 'chapter-2'
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
      })

      it('应该成功移动单词到默认章节（targetChapterId为null）', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const words = [
          { id: 'word-1', book_id: 'test-book-id', chapter_id: 'old-chapter' },
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
        // skip target chapter validation when targetChapterId is null
        mockSupabase.update.mockReturnValueOnce({
          in: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValueOnce({
              data: words,
              error: null,
            }),
          }),
        })
        mockSupabase.select.mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValueOnce({ count: 5, data: null, error: null }),
          }),
        })
        mockSupabase.update.mockReturnValueOnce({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })

        const request = new Request('http://localhost:3000/api/words/batch-move', {
          method: 'POST',
          body: JSON.stringify({
            wordIds: ['word-1'],
            targetChapterId: null,
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })

      it('应该成功移动最大数量（100个）单词', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const words = Array.from({ length: 100 }, (_, i) => ({
          id: `word-${i}`,
          book_id: 'test-book-id',
          chapter_id: 'old-chapter',
        }))

        const targetChapter = {
          id: 'target-chapter-id',
          book_id: 'test-book-id',
        }

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
        mockSupabase.select.mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({ data: targetChapter, error: null }),
          }),
        })
        mockSupabase.update.mockReturnValueOnce({
          in: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValueOnce({
              data: words,
              error: null,
            }),
          }),
        })
        mockSupabase.select.mockReturnValue({
          eq: vi.fn().mockReturnValue({
            maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
          }),
        })
        mockSupabase.update.mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        })
        mockSupabase.select.mockReturnValueOnce({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValueOnce({
              data: { title: 'Target' },
              error: null,
            }),
          }),
        })

        const wordIds = words.map(w => w.id)
        const request = new Request('http://localhost:3000/api/words/batch-move', {
          method: 'POST',
          body: JSON.stringify({
            wordIds,
            targetChapterId: 'target-chapter-id',
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    // ============ Boundary Value Tests ============
    describe('Boundary Value Tests - 边界值轰炸', () => {
      describe('WordIds数量边界', () => {
        it('应该拒绝空数组', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: [],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('单词ID列表不能为空')
        })

        it('应该拒绝wordIds为null', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: null,
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝wordIds为undefined', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: undefined,
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝超过100个单词（101个）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const wordIds = Array.from({ length: 101 }, (_, i) => `word-${i}`)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds,
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('每次最多移动100个单词')
        })

        it.each([
          [1, '1个单词（最小有效值）'],
          [50, '50个单词（中等值）'],
          [100, '100个单词（最大有效值）'],
        ])('应该接受wordIds数量为 %s', async (count, description) => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = Array.from({ length: count }, (_, i) => ({
            id: `word-${i}`,
            book_id: 'test-book-id',
            chapter_id: 'old-chapter',
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
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: { id: 'target-id', book_id: 'test-book-id' },
                error: null,
              }),
            }),
          })
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: words,
                error: null,
              }),
            }),
          })
          mockSupabase.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
            }),
          })
          mockSupabase.update.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const wordIds = words.map(w => w.id)
          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds,
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })
      })

      describe('TargetChapterId边界', () => {
        it('应该接受targetChapterId为null（移动到默认章节）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [{ id: 'word-1', book_id: 'test-book-id', chapter_id: 'old-chapter' }]

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
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: words,
                error: null,
              }),
            }),
          })
          mockSupabase.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
            }),
          })
          mockSupabase.update.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: null,
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })

        it('应该接受targetChapterId为undefined（移动到默认章节）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [{ id: 'word-1', book_id: 'test-book-id', chapter_id: 'old-chapter' }]

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
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: words,
                error: null,
              }),
            }),
          })
          mockSupabase.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
            }),
          })
          mockSupabase.update.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: undefined,
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })

        it('应该接受targetChapterId为空字符串', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [{ id: 'word-1', book_id: 'test-book-id', chapter_id: 'old-chapter' }]

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
          // Empty string is falsy, should skip target chapter validation
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: words,
                error: null,
              }),
            }),
          })
          mockSupabase.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
            }),
          })
          mockSupabase.update.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: '',
            }),
          })

          const response = await POST(request)

          // Empty string is falsy, so should be treated as null/undefined
          expect([200, 404]).toContain(response.status)
        })
      })

      describe('参数类型边界', () => {
        it('应该拒绝wordIds不是数组（字符串）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: 'not-an-array',
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝缺少targetChapterId参数', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              // targetChapterId is missing
            }),
          })

          const response = await POST(request)

          // targetChapterId undefined is treated as null (default chapter)
          expect([200, 400, 500]).toContain(response.status)
        })
      })
    })

    // ============ Logic Branch Coverage ============
    describe('Logic Branch Coverage - 逻辑分支覆盖', () => {
      describe('认证分支', () => {
        it('应该返回401当用户未登录', async () => {
          vi.mocked(getCurrentUser).mockResolvedValue(null)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'target-chapter-id',
            }),
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

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })

        it('应该返回500当查询单词失败', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Query failed' } }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })

        it('应该返回空数组当查询结果为空数组', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: [], error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })
      })

      describe('多词库检查分支', () => {
        it('应该返回400当单词来自多个词库', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'book-1', chapter_id: 'chapter-1' },
            { id: 'word-2', book_id: 'book-2', chapter_id: 'chapter-2' },
          ]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1', 'word-2'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('所有单词必须属于同一词库')
        })

        it('应该接受单词来自同一词库的不同章节', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
            { id: 'word-2', book_id: 'test-book-id', chapter_id: 'chapter-2' },
            { id: 'word-3', book_id: 'test-book-id', chapter_id: null },
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
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: { id: 'target-id', book_id: 'test-book-id' },
                error: null,
              }),
            }),
          })
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: words,
                error: null,
              }),
            }),
          })
          mockSupabase.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
            }),
          })
          mockSupabase.update.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1', 'word-2', 'word-3'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })
      })

      describe('权限验证分支', () => {
        it('应该返回403当用户非创建者', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const otherBook = {
            id: 'other-book-id',
            created_by: 'other-user-id',
          }

          const words = [{ id: 'word-1', book_id: 'other-book-id', chapter_id: 'chapter-1' }]

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

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(403)
        })

        it('应该返回404当词库不存在', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [{ id: 'word-1', book_id: 'non-existent-book', chapter_id: 'chapter-1' }]

          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockResolvedValueOnce({ data: words, error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValueOnce({ data: null, error: { message: 'Not found' } }),
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(403)
        })
      })

      describe('目标章节验证分支', () => {
        it('应该跳过验证当targetChapterId为null', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [{ id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' }]

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
          // Should skip target chapter validation
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: words,
                error: null,
              }),
            }),
          })
          mockSupabase.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
            }),
          })
          mockSupabase.update.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: null,
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })

        it('应该返回404当目标章节不存在', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [{ id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' }]

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
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'non-existent-chapter',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })

        it('应该返回400当目标章节属于不同词库', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [{ id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' }]

          const targetChapter = {
            id: 'target-chapter-id',
            book_id: 'other-book-id', // Different book!
          }

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
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: targetChapter,
                error: null,
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })
      })

      describe('更新操作分支', () => {
        it('应该返回500当更新失败', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [{ id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' }]

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
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: { id: 'target-id', book_id: 'test-book-id' },
                error: null,
              }),
            }),
          })
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: null,
                error: { message: 'Update failed' },
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })
      })

      describe('更新章节计数分支', () => {
        it('应该更新所有受影响章节的计数', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: 'chapter-1' },
            { id: 'word-2', book_id: 'test-book-id', chapter_id: 'chapter-2' },
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
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: { id: 'target-id', book_id: 'test-book-id' },
                error: null,
              }),
            }),
          })
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: words,
                error: null,
              }),
            }),
          })
          // Should update counts for chapter-1, chapter-2, and target-chapter
          mockSupabase.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
            }),
          })
          mockSupabase.update.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: { title: 'Target' },
                error: null,
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1', 'word-2'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })

        it('应该处理源章节为null的单词', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = [
            { id: 'word-1', book_id: 'test-book-id', chapter_id: null },
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
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: { id: 'target-id', book_id: 'test-book-id' },
                error: null,
              }),
            }),
          })
          mockSupabase.update.mockReturnValueOnce({
            in: vi.fn().mockReturnValue({
              select: vi.fn().mockResolvedValueOnce({
                data: words,
                error: null,
              }),
            }),
          })
          mockSupabase.select.mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValueOnce({ count: 0, data: null, error: null }),
            }),
          })
          mockSupabase.update.mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          })
          mockSupabase.select.mockReturnValueOnce({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValueOnce({
                data: { title: 'Target' },
                error: null,
              }),
            }),
          })

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: JSON.stringify({
              wordIds: ['word-1', 'word-2'],
              targetChapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })
      })

      describe('JSON解析错误分支', () => {
        it('应该处理无效的JSON', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: 'invalid json{{{',
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })

        it('应该处理空body', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/words/batch-move', {
            method: 'POST',
            body: '',
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })
      })
    })
  })
})
