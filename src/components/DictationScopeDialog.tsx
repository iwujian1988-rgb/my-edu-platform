// src/components/DictationScopeDialog.tsx
// 对应方案：Section 6.6 - 范围选择对话框组件（游戏关卡选择器风格）

'use client'

import { ChevronRight, AlertCircle, HelpCircle, CheckCircle2, BookOpen, Clock } from 'lucide-react'
import { DictationScopeType, DICTATION_SCOPE_LABELS } from '@/types/dictation'
import type { ResumeState } from '@/hooks/useResumeState'

interface ScopeOption {
  value: DictationScopeType
  label: string
  count: number
  disabled: boolean
}

interface DictationScopeDialogProps {
  isOpen: boolean
  onClose: () => void
  onSelectScope: (scope: DictationScopeType) => void
  scopeOptions: ScopeOption[]
  loading?: boolean
  recentProgress?: ResumeState | null
}

/**
 * 状态样式映射
 * 为每个学习状态定义独特的视觉标识
 */
const statusStyles = {
  unknown: {
    bg: 'bg-red-100',
    border: 'border-red-500',
    text: 'text-red-600',
    iconBg: 'bg-red-400',
    icon: AlertCircle
  },
  fuzzy: {
    bg: 'bg-yellow-100',
    border: 'border-yellow-500',
    text: 'text-yellow-700',
    iconBg: 'bg-yellow-400',
    icon: HelpCircle
  },
  known: {
    bg: 'bg-green-100',
    border: 'border-green-500',
    text: 'text-green-700',
    iconBg: 'bg-[#CCFF00]',
    icon: CheckCircle2
  },
  default: {
    bg: 'bg-white',
    border: 'border-black',
    text: 'text-black',
    iconBg: 'bg-gray-200',
    icon: BookOpen
  }
}

/**
 * 获取状态描述
 */
const getStatusDescription = (value: DictationScopeType): string => {
  switch (value) {
    case 'all': return '挑战所有单词，勇闯巅峰'
    case 'unknown': return '攻克难点，变生为熟'
    case 'fuzzy': return '巩固基础，熟能生巧'
    case 'known': return '复习旧识，温故知新'
    case 'new': return '标注未知，制定计划'
    default: return ''
  }
}

/**
 * 格式化断点续做信息
 */
function formatResumeInfo(resumeState: ResumeState): string {
  const { context } = resumeState

  // 防御性检查：确保数据完整
  if (!context || typeof context.currentIndex !== 'number') {
    return '学习进度未知'
  }

  const scopeLabels: Record<DictationScopeType, string> = {
    all: '全部单词',
    unknown: '不认识的',
    fuzzy: '模糊的',
    known: '认识的',
    new: '未标注的'
  }

  const scopeLabel = scopeLabels[context.scopeType] || context.scopeType || '未知范围'
  const currentIndex = context.currentIndex + 1
  const totalWords = context.totalWords || 0

  return `${scopeLabel}，第 ${currentIndex} 题${totalWords > 0 ? ` / 共 ${totalWords} 题` : ''}`
}

/**
 * 计算时间差
 */
function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  const date = new Date(timestamp)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * DictationScopeDialog: 听写范围选择对话框（游戏关卡选择器风格）
 * 对应方案：Section 6.6 - 范围选择对话框组件
 */
