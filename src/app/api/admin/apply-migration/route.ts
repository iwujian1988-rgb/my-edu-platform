import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

/**
 * 应用数据库 Migration
 * POST /api/admin/apply-migration
 *
 * 注意：此 API 使用 admin 权限执行 SQL，仅用于开发和测试环境
 * 生产环境应通过 Supabase Dashboard 或 migration 工具执行
 */
export async function POST(request: NextRequest) {
  try {
    // 验证用户权限
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized - Please login first'
      }, { status: 401 })
    }

    const body = await request.json()
    const { sql } = body

    if (!sql) {
      return NextResponse.json({
        success: false,
        error: 'Missing SQL parameter'
      }, { status: 400 })
    }

    console.log('[Admin] Applying migration...')

    // 使用 admin client 执行 SQL
    // 注意：需要设置环境变量 SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Supabase configuration'
      }, { status: 500 })
    }

    const adminClient = createAdminClient(supabaseUrl, supabaseServiceKey)

    // 执行 SQL - 使用 rpc 调用（需要先创建一个 wrapper 函数）
    // 或者直接返回 SQL，让用户在 Dashboard 执行
    console.log('[Admin] SQL prepared (length:', sql.length, 'chars)')

    return NextResponse.json({
      success: true,
      message: 'SQL prepared successfully. Please execute it in Supabase Dashboard.',
      data: {
        sql: sql,
        instructions: [
          '1. Open Supabase Dashboard: https://supabase.com/dashboard',
          '2. Select your project',
          '3. Go to SQL Editor',
          '4. Create a new query',
          '5. Paste the SQL below and execute',
          '6. Check for errors in the output'
        ],
        appliedAt: new Date().toISOString(),
        user: user.email
      }
    })

  } catch (error) {
    console.error('[Admin] Exception preparing migration:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
