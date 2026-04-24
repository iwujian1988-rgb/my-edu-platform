/**
 * 缓存失效工具
 *
 * 管理员修改数据后主动清除对应 Redis 缓存，确保用户立即看到变更。
 * 所有操作都是异步非阻塞的，不影响管理接口的响应速度。
 */

import { invalidatePattern, deleteCache } from './api-cache'

/** 视频更新/删除后清除相关缓存 */
export async function invalidateVideoCache(videoId?: string, creatorId?: string): Promise<void> {
  const tasks: Promise<void>[] = [
    // 清除所有用户的视频列表缓存
    invalidatePattern('videos:list:*'),
    // 清除可用语言缓存
    deleteCache('videos:available_languages'),
  ]

  // 清除视频详情页的静态数据缓存
  if (videoId) {
    tasks.push(deleteCache(`video:static:${videoId}`))
  }

  // 清除播主内容缓存
  if (creatorId) {
    tasks.push(invalidatePattern(`creator:content:${creatorId}:*`))
    tasks.push(deleteCache(`creator:info:${creatorId}`))
  }

  // 不阻塞调用方，静默执行
  Promise.all(tasks).catch(() => {})
}

/** 用户权限变更后清除该用户的所有缓存 */
export async function invalidateUserCache(userId: string): Promise<void> {
  Promise.all([
    // 清除用户权限信息缓存
    deleteCache(`videos:user_info:${userId}`),
    // 清除该用户的视频列表缓存
    invalidatePattern(`videos:list:${userId}:*`),
  ]).catch(() => {})
}

/** 批量发布后清除全局缓存 */
export async function invalidatePublishCache(): Promise<void> {
  Promise.all([
    invalidatePattern('videos:list:*'),
    deleteCache('videos:available_languages'),
    // 播主内容缓存无法精确清除（不知道影响了哪些 creator），用通配符
    invalidatePattern('creator:content:*'),
    invalidatePattern('creator:info:*'),
  ]).catch(() => {})
}
