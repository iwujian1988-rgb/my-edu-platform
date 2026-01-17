import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/admin/delete-test-users
 * 清空所有测试用户数据（保留管理员账号）
 * ⚠️ 危险操作：会删除所有非管理员用户和相关数据
 */
export async function DELETE(request: NextRequest) {
  try {
    // 使用 admin 客户端
    const supabase = await createAdminClient()

    // 调用 RPC 函数删除测试用户
    const { data, error } = await supabase.rpc('delete_test_users')

    if (error) {
      console.error('Error deleting test users:', error)
      return NextResponse.json(
        { error: 'Failed to delete test users', details: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: '测试用户已清空，可以重新注册',
      data
    })
  } catch (error: any) {
    console.error('Error in DELETE /api/admin/delete-test-users:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
