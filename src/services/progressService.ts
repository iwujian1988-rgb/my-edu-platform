/**
 * ProgressService - 统一进度管理服务
 *
 * 功能特性：
 * 1. 本地备份（LocalStorage）- 防止数据丢失
 * 2. 批量提交（Batch API）- 提升性能
 * 3. 错误重试（Retry Queue）- 保证可靠性
 * 4. sendBeacon支持 - 页面卸载时可靠提交
 *
 * @date 2026-01-14
 */

// ==================== 类型定义 ====================

/**
 * 任务类型
 */
export type TaskType = 'progress' | 'word-status'

/**
 * 任务接口
 */
export interface Task {
  id: string
  type: TaskType
  data: Record<string, unknown>
  timestamp: number
  retryCount: number
}

/**
 * 进度数据接口
 */
export interface ProgressData {
  bookId: string
  scopeType: 'all' | 'unknown' | 'fuzzy' | 'known' | 'new'
  currentIndex: number
  totalWords: number
  currentWord?: {
    id: string
    word: string
  }
}

/**
 * 统计数据接口
 */
export interface StatsData {
  known: number
  unknown: number
  fuzzy: number
  new: number
}

/**
 * 服务选项
 */
export interface ServiceOptions {
  immediate?: boolean
}

// ==================== 常量定义 ====================

const MAX_BATCH_SIZE = 10
const BATCH_DELAY_MS = 2000
const MAX_RETRY_COUNT = 3
const RETRY_DELAYS = [1000, 2000, 5000]

// ==================== LocalStorageBackup ====================

/**
 * LocalStorageBackup - 本地备份管理器
 *
 * 职责：
 * 1. 保存进度数据到本地存储
 * 2. 保存任务队列到本地存储
 * 3. 保存统计数据到本地存储
 * 4. 提供数据恢复功能
 */
export class LocalStorageBackup {
  private readonly PROGRESS_KEY_PREFIX = 'dictation_progress_backup'
  private readonly QUEUE_KEY = 'dictation_task_queue'
  private readonly STATS_KEY_PREFIX = 'dictation_stats'

  /**
   * 保存进度数据到本地存储
   */
  saveProgress(data: ProgressData): void {
    try {
      const key = `${this.PROGRESS_KEY_PREFIX}:${data.bookId}:${data.scopeType}`
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      // 静默处理存储错误（如配额超限）
      console.warn('[LocalStorageBackup] Failed to save progress:', error)
    }
  }

  /**
   * 从本地存储加载进度数据
   */
  loadProgress(bookId: string, scopeType: string): ProgressData | null {
    try {
      const key = `${this.PROGRESS_KEY_PREFIX}:${bookId}:${scopeType}`
      const data = localStorage.getItem(key)
      if (!data) return null

      return JSON.parse(data) as ProgressData
    } catch (error) {
      console.warn('[LocalStorageBackup] Failed to load progress:', error)
      return null
    }
  }

  /**
   * 保存任务队列到本地存储
   */
  saveQueue(queue: Task[]): void {
    try {
      localStorage.setItem(this.QUEUE_KEY, JSON.stringify(queue))
    } catch (error) {
      console.warn('[LocalStorageBackup] Failed to save queue:', error)
    }
  }

  /**
   * 从本地存储加载任务队列
   */
  loadQueue(): Task[] {
    try {
      const data = localStorage.getItem(this.QUEUE_KEY)
      if (!data) return []

      return JSON.parse(data) as Task[]
    } catch (error) {
      console.warn('[LocalStorageBackup] Failed to load queue:', error)
      return []
    }
  }

  /**
   * 清空任务队列
   */
  clearQueue(): void {
    try {
      localStorage.removeItem(this.QUEUE_KEY)
    } catch (error) {
      console.warn('[LocalStorageBackup] Failed to clear queue:', error)
    }
  }

  /**
   * 保存统计数据到本地存储
   */
  saveStats(bookId: string, stats: StatsData): void {
    try {
      const key = `${this.STATS_KEY_PREFIX}:${bookId}`
      localStorage.setItem(key, JSON.stringify(stats))
    } catch (error) {
      console.warn('[LocalStorageBackup] Failed to save stats:', error)
    }
  }

  /**
   * 从本地存储加载统计数据
   */
  loadStats(bookId: string): StatsData | null {
    try {
      const key = `${this.STATS_KEY_PREFIX}:${bookId}`
      const data = localStorage.getItem(key)
      if (!data) return null

      return JSON.parse(data) as StatsData
    } catch (error) {
      console.warn('[LocalStorageBackup] Failed to load stats:', error)
      return null
    }
  }
}

// ==================== RetryManager ====================

