/**
 * 用户管理页面
 * 显示用户列表、搜索、筛选、封禁等功能
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { UserList } from '@/components/admin/UserList'

export default async function AdminUsersPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string; search?: string; status?: string }>
}) {
  const admin = await requireAdmin()
  const supabase = await createClient()

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
    .from('users')
    .select('*', { count: 'exact' })

  // 搜索条件
  if (search) {
    query = query.or(`email.ilike.%${search}%,nickname.ilike.%${search}%`)
  }

  // 状态筛选
  if (status === 'banned') {
    query = query.not('banned_at', 'is', null)
  } else if (status === 'active') {
    query = query.is('banned_at', null)
  }

  // 分页查询
  const { data: users, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching users:', error)
  }

  const totalPages = count ? Math.ceil(count / pageSize) : 1

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-black text-gray-800 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          用户管理
        </h1>
        <p className="text-gray-600 font-semibold">
          查看和管理平台用户，共 {count || 0} 位用户
        </p>
      </div>

      {/* 用户列表 */}
      <UserList
        users={users || []}
        totalUsers={count || 0}
        currentPage={page}
        totalPages={totalPages}
        search={search}
        status={status}
      />
    </div>
  )
}
