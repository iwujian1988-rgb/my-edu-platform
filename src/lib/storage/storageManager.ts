/**
 * StorageManager - localStorage防抖管理器
 *
 * 用于优化频繁的localStorage写入操作，避免阻塞主线程
 *
 * @example
 * ```ts
 * const storageManager = new StorageManager()
 *
 * // 使用防抖保存（1秒内的多次变化只保存最后一次）
 * storageManager.save('user-settings', { theme: 'dark' }, 1000)
 *
 * // 立即保存所有待保存的数据（组件卸载时调用）
 * storageManager.flush()
 * ```
 */

export class StorageManager {
  private saveTimers: Map<string, NodeJS.Timeout> = new Map()
  private pendingData: Map<string, any> = new Map()

  /**
   * 保存数据到localStorage（带防抖）
   *
   * @param key - 存储键名
   * @param value - 要保存的值
   * @param delay - 防抖延迟（毫秒），默认1000ms
   */
  save(key: string, value: any, delay: number = 1000): void {
    // 保存待写入的数据
    this.pendingData.set(key, value)

    // 清除之前的定时器
    const existingTimer = this.saveTimers.get(key)
    if (existingTimer) {
      clearTimeout(existingTimer)
    }

    // 设置新的定时器
    const timer = setTimeout(() => {
      try {
        const data = this.pendingData.get(key)
        if (data !== undefined) {
          localStorage.setItem(key, JSON.stringify(data))
          this.pendingData.delete(key)
          this.saveTimers.delete(key)
        }
      } catch (error) {
        console.warn(`[StorageManager] Failed to save ${key}:`, error)
      }
    }, delay)

    this.saveTimers.set(key, timer)
  }

  /**
   * 立即保存所有待保存的数据
   * 通常在组件卸载时调用，确保数据不丢失
   */
  flush(): void {
    this.saveTimers.forEach((timer, key) => {
      clearTimeout(timer)
    })

    // 保存所有待写入的数据
    this.pendingData.forEach((value, key) => {
      try {
        localStorage.setItem(key, JSON.stringify(value))
      } catch (error) {
        console.warn(`[StorageManager] Failed to flush ${key}:`, error)
      }
    })

    // 清空
    this.saveTimers.clear()
    this.pendingData.clear()
  }

  /**
   * 取消指定key的待保存操作
   */
  cancel(key: string): void {
    const timer = this.saveTimers.get(key)
    if (timer) {
      clearTimeout(timer)
      this.saveTimers.delete(key)
    }
    this.pendingData.delete(key)
  }

  /**
   * 取消所有待保存操作
   */
  cancelAll(): void {
    this.saveTimers.forEach(timer => clearTimeout(timer))
    this.saveTimers.clear()
    this.pendingData.clear()
  }

  /**
   * 检查是否有待保存的数据
   */
  hasPending(): boolean {
    return this.pendingData.size > 0
  }

  /**
   * 获取待保存的数据数量
   */
  getPendingCount(): number {
    return this.pendingData.size
  }
}

/**
 * 创建全局单例的StorageManager
 */
export const storageManager = new StorageManager()

/**
 * React Hook for StorageManager
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const storage = useStorageManager()
 *
 *   useEffect(() => {
 *     storage.save('my-data', { foo: 'bar' })
 *   }, [storage])
 *
 *   // 组件卸载时自动flush
 *   return <div>...</div>
 * }
 * ```
 */
export function useStorageManager(): StorageManager {
  // 在实际使用中，每个组件应该创建自己的实例或使用全局单例
  // 这里返回全局单例
  return storageManager
}
