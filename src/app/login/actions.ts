'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import {
  checkRegistrationRateLimit,
  checkInvitationCodeAttempts,
  recordInvitationCodeFailure
} from '@/lib/security'

/**
 * 获取客户端IP地址
 * 从请求头中提取真实IP
 */
async function getClientIp(): Promise<string> {
  try {
    const headersList = await headers()
    const forwardedFor = headersList.get('x-forwarded-for')
    const realIp = headersList.get('x-real-ip')
    const cfConnectingIp = headersList.get('cf-connecting-ip') // Cloudflare

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

    return 'unknown'
  } catch (error) {
    return 'unknown'
  }
}

/**
 * 获取设备指纹
 * 基于 User-Agent 生成简单指纹
 */
async function getUserAgent(): Promise<string> {
  try {
    const headersList = await headers()
    return headersList.get('user-agent') || 'unknown'
  } catch (error) {
    return 'unknown'
  }
}

// Phone to fake email conversion
function phoneToEmail(phone: string): string {
  return `${phone}@phone.xiaoyu.com`
}

/**
 * Login Action
 * Validates credentials and signs in the user
 */
export async function login(formData: { phone: string; password: string }) {
  const { phone, password } = formData

  try {
    const supabase = await createClient()

    // Convert phone to fake email
    const email = phoneToEmail(phone)

    // Sign in with Supabase Auth (带重试机制)
    let retries = 3
    let data: any = null
    let error: any = null

    while (retries > 0) {
      try {
        const result = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (result.data?.user && !result.error) {
          data = result.data
          error = null
          break // 成功，退出重试
        }

        error = result.error
        if (error) {
          console.warn(`Login attempt failed, ${retries - 1} retries left:`, error.message)
        }
      } catch (err: any) {
        error = err
        console.warn(`Login error, ${retries - 1} retries left:`, err.message)
      }

      retries--
      if (retries > 0) {
        // 等待1秒后重试
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    if (error || !data?.user) {
      console.error('Login error after retries:', error)
      return { error: '手机号或密码错误' }
    }

    // Update last login
    await supabase
      .from('users')
      // @ts-ignore - Supabase type inference issue
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id)

    revalidatePath('/', 'layout')
    revalidatePath('/study', 'layout')

    return { success: true, redirect: '/' }
  } catch (error: any) {
    console.error('Login error:', error)
    return { error: error.message || '登录失败，请重试' }
  }
}

/**
 * Signup Action
 * Validates invitation code, creates Auth user, syncs to public.users
 */
export async function signup(formData: {
  phone: string
  password: string
  invitationCode: string
}) {
  const { phone, password, invitationCode } = formData

  // Extract security context from request headers
  const ipAddress = await getClientIp()
  const userAgent = await getUserAgent()

  try {
    const supabase = await createClient()

    // Step 0: Security checks
    // 0.1 Check invitation code attempts (防爆破)
    console.log('[Signup] Checking invitation code attempts for:', invitationCode)
    const codeCheckResult = await checkInvitationCodeAttempts(invitationCode, ipAddress)
    console.log('[Signup] Code check result:', codeCheckResult)

    if (!codeCheckResult.allowed) {
      if (codeCheckResult.reason === 'LOCKED' || codeCheckResult.reason === 'TOO_MANY_ATTEMPTS') {
        const retryAfter = codeCheckResult.retryAfter
          ? `请在 ${retryAfter.getHours()}:${retryAfter.getMinutes().toString().padStart(2, '0')} 后重试`
          : '请稍后重试'
        console.log('[Signup] Blocked - Returning error:', `邀请码验证失败次数过多，${retryAfter}`)
        return { error: `邀请码验证失败次数过多，${retryAfter}` }
      }
    }

    // Step 1: Validate phone number format
    if (!/^[0-9]{11}$/.test(phone)) {
      return { error: '请输入正确的11位手机号' }
    }

    // Step 2: Validate invitation code
    const { data: codeData, error: codeError } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', invitationCode)
      .eq('is_active', true)
      .single()

    if (codeError || !codeData) {
      // 记录邀请码验证失败（原子操作）
      const failureResult = await recordInvitationCodeFailure(invitationCode, ipAddress, userAgent)

      // 如果被锁定，返回锁定错误
      if (failureResult.locked) {
        const retryAfter = failureResult.retryAfter
          ? `请在 ${failureResult.retryAfter.getHours()}:${failureResult.retryAfter.getMinutes().toString().padStart(2, '0')} 后重试`
          : '请稍后重试'
        return { error: `邀请码验证失败次数过多，${retryAfter}` }
      }

      return { error: '邀请码无效或已失效' }
    }

    // Check if code has reached max uses
    if ((codeData as any).used_count >= (codeData as any).max_uses) {
      return { error: '邀请码使用次数已达上限' }
    }

    // Check if code has expired
    if ((codeData as any).expires_at && new Date((codeData as any).expires_at) < new Date()) {
      return { error: '邀请码已过期' }
    }

    // Step 3: Check if user already exists
    const email = phoneToEmail(phone)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phone)
      .single()

    if (existingUser) {
      return { error: '该手机号已注册，请直接登录' }
    }

    // Step 3.5: Check IP/device rate limit (单IP 1小时限3次，单设备24小时限1次)
    const rateLimitCheck = await checkRegistrationRateLimit(ipAddress, userAgent)
    if (!rateLimitCheck.allowed) {
      const retryAfter = rateLimitCheck.retryAfter
        ? `请在 ${retryAfter.getHours()}:${retryAfter.getMinutes().toString().padStart(2, '0')} 后重试`
        : '请稍后重试'
      return { error: `注册尝试过于频繁，${retryAfter}` }
    }

    // Step 4: Create Auth user
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          phone_number: phone
        }
      }
    })

    if (authError) {
      console.error('Auth signup error:', authError)
      return { error: '注册失败，请稍后重试' }
    }

    if (!authData.user) {
      return { error: '注册失败，请稍后重试' }
    }

    // Step 5: Sync to public.users table
    // @ts-ignore - Supabase type inference issue
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      email: email,  // ✅ 修复：添加email字段
      phone_number: phone,
      full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || null,
      avatar_url: authData.user.user_metadata?.avatar_url || null,
      password_hash: '', // Not storing password hash, managed by Supabase Auth
      metadata: { invitation_code_used: invitationCode }
    })

    if (dbError) {
      console.error('DB sync error:', dbError)
      // Rollback auth user? For now, just log the error
      return { error: '注册失败，请稍后重试' }
    }

    // Step 6: Initialize user quota
    // @ts-ignore - Supabase type inference issue
    await supabase.from('user_quotas').insert({
      user_id: authData.user.id,
      daily_smart_import_limit: 500,
      daily_smart_import_used: 0
    })

    // Step 7: Use invitation code and inherit permissions
    // Call the database function to mark the invitation code as used and set user permissions
    const { data: useCodeResult, error: useCodeError } = await (supabase as any).rpc('use_invitation_code', {
      code_param: invitationCode,
      user_id_param: authData.user.id
    })

    if (useCodeError || !useCodeResult) {
      console.error('Error using invitation code:', useCodeError)
      return { error: '邀请码使用失败，请稍后重试' }
    }

    revalidatePath('/', 'layout')
    revalidatePath('/study', 'layout')

    return { success: true, redirect: '/' }
  } catch (error: any) {
    console.error('Signup error:', error)
    return { error: error.message || '注册失败，请重试' }
  }
}

/**
 * Logout Action
 */
export async function logout() {
  const supabase = await createClient()

  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/login')
}
