'use client'

/**
 * 用户列表组件
 * 包含搜索、筛选、分页、操作按钮等功能
 */

import { useState } from 'react'
import { Search, Shield, Ban, ShieldAlert, Mail, Calendar, Eye } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'

interface User {
  id: string
  email: string
  full_name: string | null
  avatar_url: string | null
  created_at: string
  last_login_at: string | null
  banned_at: string | null
  banned_reason: string | null
  invitation_code_id: string | null
}

interface Package {
  id: string
  name: string
}

interface UserListProps {
  users: User[]
  totalUsers: number
  currentPage: number
  totalPages: number
  search: string
  status: string
  packages: Package[]
  packageFilter: string
  startDate: string
  endDate: string
}

export function UserList({
  users,
  totalUsers,
  currentPage,
  totalPages,
  search,
  status,
  packages,
  packageFilter,
  startDate,
  endDate
}: UserListProps) {
  const [searchQuery, setSearchQuery] = useState(search)
  const [statusFilter, setStatusFilter] = useState(status)
  const [selectedPackage, setSelectedPackage] = useState(packageFilter)
  const [dateStart, setDateStart] = useState(startDate)
  const [dateEnd, setDateEnd] = useState(endDate)

  const handleSearch = () => {
    const params = new URLSearchParams()
    if (searchQuery) params.set('search', searchQuery)
    if (statusFilter) params.set('status', statusFilter)
    if (selectedPackage) params.set('package', selectedPackage)
    if (dateStart) params.set('startDate', dateStart)
    if (dateEnd) params.set('endDate', dateEnd)
    window.location.href = `/admin/users?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* 搜索和筛选 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* 搜索框 */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="搜索邮箱或昵称..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                className="w-full pl-10 pr-4 py-3 rounded-xl border-[2px] border-gray-300 focus:border-green-500 focus:outline-none font-semibold"
              />
            </div>
          </div>

          {/* 状态筛选 */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-3 rounded-xl border-[2px] border-gray-300 focus:border-green-500 focus:outline-none font-semibold bg-white"
          >
            <option value="">全部用户</option>
            <option value="active">正常用户</option>
            <option value="banned">已封禁</option>
          </select>

          {/* 套餐筛选 */}
          <select
            value={selectedPackage}
            onChange={(e) => setSelectedPackage(e.target.value)}
            className="px-4 py-3 rounded-xl border-[2px] border-gray-300 focus:border-purple-500 focus:outline-none font-semibold bg-white"
          >
            <option value="">全部套餐</option>
            {packages.map(pkg => (
              <option key={pkg.id} value={pkg.id}>{pkg.name}</option>
            ))}
          </select>

          {/* 注册时间筛选 */}
          <input
            type="date"
            value={dateStart}
            onChange={(e) => setDateStart(e.target.value)}
            className="px-4 py-3 rounded-xl border-[2px] border-gray-300 focus:border-blue-500 focus:outline-none font-semibold"
            placeholder="开始日期"
          />
          <input
            type="date"
            value={dateEnd}
            onChange={(e) => setDateEnd(e.target.value)}
            className="px-4 py-3 rounded-xl border-[2px] border-gray-300 focus:border-blue-500 focus:outline-none font-semibold"
            placeholder="结束日期"
          />

          {/* 搜索按钮 */}
          <button
            onClick={handleSearch}
            className="px-6 py-3 bg-gradient-to-r from-green-400 to-green-600 text-white rounded-xl border-[2px] border-black font-bold hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-y-1 transition-all"
          >
            搜索
          </button>
        </div>

        {/* 统计信息 */}
        <div className="mt-4 flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="font-semibold text-gray-600">
              总计: {totalUsers} 位用户
            </span>
          </div>
          {search && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">|</span>
              <span className="font-semibold text-green-600">
                搜索: "{search}"
              </span>
            </div>
          )}
          {statusFilter && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">|</span>
              <span className="font-semibold text-blue-600">
                {statusFilter === 'banned' ? '已封禁' : '正常用户'}
              </span>
            </div>
          )}
          {selectedPackage && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">|</span>
              <span className="font-semibold text-purple-600">
                套餐: {packages.find(p => p.id === selectedPackage)?.name || selectedPackage}
              </span>
            </div>
          )}
          {(dateStart || dateEnd) && (
            <div className="flex items-center gap-2">
              <span className="text-gray-400">|</span>
              <span className="font-semibold text-blue-600">
                注册时间: {dateStart || '开始'} - {dateEnd || '结束'}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 用户表格 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] overflow-hidden">
        {users.length === 0 ? (
          <div className="text-center py-12">
            <Shield className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500 font-semibold text-lg">暂无用户数据</p>
            <p className="text-gray-400 text-sm mt-2">尝试调整搜索条件或筛选器</p>
          </div>
        ) : (
          <>
            {/* 桌面端表格 */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b-[2px] border-gray-200">
                  <tr>
                    <th className="text-left py-4 px-6 font-bold text-gray-700">用户</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700">注册时间</th>
                    <th className="text-left py-4 px-6 font-bold text-gray-700">状态</th>
                    <th className="text-right py-4 px-6 font-bold text-gray-700">操作</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      {/* 用户信息 */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                            {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800">{user.full_name || '未设置昵称'}</p>
                            <p className="text-sm text-gray-500 flex items-center gap-1">
                              <Mail size={12} />
                              {user.email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* 注册时间 */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={16} />
                          <span className="font-semibold">{formatDate(user.created_at)}</span>
                        </div>
                      </td>

                      {/* 状态 */}
                      <td className="py-4 px-6">
                        {user.banned_at ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-red-50 rounded-full border-[2px] border-red-200">
                            <Ban className="text-red-600" size={16} />
                            <span className="text-sm font-bold text-red-600">已封禁</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border-[2px] border-green-200">
                            <Shield className="text-green-600" size={16} />
                            <span className="text-sm font-bold text-green-600">正常</span>
                          </div>
                        )}
                      </td>

                      {/* 操作按钮 */}
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/admin/users/${user.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="查看详情"
                          >
                            <Eye size={18} />
                          </Link>
                          <BanUserButton userId={user.id} isBanned={!!user.banned_at} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* 移动端卡片 */}
            <div className="md:hidden space-y-4 p-4">
              {users.map((user) => (
                <div key={user.id} className="bg-gray-50 rounded-xl p-4 border-[2px] border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg">
                        {user.full_name?.charAt(0)?.toUpperCase() || user.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-bold text-gray-800">{user.full_name || '未设置昵称'}</p>
                        <p className="text-sm text-gray-500">{user.email}</p>
                      </div>
                    </div>
                    {user.banned_at ? (
                      <div className="px-2 py-1 bg-red-50 rounded-full border-[2px] border-red-200">
                        <span className="text-xs font-bold text-red-600">已封禁</span>
                      </div>
                    ) : (
                      <div className="px-2 py-1 bg-green-50 rounded-full border-[2px] border-green-200">
                        <span className="text-xs font-bold text-green-600">正常</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                    <span className="text-xs text-gray-500">{formatDate(user.created_at)}</span>
                    <div className="flex gap-2">
                      <Link
                        href={`/admin/users/${user.id}`}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                      >
                        <Eye size={18} />
                      </Link>
                      <BanUserButton userId={user.id} isBanned={!!user.banned_at} />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* 分页 */}
            {totalPages > 1 && (
              <div className="px-6 py-4 border-t-[2px] border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600 font-semibold">
                    第 {(currentPage - 1) * 20 + 1} - {Math.min(currentPage * 20, totalUsers)} 条，共 {totalUsers} 条
                  </p>
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/users?page=${Math.max(1, currentPage - 1)}&search=${search}&status=${status}&package=${packageFilter}&startDate=${startDate}&endDate=${endDate}`}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        currentPage === 1
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-[2px] border-black hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      }`}
                    >
                      上一页
                    </Link>
                    <span className="px-4 py-2 bg-green-500 text-white rounded-lg font-bold">
                      {currentPage} / {totalPages}
                    </span>
                    <Link
                      href={`/admin/users?page=${Math.min(totalPages, currentPage + 1)}&search=${search}&status=${status}&package=${packageFilter}&startDate=${startDate}&endDate=${endDate}`}
                      className={`px-4 py-2 rounded-lg font-bold transition-all ${
                        currentPage === totalPages
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-white border-[2px] border-black hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-y-0.5'
                      }`}
                    >
                      下一页
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

/**
 * 封禁/解封用户按钮
 */
function BanUserButton({ userId, isBanned }: { userId: string; isBanned: boolean }) {
  const [loading, setLoading] = useState(false)

  const handleBan = async () => {
    if (!confirm(isBanned ? '确定要解封该用户吗？' : '确定要封禁该用户吗？')) return

    const reason = isBanned ? '' : prompt('请输入封禁原因：')
    if (isBanned === false && reason === null) return // 用户取消

    setLoading(true)
    try {
      const response = await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, reason, isBanned: !isBanned })
      })

      if (response.ok) {
        alert(isBanned ? '用户已解封' : '用户已封禁')
        window.location.reload()
      } else {
        const data = await response.json()
        alert(data.error || '操作失败')
      }
    } catch (error) {
      console.error('Error banning user:', error)
      alert('操作失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleBan}
      disabled={loading}
      className={`p-2 rounded-lg transition-colors ${
        isBanned
          ? 'text-green-600 hover:bg-green-50'
          : 'text-red-600 hover:bg-red-50'
      }`}
      title={isBanned ? '解封用户' : '封禁用户'}
    >
      {loading ? (
        <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : isBanned ? (
        <ShieldAlert size={18} />
      ) : (
        <Ban size={18} />
      )}
    </button>
  )
}
