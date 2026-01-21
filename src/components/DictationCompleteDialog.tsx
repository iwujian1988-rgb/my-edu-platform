// src/components/DictationCompleteDialog.tsx
// 对应方案：Section 6.6 - 完成对话框组件

import { ArrowLeft, RotateCcw, Home } from 'lucide-react'

interface DictationCompleteDialogProps {
  isOpen: boolean
  scopeType: string
  scopeLabel: string
  completedCount: number
  totalCount: number
  onRestart: () => void
  onBack: () => void
  onHome: () => void
}

/**
 * DictationCompleteDialog: 听写完成对话框
 * 对应方案：Section 6.6 - 完成对话框组件
 */
export function DictationCompleteDialog({
  isOpen,
  scopeType,
  scopeLabel,
  completedCount,
  totalCount,
  onRestart,
  onBack,
  onHome
}: DictationCompleteDialogProps) {
  // 对应方案：防御性编程 - 未打开时不渲染
  if (!isOpen) return null

  const accuracy = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="border-2 border-black rounded-xl shadow-[6px_6px_0px_0px_#000] max-w-md w-full p-8 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)' }}>
        {/* 完成图标 - Neo-Brutalism 风格 */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-[#CCFF00] border-2 border-black rounded-xl mb-4 shadow-[4px_4px_0px_0px_#000]">
            <span className="text-4xl">🎉</span>
          </div>
          <h2 className="text-3xl font-black mb-2" style={{ color: 'var(--text-primary)' }}>
            太棒了！
          </h2>
          <p className="font-bold" style={{ color: 'var(--text-secondary)' }}>
            你已完成"<span className="text-black bg-[#CCFF00] px-2 py-0.5 rounded">{scopeLabel}</span>"范围的学习
          </p>
        </div>

        {/* 统计信息 */}
        <div className="mb-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* 完成单词卡片 */}
            <div className="border-2 border-black rounded-lg p-4 shadow-[3px_3px_0px_0px_#000] transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)' }}>
              <div className="text-center">
                <div className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{completedCount}</div>
                <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>完成单词</div>
              </div>
            </div>
            {/* 完成率卡片 */}
            <div className="border-2 border-black rounded-lg p-4 shadow-[3px_3px_0px_0px_#000] transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)' }}>
              <div className="text-center">
                <div className="text-4xl font-black" style={{ color: 'var(--text-primary)' }}>{accuracy.toFixed(1)}%</div>
                <div className="text-sm font-bold mt-1" style={{ color: 'var(--text-secondary)' }}>完成率</div>
              </div>
            </div>
          </div>

          {/* 鼓励语 */}
          {accuracy >= 80 && (
            <div className="text-center p-3 bg-[#CCFF00] border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
              <p className="text-sm font-black text-black">
                {accuracy >= 90 && "🌟 太出色了！继续保持！"}
                {accuracy >= 80 && accuracy < 90 && "👍 做得很好！再接再厉！"}
              </p>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3">
          <button
            onClick={onRestart}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-[#CCFF00] border-2 border-black text-black rounded-lg hover:shadow-[4px_4px_0px_0px_#000] hover:-translate-x-[4px] hover:-translate-y-[4px] transition-all font-black shadow-[2px_2px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none"
          >
            <RotateCcw className="w-5 h-5" strokeWidth={2.5} />
            重新学习这个范围
          </button>

          <div className="flex gap-3">
            <button
              onClick={onBack}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-black rounded-lg hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-x-[3px] hover:-translate-y-[3px] transition-all font-bold shadow-[2px_2px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-colors duration-300"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}
            >
              <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
              返回词书详情
            </button>

            <button
              onClick={onHome}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border-2 border-black rounded-lg hover:shadow-[3px_3px_0px_0px_#000] hover:-translate-x-[3px] hover:-translate-y-[3px] transition-all font-bold shadow-[2px_2px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none transition-colors duration-300"
              style={{ backgroundColor: 'var(--card-bg)', color: 'var(--text-primary)' }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-tertiary)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--card-bg)'}
            >
              <Home className="w-5 h-5" strokeWidth={2.5} />
              返回首页
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
