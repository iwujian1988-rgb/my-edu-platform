/**
 * 管理后台首页
 * 重定向到仪表盘
 */

import { redirect } from 'next/navigation'

export default function AdminHomePage() {
  redirect('/admin/dashboard')
}
