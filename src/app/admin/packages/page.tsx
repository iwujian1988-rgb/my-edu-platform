/**
 * 套餐管理页面
 */

import { createAdminClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/admin-auth'
import PackageListClient from '@/components/admin/PackageListClient'

export default async function PackagesPage() {
  // 验证管理员权限
  try {
    await requireAdmin()
  } catch (error) {
    redirect('/admin/login')
  }

  // 使用 admin client 绕过 RLS 限制
  const supabase = await createAdminClient()

  // 获取套餐列表
  const { data: packages } = await supabase
    .from('invitation_packages')
    .select('*')
    .order('sort_order', { ascending: true })

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">套餐管理</h1>
          <p className="text-gray-600 mt-1">管理邀请码套餐的权限配置</p>
        </div>
      </div>

      <PackageListClient initialPackages={packages || []} />
    </div>
  )
}