export function DictationScopeDialog({
  isOpen,
  onClose,
  onSelectScope,
  scopeOptions,
  loading = false,
  recentProgress
}: DictationScopeDialogProps) {
  // 对应方案：防御性编程 - 加载状态（硬核风格）
  if (loading) {
    return (
      isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8 transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)' }}>
            <div className="flex flex-col items-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#ccff00] mb-6"></div>
              <p className="font-black text-lg" style={{ color: 'var(--text-primary)' }}>加载关卡数据...</p>
            </div>
          </div>
        </div>
      )
    )
  }

  // 对应方案：防御性编程 - 未打开时不渲染
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-800/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      {/* Main Container - 游戏关卡选择器风格 */}
      <div className="w-full max-w-md border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh] transition-colors duration-300" style={{ backgroundColor: 'var(--card-bg)' }}>

        {/* Header - #f4f4f5 背景 */}
        <div className="p-6 border-b-2 border-black flex items-center" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <h2 className="text-2xl font-black italic" style={{ color: 'var(--text-primary)' }}>选择战场</h2>
        </div>

        {/* ✨ 继续上次学习卡片 ✨ */}
        {recentProgress && (
          <div className="p-4 bg-gradient-to-r from-[#ccff00] to-[#b8e600] border-b-2 border-black">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-black" strokeWidth={2.5} />
                  <span className="text-xs font-bold text-black">
                    {formatTimeAgo(recentProgress.updatedAt)}
                  </span>
                </div>
                <p className="text-sm font-black text-black mb-1">
                  继续上次学习
                </p>
                <p className="text-xs font-bold text-black/80">
                  {formatResumeInfo(recentProgress)}
                </p>
              </div>
              <button
                onClick={() => {
                  onSelectScope(recentProgress.context.scopeType)
                  onClose()
                }}
                className="px-4 py-2 bg-black text-white font-black text-sm rounded-lg shadow-[3px_3px_0px_0px_rgba(0,0,0,0.3)] hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,0.3)] active:translate-x-0 active:translate-y-0 active:shadow-none transition-all"
              >
                继续
              </button>
            </div>
          </div>
        )}

        {/* Scrollable List - 关卡卡片列表 */}
        <div className="p-4 overflow-y-auto space-y-3">
          {scopeOptions.map((option) => {
            // 根据状态获取样式
            const style = option.value === 'unknown' || option.value === 'fuzzy' || option.value === 'known'
              ? statusStyles[option.value]
              : statusStyles.default
            const Icon = style.icon

            return (
              <button
                key={option.value}
                onClick={() => !option.disabled && onSelectScope(option.value)}
                disabled={option.disabled}
                className={`
                  w-full flex items-center justify-between p-4 border-2 rounded-xl transition-all transition-colors duration-300
                  ${option.disabled
                    ? 'opacity-50 cursor-not-allowed'
                    : 'border-black cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                  }
                `}
                style={{
                  backgroundColor: option.disabled ? 'var(--bg-tertiary)' : 'var(--card-bg)',
                  borderColor: option.disabled ? 'var(--border)' : undefined
                }}
              >
                {/* 左侧：图标框 */}
                <div className={`w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0 ${option.disabled ? '' : style.iconBg}`} style={option.disabled ? { backgroundColor: 'var(--bg-tertiary)' } : {}}>
                  <Icon className={`w-6 h-6 ${option.disabled ? '' : 'text-black'}`} strokeWidth={2.5} style={option.disabled ? { color: 'var(--text-tertiary)' } : {}} />
                </div>

                {/* 中间：标题和描述 */}
                <div className="flex-1 ml-4 text-left">
                  <div className={`font-black text-lg ${option.disabled ? '' : ''}`} style={option.disabled ? { color: 'var(--text-tertiary)' } : { color: 'var(--text-primary)' }}>
                    {option.label}
                  </div>
                  <div className={`text-sm font-bold mt-1 ${option.disabled ? '' : ''}`} style={option.disabled ? { color: 'var(--text-tertiary)' } : { color: 'var(--text-secondary)' }}>
                    {getStatusDescription(option.value)}
                  </div>
                </div>

                {/* 右侧：数字和箭头 */}
                <div className="flex items-center gap-3">
                  {/* 数字标签 */}
                  <div className={`
                    min-w-14 h-14 px-2 flex items-center justify-center text-xl font-black border-2 border-black rounded-lg
                    ${option.disabled
                      ? 'bg-gray-200 text-gray-400'
                      : option.value === 'all'
                      ? 'bg-black text-white'
                      : option.value === 'unknown'
                      ? 'bg-red-500 text-white'
                      : option.value === 'fuzzy'
                      ? 'bg-yellow-400 text-black'
                      : option.value === 'known'
                      ? 'bg-[#CCFF00] text-black'
                      : 'bg-gray-300 text-black'
                    }
                  `}>
                    {option.count}
                  </div>

                  {/* 右箭头 */}
                  {!option.disabled && (
                    <ChevronRight className="w-6 h-6 text-black flex-shrink-0" strokeWidth={2.5} />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* 底部提示 */}
        <div className="p-4 border-t-2 border-black" style={{ backgroundColor: 'var(--bg-tertiary)' }}>
          <p className="text-center text-sm font-bold" style={{ color: 'var(--text-secondary)' }}>
            🎮 选择战场开始挑战，勇攀单词高峰！
          </p>
        </div>
      </div>
    </div>
  )
}
