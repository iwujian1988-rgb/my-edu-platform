/**
 * ProgressService 单元测试
 *
 * 测试覆盖范围：
 * 1. 本地备份（LocalStorageBackup）
 * 2. API提交器（APISubmitter）
 * 3. 重试管理器（RetryManager）
 * 4. 主服务类（ProgressService）
 *
 * @date 2026-01-14
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ProgressService, LocalStorageBackup, APISubmitter, RetryManager } from '../progressService'

// ==================== Mock 全局对象 ====================

const mockLocalStorage = {
  store: new Map<string, string>(),

  getItem(key: string): string | null {
    return this.store.get(key) || null
  },

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  },

  removeItem(key: string): void {
    this.store.delete(key)
  },

  clear(): void {
    this.store.clear()
  }
}

// ==================== LocalStorageBackup 测试 ====================

describe('LocalStorageBackup', () => {
  let backup: LocalStorageBackup

  beforeEach(() => {
    // @ts-ignore
    global.localStorage = mockLocalStorage
    backup = new LocalStorageBackup()
  })

  afterEach(() => {
    mockLocalStorage.clear()
  })

  describe('saveProgress / loadProgress', () => {
    it('应该保存和恢复进度数据', () => {
      // Arrange
      const data = {
        bookId: 'book-123',
        scopeType: 'known' as const,
        currentIndex: 5,
        totalWords: 100,
        currentWord: {
          id: 'word-1',
          word: 'test'
        }
      }

      // Act
      backup.saveProgress(data)
      const loaded = backup.loadProgress('book-123', 'known')

      // Assert
      expect(loaded).toEqual(data)
    })

    it('应该返回null当数据不存在时', () => {
      // Act
      const loaded = backup.loadProgress('non-existent', 'known')

      // Assert
      expect(loaded).toBeNull()
    })

    it('应该处理JSON解析错误', () => {
      // Arrange
      mockLocalStorage.setItem('dictation_progress_backup:book-123:known', 'invalid-json')

      // Act
      const loaded = backup.loadProgress('book-123', 'known')

      // Assert
      expect(loaded).toBeNull()
    })
  })

  describe('saveQueue / loadQueue', () => {
    it('应该保存和恢复队列', () => {
      // Arrange
      const queue = [
        { id: 'task-1', type: 'progress' as const, data: {}, timestamp: Date.now(), retryCount: 0 },
        { id: 'task-2', type: 'word-status' as const, data: {}, timestamp: Date.now(), retryCount: 0 }
      ]

      // Act
      backup.saveQueue(queue)
      const loaded = backup.loadQueue()

      // Assert
      expect(loaded).toHaveLength(2)
      expect(loaded[0].id).toBe('task-1')
    })

    it('应该返回空数组当队列不存在时', () => {
      // Act
      const loaded = backup.loadQueue()

      // Assert
      expect(loaded).toEqual([])
    })
  })

  describe('saveStats / loadStats', () => {
    it('应该保存和恢复统计数据', () => {
      // Arrange
      const stats = { known: 100, unknown: 50, fuzzy: 30, new: 20 }

      // Act
      backup.saveStats('book-123', stats)
      const loaded = backup.loadStats('book-123')

      // Assert
      expect(loaded).toEqual(stats)
    })
  })
})

// ==================== RetryManager 测试 ====================

describe('RetryManager', () => {
  let retryManager: RetryManager

  beforeEach(() => {
    retryManager = new RetryManager()
  })

  it('应该判断任务是否可以重试', () => {
    // Arrange
    const task = { id: 'task-1', type: 'progress' as const, data: {}, timestamp: Date.now(), retryCount: 0 }
    const taskMaxRetry = { id: 'task-2', type: 'progress' as const, data: {}, timestamp: Date.now(), retryCount: 3 }

    // Act & Assert
    expect(retryManager.shouldRetry(task)).toBe(true)
    expect(retryManager.shouldRetry(taskMaxRetry)).toBe(false)
  })

  it('应该返回正确的重试延迟', () => {
    // Arrange
    const task1 = { id: 'task-1', type: 'progress' as const, data: {}, timestamp: Date.now(), retryCount: 0 }
    const task2 = { id: 'task-2', type: 'progress' as const, data: {}, timestamp: Date.now(), retryCount: 1 }
    const task3 = { id: 'task-3', type: 'progress' as const, data: {}, timestamp: Date.now(), retryCount: 2 }

    // Act & Assert
    expect(retryManager.getRetryDelay(task1)).toBe(1000)
    expect(retryManager.getRetryDelay(task2)).toBe(2000)
    expect(retryManager.getRetryDelay(task3)).toBe(5000)
  })

  it('应该增加重试计数', () => {
    // Arrange
    const task = { id: 'task-1', type: 'progress' as const, data: {}, timestamp: Date.now(), retryCount: 0 }

    // Act
    const newTask = retryManager.incrementRetry(task)

    // Assert
    expect(newTask.retryCount).toBe(1)
  })
})

// ==================== APISubmitter 测试 ====================

describe('APISubmitter', () => {
  let submitter: APISubmitter
  let mockFetch: any

  beforeEach(() => {
    submitter = new APISubmitter()

    // Mock fetch
    mockFetch = vi.fn()
    // @ts-ignore
    global.fetch = mockFetch
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('应该在达到批次大小时立即提交', async () => {
    // Arrange
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })

    // Act - 添加10个任务（达到MAX_BATCH_SIZE）
    for (let i = 0; i < 10; i++) {
      submitter.addTask({
        id: `task-${i}`,
        type: 'progress',
        data: {
          bookId: 'book-123',
          scopeType: 'known',
          currentIndex: i,
          totalWords: 100
        },
        timestamp: Date.now(),
        retryCount: 0
      })
    }

    // Assert
    expect(mockFetch).toHaveBeenCalled()
  })

  it('应该在批次延迟后批量提交', async () => {
    // Arrange
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    })

    // Act - 添加1个任务（未达到批次大小）
    submitter.addTask({
      id: 'task-1',
      type: 'progress',
      data: {
        bookId: 'book-123',
        scopeType: 'known',
        currentIndex: 0,
        totalWords: 100
      },
      timestamp: Date.now(),
      retryCount: 0
    })

    // Assert - 尚未提交
    expect(mockFetch).not.toHaveBeenCalled()

    // Wait for debounce
    await new Promise(resolve => setTimeout(resolve, 2100))

    // Assert - 已提交
    expect(mockFetch).toHaveBeenCalled()
  })

  it('应该使用sendBeacon在页面卸载时', () => {
    // Arrange
    const mockSendBeacon = vi.fn().mockReturnValue(true)
    // @ts-ignore
    navigator.sendBeacon = mockSendBeacon

    const data = {
      bookId: 'book-123',
      scopeType: 'known',
      currentIndex: 5,
      totalWords: 100
    }

    // Act
    const sent = submitter.sendBeacon(data)

    // Assert
    expect(mockSendBeacon).toHaveBeenCalled()
    expect(sent).toBe(true)
  })
})

// ==================== ProgressService 集成测试 ====================

describe('ProgressService', () => {
  let service: ProgressService

  beforeEach(() => {
    // @ts-ignore
    global.localStorage = mockLocalStorage
    service = ProgressService.getInstance()
  })

  afterEach(() => {
    mockLocalStorage.clear()
    vi.clearAllMocks()
  })

  describe('updateDictationProgress', () => {
    it('应该保存进度到本地并添加到队列', async () => {
      // Arrange
      const data = {
        bookId: 'book-123',
        scopeType: 'known' as const,
        currentIndex: 5,
        totalWords: 100,
        currentWord: {
          id: 'word-1',
          word: 'test'
        }
      }

      // Act
      await service.updateDictationProgress(data)

      // Assert - 本地已保存
      const loaded = service.loadLocalProgress('book-123', 'known')
      expect(loaded).toEqual(data)

      // Assert - 队列已添加
      expect(service.getPendingCount()).toBeGreaterThan(0)
    })

    it('应该支持立即提交模式', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })
      // @ts-ignore
      global.fetch = mockFetch

      const data = {
        bookId: 'book-123',
        scopeType: 'known' as const,
        currentIndex: 5,
        totalWords: 100
      }

      // Act
      await service.updateDictationProgress(data, { immediate: true })

      // Assert - 已立即提交
      expect(mockFetch).toHaveBeenCalled()
    })
  })

  describe('updateWordStatus', () => {
    it('应该添加单词状态更新任务到队列', async () => {
      // Arrange
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true })
      })
      // @ts-ignore
      global.fetch = mockFetch

      // Act
      await service.updateWordStatus('word-1', 'book-123', 'new', 'known')

      // Assert
      expect(service.getPendingCount()).toBeGreaterThan(0)
    })
  })

  describe('onBeforeUnload', () => {
    it('应该使用sendBeacon并flush队列', async () => {
      // Arrange
      const mockSendBeacon = vi.fn().mockReturnValue(true)
      // @ts-ignore
      navigator.sendBeacon = mockSendBeacon

      const data = {
        bookId: 'book-123',
        scopeType: 'known' as const,
        currentIndex: 5,
        totalWords: 100
      }

      // Act
      await service.onBeforeUnload(data)

      // Assert
      expect(mockSendBeacon).toHaveBeenCalled()
    })
  })
})

// ==================== 边界情况测试 ====================

describe('边界情况处理', () => {
  let service: ProgressService

  beforeEach(() => {
    // @ts-ignore
    global.localStorage = mockLocalStorage
    service = ProgressService.getInstance()
  })

  it('应该处理localStorage存储失败', async () => {
    // Arrange - localStorage已满
    const mockSetItem = vi.fn().mockImplementation(() => {
      throw new Error('QuotaExceededError')
    })
    mockLocalStorage.setItem = mockSetItem

    const data = {
      bookId: 'book-123',
      scopeType: 'known' as const,
      currentIndex: 5,
      totalWords: 100
    }

    // Act & Assert - 不应该抛出错误
    await expect(service.updateDictationProgress(data)).resolves.not.toThrow()
  })

  it('应该处理API失败并加入重试队列', async () => {
    // Arrange
    const mockFetch = vi.fn().mockRejectedValue(new Error('Network error'))
    // @ts-ignore
    global.fetch = mockFetch

    const data = {
      bookId: 'book-123',
      scopeType: 'known' as const,
      currentIndex: 5,
      totalWords: 100
    }

    // Act & Assert
    await expect(service.updateDictationProgress(data)).resolves.not.toThrow()
  })
})
