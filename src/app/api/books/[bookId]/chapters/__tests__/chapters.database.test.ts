/**
 * 章节管理API - 数据库集成测试
 *
 * 使用真实数据库进行测试，避免复杂的mock配置
 * 测试范围：GET /api/books/[bookId]/chapters, POST /api/books/[bookId]/chapters
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { createClient as createServerClient, createAdminClient, getCurrentUser } from '@/lib/supabase/server'
import {
  createTestUser,
  createTestBook,
  createTestChapter,
  cleanupUserBooks,
  cleanupTestData
} from '@/test-helpers'

// Mock getCurrentUser and createClient
vi.mock('@/lib/supabase/server', async () => {
  const actual = await vi.importActual('@/lib/supabase/server')
  return {
    ...actual,
    getCurrentUser: vi.fn(),
    createClient: vi.fn(),
  }
})

// Import after mocking
import { POST, GET } from '../route'

describe('Chapter API - Database Integration Tests', () => {
  let testUserId: string
  let testBookId: string
  let mockUser: any

  beforeAll(async () => {
    // 创建测试用户和词库
    testUserId = await createTestUser()
    testBookId = await createTestBook(testUserId)

    mockUser = {
      id: testUserId,
      email: `test-${testUserId}@example.com`,
    }

    // Mock createClient to return admin client for the API routes
    const adminClient = await createAdminClient()
    vi.mocked(createServerClient).mockResolvedValue(adminClient as any)

    console.log(`✅ Test setup complete. User: ${testUserId}, Book: ${testBookId}`)
  }, 30000) // 30秒超时

  beforeEach(async () => {
    // 每个测试前清理该词库的章节
    await cleanupUserBooks(testUserId)
    // 重新创建词库（不指定ID，自动生成）
    const newBookId = await createTestBook(testUserId)
    // 更新测试中的 bookId 引用
    testBookId = newBookId
  })

  afterAll(async () => {
    // 清理所有测试数据
    await cleanupTestData(testUserId)
    console.log('✅ Test cleanup complete')
  }, 30000)

  describe('GET /api/books/[bookId]/chapters - 获取章节列表', () => {
    it('应该成功获取章节列表（不包含单词数）', async () => {
      // 创建测试章节
      await createTestChapter(testBookId, { title: 'Chapter 1', order_index: 1 })
      await createTestChapter(testBookId, { title: 'Chapter 2', order_index: 2 })

      // Mock用户
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request(`http://localhost/api/books/${testBookId}/chapters`)
      const response = await GET(request, { params: { bookId: testBookId } })
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data).toHaveLength(2)
      // 按order_index排序后检查
      const sortedChapters = [...data.data].sort((a, b) => a.order_index - b.order_index)
      expect(sortedChapters[0].title).toBe('Chapter 1')
      expect(sortedChapters[1].title).toBe('Chapter 2')
    })

    it('应该返回401当用户未登录', async () => {
      // Mock未登录
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request(`http://localhost/api/books/${testBookId}/chapters`)
      const response = await GET(request, { params: { bookId: testBookId } })

      expect(response.status).toBe(401)
    })

    it('应该返回404当词库不存在', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request(`http://localhost/api/books/nonexistent-book/chapters`)
      const response = await GET(request, { params: { bookId: 'nonexistent-book' } })

      expect(response.status).toBe(404)
    })
  })

  describe('POST /api/books/[bookId]/chapters - 创建章节', () => {
    it('应该成功创建新章节', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ title: 'New Chapter' }),
      })

      const response = await POST(request, { params: { bookId: testBookId } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.success).toBe(true)
      expect(data.data.title).toBe('New Chapter')
      expect(data.data.order_index).toBeDefined()
    })

    it('应该自动计算order_index（添加到最后）', async () => {
      // 创建两个现有章节
      await createTestChapter(testBookId, { title: 'Chapter 1', order_index: 1 })
      await createTestChapter(testBookId, { title: 'Chapter 2', order_index: 2 })

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Chapter 3' }),
      })

      const response = await POST(request, { params: { bookId: testBookId } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.order_index).toBe(3)
    })

    it('应该拒绝创建重复标题的章节', async () => {
      // 创建第一个章节
      await createTestChapter(testBookId, { title: 'Duplicate Chapter' })

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      // 尝试创建重复标题
      const request = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Duplicate Chapter' }),
      })

      const response = await POST(request, { params: { bookId: testBookId } })
      const data = await response.json()

      expect(response.status).toBe(400)
      expect(data.error).toContain('已存在')
    })

    it('应该验证标题长度（1-50字符）', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      // 测试空标题
      const emptyRequest = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ title: '' }),
      })
      const emptyResponse = await POST(emptyRequest, { params: { bookId: testBookId } })
      expect(emptyResponse.status).toBe(400)

      // 测试超长标题
      const longTitle = 'A'.repeat(51)
      const longRequest = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ title: longTitle }),
      })
      const longResponse = await POST(longRequest, { params: { bookId: testBookId } })
      expect(longResponse.status).toBe(400)
    })

    it('应该返回401当用户未认证', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Test' }),
      })

      const response = await POST(request, { params: { bookId: testBookId } })

      expect(response.status).toBe(401)
    })

    it('应该返回403当用户无权限', async () => {
      // 创建另一个用户和词库
      const otherUserId = await createTestUser()
      const otherBookId = await createTestBook(otherUserId)

      try {
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

        // 尝试用第一个用户修改第二个用户的词库
        const request = new Request(`http://localhost/api/books/${otherBookId}/chapters`, {
          method: 'POST',
          body: JSON.stringify({ title: 'Unauthorized Chapter' }),
        })

        const response = await POST(request, { params: { bookId: otherBookId } })

        expect(response.status).toBe(403)
      } finally {
        await cleanupTestData(otherUserId)
      }
    })

    it('应该接受order_index参数', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Test Chapter', order_index: 5 }),
      })

      const response = await POST(request, { params: { bookId: testBookId } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.order_index).toBe(5)
    })
  })

  describe('边界值测试', () => {
    it('应该处理特殊字符标题', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const specialTitles = [
        'Chapter with emoji 🎉',
        "Chapter with 'quotes'",
        'Chapter with "double quotes"',
        'Chapter with - dash',
      ]

      for (const title of specialTitles) {
        const request = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
          method: 'POST',
          body: JSON.stringify({ title }),
        })

        const response = await POST(request, { params: { bookId: testBookId } })

        expect(response.status).toBe(201)
      }
    })

    it('应该接受order_index为0', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request(`http://localhost/api/books/${testBookId}/chapters`, {
        method: 'POST',
        body: JSON.stringify({ title: 'Zero Index Chapter', order_index: 0 }),
      })

      const response = await POST(request, { params: { bookId: testBookId } })
      const data = await response.json()

      expect(response.status).toBe(201)
      expect(data.data.order_index).toBe(0)
    })
  })
})