/**
 * RetryManager - 重试管理器
 *
 * 职责：
 * 1. 判断任务是否可以重试
 * 2. 计算重试延迟时间
 * 3. 增加重试计数
 */
export class RetryManager {
  /**
   * 判断任务是否可以重试
   */
  shouldRetry(task: Task): boolean {
    return task.retryCount < MAX_RETRY_COUNT
  }

  /**
   * 获取重试延迟时间（指数退避）
   */
  getRetryDelay(task: Task): number {
    const index = Math.min(task.retryCount, RETRY_DELAYS.length - 1)
    return RETRY_DELAYS[index]
  }

  /**
   * 增加重试计数
   */
  incrementRetry(task: Task): Task {
    return {
      ...task,
      retryCount: task.retryCount + 1
    }
  }
}

// ==================== APISubmitter ====================

/**
 * APISubmitter - API提交器
 *
 * 职责：
 * 1. 批量提交任务到API
 * 2. 使用sendBeacon在页面卸载时提交
 * 3. 处理批次提交逻辑（达到批次大小或延迟）
 */
export class APISubmitter {
  private queue: Task[] = []
  private backup: LocalStorageBackup
  private retryManager: RetryManager
  private batchTimer: ReturnType<typeof setTimeout> | null = null

  constructor() {
    this.backup = new LocalStorageBackup()
    this.retryManager = new RetryManager()

    // 从本地存储恢复队列
    this.queue = this.backup.loadQueue()

    // 启动批处理定时器
    this.startBatchTimer()
  }

  /**
   * 添加任务到队列
   */
  addTask(task: Task): void {
    this.queue.push(task)

    // 立即保存到本地存储
    this.backup.saveQueue(this.queue)

    // 如果达到批次大小，立即提交
    if (this.queue.length >= MAX_BATCH_SIZE) {
      this.flush()
    } else {
      // 否则，启动/重启批处理定时器
      this.startBatchTimer()
    }
  }

  /**
   * 启动批处理定时器
   */
  private startBatchTimer(): void {
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
    }

    this.batchTimer = setTimeout(() => {
      this.flush()
    }, BATCH_DELAY_MS)
  }

  /**
   * 批量提交任务
   */
  private async flush(): Promise<void> {
    if (this.queue.length === 0) {
      console.log('[APISubmitter] Flush called but queue is empty')
      return
    }

    console.log('[APISubmitter] Flushing queue, size:', this.queue.length)

    // 停止定时器
    if (this.batchTimer) {
      clearTimeout(this.batchTimer)
      this.batchTimer = null
    }

    // 取出当前批次
    const batch = [...this.queue]
    this.queue = []

    console.log('[APISubmitter] Submitting batch of', batch.length, 'tasks')
    // 提交批次
    await this.submitBatch(batch)

    // 如果还有任务，重新启动定时器
    if (this.queue.length > 0) {
      this.startBatchTimer()
    }
  }

  /**
   * 提交批次到API
   */
  private async submitBatch(batch: Task[]): Promise<void> {
    const results = await Promise.allSettled(
      batch.map(task => this.submitTask(task))
    )

    // 处理失败的任务
    const failedTasks: Task[] = []
    results.forEach((result, index) => {
      if (result.status === 'rejected') {
        const task = batch[index]
        if (this.retryManager.shouldRetry(task)) {
          const retriedTask = this.retryManager.incrementRetry(task)
          failedTasks.push(retriedTask)
        }
      }
    })

    // 将失败的任务重新加入队列
    if (failedTasks.length > 0) {
      this.queue.unshift(...failedTasks)
      this.backup.saveQueue(this.queue)
      this.startBatchTimer()
    } else {
      // 所有任务成功，清空本地存储
      this.backup.clearQueue()
    }
  }

  /**
   * 提交单个任务
   */
  private async submitTask(task: Task): Promise<void> {
    const endpoint = task.type === 'progress'
      ? '/api/user-preferences'
      : '/api/word-progress'

    console.log('[APISubmitter] Submitting task to', endpoint, task.data)

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task.data)
    })

    console.log('[APISubmitter] Response status:', response.status)

    if (!response.ok) {
      // 尝试读取错误详情
      let errorDetails = response.statusText
      try {
        const errorData = await response.json()
        errorDetails = JSON.stringify(errorData)
      } catch (e) {
        // 无法解析错误响应
      }
      console.error('[APISubmitter] API request failed:', response.status, errorDetails)
      throw new Error(`API request failed: ${response.status} ${errorDetails}`)
    }

    const result = await response.json()
    // ✅ 详细打印响应数据，特别是 last_resume_state 字段
    if (endpoint === '/api/user-preferences' && result.data) {
      console.log('[APISubmitter] ✅ 保存成功！返回的数据:', JSON.stringify(result.data, null, 2))
      console.log('[APISubmitter] last_resume_state 字段:', JSON.stringify(result.data.last_resume_state || result.data.preferences?.last_resume_state, null, 2))
    }
  }

  /**
   * 使用sendBeacon提交数据（页面卸载时）
   */
  sendBeacon(data: Record<string, unknown>): boolean {
    const endpoint = '/api/user-preferences'

    try {
      const blob = new Blob([JSON.stringify(data)], {
        type: 'application/json'
      })

      return navigator.sendBeacon(endpoint, blob)
    } catch (error) {
      console.warn('[APISubmitter] sendBeacon failed:', error)
      return false
    }
  }

  /**
   * 获取待处理任务数量
   */
  getPendingCount(): number {
    return this.queue.length
  }
}

