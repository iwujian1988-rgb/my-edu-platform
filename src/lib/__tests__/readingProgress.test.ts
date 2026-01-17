/**
 * Reading Progress 工具函数测试
 * 测试阅读进度相关的工具函数
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getReadingProgress, saveReadingProgress, clearReadingProgress } from '../readingProgress'

// Mock fetch
global.fetch = vi.fn() as any

describe('readingProgress - 工具函数测试', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockReset()
  })

  describe('getReadingProgress - 获取阅读进度', () => {
    it('应该正确获取保存的阅读进度', async () => {
      // Arrange
      const mockProgress = {
        page: 3,
        theme: 'A-日常',
        scenario: '购物',
        status: 'fuzzy'
      }

      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            reading_progress: mockProgress
          }
        })
      } as any)

      // Act
      const result = await getReadingProgress('test-book-id')

      // Assert
      expect(result).toEqual(mockProgress)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('没有进度时应返回null', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          data: {
            reading_progress: null
          }
        })
      } as any)

      // Act
      const result = await getReadingProgress('test-book-id')

      // Assert
      expect(result).toBeNull()
    })

    it('API错误时应返回null', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      } as any)

      // Act
      const result = await getReadingProgress('test-book-id')

      // Assert
      expect(result).toBeNull()
    })
  })

  describe('saveReadingProgress - 保存阅读进度', () => {
    /**
     * 表格驱动测试：各种进度保存场景
     */
    const saveCases = [
      {
        name: 'TC-SAVE-001: 保存第2页进度',
        input: { page: 2, theme: 'all', scenario: 'all', status: 'all' },
        expected: true,
        reason: '基本保存功能'
      },
      {
        name: 'TC-SAVE-002: 保存带筛选条件的进度',
        input: { page: 5, theme: 'A-日常', scenario: '购物', status: 'fuzzy' },
        expected: true,
        reason: '带筛选条件的保存'
      },
      {
        name: 'TC-SAVE-003: 保存第1页进度',
        input: { page: 1, theme: 'all', scenario: 'all', status: 'all' },
        expected: true,
        reason: '第1页也可以保存'
      }
    ]

    saveCases.forEach(({ name, input, expected, reason }) => {
      it(`${name} - ${reason}`, async () => {
        // Arrange
        vi.mocked(global.fetch).mockResolvedValueOnce({
          ok: true,
          json: async () => ({ success: true })
        } as any)

        // Act
        const result = await saveReadingProgress('test-book-id', input)

        // Assert
        expect(result).toBe(expected)
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/user-preferences',
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('test-book-id')
          })
        )

        console.log(`✅ ${reason}`)
      })
    })

    it('保存失败时应返回false', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as any)

      // Act
      const result = await saveReadingProgress('test-book-id', { page: 2 })

      // Assert
      expect(result).toBe(false)
    })
  })

  describe('clearReadingProgress - 清除阅读进度', () => {
    it('应该成功清除阅读进度', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      } as any)

      // Act
      const result = await clearReadingProgress('test-book-id')

      // Assert
      expect(result).toBe(true)
      expect(global.fetch).toHaveBeenCalledTimes(1)
    })

    it('清除失败时应返回false', async () => {
      // Arrange
      vi.mocked(global.fetch).mockResolvedValueOnce({
        ok: false,
        status: 500
      } as any)

      // Act
      const result = await clearReadingProgress('test-book-id')

      // Assert
      expect(result).toBe(false)
    })
  })
})

/**
 * 测试统计: 10 个测试用例
 * - getReadingProgress: 3
 * - saveReadingProgress: 4
 * - clearReadingProgress: 2
 */
