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
}

export function FlashcardScopeDialog({
  bookId,
  bookTitle,
  isOpen,
  onClose
}: FlashcardScopeDialogProps) {
  const router = useRouter()
  const [stats, setStats] = useState<WordStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selectedScope, setSelectedScope] = useState<string | null>(null)

  // 获取各状态的单词数量统计
  useEffect(() => {
    async function fetchStats() {
      try {
        // 使用专门的统计API，只返回数量，不返回单词数据
        const response = await fetch(`/api/words/stats?bookId=${bookId}`)
        const result = await response.json()

        if (result.success && result.data) {
          setStats(result.data)
        }
      } catch (error) {
        console.error('Error fetching word stats:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchStats()
    }
  }, [bookId, isOpen])

  const scopeOptions: ScopeOption[] = [
    {
      value: 'unknown',
      label: '不认识的',
      description: '重点攻克陌生单词',
      icon: <AlertCircle size={32} />,
      color: '#FF6B6B',
      bgColor: 'bg-red-50'
    },
    {
      value: 'new',
      label: '未标注',
      description: '从零开始学习',
      icon: <Plus size={32} />,
      color: '#9CA3AF',
      bgColor: 'bg-gray-50'
    },
    {
      value: 'fuzzy',
      label: '模糊的',
      description: '巩固不太熟悉的单词',
      icon: <HelpCircle size={32} />,
      color: '#FACC15',
      bgColor: 'bg-yellow-50'
    },
    {
      value: 'known',
      label: '认识',
      description: '复习已掌握的单词',
      icon: <CheckCircle size={32} />,
      color: '#B4F416',
      bgColor: 'bg-green-50'
    },
    {
      value: 'all',
      label: '全部单词',
      description: '全面复习所有内容',
      icon: <BookOpen size={32} />,
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

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl border-[3px] border-black shadow-[8px_8px_0px_0px_#000] w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b-[2px] border-black">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-black">选择学习范围</h2>
            <button
              onClick={onClose}
              className="w-10 h-10 flex items-center justify-center bg-gray-100 border-2 border-black rounded-lg hover:bg-gray-200 transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-gray-600 font-bold">{bookTitle}</p>
        </div>

        {/* Content */}
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block w-12 h-12 border-4 border-black border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-900 font-black">加载中...</p>
            </div>
          ) : stats ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scopeOptions
                .filter((option) => {
                  // 只显示有单词的选项
                  const count = Number(stats[option.value] || 0)
                  return count > 0
                })
                .map((option) => {
                  const count = Number(stats[option.value] || 0)
                  const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0

                  return (
                    <button
                      key={option.value}
                      onClick={() => handleScopeSelect(option.value)}
                      className={`
                        relative p-4 rounded-xl border-[3px] transition-all
                        ${option.bgColor} border-black hover:shadow-[4px_4px_0px_0px_#000] active:translate-y-1 active:shadow-none cursor-pointer
                      `}
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0" style={{ color: option.color }}>
                          {option.icon}
                        </div>
                        <div className="flex-1 text-left">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-black text-lg">{option.label}</h3>
                            <span className="font-mono font-bold text-xl" style={{ color: option.color }}>
                              {count}
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 font-semibold mb-2">{option.description}</p>
                          {/* 进度条 */}
                          <div className="w-full h-3 bg-white border-2 border-black rounded overflow-hidden">
                            <div
                              className="h-full transition-all duration-300"
                              style={{
                                width: `${percentage}%`,
                                backgroundColor: option.color
                              }}
                            />
                          </div>
                          <p className="text-xs text-gray-500 font-mono mt-1">
                            {percentage}% ({count}/{stats.total})
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
            </div>
          ) : (
            <div className="text-center py-12 text-red-600">
              <p className="font-black">加载失败，请重试</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t-[2px] border-black bg-gray-50">
          <p className="text-sm text-gray-600 font-semibold text-center">
            💡 提示：选择范围后可以随时切换，进度会自动保存
          </p>
        </div>
      </div>
    </div>
  )
}
