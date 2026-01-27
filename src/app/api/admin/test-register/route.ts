import { createAdminClient } from '@/lib/supabase/server'
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/test-register
 * 测试注册流程，返回详细错误信息
 */
export async function POST(request: NextRequest) {
  const logs: string[] = []

  try {
    const body = await request.json()
    const { phone, password, invitationCode } = body

    logs.push(`📱 手机号: ${phone}`)
    logs.push(`🔑 密码: ${password ? '***' : '(empty)'}`)
    logs.push(`🎫 邀请码: ${invitationCode}`)

    const supabase = await createClient()

    // Step 1: 检查邀请码
    logs.push(`\n🔍 Step 1: 检查邀请码...`)
    const { data: codeData, error: codeError } = await supabase
      .from('invitation_codes')
      .select('*')
      .eq('code', invitationCode)
      .eq('is_active', true)
      .single()

    if (codeError || !codeData) {
      logs.push(`❌ 邀请码无效: ${codeError?.message}`)
      return NextResponse.json({
        success: false,
        error: '邀请码无效或已失效',
        logs
      })
    }

    logs.push(`✅ 邀请码有效: max_uses=${(codeData as any).max_uses}, used_count=${(codeData as any).used_count}`)

    // Step 2: 检查用户是否已存在
    logs.push(`\n🔍 Step 2: 检查用户是否已存在...`)
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phone)
      .single()

    if (existingUser) {
      logs.push(`❌ 用户已存在: id=${(existingUser as any).id}`)
      return NextResponse.json({
        success: false,
        error: '该手机号已注册，请直接登录',
        logs
      })
    }

    logs.push(`✅ 用户不存在，可以注册`)

    // Step 3: 创建 Auth 用户
    logs.push(`\n🔍 Step 3: 创建 Auth 用户...`)
    const email = `${phone}@phone.xiaoyu.com`
    logs.push(`📧 邮箱: ${email}`)

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
      logs.push(`❌ Auth 注册失败: ${authError.message}`)
      logs.push(`错误详情: ${JSON.stringify(authError)}`)
      return NextResponse.json({
        success: false,
        error: `注册失败: ${authError.message}`,
        logs
      })
    }

    if (!authData.user) {
      logs.push(`❌ Auth 返回空用户`)
      return NextResponse.json({
        success: false,
        error: '注册失败：服务器未返回用户信息',
        logs
      })
    }

    logs.push(`✅ Auth 用户创建成功: id=${authData.user.id}`)

    // Step 4: 同步到 public.users
    logs.push(`\n🔍 Step 4: 同步到 public.users...`)
    const { error: dbError } = await (supabase.from('users') as any).insert({
      id: authData.user.id,
      email: email,
      phone_number: phone,
      full_name: authData.user.user_metadata?.full_name || authData.user.user_metadata?.name || null,
      avatar_url: authData.user.user_metadata?.avatar_url || null,
      metadata: { invitation_code_used: invitationCode }
    })

    if (dbError) {
      logs.push(`❌ 同步到 public.users 失败: ${dbError.message}`)
      logs.push(`错误详情: ${JSON.stringify(dbError)}`)
      return NextResponse.json({
        success: false,
        error: '注册失败：数据库同步错误',
        logs
      })
    }

    logs.push(`✅ 同步到 public.users 成功`)

    // Step 5: 初始化用户配额
    logs.push(`\n🔍 Step 5: 初始化用户配额...`)
    const { error: quotaError } = await (supabase.from('user_quotas') as any).insert({
      user_id: authData.user.id,
      daily_smart_import_limit: 500,
      daily_smart_import_used: 0
    })

    if (quotaError) {
      logs.push(`⚠️ 初始化配额失败（非致命）: ${quotaError.message}`)
    } else {
      logs.push(`✅ 配额初始化成功`)
    }

    // Step 6: 使用邀请码
    logs.push(`\n🔍 Step 6: 使用邀请码...`)
    const { data: useCodeResult, error: useCodeError } = await (supabase as any).rpc('use_invitation_code', {
      code_param: invitationCode,
      user_id_param: authData.user.id
    })

    if (useCodeError || !useCodeResult) {
      logs.push(`⚠️ 使用邀请码失败（非致命）: ${useCodeError?.message}`)
    } else {
      logs.push(`✅ 邀请码使用成功`)
    }

    logs.push(`\n🎉 注册完成！`)

    return NextResponse.json({
      success: true,
      message: '注册成功',
      userId: authData.user.id,
      email: authData.user.email,
      logs
    })

  } catch (error: any) {
    logs.push(`\n💥 异常: ${error.message}`)
    logs.push(`堆栈: ${error.stack}`)
    return NextResponse.json({
      success: false,
      error: error.message || '注册失败，请重试',
      logs
    }, { status: 500 })
  }
}
