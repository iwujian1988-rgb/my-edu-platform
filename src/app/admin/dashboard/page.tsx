/**
 * 管理后台仪表盘
 * 显示核心指标、数据图表和待办事项
 */

import Link from 'next/link'
import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { RecentActivity } from '@/components/admin/RecentActivity'

export default async function AdminDashboard() {
  const admin = await requireAdmin()
  // 使用 admin client 绕过 RLS 限制
  const supabase = await createAdminClient()

  // ⚠️ 添加超时保护，避免查询hang住
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), 8000) // 8秒超时
  )

  // 获取核心统计数据（添加超时保护）
  const [
    { count: totalUsers },
    { count: todayNewUsers },
    { count: activeUsers },
    { count: totalInvitationCodes },
    { count: usedInvitationCodes },
    { count: pendingReviews },
    totalPackagesData,
    activeInvitationCodesData
  ] = await Promise.all([
    // 用户总数
    Promise.race([
      (supabase.from('users') as any).select('id', { count: 'exact', head: true }),
      timeoutPromise
    ]),
    // 今日新增用户
    Promise.race([
      (supabase.from('users') as any)
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date().toISOString().split('T')[0]),
      timeoutPromise
    ]),
    // 7日内活跃用户
    Promise.race([
      supabase
        .from('learning_records')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
      timeoutPromise
    ]),
    // 邀请码总数
    Promise.race([
      supabase.from('invitation_codes').select('id', { count: 'exact', head: true }),
      timeoutPromise
    ]),
    // 已使用的邀请码数
    Promise.race([
      supabase
        .from('invitation_codes')
        .select('id', { count: 'exact', head: true })
        .gt('used_count', 0),
      timeoutPromise
    ]),
    // 待审核词库
    Promise.race([
      supabase
        .from('books')
        .select('id', { count: 'exact', head: true })
        .eq('review_status', 'pending'),
      timeoutPromise
    ]),
    // 套餐总数
    Promise.race([
      supabase.from('invitation_packages').select('id', { count: 'exact', head: true }),
      timeoutPromise
    ]),
    // 有效邀请码数
    Promise.race([
      supabase.from('invitation_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
      timeoutPromise
    ])
  ]).catch(() => [
    { count: 0 },
    { count: 0 },
    { count: 0 },
    { count: 0 },
    { count: 0 },
    { count: 0 },
    { count: 0 },
    { count: 0 }
  ])

  // 统计各套餐使用情况
  const { data: packageStats } = await supabase
    .from('invitation_codes')
    .select('package_id, invitation_packages!inner(name)')
    .eq('is_active', true)

  const totalPackages = (totalPackagesData as { count: number | null })?.count || 0
  const activeInvitationCodes = (activeInvitationCodesData as { count: number | null })?.count || 0

  // 统计权限过期用户
  const { count: expiredPermissionsCount } = await (supabase
    .from('users') as any)
    .select('id', { count: 'exact', head: true })
    .not('permission_expires_at', 'is', null)
    .lt('permission_expires_at', new Date().toISOString())

  // 计算邀请码使用率
  const invitationUsageRate = totalInvitationCodes
    ? Math.round(((usedInvitationCodes || 0) / totalInvitationCodes) * 100)
    : 0

  // 获取最近操作日志
  const { data: recentLogs } = await supabase
    .from('admin_audit_logs')
    .select(`
      *,
      administrator:administrators!admin_audit_logs_admin_id_fkey (
        name,
        email
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10)

  // 统计数据
  const stats = {
    totalUsers: totalUsers || 0,
    todayNewUsers: todayNewUsers || 0,
    activeUsers: activeUsers || 0,
    invitationUsageRate,
    usedInvitationCodes: usedInvitationCodes || 0,
    totalInvitationCodes: totalInvitationCodes || 0,
    pendingReviews: pendingReviews || 0,
    totalPackages,
    activeInvitationCodes,
    expiredPermissionsCount: expiredPermissionsCount || 0,
    packageUsage: packageStats || []
  }

  return (
    <div className="space-y-8">
      {/* 欢迎信息 */}
      <div>
        <h1 className="text-3xl font-black text-gray-800 mb-2" style={{ fontFamily: 'Fredoka, sans-serif' }}>
          欢迎回来，{admin.name}！
        </h1>
        <p className="text-gray-600 font-semibold">
          这是今天的平台数据概览
        </p>
      </div>

      {/* 核心指标卡片 */}
      <DashboardStats stats={stats} />

      {/* 最近活动 */}
      <RecentActivity logs={recentLogs || []} />

      {/* 待办事项 */}
      {(stats.pendingReviews > 0) && (
        <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4">待办事项</h3>
          <div className="space-y-3">
            <Link
              href="/admin/reviews"
              className="flex items-center justify-between p-4 bg-yellow-50 rounded-xl border-[2px] border-yellow-300 hover:shadow-md transition-all"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-400 rounded-full flex items-center justify-center text-white font-bold">
                  {stats.pendingReviews}
                </div>
                <div>
                  <p className="font-semibold text-gray-800">待审核词库</p>
                  <p className="text-sm text-gray-600">有 {stats.pendingReviews} 个词库等待审核</p>
                </div>
              </div>
              <span className="text-yellow-600">→</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
