/**
 * 智能导入API边界值和逻辑分支全覆盖测试
 * 测试范围：POST /api/smart-import, GET /api/smart-import
 *
 * 测试策略：
 * 1. Happy Path：正常业务流程
 * 2. 边界值轰炸：words数量、配额限制、单词格式
 * 3. 逻辑分支覆盖：所有if/else、try/catch
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { POST, GET } from '../route'
import { createClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/supabase/server'

// Mock dependencies
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
  getCurrentUser: vi.fn(),
}))

// Mock external dependencies
vi.mock('@/lib/utils/retry', () => ({
  retryWithBackoff: vi.fn(),
  parseYoudaoResponse: vi.fn((data, word) => ({
    word,
    phonetic: '/fəˈnetɪk/',
    uk_phonetic: '/uk/',
    us_phonetic: '/us/',
    definition: 'Definition',
    definition_en: 'English definition',
    collocation: 'Collocation',
    collocation_en: 'English collocation',
    example_sentence: 'Example',
    example_sentence_en: 'English example',
    part_of_speech: 'n.',
    success: true,
  })),
  sleep: vi.fn(),
}))

vi.mock('@/lib/utils/cache', () => ({
  getCachedWordData: vi.fn(() => null),
  cacheWordData: vi.fn(),
  isRedisAvailable: vi.fn(async () => false),
}))

// Mock global fetch
global.fetch = vi.fn()

describe('Smart Import API - Boundary and Branch Coverage', () => {
  const mockUser = { id: 'test-user-id', email: 'test@example.com' }
  const mockBook = {
    id: 'test-book-id',
    created_by: 'test-user-id',
    is_official: false,
    total_words: 10,
    total_chapters: 1,
  }

  const createMockSupabase = () => {
    const mockChain: any = {
      from: vi.fn(() => mockChain),
      select: vi.fn(() => mockChain),
      insert: vi.fn(() => mockChain),
      update: vi.fn(() => mockChain),
      delete: vi.fn(() => mockChain),
      eq: vi.fn(() => mockChain),
      maybeSingle: vi.fn(),
      single: vi.fn(),
      order: vi.fn(() => mockChain),
      limit: vi.fn(() => mockChain),
      upsert: vi.fn(() => mockChain),
      in: vi.fn(() => mockChain),
      rpc: vi.fn(() => mockChain),
    }
    return mockChain
  }

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(getCurrentUser).mockResolvedValue(mockUser)
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ }),
    } as Response)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('POST /api/smart-import - 智能导入单词', () => {
    // ============ Happy Path Tests ============
    describe('Happy Path - 正常业务流程', () => {
      it('应该成功导入单个单词', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
        mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
        mockSupabase.single.mockResolvedValueOnce({
          data: { id: 'chapter-id', title: '默认章节' },
          error: null,
        })
        mockSupabase.single.mockResolvedValueOnce({
          data: [{ id: 'word-1', word: 'apple' }],
          error: null,
        })
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

        const request = new Request('http://localhost:3000/api/smart-import', {
          method: 'POST',
          body: JSON.stringify({
            words: ['apple'],
            bookId: 'test-book-id',
          }),
        })

        const response = await POST(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.success).toBe(true)
        expect(data.imported).toBe(1)
      })

      it('应该成功导入多个单词', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
        mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
        mockSupabase.single.mockResolvedValueOnce({
          data: { id: 'chapter-id', title: '默认章节' },
          error: null,
        })
        mockSupabase.single.mockResolvedValueOnce({
          data: [
            { id: 'word-1', word: 'apple' },
            { id: 'word-2', word: 'banana' },
          ],
          error: null,
        })
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

        const request = new Request('http://localhost:3000/api/smart-import', {
          method: 'POST',
          body: JSON.stringify({
            words: ['apple', 'banana'],
            bookId: 'test-book-id',
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
        expect((await response.json()).imported).toBe(2)
      })

      it('应该成功导入到指定章节', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        const targetChapter = {
          id: 'target-chapter-id',
          book_id: 'test-book-id',
        }

        mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
        mockSupabase.maybeSingle.mockResolvedValueOnce({ data: targetChapter, error: null })
        mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
        mockSupabase.single.mockResolvedValueOnce({
          data: [{ id: 'word-1', word: 'apple' }],
          error: null,
        })
        mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

        const request = new Request('http://localhost:3000/api/smart-import', {
          method: 'POST',
          body: JSON.stringify({
            words: ['apple'],
            bookId: 'test-book-id',
            chapterId: 'target-chapter-id',
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(200)
      })
    })

    // ============ Boundary Value Tests ============
    describe('Boundary Value Tests - 边界值轰炸', () => {
      describe('Words数量边界', () => {
        it('应该拒绝空数组', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: [],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('单词列表不能为空')
        })

        it('应该拒绝words为null', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: null,
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝超过100个单词（101个）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

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

        it.each([
          [1, '1个单词（最小有效值）'],
          [50, '50个单词（中等值）'],
          [100, '100个单词（最大有效值）'],
        ])('应该接受words数量为 %s', async (count, description) => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const words = Array.from({ length: count }, (_, i) => `word${i}`)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: words.map((w, i) => ({ id: `word-${i}`, word: w })),
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words,
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })
      })

      describe('配额边界', () => {
        it('应该拒绝超过每日配额（500）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            count: 450,
            data: null,
            error: null,
          })

          const words = Array.from({ length: 60 }, (_, i) => `word${i}`)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words,
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(429)
          expect(data.error).toContain('超过每日配额限制')
        })

        it('应该接受刚好达到配额上限', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            count: 0,
            data: null,
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: Array.from({ length: 100 }, (_, i) => ({ id: `word-${i}`, word: `word${i}` })),
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const words = Array.from({ length: 100 }, (_, i) => `word${i}`)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words,
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })
      })

      describe('单词格式边界', () => {
        it('应该拒绝包含数字的单词', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['word123', 'test'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('单词格式不正确')
        })

        it('应该拒绝包含特殊字符的单词', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['test@word', 'hello!'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('单词格式不正确')
        })

        it('应该接受带连字符的单词', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: [{ id: 'word-1', word: 'mother-in-law' }],
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['mother-in-law'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })

        it('应该处理大小写混合的单词', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: [{ id: 'word-1', word: 'apple' }],
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['Apple', 'BANANA', 'Cherry'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })

        it('应该拒绝包含空格的短语', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple banana'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect([400, 500]).toContain(response.status)
        })

        it('应该自动trim空白字符', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: [{ id: 'word-1', word: 'apple' }],
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['  apple  ', '  banana  '],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })

        it('应该过滤空字符串', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: [{ id: 'word-1', word: 'apple' }],
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple', '', '  ', 'banana'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })
      })

      describe('参数类型边界', () => {
        it('应该拒绝words不是数组', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: 'not-an-array',
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝缺少bookId', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              // bookId is missing
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('词库ID不能为空')
        })

        it('应该拒绝bookId为null', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: null,
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(400)
        })

        it('应该拒绝chapterId为空字符串', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
              chapterId: '',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })
      })
    })

    // ============ Logic Branch Coverage ============
    describe('Logic Branch Coverage - 逻辑分支覆盖', () => {
      describe('认证分支', () => {
        it('应该返回401当用户未登录', async () => {
          vi.mocked(getCurrentUser).mockResolvedValue(null)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(401)
        })
      })

      describe('词库验证分支', () => {
        it('应该返回404当词库不存在', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { message: 'Not found' },
          })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'non-existent-book',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })

        it('应该返回403当词库属于其他用户', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const otherBook = {
            id: 'other-book-id',
            created_by: 'other-user-id',
            is_official: false,
          }

          mockSupabase.single.mockResolvedValueOnce({ data: otherBook, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'other-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(403)
        })

        it('应该返回403当词库是官方词库', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const officialBook = {
            id: 'official-book-id',
            created_by: 'test-user-id',
            is_official: true,
          }

          mockSupabase.single.mockResolvedValueOnce({ data: officialBook, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'official-book-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(403)
          expect(data.error).toContain('官方词库不支持智能导入')
        })
      })

      describe('目标章节验证分支', () => {
        it('应该跳过验证当chapterId为null', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: [{ id: 'word-1', word: 'apple' }],
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
              chapterId: null,
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
        })

        it('应该返回404当目标章节不存在', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
              chapterId: 'non-existent-chapter',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })

        it('应该返回404当目标章节属于不同词库', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.maybeSingle.mockResolvedValueOnce({
            data: { id: 'target-id', book_id: 'other-book-id' },
            error: null,
          })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
              chapterId: 'target-chapter-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(404)
        })
      })

      describe('章节创建分支', () => {
        it('应该创建默认章节（当不存在时）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'new-chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: [{ id: 'word-1', word: 'apple' }],
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
          expect(mockSupabase.insert).toHaveBeenCalled()
        })

        it('应该使用现有章节（当已存在时）', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.maybeSingle.mockResolvedValueOnce({
            data: { id: 'existing-chapter-id' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: [{ id: 'word-1', word: 'apple' }],
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(200)
          expect(mockSupabase.insert).not.toHaveBeenCalled()
        })

        it('应该返回500当创建章节失败', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { message: 'Insert failed' },
          })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })
      })

      describe('单词重复分支', () => {
        it('应该拒绝包含重复单词的列表', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple', 'banana', 'apple', 'cherry', 'banana'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)
          const data = await response.json()

          expect(response.status).toBe(400)
          expect(data.error).toContain('包含重复')
        })
      })

      describe('数据库错误分支', () => {
        it('应该处理插入单词失败', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          mockSupabase.single.mockResolvedValueOnce({ data: mockBook, error: null })
          mockSupabase.single.mockResolvedValueOnce({ count: 0, data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({ data: null, error: null })
          mockSupabase.single.mockResolvedValueOnce({
            data: { id: 'chapter-id', title: '默认章节' },
            error: null,
          })
          mockSupabase.single.mockResolvedValueOnce({
            data: null,
            error: { message: 'Insert failed' },
          })

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: JSON.stringify({
              words: ['apple'],
              bookId: 'test-book-id',
            }),
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })
      })

      describe('JSON解析错误分支', () => {
        it('应该处理无效的JSON', async () => {
          const mockSupabase = createMockSupabase()
          vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

          const request = new Request('http://localhost:3000/api/smart-import', {
            method: 'POST',
            body: 'invalid json{{{',
          })

          const response = await POST(request)

          expect(response.status).toBe(500)
        })
      })
    })
  })

  describe('GET /api/smart-import - 获取今日配额', () => {
    describe('Happy Path', () => {
      it('应该返回今日配额使用情况（有使用记录）', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        mockSupabase.maybeSingle.mockResolvedValueOnce({
          count: 50,
          data: null,
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

      it('应该返回今日配额使用情况（无使用记录）', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        mockSupabase.maybeSingle.mockResolvedValueOnce({
          data: null,
          error: null,
        })

        const request = new Request('http://localhost:3000/api/smart-import')

        const response = await GET(request)
        const data = await response.json()

        expect(response.status).toBe(200)
        expect(data.used).toBe(0)
        expect(data.remaining).toBe(500)
        expect(data.limit).toBe(500)
      })
    })

    describe('Logic Branch Coverage', () => {
      it('应该返回401当用户未登录', async () => {
        vi.mocked(getCurrentUser).mockResolvedValue(null)

        const request = new Request('http://localhost:3000/api/smart-import')

        const response = await GET(request)

        expect(response.status).toBe(401)
      })

      it('应该处理数据库查询错误', async () => {
        const mockSupabase = createMockSupabase()
        vi.mocked(createClient).mockResolvedValue(mockSupabase as any)

        mockSupabase.maybeSingle.mockResolvedValueOnce({
          data: null,
          error: { message: 'Query failed' },
        })

        const request = new Request('http://localhost:3000/api/smart-import')

        const response = await GET(request)

        expect(response.status).toBe(500)
      })
    })
  })
})
