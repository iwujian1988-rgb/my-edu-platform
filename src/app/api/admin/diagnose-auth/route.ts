import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/diagnose-auth
 * 诊断 Supabase Auth 问题
 */
export async function GET(request: NextRequest) {
  const diagnostics: any = {
    timestamp: new Date().toISOString(),
    checks: []
  }

  try {
    const supabase = await createAdminClient()

    // 检查 1: 连接测试
    diagnostics.checks.push({
      name: 'Supabase 连接测试',
      status: 'running'
    })

    try {
      const { data, error } = await supabase.from('users').select('count').limit(1)
      diagnostics.checks[0].status = error ? 'failed' : 'passed'
      diagnostics.checks[0].error = error?.message
      diagnostics.checks[0].data = data
    } catch (err: any) {
      diagnostics.checks[0].status = 'failed'
      diagnostics.checks[0].error = err.message
    }

    // 检查 2: Auth Admin API 测试
    diagnostics.checks.push({
      name: 'Auth Admin API 测试',
      status: 'running'
    })

    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      diagnostics.checks[1].status = error ? 'failed' : 'passed'
      diagnostics.checks[1].error = error?.message
      diagnostics.checks[1].userCount = users?.length || 0
    } catch (err: any) {
      diagnostics.checks[1].status = 'failed'
      diagnostics.checks[1].error = err.message
    }

    // 检查 3: 列出最近5个用户
    diagnostics.checks.push({
      name: '最近 Auth 用户',
      status: 'running'
    })

    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers()
      if (!error && users) {
        const recentUsers = (users as any)
          .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
          .slice(0, 5)
          .map((u: any) => ({
            id: u.id,
            email: u.email,
            created_at: u.created_at,
            confirmed: !!u.email_confirmed_at
          }))
        diagnostics.checks[2].status = 'passed'
        diagnostics.checks[2].users = recentUsers
      } else {
        diagnostics.checks[2].status = 'failed'
        diagnostics.checks[2].error = error?.message
      }
    } catch (err: any) {
      diagnostics.checks[2].status = 'failed'
      diagnostics.checks[2].error = err.message
    }

    // 检查 4: 测试创建新用户
    diagnostics.checks.push({
      name: '创建测试用户',
      status: 'running',
      testEmail: `test-${Date.now()}@test.com`
    })

    try {
      const testEmail = `test-${Date.now()}@test.com`
      const { data, error } = await supabase.auth.admin.createUser({
        email: testEmail,
        password: 'test123456',
        email_confirm: true
      })

      if (error) {
        diagnostics.checks[3].status = 'failed'
        diagnostics.checks[3].error = error.message
        diagnostics.checks[3].details = error
      } else if (data.user) {
        diagnostics.checks[3].status = 'passed'
        diagnostics.checks[3].createdUserId = data.user.id

        // 清理测试用户
        await supabase.auth.admin.deleteUser(data.user.id)
        diagnostics.checks[3].cleanup = 'deleted'
      }
    } catch (err: any) {
      diagnostics.checks[3].status = 'failed'
      diagnostics.checks[3].error = err.message
      diagnostics.checks[3].stack = err.stack
    }

    // 检查 5: 检查环境变量
    diagnostics.checks.push({
      name: '环境变量检查',
      status: 'passed',
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'set' : 'missing',
      hasServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'yes' : 'no'
    })

    return NextResponse.json(diagnostics)

  } catch (error: any) {
    diagnostics.error = error.message
    diagnostics.stack = error.stack
    return NextResponse.json(diagnostics, { status: 500 })
  }
}
