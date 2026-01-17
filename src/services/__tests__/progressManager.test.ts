// src/services/__tests__/progressManager.test.ts
// 对应方案：Section 8.1 - ProgressManager单元测试

import { progressManager } from '../progressManager'
import { dictationService } from '../dictationService'

// Mock dictationService
vi.mock('../dictationService')

describe('ProgressManager', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.runOnlyPendingTimers()
    vi.useRealTimers()
  })

  // 对应方案：Section 8.1 - 防抖测试
  describe('saveProgress', () => {
    it('应该在防抖延迟后批量保存', async () => {
      ;(dictationService.saveProgress as any).mockResolvedValue(undefined)

      // 调用3次保存
      progressManager.saveProgress('book_1', 'unknown', 5, 100)
      progressManager.saveProgress('book_1', 'unknown', 6, 100)
      progressManager.saveProgress('book_1', 'unknown', 7, 100)

      // 立即检查，应该还没有保存
      expect(dictationService.saveProgress).not.toHaveBeenCalled()

      // 快进时间到防抖延迟后
      vi.advanceTimersByTime(1000)

      // 等待异步操作完成
      await new Promise(resolve => setImmediate(resolve))

      // 应该只保存最后一次的值
      expect(dictationService.saveProgress).toHaveBeenCalledTimes(1)
      expect(dictationService.saveProgress).toHaveBeenCalledWith('book_1', 'unknown', 7, 100)
    })

    it('应该在参数无效时记录错误', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation()

      progressManager.saveProgress('', 'unknown', 5, 100)
      progressManager.saveProgress('book_1', '' as any, 5, 100)
      progressManager.saveProgress('book_1', 'unknown', -1, 100)

      expect(consoleSpy).toHaveBeenCalledTimes(3)

      consoleSpy.mockRestore()
    })
  })

  // 对应方案：Section 8.1 - flush测试
  describe('flush', () => {
    it('应该立即保存所有待保存的进度', async () => {
      ;(dictationService.saveProgress as any).mockResolvedValue(undefined)

      // 添加3个待保存项
      progressManager.saveProgress('book_1', 'unknown', 5, 100)
      progressManager.saveProgress('book_2', 'fuzzy', 10, 200)
      progressManager.saveProgress('book_3', 'known', 15, 300)

      // 手动触发flush
      await progressManager.flush()

      // 应该保存所有3项
      expect(dictationService.saveProgress).toHaveBeenCalledTimes(3)
      expect(dictationService.saveProgress).toHaveBeenCalledWith('book_1', 'unknown', 5, 100)
      expect(dictationService.saveProgress).toHaveBeenCalledWith('book_2', 'fuzzy', 10, 200)
      expect(dictationService.saveProgress).toHaveBeenCalledWith('book_3', 'known', 15, 300)
    })

    it('应该在空队列时不执行任何操作', async () => {
      await progressManager.flush()

      expect(dictationService.saveProgress).not.toHaveBeenCalled()
    })
  })

  // 对应方案：Section 8.1 - 辅助方法测试
  describe('getPendingCount', () => {
    it('应该返回待保存的数量', () => {
      expect(progressManager.getPendingCount()).toBe(0)

      progressManager.saveProgress('book_1', 'unknown', 5, 100)
      progressManager.saveProgress('book_2', 'unknown', 10, 100)

      expect(progressManager.getPendingCount()).toBe(2)
    })
  })

  describe('getPendingKeys', () => {
    it('应该返回所有待保存的键', () => {
      progressManager.saveProgress('book_1', 'unknown', 5, 100)
      progressManager.saveProgress('book_2', 'fuzzy', 10, 100)

      const keys = progressManager.getPendingKeys()

      expect(keys).toContain('book_1:unknown')
      expect(keys).toContain('book_2:fuzzy')
      expect(keys).toHaveLength(2)
    })
  })
})
