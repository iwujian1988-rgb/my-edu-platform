import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/force-create-user
 * 使用 Admin API 强制创建用户（绕过 Auth 限制）
 */
export async function POST(request: NextRequest) {
  const logs: string[] = []

  try {
    const body = await request.json()
    const { phone, password, invitationCode } = body

    logs.push(`📱 手机号: ${phone}`)
    logs.push(`🎫 邀请码: ${invitationCode}`)

    const supabase = await createAdminClient()
    const email = `${phone}@phone.xiaoyu.com`

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
    logs.push(`✅ 邀请码有效`)

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

    // Step 3: 使用 Admin API 创建用户（绕过正常 Auth 流程）
    logs.push(`\n🔍 Step 3: 使用 Admin API 创建用户...`)
    logs.push(`📧 邮箱: ${email}`)

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // 自动确认邮箱
      user_metadata: {
        phone_number: phone
      }
    })

    if (authError) {
      logs.push(`❌ Admin API 创建用户失败: ${authError.message}`)
      logs.push(`错误详情: ${JSON.stringify(authError)}`)

      // 如果是用户已存在错误，尝试直接登录
      if (authError.message.includes('already exists') || authError.message.includes('duplicate')) {
        logs.push(`\n⚠️ 用户已存在于 Auth，尝试查找现有用户...`)

        // 尝试列出所有用户找到这个用户
        const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()

        if (!listError && users) {
          const existingAuthUser = (users as any).find((u: any) => u.email === email)
          if (existingAuthUser) {
            logs.push(`✅ 找到现有 Auth 用户: id=${existingAuthUser.id}`)

            // 同步到 public.users
            const { error: syncError } = await (supabase.from('users') as any).insert({
              id: existingAuthUser.id,
              email: email,
              phone_number: phone,
              full_name: existingAuthUser.user_metadata?.full_name || existingAuthUser.user_metadata?.name || null,
              avatar_url: existingAuthUser.user_metadata?.avatar_url || null,
              metadata: { invitation_code_used: invitationCode }
            })

            if (syncError) {
              logs.push(`❌ 同步失败: ${syncError.message}`)
            } else {
              logs.push(`✅ 同步成功`)
            }

            return NextResponse.json({
              success: true,
              message: '用户已存在，已同步到数据库',
              userId: existingAuthUser.id,
              logs
            })
          }
        }
      }

      return NextResponse.json({
        success: false,
        error: `创建用户失败: ${authError.message}`,
        logs
      })
    }

    if (!authData.user) {
      logs.push(`❌ Admin API 返回空用户`)
      return NextResponse.json({
        success: false,
        error: '创建用户失败：服务器未返回用户信息',
        logs
      })
    }

    logs.push(`✅ Admin API 创建用户成功: id=${authData.user.id}`)

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

      // 回滚：删除 Auth 用户
      await supabase.auth.admin.deleteUser(authData.user.id)
      logs.push(`🗑️ 已回滚 Auth 用户`)

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
    logs.push(`\n📝 用户可以直接登录了！`)
    logs.push(`手机号: ${phone}`)
    logs.push(`密码: (您设置的密码)`)

    return NextResponse.json({
      success: true,
      message: '注册成功！用户可以直接登录',
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
