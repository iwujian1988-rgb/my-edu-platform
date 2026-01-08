/**
 * 用户权限历史查询 API
 * GET /api/admin/users/[userId]/permission-logs - 获取用户权限变更历史
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await requireAdmin()

    const { userId } = await params
    const supabase = await createAdminClient()

    // 获取用户权限变更历史
    const { data, error } = await supabase
      .from('user_permission_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) {
      console.error('Error fetching permission logs:', error)
      return NextResponse.json({ error: '获取权限历史失败' }, { status: 500 })
    }

    return NextResponse.json({ logs: data })
  } catch (error: any) {
    console.error('Error in permission logs API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
