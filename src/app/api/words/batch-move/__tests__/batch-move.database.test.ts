/**
 * 批量移动单词API - 数据库集成测试
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

describe('Batch Move API - Database Integration Tests', () => {
  let testUserId: string
  let testBookId: string
  let chapter1Id: string
  let chapter2Id: string
  let mockUser: any

  beforeAll(async () => {
    testUserId = await createTestUser()
    testBookId = await createTestBook(testUserId)
    chapter1Id = await createTestChapter(testBookId, { title: 'Chapter 1', order_index: 1 })
    chapter2Id = await createTestChapter(testBookId, { title: 'Chapter 2', order_index: 2 })

    mockUser = {
      id: testUserId,
      email: `test-${testUserId}@example.com`,
    }

    // Mock createClient to return admin client for the API routes
    const adminClient = await createAdminClient()
    vi.mocked(createServerClient).mockResolvedValue(adminClient as any)

    console.log(`✅ Batch move test setup complete`)
  }, 30000)

  beforeEach(async () => {
    // 清理并重新创建测试数据
    const supabase = await createAdminClient()
    await supabase.from('words').delete().eq('book_id', testBookId)
  })

  afterAll(async () => {
    await cleanupTestData(testUserId)
    console.log('✅ Batch move test cleanup complete')
  }, 30000)

  describe('核心功能测试', () => {
    it('应该成功移动单词到指定章节', async () => {
      // 创建测试单词
      const wordId = await createTestWord(testBookId, chapter1Id, { word: 'apple' })

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request('http://localhost/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: [wordId],
          targetChapterId: chapter2Id,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // 验证单词已移动
      const supabase = await createAdminClient()
      const { data: word } = await supabase
        .from('words')
        .select('chapter_id')
        .eq('id', wordId)
        .single()

      expect(word?.chapter_id).toBe(chapter2Id)
    })

    it('应该成功移动单词到默认章节（targetChapterId为null）', async () => {
      const wordId = await createTestWord(testBookId, chapter1Id, { word: 'banana' })

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request('http://localhost/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: [wordId],
          targetChapterId: null,
        }),
      })

      const response = await POST(request)
      const data = await response.json()

      expect(response.status).toBe(200)
      expect(data.success).toBe(true)

      // 验证单词的chapter_id为null
      const supabase = await createAdminClient()
      const { data: word } = await supabase
        .from('words')
        .select('chapter_id')
        .eq('id', wordId)
        .single()

      expect(word?.chapter_id).toBeNull()
    })

    it('应该返回401当用户未登录', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null)

      const request = new Request('http://localhost/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['word-1'], targetChapterId: chapter1Id }),
      })

      const response = await POST(request)

      expect(response.status).toBe(401)
    })

    it('应该拒绝空数组', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request('http://localhost/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({ wordIds: [], targetChapterId: chapter1Id }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('应该拒绝超过100个单词', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const wordIds = Array.from({ length: 101 }, (_, i) => `word-${i}`)

      const request = new Request('http://localhost/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({ wordIds, targetChapterId: chapter1Id }),
      })

      const response = await POST(request)

      expect(response.status).toBe(400)
    })

    it('应该返回404当单词不存在', async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      const request = new Request('http://localhost/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({ wordIds: ['nonexistent-word-id'], targetChapterId: chapter1Id }),
      })

      const response = await POST(request)

      expect(response.status).toBe(404)
    })
  })

  describe('权限测试', () => {
    it('应该返回403当单词属于其他用户的词库', async () => {
      const otherUserId = await createTestUser()
      const otherBookId = await createTestBook(otherUserId)
      const otherChapterId = await createTestChapter(otherBookId, { title: 'Other' })
      const otherWordId = await createTestWord(otherBookId, otherChapterId, { word: 'other' })

      try {
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

        const request = new Request('http://localhost/api/words/batch-move', {
          method: 'POST',
          body: JSON.stringify({
            wordIds: [otherWordId],
            targetChapterId: chapter1Id,
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(403)
      } finally {
        await cleanupTestData(otherUserId)
      }
    })

    it('应该返回404当目标章节属于不同词库', async () => {
      const otherUserId = await createTestUser()
      const otherBookId = await createTestBook(otherUserId)
      const otherChapterId = await createTestChapter(otherBookId, { title: 'Other' })
      const wordId = await createTestWord(testBookId, chapter1Id, { word: 'test' })

      try {
        vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

        const request = new Request('http://localhost/api/words/batch-move', {
          method: 'POST',
          body: JSON.stringify({
            wordIds: [wordId],
            targetChapterId: otherChapterId,
          }),
        })

        const response = await POST(request)

        expect(response.status).toBe(404)
      } finally {
        await cleanupTestData(otherUserId)
      }
    })
  })

  describe('数据一致性测试', () => {
    it('应该正确更新章节计数', async () => {
      // 创建3个单词在chapter1
      await createTestWord(testBookId, chapter1Id, { word: 'word1' })
      await createTestWord(testBookId, chapter1Id, { word: 'word2' })
      await createTestWord(testBookId, chapter1Id, { word: 'word3' })

      vi.mocked(getCurrentUser).mockResolvedValue(mockUser)

      // 移动到chapter2
      const supabase = await createAdminClient()
      const { data: words } = await supabase
        .from('words')
        .select('id')
        .eq('book_id', testBookId)

      const request = new Request('http://localhost/api/words/batch-move', {
        method: 'POST',
        body: JSON.stringify({
          wordIds: words!.map((w: any) => w.id),
          targetChapterId: chapter2Id,
        }),
      })

      const response = await POST(request)

      expect(response.status).toBe(200)

      // 验证章节计数已更新
      const { data: chapter1 } = await supabase
        .from('chapters')
        .select('word_count')
        .eq('id', chapter1Id)
        .single()

      const { data: chapter2 } = await supabase
        .from('chapters')
        .select('word_count')
        .eq('id', chapter2Id)
        .single()

      expect(chapter1?.word_count).toBe(0)
      expect(chapter2?.word_count).toBe(3)
    })
  })
})
