import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * DELETE /api/admin/clear-users
 * 清空所有测试用户（保留当前管理员）
 * ⚠️ 危险操作
 */
export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    // 获取当前管理员邮箱
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const adminEmail = user.email

    // 删除所有非管理员的用户
    const { data: { users }, error } = await supabase.auth.admin.listUsers()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let deletedCount = 0
    for (const u of users) {
      // 保留管理员账号
      if (u.email === adminEmail) {
        console.log('✅ Keeping admin:', u.email)
        continue
      }

      // 删除其他用户
      await supabase.auth.admin.deleteUser(u.id)
      deletedCount++
      console.log('🗑️ Deleted user:', u.email)
    }

    return NextResponse.json({
      success: true,
      message: `已删除 ${deletedCount} 个测试用户`,
      adminEmail,
      deletedCount
    })
  } catch (error: any) {
    console.error('Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}
