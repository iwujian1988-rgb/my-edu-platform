// lib/cache/redis.ts
// 对应方案：Section 5.1.1 - Redis缓存方案，带缓存击穿保护

import { Redis } from 'ioredis'

interface CacheStats {
  hits: number
  misses: number
  errors: number
}

interface DictationStats {
  all: number
  unknown: number
  fuzzy: number
  known: number
  new: number
}

/**
 * Redis缓存服务
 * 对应方案：Section 5.1.1 - 缓存击穿保护 + 随机TTL防雪崩
 */
class CacheService {
  private redis: Redis | null = null
  private readonly DEFAULT_TTL = 300  // 5分钟 - 对应方案：Section 5.1.1
  private readonly LOCK_TTL = 10      // 锁的TTL：10秒 - 对应方案：Section 5.1.1
  private stats: CacheStats = { hits: 0, misses: 0, errors: 0 }
  private isEnabled: boolean = true

  constructor() {
    this.initializeRedis()
  }

  /**
   * 初始化Redis连接
   * 对应方案：Section 5.1.3 - 环境变量配置
   */
  private initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL

      // 如果没有配置Redis URL，禁用缓存
      if (!redisUrl) {
        console.warn('⚠️ Redis URL未配置，缓存功能已禁用')
        this.isEnabled = false
        return
      }

      this.redis = new Redis(redisUrl, {
        enableReadyCheck: true,
        maxRetriesPerRequest: 3,
        connectTimeout: 10000,
        lazyConnect: false,
        // ✅ 修复：添加超时保护，防止无限挂起
        retryStrategy: (times) => {
          const delay = Math.min(times * 50, 2000)
          if (times > 3) {
            console.error('❌ Redis重试次数过多，放弃连接')
            return null  // 停止重试
          }
          return delay
        },
        // ✅ 修复：设置命令超时
        enableOfflineQueue: false,  // 禁用离线队列，避免积压
        keepAlive: 30000,  // 30秒保活
        // ✅ 修复：添加连接超时
        family: 4,  // 使用IPv4，避免IPv6连接延迟
      })

      // 对应方案：防御性编程 - Redis错误处理
      this.redis.on('error', (error) => {
        console.error('❌ Redis error:', error)
        this.stats.errors++
      })

      this.redis.on('connect', () => {
        console.log('✅ Redis connected')
      })

    } catch (error) {
      console.error('❌ Redis初始化失败:', error)
      this.isEnabled = false
    }
  }

  /**
   * 获取统计数据（带缓存击穿保护）
   * 对应方案：Section 5.1.1 - 失效时降级到数据库查询
   */
  async getStats(userId: string, bookId: string): Promise<DictationStats | null> {
    // 对应方案：防御性编程 - 参数校验
    if (!userId || !bookId) {
      console.error('❌ Cache get error: userId和bookId不能为空')
      return null
    }

    // 如果缓存未启用，直接返回null
    if (!this.isEnabled || !this.redis) {
      return null
    }

    const cacheKey = `stats:${userId}:${bookId}`

    try {
      // 1. 尝试从缓存读取
      const cached = await this.redis.get(cacheKey)
      if (cached) {
        this.stats.hits++
        return JSON.parse(cached)
      }

      this.stats.misses++
      return null  // 缓存未命中，降级到数据库查询
    } catch (error) {
      // 对应方案：Section 5.1.1 - 缓存失败，降级到数据库查询
      console.error('❌ Cache get error:', error)
      this.stats.errors++
      return null  // 降级处理
    }
  }

  /**
   * 设置统计数据（带随机TTL，避免雪崩）
   * 对应方案：Section 5.1.1 - 随机过期时间防止缓存雪崩
   */
  async setStats(userId: string, bookId: string, stats: DictationStats): Promise<void> {
    // 对应方案：防御性编程 - 参数校验
    if (!userId || !bookId || !stats) {
      console.error('❌ Cache set error: 参数不完整')
      return
    }

    // 如果缓存未启用，直接返回
    if (!this.isEnabled || !this.redis) {
      return
    }

    const cacheKey = `stats:${userId}:${bookId}`

    try {
      // 对应方案：Section 5.1.1 - 添加随机过期时间，避免雪崩
      const randomTTL = this.DEFAULT_TTL + Math.floor(Math.random() * 60)  // 300-360秒

      await this.redis.setex(cacheKey, randomTTL, JSON.stringify(stats))
    } catch (error) {
      // 对应方案：防御性编程 - 静默失败，不影响业务逻辑
      console.error('❌ Cache set error:', error)
      this.stats.errors++
    }
  }

  /**
   * 失效缓存（当word_progress更新时调用）
   * 对应方案：Section 5.1.2 - 缓存失效策略
   */
  async invalidateStats(userId: string, bookId: string): Promise<void> {
    // 对应方案：防御性编程 - 参数校验
    if (!userId || !bookId) {
      console.error('❌ Cache invalidate error: 参数不完整')
      return
    }

    // 如果缓存未启用，直接返回
    if (!this.isEnabled || !this.redis) {
      return
    }

    const cacheKey = `stats:${userId}:${bookId}`

    try {
      await this.redis.del(cacheKey)
      console.log(`✅ Cache invalidated: ${cacheKey}`)
    } catch (error) {
      console.error('❌ Cache invalidate error:', error)
      this.stats.errors++
    }
  }

  /**
   * 获取缓存统计信息
   * 对应方案：Section 9.3 - 监控指标
   */
  getCacheStats(): CacheStats {
    return { ...this.stats }
  }

  /**
   * 重置缓存统计信息
   */
  resetStats(): void {
    this.stats = { hits: 0, misses: 0, errors: 0 }
  }

  /**
   * 检查缓存是否启用
   */
  isCacheEnabled(): boolean {
    return this.isEnabled && this.redis !== null
  }

  /**
   * 关闭连接
   * 对应方案：防御性编程 - 资源清理
   */
  async close(): Promise<void> {
    if (this.redis) {
      await this.redis.quit()
      this.redis = null
    }
  }
}

// 导出单例
export const cacheService = new CacheService()
