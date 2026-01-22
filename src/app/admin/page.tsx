/**
 * 管理后台首页
 * 重定向到仪表盘
 */

import { redirect } from 'next/navigation'

// 强制动态渲染
export const dynamic = 'force-dynamic'

export default function AdminHomePage() {
  redirect('/admin/dashboard')
}
