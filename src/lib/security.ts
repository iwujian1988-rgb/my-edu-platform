/**
 * 安全防护工具库
 * 功能: IP/设备限流、邀请码防爆破
 */

import { createClient } from './supabase/server'

interface RateLimitConfig {
  maxAttempts: number
  windowHours: number
  lockHours: number
}

/**
 * 检查并记录 IP/设备限流
 * 规则: 单IP 1小时限3次，单设备24小时限1次
 * 使用数据库函数确保原子性
 */
export async function checkRegistrationRateLimit(
  ipAddress: string,
  userAgent?: string
): Promise<{ allowed: boolean; reason?: string; retryAfter?: Date }> {
  const supabase = await createClient()

  try {
    // 调用数据库函数：检查并记录
    const { data, error } = await (supabase as any).rpc('check_and_record_registration_attempt', {
      p_ip_address: ipAddress,
      p_user_agent: userAgent || 'unknown'
    })

    if (error) {
      console.error('[Security] check_and_record_registration_attempt error:', error)
      // 如果函数不存在，回退到允许
      return { allowed: true }
    }

    console.log('[Security] check_and_record_registration_attempt result:', data)

    if (!data.allowed) {
      const retryAfter = data.retry_after ? new Date(data.retry_after) : undefined
      return {
        allowed: false,
        reason: data.reason,
        retryAfter
      }
    }

    return { allowed: true }
  } catch (err) {
    console.error('[Security] checkRegistrationRateLimit error:', err)
    return { allowed: true }
  }
}

/**
 * 记录注册尝试
 */
/**
 * 检查邀请码验证失败次数
 * 规则: 输错5次锁定24小时
 * 不再单独检查，直接在记录失败时原子操作
 */
export async function checkInvitationCodeAttempts(
  code: string,
  ipAddress: string
): Promise<{ allowed: boolean; reason?: string; retryAfter?: Date }> {
  // 这个函数现在只作为占位符，实际逻辑在 recordInvitationCodeFailure 中
  // 直接返回允许，让后续的 recordInvitationCodeFailure 原子处理
  return { allowed: true }
}

/**
 * 记录邀请码验证失败
 * 第5次失败时自动锁定24小时
 * 使用数据库函数确保原子性
 *
 * 注意：这个函数会原子地检查并递增计数
 * 返回值表示是否被锁定
 */
export async function recordInvitationCodeFailure(
  code: string,
  ipAddress: string,
  userAgent?: string
): Promise<{ locked: boolean; reason?: string; retryAfter?: Date }> {
  const supabase = await createClient()

  try {
    // 调用统一的数据库函数：检查并递增
    const { data, error } = await (supabase as any).rpc('check_and_increment_invitation_code_attempts', {
      p_code: code,
      p_ip_address: ipAddress,
      p_user_agent: userAgent || 'unknown'
    })

    if (error) {
      console.error('[Security] check_and_increment_invitation_code_attempts error:', error)
      return { locked: false }
    }

    console.log('[Security] check_and_increment result:', data)

    // 如果返回不允许，说明被锁定了
    if (!data.allowed) {
      return {
        locked: true,
        reason: data.reason,
        retryAfter: data.locked_until ? new Date(data.locked_until) : undefined
      }
    }

    return { locked: false }
  } catch (err) {
    console.error('[Security] recordInvitationCodeFailure error:', err)
    return { locked: false }
  }
}

/**
 * 获取客户端IP地址
 * 从请求头中提取真实IP
 */
export function getClientIp(request: Request): string {
  // 尝试从各种请求头中获取真实IP
  const headers = request.headers
  const forwardedFor = headers.get('x-forwarded-for')
  const realIp = headers.get('x-real-ip')
  const cfConnectingIp = headers.get('cf-connecting-ip') // Cloudflare

  if (forwardedFor) {
    // x-forwarded-for 可能包含多个IP，取第一个
    return forwardedFor.split(',')[0].trim()
  }

  if (realIp) {
    return realIp
  }

  if (cfConnectingIp) {
    return cfConnectingIp
  }

  // 如果都无法获取，返回空字符串（应该在中间件层面处理）
  return ''
}

/**
 * 获取设备指纹
 * 基于 User-Agent 生成简单指纹
 */
export function getDeviceFingerprint(request: Request): string {
  const userAgent = request.headers.get('user-agent') || 'unknown'

  // 简单哈希（生产环境建议使用更复杂的指纹算法）
  // 这里直接返回 user-agent 作为指纹
  // 可以考虑添加更多特征：屏幕分辨率、时区、语言等
  return userAgent
}
