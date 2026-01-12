'use client'

import { useState, useEffect } from 'react'
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
}

export function FlashcardStatsBar({ bookId, currentScope, onScopeChange }: FlashcardStatsBarProps) {
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [pendingScope, setPendingScope] = useState<string | null>(null)

  // 获取统计数据
  useEffect(() => {
    async function fetchStats() {
      try {
        const [allRes, unknownRes, fuzzyRes, knownRes, newRes] = await Promise.all([
          fetch(`/api/words?bookId=${bookId}&status=all`),
          fetch(`/api/words?bookId=${bookId}&status=unknown`),
          fetch(`/api/words?bookId=${bookId}&status=fuzzy`),
          fetch(`/api/words?bookId=${bookId}&status=known`),
          fetch(`/api/words?bookId=${bookId}&status=new`)
        ])

        const [allData, unknownData, fuzzyData, knownData, newData] = await Promise.all([
          allRes.json(),
          unknownRes.json(),
          fuzzyRes.json(),
          knownRes.json(),
          newRes.json()
        ])

        setStats({
          total: allData.total || 0,
          unknown: unknownData.total || 0,
          fuzzy: fuzzyData.total || 0,
          known: knownData.total || 0,
          new: newData.total || 0
        })
      } catch (error) {
        console.error('Error fetching stats:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [bookId])

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
        {/* 统计色块 */}
        <div className="flex items-center gap-1 mb-1">
          {Object.entries(scopeInfo).map(([key, info]) => {
            const count = stats[key as keyof StatsData] || 0
            const percentage = stats.total > 0 ? (count / stats.total) * 100 : 0

            return (
              <button
                key={key}
                onClick={() => handleScopeClick(key)}
                className={`
                  relative flex-1 h-8 rounded border-2 border-black transition-all
                  flex items-center justify-center gap-1 font-black text-xs
                  ${currentScope === key ? 'shadow-[2px_2px_0px_0px_#000]' : 'opacity-80 hover:opacity-100'}
                `}
                style={{
                  backgroundColor: info.color,
                  minWidth: percentage > 0 ? `${percentage}%` : '40px'
                }}
                title={`${info.label}: ${count}个 (${Math.round(percentage)}%)`}
              >
                {count > 0 && (
                  <>
                    {info.icon}
                    <span className="hidden sm:inline">{Math.round(percentage)}%</span>
                  </>
                )}
              </button>
            )
          })}
        </div>

        {/* 当前范围标签 */}
        <div className="flex items-center justify-between text-xs font-bold text-gray-600 px-1">
          <span>
            当前范围: <span className="font-mono uppercase">{currentScope}</span>
          </span>
          <span>
            总计: <span className="font-mono">{stats.total}</span>
          </span>
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
