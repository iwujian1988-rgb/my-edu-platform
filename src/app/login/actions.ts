'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

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

    // Sign in with Supabase Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      console.error('Login error:', error)
      return { error: '手机号或密码错误' }
    }

    if (!data.user) {
      return { error: '登录失败，请重试' }
    }

    // Update last login
    await supabase
      .from('users')
      .update({ last_login_at: new Date().toISOString() })
      .eq('id', data.user.id)

    revalidatePath('/', 'layout')
    return { success: true }
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

  try {
    const supabase = await createClient()

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
      return { error: '邀请码无效或已失效' }
    }

    // Check if code has reached max uses
    if (codeData.used_count >= codeData.max_uses) {
      return { error: '邀请码使用次数已达上限' }
    }

    // Check if code has expired
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
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
    const { error: dbError } = await supabase.from('users').insert({
      id: authData.user.id,
      phone_number: phone,
      password_hash: '', // Not storing password hash, managed by Supabase Auth
      metadata: { invitation_code_used: invitationCode }
    })

    if (dbError) {
      console.error('DB sync error:', dbError)
      // Rollback auth user? For now, just log the error
      return { error: '注册失败，请稍后重试' }
    }

    // Step 6: Initialize user quota
    await supabase.from('user_quotas').insert({
      user_id: authData.user.id,
      daily_smart_import_limit: 500,
      daily_smart_import_used: 0
    })

    // Step 7: Update invitation code usage
    await supabase
      .from('invitation_codes')
      .update({ used_count: codeData.used_count + 1 })
      .eq('code', invitationCode)

    revalidatePath('/', 'layout')
    return { success: true }
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
