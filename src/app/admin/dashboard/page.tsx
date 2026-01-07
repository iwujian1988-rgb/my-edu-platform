/**
 * 管理后台仪表盘
 * 显示核心指标、数据图表和待办事项
 */

import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { DashboardStats } from '@/components/admin/DashboardStats'
import { RecentActivity } from '@/components/admin/RecentActivity'

export default async function AdminDashboard() {
  const admin = await requireAdmin()
  const supabase = await createClient()

  // 获取核心统计数据
  const [
    { count: totalUsers },
    { count: todayNewUsers },
    { count: activeUsers },
    { count: totalInvitationCodes },
    { count: usedInvitationCodes },
    { count: pendingReviews }
  ] = await Promise.all([
    // 用户总数
    supabase.from('users').select('id', { count: 'exact', head: true }),
    // 今日新增用户
    supabase
      .from('users')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date().toISOString().split('T')[0]),
    // 7日内活跃用户
    supabase
      .from('learning_records')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    // 邀请码总数
    supabase.from('invitation_codes').select('id', { count: 'exact', head: true }),
    // 已使用的邀请码数
    supabase
      .from('invitation_codes')
      .select('id', { count: 'exact', head: true })
      .gt('used_count', 0),
    // 待审核词库
    supabase
      .from('books')
      .select('id', { count: 'exact', head: true })
      .eq('review_status', 'pending')
  ])

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
    pendingReviews: pendingReviews || 0
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
