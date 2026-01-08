'use client'

/**
 * 仪表盘统计卡片组件
 * 显示6个核心指标（包括套餐和权限统计）
 */

import { Users, UserPlus, Ticket, BookOpen, Package, AlertCircle } from 'lucide-react'
import Link from 'next/link'

interface DashboardStatsProps {
  stats: {
    totalUsers: number
    todayNewUsers: number
    activeUsers: number
    invitationUsageRate: number
    usedInvitationCodes: number
    totalInvitationCodes: number
    pendingReviews: number
    totalPackages: number
    activeInvitationCodes: number
    expiredPermissionsCount: number
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* 用户统计卡片 */}
      <Link
        href="/admin/users"
        className="group bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6 hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl border-[2px] border-green-300 flex items-center justify-center">
            <Users className="text-green-600" size={24} strokeWidth={2.5} />
          </div>
          <div className="text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs font-bold">
            总数
          </div>
        </div>
        <div className="mb-2">
          <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {stats.totalUsers.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 font-semibold mt-1">用户总数</p>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <UserPlus size={16} className="text-green-600" />
          <span className="text-green-600 font-bold">+{stats.todayNewUsers}</span>
          <span className="text-gray-500 font-semibold">今日新增</span>
        </div>
      </Link>

      {/* 活跃用户卡片 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl border-[2px] border-blue-300 flex items-center justify-center">
            <Users className="text-blue-600" size={24} strokeWidth={2.5} />
          </div>
          <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xs font-bold">
            7日
          </div>
        </div>
        <div className="mb-2">
          <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {stats.activeUsers.toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 font-semibold mt-1">活跃用户</p>
        </div>
        <div className="text-sm text-gray-500 font-semibold">
          占比 {stats.totalUsers > 0 ? Math.round((stats.activeUsers / stats.totalUsers) * 100) : 0}%
        </div>
      </div>

      {/* 邀请码使用率卡片 */}
      <Link
        href="/admin/invitation-codes"
        className="group bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6 hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-purple-100 rounded-xl border-[2px] border-purple-300 flex items-center justify-center">
            <Ticket className="text-purple-600" size={24} strokeWidth={2.5} />
          </div>
          <div className="text-purple-600 bg-purple-50 px-2 py-1 rounded-lg text-xs font-bold">
            使用率
          </div>
        </div>
        <div className="mb-2">
          <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {stats.invitationUsageRate}%
          </p>
          <p className="text-sm text-gray-600 font-semibold mt-1">邀请码使用率</p>
        </div>
        <div className="text-sm text-gray-500 font-semibold">
          已用 {stats.usedInvitationCodes} / 总计 {stats.totalInvitationCodes}
        </div>
      </Link>

      {/* 套餐统计卡片 */}
      <Link
        href="/admin/packages"
        className="group bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6 hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-indigo-100 rounded-xl border-[2px] border-indigo-300 flex items-center justify-center">
            <Package className="text-indigo-600" size={24} strokeWidth={2.5} />
          </div>
          <div className="text-indigo-600 bg-indigo-50 px-2 py-1 rounded-lg text-xs font-bold">
            套餐
          </div>
        </div>
        <div className="mb-2">
          <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {stats.totalPackages}
          </p>
          <p className="text-sm text-gray-600 font-semibold mt-1">套餐总数</p>
        </div>
        <div className="text-sm text-gray-500 font-semibold">
          有效邀请码 {stats.activeInvitationCodes} 个
        </div>
      </Link>

      {/* 权限过期用户卡片 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl border-[2px] border-red-300 flex items-center justify-center">
            <AlertCircle className="text-red-600" size={24} strokeWidth={2.5} />
          </div>
          <div className="text-red-600 bg-red-50 px-2 py-1 rounded-lg text-xs font-bold">
            过期
          </div>
        </div>
        <div className="mb-2">
          <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {stats.expiredPermissionsCount}
          </p>
          <p className="text-sm text-gray-600 font-semibold mt-1">权限过期用户</p>
        </div>
        <div className="text-sm text-gray-500 font-semibold">
          需要及时续费
        </div>
      </div>

      {/* 待审核词库卡片 */}
      <Link
        href="/admin/reviews"
        className="group bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6 hover:shadow-[6px_6px_0px_0px_#000] hover:-translate-y-1 transition-all"
      >
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl border-[2px] border-orange-300 flex items-center justify-center">
            <BookOpen className="text-orange-600" size={24} strokeWidth={2.5} />
          </div>
          {stats.pendingReviews > 0 && (
            <div className="text-red-600 bg-red-50 px-2 py-1 rounded-lg text-xs font-bold">
              待处理
            </div>
          )}
        </div>
        <div className="mb-2">
          <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
            {stats.pendingReviews}
          </p>
          <p className="text-sm text-gray-600 font-semibold mt-1">待审核词库</p>
        </div>
        <div className="text-sm text-gray-500 font-semibold">
          {stats.pendingReviews > 0 ? '需要及时处理' : '所有词库已审核'}
        </div>
      </Link>
    </div>
  )
}
