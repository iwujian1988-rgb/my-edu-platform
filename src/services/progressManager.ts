// src/services/progressManager.ts
// 对应方案：Section 6.5 - 听写进度管理器

import { dictationService } from './dictationService'
import { DictationScopeType } from '@/types/dictation'

interface PendingSave {
  index: number
  totalWords: number
}

/**
 * 听写进度管理器
 * 对应方案：Section 6.5 - 职责：防抖保存、批量保存、关键场景立即保存
 */
class DictationProgressManager {
  // 对应方案：Section 6.5 - 待保存进度队列
  private pendingSaves = new Map<string, PendingSave>()
  private saveTimer: NodeJS.Timeout | null = null
  private readonly DEBOUNCE_DELAY = 1000  // 对应方案：Section 6.5 - 1秒防抖

  /**
   * 保存进度（防抖）
   * 对应方案：Section 6.5 - 防抖保存实现
   */
  saveProgress(
    bookId: string,
    scopeType: DictationScopeType,
    currentIndex: number,
    totalWords: number
  ): void {
    // 对应方案：防御性编程 - 参数校验
    if (!bookId || !scopeType) {
      console.error('❌ [ProgressManager] bookId和scopeType不能为空')
      return
    }

    if (currentIndex < 0 || totalWords < 0) {
      console.error('❌ [ProgressManager] currentIndex和totalWords不能为负数')
      return
    }

    const key = `${bookId}:${scopeType}`

    // 对应方案：Section 6.5 - 1. 累积待保存的进度
    this.pendingSaves.set(key, { index: currentIndex, totalWords })

    // 对应方案：Section 6.5 - 2. 清除之前的定时器
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
    }

    // 对应方案：Section 6.5 - 3. 设置新的防抖定时器
    this.saveTimer = setTimeout(async () => {
      await this.flush()
    }, this.DEBOUNCE_DELAY)
  }

  /**
   * 立即保存所有待保存的进度（用于页面卸载等关键场景）
   * 对应方案：Section 6.5 - 批量保存实现
   */
  async flush(): Promise<void> {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer)
      this.saveTimer = null
    }

    if (this.pendingSaves.size === 0) {
      return
    }

    console.log(`💾 [ProgressManager] 批量保存 ${this.pendingSaves.size} 个进度`)

    // 对应方案：Section 6.5 - 批量保存所有待保存的进度
    const savePromises = Array.from(this.pendingSaves.entries()).map(
      async ([key, { index, totalWords }]) => {
        const [bookId, scopeType] = key.split(':')

        try {
          await dictationService.saveProgress(bookId, scopeType, index, totalWords)
          console.log(`✅ 保存成功: ${key} -> ${index}`)
        } catch (error) {
          console.error(`❌ 保存失败: ${key}`, error)
        }
      }
    )

    await Promise.all(savePromises)

    // 对应方案：Section 6.5 - 清空待保存队列
    this.pendingSaves.clear()
  }

  /**
   * 获取待保存的进度数量
   * 对应方案：Section 6.5 - 调试辅助方法
   */
  getPendingCount(): number {
    return this.pendingSaves.size
  }

  /**
   * 获取所有待保存的进度键
   * 对应方案：调试辅助方法
   */
  getPendingKeys(): string[] {
    return Array.from(this.pendingSaves.keys())
  }
}

// 导出单例
export const progressManager = new DictationProgressManager()
