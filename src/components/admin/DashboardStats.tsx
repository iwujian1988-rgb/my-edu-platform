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
  const maxCount = Math.max(...stats.trendData.map(d => d.count), 1)

  return (
    <div className="space-y-6">
      {/* 用户统计卡片 - 3列布局 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 昨日新增 */}
        <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-gray-100 rounded-xl border-[2px] border-gray-300 flex items-center justify-center">
              <UserPlus className="text-gray-600" size={24} strokeWidth={2.5} />
            </div>
            <div className="text-gray-600 bg-gray-50 px-2 py-1 rounded-lg text-xs font-bold">
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
        <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-green-100 rounded-xl border-[2px] border-green-300 flex items-center justify-center">
              <UserPlus className="text-green-600" size={24} strokeWidth={2.5} />
            </div>
            <div className="text-green-600 bg-green-50 px-2 py-1 rounded-lg text-xs font-bold">
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
        <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-blue-100 rounded-xl border-[2px] border-blue-300 flex items-center justify-center">
              <Users className="text-blue-600" size={24} strokeWidth={2.5} />
            </div>
            <div className="text-blue-600 bg-blue-50 px-2 py-1 rounded-lg text-xs font-bold">
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

      {/* 注册走势图 - 最简单版本 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl border-[2px] border-indigo-300 flex items-center justify-center">
            <TrendingUp className="text-indigo-600" size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">注册走势</h3>
            <p className="text-sm text-gray-600 font-semibold">最近30天每日新增用户</p>
          </div>
        </div>

        {/* 超简单柱状图 */}
        <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '4px', borderBottom: '2px solid #d1d5db', paddingLeft: '10px' }}>
          {stats.trendData.map((item, index) => {
            const height = item.count > 0 ? (item.count / maxCount) * 100 : 5
            const isToday = index === stats.trendData.length - 1

            return (
              <div
                key={item.date}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  minWidth: '10px'
                }}
              >
                {/* 柱子 */}
                <div
                  title={`${item.date}: ${item.count}人`}
                  style={{
                    width: '100%',
                    height: `${height}%`,
                    minHeight: '10px',
                    backgroundColor: isToday ? '#22c55e' : '#818cf8',
                    borderRadius: '4px 4px 0 0',
                    transition: 'opacity 0.2s'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                />
              </div>
            )
          })}
        </div>

        {/* X轴标签 */}
        <div style={{ display: 'flex', gap: '4px', marginTop: '8px', paddingLeft: '10px' }}>
          {stats.trendData.map((item, index) => {
            const showLabel = index % 5 === 0 || index === stats.trendData.length - 1
            if (!showLabel) return <div key={item.date} style={{ flex: 1 }} />

            return (
              <div
                key={item.date}
                style={{
                  flex: 1,
                  fontSize: '12px',
                  color: '#6b7280',
                  textAlign: 'center',
                  fontWeight: 600
                }}
              >
                {item.date.slice(5).replace('-', '/')}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
