/**
 * 用户管理页面
 * 显示用户列表、搜索、筛选、封禁等功能
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { UserList } from '@/components/admin/UserList'

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string; package?: string; startDate?: string; endDate?: string }>
}) {
  const admin = await requireAdmin()
  // 使用 admin client 绕过 RLS 限制
  const supabase = await createAdminClient()

  // 解析搜索参数
  const params = await searchParams
  const page = parseInt(params.page || '1')
  const search = params.search || ''
  const status = params.status || ''
  const packageFilter = params.package || ''
  const startDate = params.startDate || ''
  const endDate = params.endDate || ''

  // 获取所有套餐用于筛选器
  const { data: packages } = await supabase
    .from('invitation_packages')
    .select('id, name')
    .order('name', { ascending: true })

  const pageSize = 20
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  // 构建查询
  // 注意：当需要套餐筛选时，先获取符合条件的用户ID，再查询用户详情
  let query: any
  if (packageFilter) {
    // 套餐筛选时，使用子查询方式：先找到使用该套餐的邀请码，再找用户
    const { data: packageCodes } = await supabase
      .from('invitation_codes')
      .select('id')
      .eq('package_id', packageFilter)

    const codeIds = packageCodes?.map(c => c.id) || []

    // 查询使用这些邀请码的用户
    query = supabase
      .from('users') as any
      .select('*', { count: 'exact', head: false })
      .in('invitation_code_id', codeIds.length > 0 ? codeIds : ['__none__'])
  } else {
    // 不筛选套餐时，查询所有用户（包括没有邀请码的用户）
    query = supabase
      .from('users') as any
      .select('*', { count: 'exact', head: false })
  }

  // 搜索条件
  if (search) {
    query = query.or(`email.ilike.%${search}%,phone_number.ilike.%${search}%,full_name.ilike.%${search}%`)
  }

  // 状态筛选
  if (status === 'banned') {
    query = query.not('banned_at', 'is', null)
  } else if (status === 'active') {
    query = query.is('banned_at', null)
  }

  // 注册时间筛选
  if (startDate) {
    // startDate 包含当天，使用 gte (>=)
    query = query.gte('created_at', startDate)
  }
  if (endDate) {
    // endDate 包含当天，需要加一天使用 lt (<)
    const endDateTime = new Date(endDate)
    endDateTime.setDate(endDateTime.getDate() + 1)
    query = query.lt('created_at', endDateTime.toISOString())
  }

  // 分页查询
  const { data: users, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('=================================')
    console.error('Error fetching users:')
    console.error('Message:', error.message)
    console.error('Details:', error)
    console.error('Hint:', error.hint)
    console.error('Code:', error.code)
    console.error('=================================')
  }

  // 如果 count 查询失败，手动查询总数
  let totalCount = count
  if (!totalCount && users) {
    const { count: manualCount } = await supabase
      .from('users') as any
      .select('*', { count: 'exact', head: true })

    totalCount = manualCount || 0
  }

  const totalPages = totalCount ? Math.ceil(totalCount / pageSize) : 1

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-black text-gray-800 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          用户管理
        </h1>
        <p className="text-gray-600 font-semibold">
          查看和管理平台用户，共 {totalCount || 0} 位用户
        </p>
      </div>

      {/* 用户列表 */}
      <UserList
        users={users || []}
        totalUsers={totalCount || 0}
        currentPage={page}
        totalPages={totalPages}
        search={search}
        status={status}
        packages={packages || []}
        packageFilter={packageFilter}
        startDate={startDate}
        endDate={endDate}
      />
    </div>
  )
}
