/**
 * 通用 API 缓存工具
 *
 * 用途：缓存 API 响应和 SSR 数据，减少对 Supabase（美国区域）的重复查询。
 * 设计原则：
 * - 缓存失败永远不阻塞业务逻辑（try/catch + 降级）
 * - 使用 ioredis 单例复用连接
 * - 支持泛型，类型安全
 */

import { Redis } from 'ioredis'

/** Redis 单例（跨请求复用） */
let redisInstance: Redis | null = null
let redisDisabled = false
/** 禁用后自动恢复的时间（毫秒） */
let redisRetryAt = 0

const REDIS_CONNECT_TIMEOUT = 5000
const MAX_RETRIES = 3
const REDIS_RETRY_INTERVAL = 30000 // 禁用后 30 秒自动重试
const REDIS_COMMAND_TIMEOUT = 500 // 单条命令超时，防止 Redis 慢响应阻塞 API

/** 获取 Redis 单例，连接失败时返回 null */
async function getRedis(): Promise<Redis | null> {
  // 禁用后超过重试间隔，自动尝试重新连接
  if (redisDisabled) {
    if (Date.now() < redisRetryAt) return null
    // 关闭旧连接再重试
    if (redisInstance) {
      try { redisInstance.disconnect() } catch { /* 忽略 */ }
      redisInstance = null
    }
    redisDisabled = false
    console.log('[api-cache] 尝试重新连接 Redis...')
  }
  if (redisInstance) return redisInstance

  const redisUrl = process.env.REDIS_URL
  if (!redisUrl) {
    redisDisabled = true
    return null
  }

  try {
    const client = new Redis(redisUrl, {
      maxRetriesPerRequest: 2,
      connectTimeout: REDIS_CONNECT_TIMEOUT,
      enableOfflineQueue: false,
      keepAlive: 30000,
      retryStrategy(times) {
        if (times > MAX_RETRIES) {
          console.error('[api-cache] Redis 连接失败次数过多，30 秒后自动重试')
          redisDisabled = true
          redisRetryAt = Date.now() + REDIS_RETRY_INTERVAL
          return null
        }
        return Math.min(times * 100, 2000)
      },
    })

    client.on('error', (err) => {
      console.error('[api-cache] Redis error:', (err as Error).message)
    })

    // 等待连接就绪或超时
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Redis connect timeout'))
      }, REDIS_CONNECT_TIMEOUT)

      client.once('ready', () => {
        clearTimeout(timer)
        resolve()
      })
      client.once('error', () => {
        clearTimeout(timer)
        reject(new Error('Redis connect error'))
      })
    })

    redisInstance = client
    return redisInstance
  } catch (err) {
    console.error('[api-cache] Redis 初始化失败，30 秒后自动重试:', (err as Error).message)
    redisDisabled = true
    redisRetryAt = Date.now() + REDIS_RETRY_INTERVAL
    return null
  }
}

/**
 * 从缓存读取数据
 *
 * @returns 缓存命中返回反序列化后的数据，未命中或出错返回 null
 */
/** Redis 命令超时包装，防止慢响应阻塞 API */
function withCommandTimeout<T>(promise: Promise<T>, label: string): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn(`[api-cache] ${label} 超时 ${REDIS_COMMAND_TIMEOUT}ms，降级`)
        resolve(null)
      }, REDIS_COMMAND_TIMEOUT)
    ),
  ])
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const redis = await getRedis()
    if (!redis) return null

    const raw = await withCommandTimeout(redis.get(key), 'getCached')
    if (!raw) return null

    return JSON.parse(raw) as T
  } catch {
    // 缓存读失败 → 降级到直接查 DB
    return null
  }
}

/**
 * 写入缓存
 *
 * @param ttl 过期时间（秒）
 */
export async function setCache<T>(key: string, data: T, ttl: number): Promise<void> {
  try {
    const redis = await getRedis()
    if (!redis) return

    await withCommandTimeout(redis.setex(key, ttl, JSON.stringify(data)), 'setCache')
  } catch {
    // 缓存写失败 → 静默忽略
  }
}

/**
 * 删除指定缓存 key
 */
export async function deleteCache(key: string): Promise<void> {
  try {
    const redis = await getRedis()
    if (!redis) return

    await withCommandTimeout(redis.del(key), 'deleteCache')
  } catch {
    // 静默忽略
  }
}

/**
 * 按通配符模式批量删除缓存
 *
 * 例：invalidatePattern('videos:list:*')
 */
export async function invalidatePattern(pattern: string): Promise<void> {
  try {
    const redis = await getRedis()
    if (!redis) return

    const keys = await withCommandTimeout(redis.keys(pattern), 'invalidatePattern') as string[] | null
    if (keys && keys.length > 0) {
      await withCommandTimeout(redis.del(...keys), 'invalidatePattern-del')
    }
  } catch {
    // 静默忽略
  }
}

/**
 * 惯用缓存模式：先查缓存，未命中则执行 fetcher 并回填。
 *
 * @param key    缓存 key
 * @param ttl    过期时间（秒）
 * @param fetcher 数据获取函数（仅在缓存未命中时执行）
 */
export async function cacheable<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const cached = await getCached<T>(key)
  if (cached !== null) {
    return cached
  }

  const data = await fetcher()

  // 回填缓存（不 await，不阻塞响应）
  setCache(key, data, ttl).catch(() => {})

  return data
}