// ==================== ProgressService ====================

/**
 * ProgressService - 统一进度管理服务
 *
 * 职责：
 * 1. 管理听写进度更新
 * 2. 管理单词状态更新
 * 3. 提供本地备份恢复
 * 4. 处理页面卸载时的数据提交
 */
export class ProgressService {
  private static instance: ProgressService
  private backup: LocalStorageBackup
  private submitter: APISubmitter

  private constructor() {
    this.backup = new LocalStorageBackup()
    this.submitter = new APISubmitter()
  }

  /**
   * 获取单例实例
   */
  static getInstance(): ProgressService {
    if (!ProgressService.instance) {
      ProgressService.instance = new ProgressService()
    }
    return ProgressService.instance
  }

  /**
   * 更新听写进度
   */
  async updateDictationProgress(
    data: ProgressData,
    options: ServiceOptions = {}
  ): Promise<void> {
    console.log('[ProgressService] updateDictationProgress called:', data)

    // 1. 立即保存到本地存储
    this.backup.saveProgress(data)

    // 2. 添加到提交队列
    // ⚠️ 注意：API 期望下划线命名 (book_id)，不要 preference 包装
    const task: Task = {
      id: `progress-${Date.now()}-${Math.random()}`,
      type: 'progress',
      data: {
        book_id: data.bookId,  // 使用下划线命名
        last_resume_state: {  // 直接放在顶层，不要 preference 包装
          mode: 'dictation',
          bookId: data.bookId,
          updatedAt: Date.now(),
          context: {
            scopeType: data.scopeType,
            currentIndex: data.currentIndex,
            totalWords: data.totalWords,
            currentWord: data.currentWord
          }
        }
      },
      timestamp: Date.now(),
      retryCount: 0
    }

    console.log('[ProgressService] Adding task to queue:', task)
    this.submitter.addTask(task)

    // 3. 如果是立即模式，强制刷新
    if (options.immediate) {
      console.log('[ProgressService] Immediate mode, flushing queue...')
      await this.submitter['flush']()
    }
  }

  /**
   * 更新单词状态
   */
  async updateWordStatus(
    wordId: string,
    bookId: string,
    oldStatus: string,
    newStatus: 'known' | 'unknown' | 'fuzzy'
  ): Promise<void> {
    // ⚠️ 注意：API 期望下划线命名 (word_id, book_id)，不是驼峰命名
    const task: Task = {
      id: `word-status-${wordId}-${Date.now()}`,
      type: 'word-status',
      data: {
        word_id: wordId,  // 使用下划线命名
        book_id: bookId,  // 使用下划线命名
        status: newStatus
      },
      timestamp: Date.now(),
      retryCount: 0
    }

    this.submitter.addTask(task)
  }

  /**
   * 从本地加载进度
   */
  loadLocalProgress(bookId: string, scopeType: string): ProgressData | null {
    return this.backup.loadProgress(bookId, scopeType)
  }

  /**
   * 从本地加载统计数据
   */
  loadLocalStats(bookId: string): StatsData | null {
    return this.backup.loadStats(bookId)
  }

  /**
   * 保存统计数据
   */
  saveStats(bookId: string, stats: StatsData): void {
    this.backup.saveStats(bookId, stats)
  }

  /**
   * 获取待处理任务数量
   */
  getPendingCount(): number {
    return this.submitter.getPendingCount()
  }

  /**
   * 页面卸载前的处理
   */
  async onBeforeUnload(data: ProgressData): Promise<void> {
    // 使用sendBeacon确保数据发送
    this.submitter.sendBeacon({
      bookId: data.bookId,
      preference: {
        last_resume_state: {
          mode: 'dictation',
          bookId: data.bookId,
          updatedAt: Date.now(),
          context: {
            scopeType: data.scopeType,
            currentIndex: data.currentIndex,
            totalWords: data.totalWords,
            currentWord: data.currentWord
          }
        }
      }
    })
  }
}

// ==================== 导出单例 ====================

export const progressService = ProgressService.getInstance()
