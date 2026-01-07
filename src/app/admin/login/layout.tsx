/**
 * 管理后台登录页面布局
 * 不包含认证检查，避免重定向循环
 */

export default function AdminLoginLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      {children}
    </div>
  )
}
