/**
 * 管理后台仪表盘
 * 显示核心指标、数据图表和待办事项
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { DashboardStats } from '@/components/admin/DashboardStats'

export default async function AdminDashboard() {
  const admin = await requireAdmin()
  // 使用 admin client 绕过 RLS 限制
  const supabase = await createAdminClient()

  // ⚠️ 添加超时保护，避免查询hang住
  const timeoutPromise = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Query timeout')), 8000) // 8秒超时
  )

  // 计算昨天日期
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const todayStr = new Date().toISOString().split('T')[0]

  // 获取用户统计数据（添加超时保护）
  const [
    { count: totalUsers },
    { count: todayNewUsers },
    { count: yesterdayNewUsers },
    registrationTrendData
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
        .gte('created_at', todayStr),
      timeoutPromise
    ]),
    // 昨日新增用户
    Promise.race([
      (supabase.from('users') as any)
        .select('id', { count: 'exact', head: true })
        .gte('created_at', yesterdayStr)
        .lt('created_at', todayStr),
      timeoutPromise
    ]),
    // 获取最近30天的注册走势数据
    Promise.race([
      supabase.rpc('get_registration_trend', { days_count: 30 }),
      timeoutPromise
    ])
  ]).catch(() => [
    { count: 0 },
    { count: 0 },
    { count: 0 },
    null
  ])

  // 转换走势图数据（处理可能的多种返回格式）
  let rawTrendData = registrationTrendData as any

  // 如果是 {data: [...]} 格式，提取 data
  if (rawTrendData && rawTrendData.data && Array.isArray(rawTrendData.data)) {
    rawTrendData = rawTrendData.data
  }

  // 确保是数组
  const trendData = (Array.isArray(rawTrendData) ? rawTrendData : []).map((item: any) => ({
    date: item.trend_date,
    count: item.trend_count
  }))

  // 统计数据
  const stats = {
    totalUsers: totalUsers || 0,
    yesterdayNewUsers: yesterdayNewUsers || 0,
    todayNewUsers: todayNewUsers || 0,
    trendData
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
    </div>
  )
}
