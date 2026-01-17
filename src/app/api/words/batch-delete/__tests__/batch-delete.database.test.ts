/**
 * 批量删除单词API - 数据库集成测试
 *
 * 测试关键路径，避免复杂mock配置
 */

import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest'
import { POST } from '../route'
import { createClient as createServerClient, createAdminClient, getCurrentUser } from '@/lib/supabase/server'
import {
  createTestUser,
  createTestBook,
  createTestChapter,
  createTestWord,
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

describe('Batch Delete API - Database Integration Tests', () => {
  let testUserId: string
  let testBookId: string
  let testChapterId: string
  let mockUser: any

  beforeAll(async () => {
    testUserId = await createTestUser()
    testBookId = await createTestBook(testUserId)
    testChapterId = await createTestChapter(testBookId, { title: 'Test Chapter' })

    mockUser = {
      id: testUserId,
      email: `test-${testUserId}@example.com`,
    }

    // Mock createClient to return admin client for the API routes
    const adminClient = await createAdminClient()
    vi.mocked(createServerClient).mockResolvedValue(adminClient as any)

    console.log(`✅ Batch delete test setup complete`)
  }, 30000)

  beforeEach(async () => {
    // 每个测试前清理单词
    const supabase = await createAdminClient()
    await supabase.from('words').delete().eq('book_id', testBookId)
  })

  afterAll(async () => {
    await cleanupTestData(testUserId)
    console.log('✅ Batch delete test cleanup complete')
  }, 30000)

  describe('核心功能测试', () => {
    it('应该成功删除单个单词', async () => {
      // 创建测试单词
      await createTestWord(testBookId, testChapterId, { word: 'apple' })

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      // 先查询单词ID
      const supabase = await createAdminClient()
      const { data: words } = await supabase
        .from('words')
        .select('id')
        .eq('book_id', testBookId)

      expect(words).toHaveLength(1)
      const wordId = words![0].id

      // 删除单词
      const request = new Request('http://localhost/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: [wordId] }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)
      expect(data.data.deleted).toBe(1)
    })

    it('应该成功删除多个单词', async () => {
      // 创建3个测试单词
      const wordIds: string[] = []
      for (let i = 0; i < 3; i++) {
        const id = await createTestWord(testBookId, testChapterId, { word: `word${i}` })
        wordIds.push(id)
      }

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request('http://localhost/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.data.deleted).toBe(3)
    })

    it('应该返回401当用户未登录', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request('http://localhost/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1'] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('应该拒绝空数组', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request('http://localhost/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: [] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
      expect((await response.json()).error).toContain('不能为空')
    })

    it('应该拒绝超过100个单词', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const wordIds = Array.from({ length: 101 }, (_, i) => `word-${i}`)

      const request = new Request('http://localhost/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('应该返回404当单词不存在', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      // 使用有效的UUID格式但不存在
      const request = new Request('http://localhost/api/words/batch-delete', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['00000000-0000-0000-0000-000000000000'] }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })
  })

  describe('权限测试', () => {
    it('应该返回403当单词属于其他用户', async () => {
      // 创建另一个用户和词库
      const otherUserId = await createTestUser()
      const otherBookId = await createTestBook(otherUserId)
      const otherChapterId = await createTestChapter(otherBookId, { title: 'Other Chapter' })
      const otherWordId = await createTestWord(otherBookId, otherChapterId, { word: 'other' })

      try {
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

        const request = new Request('http://localhost/api/words/batch-delete', {
          method: 'POST',
          body: JSON.stringify({ wordIds: [otherWordId] }),
        })

        const response = await POST(request)

        expect(response.status).toBe(403)
      } finally {
        await cleanupTestData(otherUserId)
      }
    })
  })
})
