'use client'

import { useState, useEffect, useRef } from 'react'
import { CheckCircle, HelpCircle, AlertCircle, Plus } from 'lucide-react'

interface StatsData {
  total: number
  known: number
  fuzzy: number
  unknown: number
  new: number
}

interface FlashcardStatsBarProps {
  bookId: string
  currentScope: string
  onScopeChange: (newScope: string) => void
  initialStats?: StatsData // 初始统计数据（从父组件传入，避免首次加载）
  onWordMarked?: (oldStatus: string | null, newStatus: string) => void // 单词标记回调
}

export function FlashcardStatsBar({
  bookId,
  currentScope,
  onScopeChange,
  initialStats,
  onWordMarked
}: FlashcardStatsBarProps) {
  const [stats, setStats] = useState<StatsData | null>(initialStats || null)
  const [loading, setLoading] = useState(!initialStats) // 如果有初始数据，不需要loading
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingScope, setPendingScope] = useState<string | null>(null)

  // 前端缓存：标记单词时的增量更新
  const pendingUpdatesRef = useRef<{ oldStatus: string | null; newStatus: string }[]>([])
  const syncTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 获取统计数据（只在没有初始数据时才请求）
  useEffect(() => {
    if (initialStats) {
      setStats(initialStats)
      setLoading(false)
      return
    }

    async function fetchStats() {
      try {
        const response = await fetch(`/api/words/stats?bookId=${bookId}`)
        const result = await response.json()

        if (result.success && result.data) {
          setStats({
            total: result.data.total || 0,
            unknown: result.data.unknown || 0,
            fuzzy: result.data.fuzzy || 0,
            known: result.data.known || 0,
            new: result.data.new || 0
          })
        }
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [bookId, initialStats])

  // ⚡ 前端即时更新：标记单词时立即更新显示
  useEffect(() => {
    const handleWordMarked = (oldStatus: string | null, newStatus: string) => {
      setStats(prev => {
        if (!prev) return prev

        const updated = { ...prev }

        // 从旧状态减1
        if (oldStatus && oldStatus !== 'all') {
          updated[oldStatus as keyof StatsData] = Math.max(0, (updated[oldStatus as keyof StatsData] || 0) - 1)
        }

        // 给新状态加1
        if (newStatus !== 'all') {
          updated[newStatus as keyof StatsData] = (updated[newStatus as keyof StatsData] || 0) + 1
        }

        return updated
      })
    }

    // 监听来自父组件的标记事件
    if (onWordMarked) {
      // 这里需要父组件通过某种方式通知我们
      // 暂时先通过全局事件或者直接调用这个函数
    }
  }, [onWordMarked])

  // 暴露更新方法给父组件
  useEffect(() => {
    if (onWordMarked) {
      // 父组件会调用这个方法
      window.updateFlashcardStats = (oldStatus: string | null, newStatus: string) => {
        setStats(prev => {
          if (!prev) return prev

          const updated = { ...prev }

          // 从旧状态减1
          if (oldStatus && oldStatus !== 'all') {
            updated[oldStatus as keyof StatsData] = Math.max(0, (updated[oldStatus as keyof StatsData] || 0) - 1)
          }

          // 给新状态加1
          if (newStatus !== 'all') {
            updated[newStatus as keyof StatsData] = (updated[newStatus as keyof StatsData] || 0) + 1
          }

          return updated
        })
      }
    }

    return () => {
      delete window.updateFlashcardStats
    }
  }, [onWordMarked])

  const handleScopeClick = (scopeValue: string) => {
    if (scopeValue === currentScope) return
    setPendingScope(scopeValue)
    setShowConfirmDialog(true)
  }

  const confirmScopeChange = () => {
    if (pendingScope) {
      onScopeChange(pendingScope)
      setShowConfirmDialog(false)
      setPendingScope(null)
    }
  }

  const scopeInfo: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    known: { label: '认识', color: '#B4F416', icon: <CheckCircle size={16} /> },
    fuzzy: { label: '模糊', color: '#FACC15', icon: <HelpCircle size={16} /> },
    unknown: { label: '不认识', color: '#FF6B6B', icon: <AlertCircle size={16} /> },
    new: { label: '未标注', color: '#9CA3AF', icon: <Plus size={16} /> }
  }

  if (loading || !stats) {
    return (
      <div className="w-full h-12 bg-gray-100 border-2 border-black rounded-lg animate-pulse" />
    )
  }

  return (
    <>
      <div className="w-full">
        {/* 📊 状态统计 - 清晰显示各状态单词分布 */}
        <div className="text-center mb-2">
          <p className="text-xs font-bold text-gray-500 mb-2">学习状态分布（点击切换范围）</p>
          <div className="flex items-center justify-center gap-2 text-xs flex-wrap">
            {Object.entries(scopeInfo).map(([key, info]) => {
              const count = stats[key as keyof StatsData] || 0
              const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0
              const isActive = currentScope === key

              // 只显示有单词的状态
              if (count === 0) return null

              return (
                <button
                  key={key}
                  onClick={() => handleScopeClick(key)}
                  className={`
                    flex items-center gap-1 px-2 py-1 rounded border transition-all
                    ${isActive
                      ? 'border-black bg-white shadow-[2px_2px_0px_0px_#000] font-bold'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}
                  `}
                  title={`切换到${info.label}：${count}个单词 (${Math.round(percentage)}%)`}
                >
                  <span style={{ color: info.color }}>{info.icon}</span>
                  <span>{info.label}</span>
                  <span className="font-mono font-semibold" style={{ color: info.color }}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* 确认对话框 */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowConfirmDialog(false)}
        >
          <div
            className="bg-white rounded-xl border-[3px] border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-black mb-4">切换学习范围</h3>
            <p className="text-gray-700 font-semibold mb-6">
              确定要切换到 <span className="font-mono font-bold">{pendingScope}</span> 范围吗？
              <br />
              <span className="text-sm text-gray-500">当前进度将被保存，可以随时返回。</span>
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirmDialog(false)}
                className="flex-1 px-4 py-2 bg-gray-100 border-2 border-black rounded-lg font-bold hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
              <button
                onClick={confirmScopeChange}
                className="flex-1 px-4 py-2 bg-[#B4F416] border-2 border-black rounded-lg font-bold hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none transition-all"
              >
                确认切换
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
