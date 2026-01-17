// src/services/__tests__/dictationService.test.ts
// 对应方案：Section 8.1 - DictationService单元测试

import { dictationService } from '../dictationService'

// Mock fetch
global.fetch = vi.fn()

// Mock console methods
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

beforeEach(() => {
  vi.clearAllMocks()
  console.warn = vi.fn()
  console.error = vi.fn()

  // Mock localStorage
  global.localStorage = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn()
  } as any
})

afterEach(() => {
  console.warn = originalConsoleWarn
  console.error = originalConsoleError
})

describe('DictationService', () => {
  // 对应方案：Section 8.1 - getStats测试
  describe('getStats', () => {
    it('应该成功获取统计数据', async () => {
      const mockStats = {
        all: 100,
        unknown: 30,
        fuzzy: 20,
        known: 40,
        new: 10
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockStats })
      })

      const result = await dictationService.getStats('book_123')

      expect(result).toEqual(mockStats)
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/words/stats?bookId=book_123',
        expect.any(Object)
      )
    })

    it('应该在参数为空时抛出错误', async () => {
      await expect(dictationService.getStats('')).rejects.toThrow('bookId不能为空')
    })

    it('应该自动重试失败请求', async () => {
      let attemptCount = 0

      ;(global.fetch as any).mockImplementation(async () => {
        attemptCount++

        if (attemptCount < 3) {
          // 前2次失败
          throw new Error('Network error')
        }

        // 第3次成功
        return {
          ok: true,
          json: async () => ({ success: true, data: { all: 100 } })
        }
      })

      const result = await dictationService.getStats('book_123')

      expect(attemptCount).toBe(3)  // 对应方案：Section 8.1 - 验证重试了3次
      expect(result).toEqual({ all: 100 })
    })

    it('应该在达到最大重试次数后抛出错误', async () => {
      ;(global.fetch as any).mockImplementation(async () => {
        throw new Error('Persistent network error')
      })

      await expect(dictationService.getStats('book_123')).rejects.toThrow('Persistent network error')
    })
  })

  // 对应方案：Section 8.1 - saveProgress测试
  describe('saveProgress', () => {
    it('应该成功保存进度', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { currentIndex: 5 } })
      })

      await expect(
        dictationService.saveProgress('book_123', 'unknown', 5, 100)
      ).resolves.not.toThrow()

      expect(global.fetch).toHaveBeenCalledWith(
        '/api/flashcard-progress',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('"mode":"dictation"')
        })
      )
    })

    it('应该在负数参数时抛出错误', async () => {
      await expect(
        dictationService.saveProgress('book_123', 'unknown', -1, 100)
      ).rejects.toThrow('currentIndex和totalWords不能为负数')
    })

    it('应该在空参数时抛出错误', async () => {
      await expect(
        dictationService.saveProgress('', 'unknown', 5, 100)
      ).rejects.toThrow('bookId和scopeType不能为空')
    })
  })

  // 对应方案：Section 8.1 - getProgress测试
  describe('getProgress', () => {
    it('应该成功获取进度', async () => {
      const mockProgress = {
        currentIndex: 10,
        totalWords: 100,
        lastStudyTime: Date.now()
      }

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockProgress })
      })

      const result = await dictationService.getProgress('book_123', 'unknown')

      expect(result).toEqual(mockProgress)
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('mode=dictation'),
        expect.any(Object)
      )
    })

    it('应该在无进度时返回null', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: null })
      })

      const result = await dictationService.getProgress('book_123', 'unknown')

      expect(result).toBeNull()
    })
  })

  // 对应方案：Section 8.1 - getWords测试
  describe('getWords', () => {
    it('应该成功获取单词列表', async () => {
      const mockWords = [
        { id: '1', word: 'test1' },
        { id: '2', word: 'test2' }
      ]

      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockWords })
      })

      const result = await dictationService.getWords('book_123', 'unknown', false)

      expect(result).toEqual(mockWords)
    })

    it('应该在shuffle=true时添加shuffle参数', async () => {
      ;(global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: [] })
      })

      await dictationService.getWords('book_123', 'unknown', true)

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('shuffle=true'),
        expect.any(Object)
      )
    })
  })
})
