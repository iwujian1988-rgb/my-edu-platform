/**
 * 管理员登录页面
 * Claymorphism 设计风格
 */

import { redirect } from 'next/navigation'
import { getCurrentAdmin } from '@/lib/admin-auth'
import { AdminLoginForm } from '@/components/admin/AdminLoginForm'

export default async function AdminLoginPage({
  searchParams
}: {
  searchParams: { redirect?: string }
}) {
  // 如果已登录，重定向到管理后台首页或指定页面
  const admin = await getCurrentAdmin()
  if (admin) {
    redirect(searchParams.redirect || '/admin/dashboard')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo 和标题 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-green-600 rounded-3xl border-[3px] border-black shadow-[6px_6px_0px_0px_#000] mb-4">
            <span className="text-4xl">🐱</span>
          </div>
          <h1 className="text-3xl font-black text-gray-800 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            喵喵笔记管理后台
          </h1>
          <p className="text-gray-600 font-semibold">
            管理员登录
          </p>
        </div>

        {/* 登录表单 */}
        <AdminLoginForm redirectTo={searchParams.redirect} />

        {/* 页脚信息 */}
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500 font-semibold">
            © 2026 喵喵笔记 · 管理后台
          </p>
        </div>
      </div>
    </div>
  )
}
