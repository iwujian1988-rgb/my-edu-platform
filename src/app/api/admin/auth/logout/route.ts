/**
 * 管理员登出 API
 */

import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { logAdminAction } from '@/lib/admin-auth'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    const supabase = await createClient()

    // 记录登出日志
    await logAdminAction('admin_logout')

    // 执行登出
    await supabase.auth.signOut()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin logout error:', error)
    return NextResponse.json(
      { success: false, error: '登出失败' },
      { status: 500 }
    )
  }
}
