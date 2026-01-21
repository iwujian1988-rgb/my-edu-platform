'use client'

/**
 * 仪表盘统计卡片组件
 * 显示用户核心指标和注册走势图
 */

import { Users, UserPlus, TrendingUp } from 'lucide-react'
import { useEffect } from 'react'

interface DashboardStatsProps {
  stats: {
    totalUsers: number
    yesterdayNewUsers: number
    todayNewUsers: number
    trendData: Array<{ date: string; count: number }>
  }
}

export function DashboardStats({ stats }: DashboardStatsProps) {
  // 调试日志
  useEffect(() => {
    console.log('🎨 [DashboardStats Client] 收到的props:', {
      totalUsers: stats.totalUsers,
      yesterdayNewUsers: stats.yesterdayNewUsers,
      todayNewUsers: stats.todayNewUsers,
      trendDataLength: stats.trendData.length,
      trendDataSample: stats.trendData.slice(0, 3)
    })
  }, [stats])

  // 计算走势图的最大值（用于归一化高度）
  const maxCount = Math.max(...stats.trendData.map(d => d.count), 1)

  console.log('📊 [DashboardStats Client] maxCount:', maxCount, 'trendData:', stats.trendData.length)

  return (
    <div className="space-y-6">
      {/* 调试：显示数据接收状态 */}
      <div className="bg-yellow-50 p-2 rounded text-xs">
        调试信息: 收到 {stats.trendData.length} 条走势数据，最大值 {maxCount}，
        非零数据 {stats.trendData.filter(d => d.count > 0).length} 天
      </div>

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

      {/* 注册走势图 */}
      <div className="bg-white rounded-2xl border-[3px] border-black shadow-[4px_4px_0px_0px_#000] p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-indigo-100 rounded-xl border-[2px] border-indigo-300 flex items-center justify-center">
            <TrendingUp className="text-indigo-600" size={20} strokeWidth={2.5} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-800">注册走势</h3>
            <p className="text-sm text-gray-600 font-semibold">最近30天每日新增用户</p>
          </div>
          {/* 调试信息 */}
          <div className="ml-auto text-xs bg-gray-100 px-2 py-1 rounded">
            数据: {stats.trendData.length}天 | 最大值: {maxCount}人
          </div>
        </div>

        {/* 纯CSS柱状图 */}
        <div className="relative">
          {/* Y轴标签 */}
          <div className="absolute left-0 top-0 bottom-8 w-12 flex flex-col justify-between text-xs text-gray-500 font-semibold">
            <span>{maxCount}</span>
            <span>{Math.floor(maxCount / 2)}</span>
            <span>0</span>
          </div>

          {/* 图表区域 */}
          <div className="ml-14">
            {/* 调试：显示正在渲染 */}
            <div className="text-xs text-gray-500 mb-2">
              正在渲染 {stats.trendData.length} 个柱子，其中 {stats.trendData.filter(d => d.count > 0).length} 个有数据
            </div>

            {/* 柱状图 */}
            <div className="flex items-end gap-1 h-40 border-b border-l border-gray-300 pl-2 bg-gray-50">
              {stats.trendData.map((item, index) => {
                const heightPercent = (item.count / maxCount) * 100
                const isToday = index === stats.trendData.length - 1

                return (
                  <div
                    key={item.date}
                    className="flex-1 flex flex-col items-center group relative"
                    style={{ minWidth: '8px' }}
                  >
                    {/* 柱子 */}
                    <div
                      className={`w-full rounded-t-sm transition-all hover:opacity-80 ${
                        isToday ? 'bg-green-500' : 'bg-indigo-400'
                      }`}
                      style={{
                        height: `${Math.max(heightPercent, 2)}%`,
                        minHeight: '2px'
                      }}
                      title={`${item.date}: ${item.count}人`}
                    />

                    {/* Tooltip */}
                    <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                      {item.date.slice(5)}: {item.count}人
                    </div>
                  </div>
                )
              })}
            </div>

            {/* X轴标签（每隔5天显示一次） */}
            <div className="flex gap-1 mt-2 pl-2">
              {stats.trendData.map((item, index) => {
                const showLabel = index % 5 === 0 || index === stats.trendData.length - 1
                if (!showLabel) return <div key={item.date} className="flex-1" />

                return (
                  <div
                    key={item.date}
                    className="flex-1 text-xs text-gray-500 font-semibold text-center"
                    style={{ minWidth: '8px' }}
                  >
                    {item.date.slice(5).replace('-', '/')}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
