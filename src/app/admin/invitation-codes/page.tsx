/**
 * 邀请码管理页面
 * 显示邀请码列表、创建新邀请码、禁用邀请码等功能
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { InvitationCodeList } from '@/components/admin/InvitationCodeList'
import { CreateInvitationCodeButton } from '@/components/admin/CreateInvitationCodeButton'

export default async function AdminInvitationCodesPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}) {
  const admin = await requireAdmin()
  // 使用 admin client 绕过 RLS 限制
  const supabase = await createAdminClient()

  // 解析搜索参数
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const search = params.search || ''
  const status = params.status || ''

  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // 构建查询
  let query = supabase
    .from('invitation_codes')
    .select('*', { count: 'exact' })

  // 搜索条件
  if (search) {
    query = query.or(`code.ilike.%${search}%`)
  }

  // 状态筛选
  if (status === 'unused') {
    query = query.eq('used_count', 0)
  } else if (status === 'used') {
    query = query.gt('used_count', 0)
  } else if (status === 'disabled') {
    query = query.eq('is_active', false)
  }

  // 分页查询
  const { data: codes, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching invitation codes:', error)
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 1

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-800 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            邀请码管理
          </h1>
          <p className="text-gray-600 font-semibold">
            查看和管理邀请码，共 {count || 0} 个邀请码
          </p>
        </div>
        <CreateInvitationCodeButton />
      </div>

      {/* 邀请码列表 */}
      <InvitationCodeList
        codes={codes || []}
        totalCodes={count || 0}
        currentPage={page}
        totalPages={totalPages}
        search={search}
        status={status}
      />
    </div>
  )
}
