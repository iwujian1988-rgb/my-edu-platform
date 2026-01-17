/**
 * 数据统计悬浮岛 - 大型居中悬浮面板
 */

"use client"

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, BarChart3, Clock, Target, TrendingUp } from 'lucide-react'

interface StatsData {
  todayTime: number // 今日学习时长（分钟）
  totalWords: number // 掌握词数
  accuracy: number // 正确率
  weeklyData: number[] // 本周每天的学习数据
}

interface StatsPanelProps {
  isOpen: boolean
  onClose: () => void
  stats: StatsData
}

// 🔧 性能优化：使用React.memo避免不必要的重渲染
export const StatsPanel = React.memo(function StatsPanel({ isOpen, onClose, stats }: StatsPanelProps) {
  if (!isOpen) return null

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return hours > 0 ? `${hours}小时${mins}分钟` : `${mins}分钟`
  }

  const maxWeeklyValue = Math.max(...stats.weeklyData, 1)

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* 半透明背景遮罩 */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-black/20 z-40 flex items-center justify-center p-4"
            onClick={onClose}
          />

          {/* 大型居中悬浮岛 */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ type: 'spring', damping: 20, stiffness: 300 }}
            className="fixed z-50 left-0 top-0 right-0 bottom-0 flex items-center justify-center pointer-events-none p-4"
          >
            <div
              className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-gray-200/50 overflow-hidden flex flex-col pointer-events-auto"
              style={{
                width: '65vw',
                maxWidth: '800px',
                maxHeight: '70vh',
              }}
            >
              {/* 头部 */}
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                    <BarChart3 size={20} className="text-indigo-600" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">学习数据统计</h2>
                    <p className="text-sm text-gray-500">查看您的学习进度</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              {/* 内容 */}
              <div className="flex-1 overflow-y-auto px-6 py-5">
                {/* 核心数据卡片 */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Clock size={20} className="text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">今日时长</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{formatTime(stats.todayTime)}</p>
                  </div>

                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <Target size={20} className="text-green-600" />
                      <p className="text-sm font-medium text-green-800">掌握词数</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{stats.totalWords}</p>
                  </div>

                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-5 rounded-2xl">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp size={20} className="text-purple-600" />
                      <p className="text-sm font-medium text-purple-800">正确率</p>
                    </div>
                    <p className="text-3xl font-bold text-purple-900">{stats.accuracy}%</p>
                  </div>
                </div>

                {/* 本周学习曲线 */}
                <div className="bg-gray-50 p-5 rounded-2xl">
                  <h3 className="text-base font-semibold text-gray-800 mb-4">本周学习曲线</h3>
                  <div className="flex items-end justify-between gap-2 h-40">
                    {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, index) => (
                      <div key={day} className="flex-1 flex flex-col items-center gap-2">
                        <div
                          className="w-full bg-blue-500 rounded-t-lg transition-all hover:bg-blue-600"
                          style={{
                            height: `${(stats.weeklyData[index] / maxWeeklyValue) * 100}%`,
                            minHeight: '4px',
                          }}
                        />
                        <p className="text-xs text-gray-600">{day}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* 学习建议 */}
                <div className="mt-4 p-4 bg-indigo-50 rounded-2xl border border-indigo-200">
                  <p className="text-sm text-indigo-800">
                    💡 <strong>建议：</strong>
                    {stats.todayTime < 30 ? '今日学习时间较少，建议继续学习30分钟以上' :
                     stats.accuracy < 80 ? '正确率有待提高，建议放慢速度注重准确率' :
                     '学习状态良好，继续保持！'}
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
})
