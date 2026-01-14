'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BookOpen, TrendingUp, AlertCircle, HelpCircle, CheckCircle, Plus } from 'lucide-react'

interface ScopeOption {
  value: 'all' | 'unknown' | 'fuzzy' | 'known' | 'new'
  label: string
  description: string
  icon: React.ReactNode
  color: string
  bgColor: string
}

interface WordStats {
  total: number
  known: number
  fuzzy: number
  unknown: number
  new: number
  all: number
}

interface FlashcardScopeDialogProps {
  bookId: string
  bookTitle: string
  isOpen: boolean
  onClose: () => void
  initialStats?: WordStats // 预加载的统计数据
}

export function FlashcardScopeDialog({
  bookId,
  bookTitle,
  isOpen,
  onClose,
  initialStats
}: FlashcardScopeDialogProps) {
  const router = useRouter()
  const [stats, setStats] = useState<WordStats | null>(initialStats || null)
  const [loading, setLoading] = useState(!initialStats) // 如果有预加载数据，不需要loading
  const [selectedScope, setSelectedScope] = useState<string | null>(null)

  // 获取各状态的单词数量统计（只有在没有预加载数据时才请求）
  useEffect(() => {
    if (initialStats) {
      setStats(initialStats)
      setLoading(false)
      return
    }

    async function fetchStats() {
      try {
        // 使用专门的统计API，只返回数量，不返回单词数据
        const response = await fetch(`/api/words/stats?bookId=${bookId}`)
        const result = await response.json()

        if (result.success && result.data) {
          setStats(result.data)
        } else {
          // API返回失败，使用默认值
          setStats({ total: 0, all: 0, known: 0, fuzzy: 0, unknown: 0, new: 0 })
        }
      } catch (error) {
        console.error('Error fetching word stats:', error)
        // 出错时使用默认值，确保界面不会卡住
        setStats({ total: 0, all: 0, known: 0, fuzzy: 0, unknown: 0, new: 0 })
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      setLoading(true)
      fetchStats()
    }
  }, [bookId, isOpen, initialStats])

  const scopeOptions: ScopeOption[] = [
    {
      value: 'unknown',
      label: '不认识的',
      description: '重点攻克陌生单词',
      icon: <AlertCircle size={18} />,
      color: '#FF6B6B',
      bgColor: 'bg-red-50'
    },
    {
      value: 'new',
      label: '未标注',
      description: '从零开始学习',
      icon: <Plus size={18} />,
      color: '#9CA3AF',
      bgColor: 'bg-gray-50'
    },
    {
      value: 'fuzzy',
      label: '模糊的',
      description: '巩固不太熟悉的单词',
      icon: <HelpCircle size={18} />,
      color: '#FACC15',
      bgColor: 'bg-yellow-50'
    },
    {
      value: 'known',
      label: '认识',
      description: '复习已掌握的单词',
      icon: <CheckCircle size={18} />,
      color: '#B4F416',
      bgColor: 'bg-green-50'
    },
    {
      value: 'all',
      label: '全部单词',
      description: '全面复习所有内容',
      icon: <BookOpen size={18} />,
      color: '#3B82F6',
      bgColor: 'bg-blue-50'
    }
  ]

  const handleScopeSelect = async (scopeValue: string) => {
    setSelectedScope(scopeValue)

    // 保存选择到进度记录（用于"继续学习"功能）
    try {
      await fetch('/api/flashcard-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bookId,
          scopeType: scopeValue,
          currentIndex: 0,
          totalWords: 0
        })
      })
    } catch (error) {
      console.error('Error saving scope selection:', error)
    }

    // 跳转到flashcards页面
    router.push(`/study/${bookId}/flashcards?scope=${scopeValue}&shuffle=true`)
    onClose()
  }

  // 重置进度功能
  const resetProgress = async () => {
    try {
      const response = await fetch('/api/word-progress/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookId })
      })

      if (response.ok) {
        alert('进度已重置！所有单词都变回"未标注"状态。')
        window.location.reload()
      } else {
        const error = await response.json()
        alert('重置失败：' + (error.error || '未知错误'))
      }
    } catch (error) {
      console.error('Error resetting progress:', error)
      alert('重置失败，请重试')
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border-[3px] border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b-[2px] border-black">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-lg font-black">选择学习范围</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center bg-gray-100 border-2 border-black rounded-lg hover:bg-gray-200 transition-colors text-sm"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-600 text-xs font-semibold truncate">{bookTitle}</p>
        </div>

        {/* Content */}
        <div className="p-4">
          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block w-8 h-8 border-4 border-black border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-gray-900 text-sm font-bold">加载中...</p>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 gap-2">
              {scopeOptions.map((option) => {
                const count = Number(stats[option.value] || 0)
                const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0
                const isDisabled = count === 0

                return (
                  <button
                    key={option.value}
                    onClick={() => !isDisabled && handleScopeSelect(option.value)}
                    disabled={isDisabled}
                    className={`
                      relative p-3 rounded-lg border-2 transition-all text-left
                      ${option.bgColor} border-black
                      ${isDisabled
                        ? 'opacity-40 cursor-not-allowed grayscale'
                        : 'hover:shadow-[2px_2px_0px_0px_#000] active:translate-y-0.5 active:shadow-none cursor-pointer'
                      }
                    `}
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-shrink-0" style={{ color: option.color }}>
                        {option.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <h3 className="font-bold text-sm">{option.label}</h3>
                          <span className="font-mono font-bold text-sm" style={{ color: option.color }}>
                            {count}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          {/* 进度条 */}
                          <div className="flex-1 h-2 bg-white border border-black rounded overflow-hidden">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: option.color
                              }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 font-mono whitespace-nowrap">
                            {percentage}%
                          </span>
                        </div>
                        {isDisabled && (
                          <p className="text-[10px] text-red-600 font-bold mt-1">暂无单词</p>
                        )}
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-red-600">
              <p className="font-bold text-sm">加载失败，请重试</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t-[2px] border-black bg-gray-50">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-600 font-semibold flex-1">
              💡 选择范围后可随时切换
            </p>
            <button
              onClick={() => {
                if (confirm('确定要重置所有学习进度吗？这将清除所有单词的学习记录，不可恢复！')) {
                  resetProgress()
                }
              }}
              className="text-xs text-red-600 font-bold hover:underline"
            >
              重置进度
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
