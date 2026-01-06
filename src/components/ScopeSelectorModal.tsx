'use client'

import React from 'react'
import { Check, X } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface ScopeSelectorModalProps {
  isOpen: boolean
  onClose: () => void
  bookId: string
  practiceMode: 'flashcards' | 'dictation' | 'match-game'
  filteredCount: number
  totalCount: number
  filterDescription: string
  filterParams?: {
    theme?: string
    scene?: string
    status?: string
  }
}

type ScopeType = 'filtered' | 'all'

export function ScopeSelectorModal({
  isOpen,
  onClose,
  bookId,
  practiceMode,
  filteredCount,
  totalCount,
  filterDescription,
  filterParams
}: ScopeSelectorModalProps) {
  const router = useRouter()
  const [selectedScope, setSelectedScope] = React.useState<ScopeType>(
    filteredCount > 0 ? 'filtered' : 'all'
  )

  const handleConfirm = () => {
    const scope = selectedScope === 'filtered' ? 'filtered' : 'all'

    // 构建URL参数
    const params = new URLSearchParams()
    params.set('scope', scope)

    // 如果选择筛选范围，添加筛选条件参数
    if (scope === 'filtered' && filterParams) {
      if (filterParams.theme && filterParams.theme !== 'all') {
        params.set('theme', filterParams.theme)
      }
      if (filterParams.scene && filterParams.scene !== 'all') {
        params.set('scene', filterParams.scene)
      }
      if (filterParams.status && filterParams.status !== 'all') {
        params.set('status', filterParams.status)
      }
    }

    const queryString = params.toString()
    const url = `/study/${bookId}/${practiceMode}${queryString ? `?${queryString}` : ''}`

    router.push(url)
    onClose()
  }

  if (!isOpen) return null

  const isFilteredDisabled = filteredCount === 0
  const isTotalDisabled = totalCount < 3

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="clay-card w-full max-w-md p-6 relative">
        {/* 关闭按钮 */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 clay-icon p-2 hover:scale-110 transition-transform"
        >
          <X className="w-5 h-5 text-gray-600" />
        </button>

        {/* 标题 */}
        <h2 className="text-2xl font-black text-gradient-lilac mb-6">
          选择练习范围 🎯
        </h2>

        {/* 选项卡片 */}
        <div className="space-y-4 mb-6">
          {/* 当前筛选结果 */}
          <button
            onClick={() => !isFilteredDisabled && setSelectedScope('filtered')}
            disabled={isFilteredDisabled}
            className={`
              w-full p-4 rounded-xl border-2 text-left transition-all
              ${selectedScope === 'filtered' && !isFilteredDisabled
                ? 'border-green-400 bg-green-50 shadow-lg'
                : 'border-gray-200 hover:border-purple-300'
              }
              ${isFilteredDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    当前筛选结果
                  </h3>
                  {selectedScope === 'filtered' && !isFilteredDisabled && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 font-semibold mb-2">
                  {filterDescription}
                </p>
                <p className="text-sm font-bold text-gray-700">
                  {isFilteredDisabled ? '当前筛选结果为空' : `${filteredCount} 个单词`}
                </p>
              </div>
            </div>
          </button>

          {/* 全书所有单词 */}
          <button
            onClick={() => !isTotalDisabled && setSelectedScope('all')}
            disabled={isTotalDisabled}
            className={`
              w-full p-4 rounded-xl border-2 text-left transition-all
              ${selectedScope === 'all' && !isTotalDisabled
                ? 'border-green-400 bg-green-50 shadow-lg'
                : 'border-gray-200 hover:border-purple-300'
              }
              ${isTotalDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
            `}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <h3 className="text-lg font-bold text-gray-900">
                    全书所有单词
                  </h3>
                  {selectedScope === 'all' && !isTotalDisabled && (
                    <Check className="w-5 h-5 text-green-600" />
                  )}
                </div>
                <p className="text-sm text-gray-600 font-semibold mb-2">
                  练习本书所有单词，忽略筛选条件
                </p>
                <p className="text-sm font-bold text-gray-700">
                  {isTotalDisabled ? '单词数量太少，无法练习' : `全书共 ${totalCount} 个单词`}
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* 底部按钮 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 font-bold rounded-xl hover:bg-gray-50 transition-colors"
          >
            取消
          </button>
          <button
            onClick={handleConfirm}
            disabled={(selectedScope === 'filtered' && isFilteredDisabled) || (selectedScope === 'all' && isTotalDisabled)}
            className="flex-1 px-6 py-3 bg-gradient-to-r from-green-400 to-green-500 text-white font-bold rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            确认开始
          </button>
        </div>
      </div>
    </div>
  )
}
