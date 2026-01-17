/**
 * Redis 缓存工具
 * 用于缓存单词数据（有道API响应）
 */

import { Redis } from 'ioredis'

let redisClient: Redis | null = null

/**
 * 获取 Redis 客户端
 */
export async function getRedisClient(): Promise<Redis> {
  if (!redisClient) {
    const redisUrl = process.env.REDIS_URL

    if (!redisUrl) {
      console.warn('REDIS_URL not configured, cache disabled')
      throw new Error('Redis not configured')
    }

    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000)
        return delay
      }
    })

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err)
      redisClient = null
    })
  }

  return redisClient
}

/**
 * 缓存单词数据
 * @param word 单词
 * @param data 单词数据
 * @param ttl 过期时间（秒），默认30天
 */
export async function cacheWordData(
  word: string,
  data: any,
  ttl: number = 30 * 24 * 3600 // 30天
): Promise<void> {
  try {
    const redis = await getRedisClient()
    const key = `word:data:${word.toLowerCase()}`
    await redis.setex(key, ttl, JSON.stringify(data))
    console.log(`[Cache] Cached word: ${word}`)
  } catch (error) {
    console.error('[Cache] Failed to cache word:', error)
    // 缓存失败不影响主流程
  }
}

/**
 * 获取缓存的单词数据
 * @param word 单词
 * @returns 单词数据或null
 */
export async function getCachedWordData(
  word: string
): Promise<any | null> {
  try {
    const redis = await getRedisClient()
    const key = `word:data:${word.toLowerCase()}`
    const data = await redis.get(key)

    if (data) {
      console.log(`[Cache] Hit for word: ${word}`)
      return JSON.parse(data)
    }

    console.log(`[Cache] Miss for word: ${word}`)
    return null
  } catch (error) {
    console.error('[Cache] Failed to get cached word:', error)
    return null
  }
}

/**
 * 删除缓存
 * @param pattern 缓存键模式（支持通配符）
 */
export async function invalidateCache(pattern: string): Promise<void> {
  try {
    const redis = await getRedisClient()
    const keys = await redis.keys(pattern)

    if (keys.length > 0) {
      await redis.del(...keys)
      console.log(`[Cache] Invalidated ${keys.length} keys matching: ${pattern}`)
    }
  } catch (error) {
    console.error('[Cache] Failed to invalidate cache:', error)
  }
}

/**
 * 检查 Redis 是否可用
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    const redis = await getRedisClient()
    await redis.ping()
    return true
  } catch (error) {
    console.warn('[Cache] Redis not available:', error)
    return false
  }
}
