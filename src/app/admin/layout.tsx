/**
 * 管理后台主布局
 * 包含侧边栏、顶部栏和内容区域
 */

import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { AdminLayoutComponent } from '@/components/admin/AdminLayout'

export default async function AdminRootLayout({
  children
}: {
  children: React.ReactNode
}) {
  // 验证管理员登录状态
  const admin = await getCurrentAdmin()
  if (!admin) {
    redirect('/admin/login')
  }

  return <AdminLayoutComponent admin={admin}>{children}</AdminLayoutComponent>
}
