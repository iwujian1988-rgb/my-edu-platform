/**
 * 管理后台主布局
 * 包含侧边栏、顶部栏和内容区域
 *
 * 注意：认证检查已在 middleware.ts 中处理
 * 这里只需要提供布局组件
 */

import { getCurrentAdmin } from '@/lib/admin-auth'
import { AdminLayoutComponent } from '@/components/admin/AdminLayout'

// 强制动态渲染，因为使用了 cookies
export const dynamic = 'force-dynamic'

export default async function AdminRootLayout({
  children
}: {
  children: React.ReactNode
}) {
  // 获取当前管理员信息（middleware 已经验证过身份）
  const admin = await getCurrentAdmin()

  // 如果是 /admin/login 页面，不使用主布局
  // 注意：middleware 不会阻止 /admin/login，但这里可能没有 admin 对象
  if (!admin) {
    return <>{children}</>
  }

  return <AdminLayoutComponent admin={admin}>{children}</AdminLayoutComponent>
}
