'use client'

import { Users, UserPlus, TrendingUp } from 'lucide-react'

interface DashboardStatsProps {
  stats: {
    totalUsers: number
    yesterdayNewUsers: number
    todayNewUsers: number
    trendData: Array<{ date: string; count: number }>
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  return (
    <div className="space-y-6">
      {/* 用户统计卡片 - 3列布局 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 昨日新增 */}
        <div className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded border-[2px] border-gray-300 flex items-center justify-center">
              <UserPlus className="text-gray-600" size={24} strokeWidth={2.5} />
            </div>
            <div className="text-gray-600 bg-gray-50 px-2 py-1 rounded text-xs font-bold">
              昨日
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.yesterdayNewUsers.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 font-semibold mt-1">昨日新增</p>
          </div>
        </div>

        {/* 今日新增 */}
        <div className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded border-[2px] border-green-300 flex items-center justify-center">
              <UserPlus className="text-green-600" size={24} strokeWidth={2.5} />
            </div>
            <div className="text-green-600 bg-green-50 px-2 py-1 rounded text-xs font-bold">
              今日
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.todayNewUsers.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 font-semibold mt-1">今日新增</p>
          </div>
        </div>

        {/* 总用户数 */}
        <div className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded border-[2px] border-blue-300 flex items-center justify-center">
              <Users className="text-blue-600" size={24} strokeWidth={2.5} />
            </div>
            <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-xs font-bold">
              总数
            </div>
          </div>
          <div>
            <p className="text-4xl font-black text-gray-800" style={{ fontFamily: 'Fredoka, sans-serif' }}>
              {stats.totalUsers.toLocaleString()}
            </p>
            <p className="text-sm text-gray-600 font-semibold mt-1">总用户数</p>
          </div>
        </div>
      </div>

      {/* 注册走势表 - 简单可靠 */}
      <div className="bg-white rounded border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded border-[2px] border-indigo-300 flex items-center justify-center">
            <TrendingUp className="text-indigo-600" size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">注册走势</h3>
            <p className="text-sm text-gray-600 font-semibold">最近30天每日新增用户</p>
          </div>
        </div>

        {/* 简单表格 */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b-2 border-gray-300">
                <th className="text-left py-3 px-4 font-bold text-gray-700">日期</th>
                <th className="text-right py-3 px-4 font-bold text-gray-700">新增用户</th>
                <th className="text-left py-3 px-4 font-bold text-gray-700">状态</th>
              </tr>
            </thead>
            <tbody>
              {stats.trendData.map((item) => (
                <tr key={item.date} className="border-b border-gray-200 hover:bg-gray-50">
                  <td className="py-3 px-4 text-gray-800 font-semibold">{item.date}</td>
                  <td className="py-3 px-4 text-right">
                    <span className={`inline-block px-3 py-1 rounded font-bold ${
                      item.count > 0
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {item.count} 人
                    </span>
                  </td>
                  <td className="py-3 px-4">
                    {item.count > 0 ? (
                      <span className="text-green-600 font-bold">✓ 有数据</span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
