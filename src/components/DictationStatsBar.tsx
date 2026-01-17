// src/components/DictationStatsBar.tsx
// 对应方案：Section 6.6 - 统计色块组件

import { DictationStats, DictationScopeType, DICTATION_SCOPE_LABELS } from '@/types/dictation'

interface DictationStatsBarProps {
  stats: DictationStats | null
  loading?: boolean
  currentScope?: DictationScopeType
  onScopeClick?: (scope: DictationScopeType) => void
}

/**
 * DictationStatsBar: 听写统计色块组件
 * 对应方案：Section 6.6 - 统计色块组件
 */
export function DictationStatsBar({
  stats,
  loading = false,
  currentScope,
  onScopeClick
}: DictationStatsBarProps) {
  // 对应方案：防御性编程 - 加载状态（硬核风格）
  if (loading || !stats) {
    return (
      <div className="bg-white border-[3px] border-black rounded-xl shadow-[4px_4px_0px_0px_#000] p-4 animate-pulse">
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="flex-1 h-16 bg-gray-300 rounded-lg border-[3px] border-black"></div>
          ))}
        </div>
      </div>
    )
  }

  // Neo-Brutalism 风格颜色映射
  const colorMap: Record<DictationScopeType, string> = {
    all: 'text-black',
    unknown: 'text-red-600',
    fuzzy: 'text-orange-600',
    known: 'text-black',
    new: 'text-gray-600'
  }

  const bgColorMap: Record<DictationScopeType, string> = {
    all: 'bg-[#CCFF00]',
    unknown: 'bg-red-400',
    fuzzy: 'bg-yellow-400',
    known: 'bg-[#CCFF00]',
    new: 'bg-gray-300'
  }

  const scopeTypes: DictationScopeType[] = ['all', 'unknown', 'fuzzy', 'known', 'new']
  const totalWords = stats.all

  return (
    <div className="bg-white border-2 border-black rounded-xl shadow-[4px_4px_0px_0px_#000] p-4">
      {/* 统计标题 */}
      <div className="text-sm font-black mb-4">
        单词统计：共 <span className="text-[#CCFF00] bg-black px-2 py-0.5 rounded">{totalWords}</span> 词
      </div>

      {/* 统计卡片网格 - 独立卡片式设计 */}
      <div className="grid grid-cols-5 gap-2 mb-4">
        {scopeTypes.map((scopeType) => {
          const count = stats[scopeType]
          const percentage = totalWords > 0 ? (count / totalWords) * 100 : 0
          const isSelected = currentScope === scopeType
          const isClickable = onScopeClick !== undefined

          return (
            <button
              key={scopeType}
              onClick={() => isClickable && count > 0 && onScopeClick(scopeType)}
              disabled={!isClickable || count === 0}
              className={`relative p-3 border-2 rounded-lg transition-all ${
                count === 0
                  ? 'opacity-40 cursor-not-allowed border-gray-300 bg-gray-100'
                  : isClickable
                    ? 'cursor-pointer border-black bg-white hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-x-[3px] hover:-translate-y-[3px] shadow-[2px_2px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none'
                    : 'cursor-default border-black bg-white'
              } ${isSelected ? 'ring-2 ring-black ring-offset-2' : ''}`}
            >
              {/* 统计数字 */}
              <div className="text-center">
                <div className={`text-2xl font-black ${colorMap[scopeType]}`}>
                  {count}
                </div>
                <div className="text-xs font-bold text-gray-700 mt-1 leading-tight">
                  {DICTATION_SCOPE_LABELS[scopeType]}
                </div>
                {percentage > 0 && (
                  <div className="text-xs font-semibold text-gray-600 mt-1">
                    {percentage.toFixed(1)}%
                  </div>
                )}
              </div>

              {/* 色条指示器 */}
              {count > 0 && (
                <div className={`absolute top-0 left-0 right-0 h-1 ${bgColorMap[scopeType]} border-b-2 border-black rounded-t-lg`}></div>
              )}
            </button>
          )
        })}
      </div>

      {/* 图例 */}
      <div className="flex flex-wrap gap-3 text-xs font-bold text-gray-700">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-red-400 border-2 border-black rounded"></div>
          <span>不认识</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-yellow-400 border-2 border-black rounded"></div>
          <span>模糊</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-[#CCFF00] border-2 border-black rounded"></div>
          <span>认识</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-gray-300 border-2 border-black rounded"></div>
          <span>未标注</span>
        </div>
      </div>
    </div>
  )
}
