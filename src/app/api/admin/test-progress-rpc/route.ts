import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * 测试进度卡片 RPC 函数
 * POST /api/admin/test-progress-rpc
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

    console.log('[Admin] Testing get_user_progress_cards RPC...')

    const startTime = Date.now()

    // 调用 RPC 函数
    const { data, error } = await supabase.rpc('get_user_progress_cards', {
      p_user_id: user.id
    })

    const endTime = Date.now()
    const duration = endTime - startTime

    if (error) {
      console.error('[Admin] RPC test failed:', error)

      // 检查是否是函数不存在的错误
      if (error.code === '42883') { // undefined_function
        return NextResponse.json({
          success: false,
          error: 'RPC function does not exist. Please apply the migration first.',
          details: {
            code: error.code,
            message: error.message,
            hint: 'Run the migration SQL in Supabase Dashboard SQL Editor'
          }
        }, { status: 404 })
      }

      return NextResponse.json({
        success: false,
        error: error.message,
        details: error
      }, { status: 500 })
    }

    console.log('[Admin] RPC test success:', {
      resultCount: data?.length || 0,
      duration
    })

    return NextResponse.json({
      success: true,
      message: 'RPC function executed successfully',
      data: data || [],
      performance: duration
    })

  } catch (error) {
    console.error('[Admin] Exception testing RPC:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      details: error
    }, { status: 500 })
  }
}
