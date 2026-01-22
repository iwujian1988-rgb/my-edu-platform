/**
 * API Client Helper
 *
 * 提供带认证的fetch功能，用于客户端组件调用API路由
 */

import { createClient as createBrowserClient } from '@/lib/supabase/client'

let cachedToken: string | null = null
let tokenExpireTime: number = 0

/**
 * 获取当前用户的access token
 * 使用缓存避免频繁调用
 */
export async function getAccessToken(): Promise<string | null> {
  // 检查缓存是否有效（token有效期通常1小时，我们缓存50分钟）
  if (cachedToken && Date.now() < tokenExpireTime) {
    console.log('🔑 [API] 使用缓存的token')
    return cachedToken
  }

  try {
    // 🔧 Fix: 使用浏览器客户端（createBrowserClient）而不是 supabase-js
    // 因为登录方案使用的是 createBrowserClient，session 存储在 cookies 中
    const supabase = createBrowserClient()

    console.log('🔍 [API] 调用 getSession()...')

    const { data: { session } } = await supabase.auth.getSession()

    console.log('🔍 [API] getSession() 返回:', {
      hasSession: !!session,
      hasAccessToken: !!session?.access_token,
      hasRefreshToken: !!session?.refresh_token,
      userId: session?.user?.id,
      expiresAt: session?.expires_at,
    })

    if (session?.access_token) {
      cachedToken = session.access_token
      tokenExpireTime = Date.now() + (50 * 60 * 1000) // 50分钟后过期
      console.log('✅ [API] Token获取成功')
      return session.access_token
    }

    console.warn('⚠️ [API] Session不存在或无access_token')
    return null
  } catch (error) {
    console.error('❌ [API] 获取token失败:', error)
    return null
  }
}

/**
 * 发起带认证的API请求
 * 自动添加Authorization header和credentials
 * @param url - 请求URL
 * @param options - fetch选项（支持signal用于取消请求）
 */
export async function authenticatedFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await getAccessToken()

  const headers: HeadersInit = {
    ...options.headers,
  }

  // 添加Authorization header（优先级更高）
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include',  // 同时携带cookies
    signal: options.signal  // 🔥 支持AbortSignal
  })
}

/**
 * 清除token缓存（登出时调用）
 */
export function clearTokenCache() {
  cachedToken = null
  tokenExpireTime = 0
}
