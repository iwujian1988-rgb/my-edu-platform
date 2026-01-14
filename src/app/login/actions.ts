'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'
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

    // 检查用户是否被封禁
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('is_banned, ban_reason')
      .eq('id', data.user.id)
      .single()

    if (userError) {
      console.error('Error checking ban status:', userError)
      return { error: '登录失败，请重试' }
    }

    if ((userData as any)?.is_banned) {
      // 登出已封禁的用户
      await supabase.auth.signOut()

      return {
        error: '你的账号被封禁 可联系店铺客服'
      }
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
        const retryMsg = codeCheckResult.retryAfter
          ? `请在 ${codeCheckResult.retryAfter.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 后重试`
          : '请稍后重试'
        console.log('[Signup] Blocked - Returning error:', `邀请码验证失败次数过多，${retryMsg}`)
        return { error: `邀请码验证失败次数过多，${retryMsg}` }
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
        const retryMsg = failureResult.retryAfter
          ? `请在 ${failureResult.retryAfter.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 后重试`
          : '请稍后重试'
        return { error: `邀请码验证失败次数过多，${retryMsg}` }
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

    // Step 3: Check if user already exists in public.users
    const email = phoneToEmail(phone)

    // 3.1 Check in public.users table first - if user exists, they are fully registered
    const { data: existingPublicUser } = await supabase
      .from('users')
      .select('id, phone_number')
      .eq('phone_number', phone)
      .single()

    if (existingPublicUser) {
      console.log('[Signup] User already fully registered in public.users, should login instead')
      return { error: '您的账号已注册，请进行登录' }
    }

    // 3.2 Don't check auth.users here - directly try to create the user
    // If user already exists in auth, we'll catch it in Step 4 and return appropriate error
    console.log('[Signup] User not found in public.users, will attempt to create account')
    var isRecoveryMode = false

    // Step 3.5: Check IP/device rate limit (单IP 1小时限3次，单设备24小时限1次)
    const rateLimitCheck = await checkRegistrationRateLimit(ipAddress, userAgent)
    if (!rateLimitCheck.allowed) {
      const retryMsg = rateLimitCheck.retryAfter
        ? `请在 ${rateLimitCheck.retryAfter.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })} 后重试`
        : '请稍后重试'
      return { error: `注册尝试过于频繁，${retryMsg}` }
    }

    // Step 4: Create Auth user (only if not in recovery mode)
    if (!isRecoveryMode) {
      const { data: signUpData, error: authError } = await supabase.auth.signUp({
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

        // If user already exists, they are registered
        if (authError.message?.includes('already registered') || authError.message?.includes('user already exists') || authError.status === 422) {
          console.log('[Signup] User already exists in auth.users')
          return { error: '您的账号已注册，请进行登录' }
        }

        return { error: '注册失败，请稍后重试' }
      }

      if (!signUpData.user) {
        return { error: '注册失败，请稍后重试' }
      }

      var authData = signUpData
      console.log('[Signup] New auth user created successfully')
    } else {
      console.log('[Signup] Using existing auth user from recovery mode')
    }

    // Step 5: Sync to public.users table (使用 admin client 绕过 RLS)
    const supabaseAdmin = await createAdminClient()

    // Check if user already exists in public.users (from previous failed attempt)
    const { data: existingUserInPublic } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single()

    if (existingUserInPublic) {
      console.log('[Signup] User record already exists in public.users from previous attempt')

      // 如果 phone_number 为空，更新它
      if (!existingUserInPublic.phone_number) {
        console.log('[Signup] Updating missing phone_number for existing user')
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ phone_number: phone })
          .eq('id', authData.user.id)

        if (updateError) {
          console.error('[Signup] Error updating phone_number:', updateError)
        } else {
          console.log('[Signup] phone_number updated successfully')
        }
      }
    } else {
      // @ts-ignore - Supabase type inference issue
      const { error: dbError } = await supabaseAdmin.from('users').insert({
        id: authData.user.id,
        email: email,
        phone_number: phone,
        full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || null,
        avatar_url: authData.user.user_metadata?.avatar_url || null,
        metadata: { invitation_code_used: invitationCode }
      })

      if (dbError) {
        console.error('[Signup] DB sync error:', dbError)
        console.error('[Signup] DB sync error details:', JSON.stringify(dbError, null, 2))
        console.error('[Signup] DB sync error message:', dbError.message)
        console.error('[Signup] DB sync error code:', dbError.code)
        console.error('[Signup] DB sync error hint:', dbError.hint)
        console.error('[Signup] DB sync error details:', dbError.details)

        // If duplicate key error, it means user already exists, continue with other steps
        if (dbError.code === '23505') {
          console.log('[Signup] User already exists (duplicate key), continuing with remaining steps...')
        } else {
          // For other errors, return failure
          return { error: '注册失败，请稍后重试' }
        }
      } else {
        console.log('[Signup] User synced to public.users successfully')
      }
    }

    // Step 6: Initialize user quota (使用 admin client)
    // First check if quota already exists
    const { data: existingQuota } = await supabaseAdmin
      .from('user_quotas')
      .select('user_id')
      .eq('user_id', authData.user.id)
      .single()

    if (existingQuota) {
      console.log('[Signup] User quota already exists, skipping initialization')
    } else {
      // @ts-ignore - Supabase type inference issue
      const { error: quotaError } = await supabaseAdmin.from('user_quotas').insert({
        user_id: authData.user.id,
        daily_smart_import_limit: 500,
        daily_smart_import_used: 0
      })

      if (quotaError) {
        // Log but don't fail - quota can be created later
        if (quotaError.code === '23505') {
          console.log('[Signup] Quota already exists (duplicate key), continuing...')
        } else {
          console.error('[Signup] Quota initialization error:', quotaError)
        }
      } else {
        console.log('[Signup] Quota initialized successfully')
      }
    }

    // Step 7: Use invitation code and inherit permissions (使用 admin client)
    // Call the database function to mark the invitation code as used and set user permissions
    const { data: useCodeResult, error: useCodeError } = await (supabaseAdmin as any).rpc('use_invitation_code', {
      code_param: invitationCode,
      user_id_param: authData.user.id
    })

    if (useCodeError || !useCodeResult) {
      console.error('[Signup] Error using invitation code:', useCodeError)
      console.error('[Signup] Invitation code error details:', JSON.stringify(useCodeError, null, 2))
      // 非致命错误 - 用户已经创建成功，邀请码可以稍后手动处理
      console.log('[Signup] Continuing despite invitation code error (non-fatal)')
    } else {
      console.log('[Signup] Invitation code used successfully')
    }

    console.log('[Signup] All steps completed successfully')

    try {
      revalidatePath('/', 'layout')
      revalidatePath('/study', 'layout')
    } catch (revalidateError) {
      console.error('Revalidate error (non-fatal):', revalidateError)
      // 忽略 revalidate 错误，不影响注册
    }

    console.log('[Signup] Returning success')
    return { success: true, redirect: '/' }
  } catch (error: any) {
    console.error('[Signup] Exception:', error)
    console.error('[Signup] Stack:', error.stack)
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
