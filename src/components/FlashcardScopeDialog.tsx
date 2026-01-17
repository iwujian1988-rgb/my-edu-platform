'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, AlertCircle, HelpCircle, CheckCircle2, BookOpen, Clock, X } from 'lucide-react'

type FlashcardScopeType = 'all' | 'unknown' | 'fuzzy' | 'known' | 'new'

interface ScopeOption {
  value: FlashcardScopeType
  label: string
  count: number
  disabled: boolean
}

interface WordStats {
  total: number
  known: number
  fuzzy: number
  unknown: number
  new: number
  all: number
}

interface FlashcardProgress {
  scopeType: FlashcardScopeType
  currentIndex: number
  totalWords: number
  lastStudyTime?: number
}

interface FlashcardScopeDialogProps {
  bookId: string
  bookTitle: string
  isOpen: boolean
  onClose: () => void
  initialStats?: WordStats
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
const getStatusDescription = (value: FlashcardScopeType): string => {
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
function formatResumeInfo(progress: FlashcardProgress): string {
  // 防御性检查：确保数据完整
  if (typeof progress.currentIndex !== 'number') {
    return '学习进度未知'
  }

  const scopeLabels: Record<FlashcardScopeType, string> = {
    all: '全部单词',
    unknown: '不认识的',
    fuzzy: '模糊的',
    known: '认识的',
    new: '未标注的'
  }

  const scopeLabel = scopeLabels[progress.scopeType] || progress.scopeType || '未知范围'
  const currentIndex = progress.currentIndex + 1
  const totalWords = progress.totalWords || 0

  return `${scopeLabel}，第 ${currentIndex} 张${totalWords > 0 ? ` / 共 ${totalWords} 张` : ''}`
}

/**
 * 计算时间差
 */
function formatTimeAgo(lastStudyTime?: number): string {
  if (!lastStudyTime) return '未知时间'

  const now = Date.now()
  const diff = now - lastStudyTime

  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return '刚刚'
  if (minutes < 60) return `${minutes} 分钟前`
  if (hours < 24) return `${hours} 小时前`
  if (days < 7) return `${days} 天前`

  const date = new Date(lastStudyTime)
  return `${date.getMonth() + 1}月${date.getDate()}日`
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
  const [recentProgress, setRecentProgress] = useState<FlashcardProgress | null>(null)
  const [loading, setLoading] = useState(!initialStats)

  // 获取统计数据和最近进度
  useEffect(() => {
    if (initialStats) {
      setStats(initialStats)
      setLoading(false)
    }

    async function fetchData() {
      try {
        // 并行请求统计数据和所有范围的进度
        const [statsRes, ...progressResps] = await Promise.all([
          fetch(`/api/words/stats?bookId=${bookId}`),
          // 获取所有范围的进度
          fetch(`/api/flashcard-progress?bookId=${bookId}&scopeType=unknown`),
          fetch(`/api/flashcard-progress?bookId=${bookId}&scopeType=new`),
          fetch(`/api/flashcard-progress?bookId=${bookId}&scopeType=fuzzy`),
          fetch(`/api/flashcard-progress?bookId=${bookId}&scopeType=known`),
          fetch(`/api/flashcard-progress?bookId=${bookId}&scopeType=all`)
        ])

        // 处理统计数据
        if (statsRes.ok && !initialStats) {
          const statsResult = await statsRes.json()
          if (statsResult.success && statsResult.data) {
            setStats(statsResult.data)
          }
        }

        // 处理所有进度，找到最近学习的一个
        const scopeTypes: FlashcardScopeType[] = ['unknown', 'new', 'fuzzy', 'known', 'all']
        let latestProgress: FlashcardProgress | null = null
        let latestTime = 0

        for (let i = 0; i < scopeTypes.length; i++) {
          const resp = progressResps[i]
          if (resp.ok) {
            const progressResult = await resp.json()
            if (progressResult.data && progressResult.data.currentIndex !== undefined) {
              const studyTime = progressResult.data.lastStudyTime || 0
              if (studyTime > latestTime) {
                latestTime = studyTime
                latestProgress = {
                  scopeType: progressResult.data.scopeType || scopeTypes[i],
                  currentIndex: progressResult.data.currentIndex,
                  totalWords: progressResult.data.totalWords || 0,
                  lastStudyTime: studyTime
                }
              }
            }
          }
        }

        if (latestProgress) {
          setRecentProgress(latestProgress)
        }
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    if (isOpen) {
      fetchData()
    }
  }, [bookId, isOpen, initialStats])

  // 构建范围选项
  const scopeOptions: ScopeOption[] = stats ? [
    {
      value: 'unknown',
      label: '不认识的',
      count: stats.unknown || 0,
      disabled: (stats.unknown || 0) === 0
    },
    {
      value: 'new',
      label: '未标注的',
      count: stats.new || 0,
      disabled: (stats.new || 0) === 0
    },
    {
      value: 'fuzzy',
      label: '模糊的',
      count: stats.fuzzy || 0,
      disabled: (stats.fuzzy || 0) === 0
    },
    {
      value: 'known',
      label: '认识的',
      count: stats.known || 0,
      disabled: (stats.known || 0) === 0
    },
    {
      value: 'all',
      label: '全部单词',
      count: stats.all || 0,
      disabled: (stats.all || 0) === 0
    }
  ] : []

  const handleScopeSelect = async (scopeValue: FlashcardScopeType) => {
    // 跳转到flashcards页面
    router.push(`/study/${bookId}/flashcards?scope=${scopeValue}&shuffle=true`)
    onClose()
  }

  // 加载状态
  if (loading) {
    return (
      isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] p-8">
            <div className="flex flex-col items-center">
              <div className="inline-block animate-spin rounded-full h-16 w-16 border-4 border-black border-t-[#ccff00] mb-6"></div>
              <p className="font-black text-lg">加载学习数据...</p>
            </div>
          </div>
        </div>
      )
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-800/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      {/* Main Container - Neo-Brutalism 风格 */}
      <div className="w-full max-w-md bg-white border-2 border-black rounded-xl shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header - #f4f4f5 背景 */}
        <div className="p-6 border-b-2 border-black bg-[#f4f4f5] flex justify-between items-center">
          <h2 className="text-2xl font-black italic">选择学习范围</h2>
          <button
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center border-2 border-black rounded-lg hover:bg-red-400 hover:shadow-[2px_2px_0px_0px_#000] hover:-translate-x-[2px] hover:-translate-y-[2px] transition-all shadow-[2px_2px_0px_0px_#000] active:translate-x-0 active:translate-y-0 active:shadow-none"
            aria-label="关闭"
          >
            <X className="w-6 h-6" strokeWidth={2.5} />
          </button>
        </div>

        {/* ✨ 继续上次学习卡片 ✨ */}
        {recentProgress && recentProgress.currentIndex >= 0 && (
          <div className="p-4 bg-gradient-to-r from-[#ccff00] to-[#b8e600] border-b-2 border-black">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-black" strokeWidth={2.5} />
                  <span className="text-xs font-bold text-black">
                    {formatTimeAgo(recentProgress.lastStudyTime)}
                  </span>
                </div>
                <p className="text-sm font-black text-black mb-1">
                  继续上次学习
                </p>
                <p className="text-xs font-bold text-gray-700">
                  {formatResumeInfo(recentProgress)}
                </p>
              </div>
              <button
                onClick={() => handleScopeSelect(recentProgress.scopeType)}
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
                onClick={() => !option.disabled && handleScopeSelect(option.value)}
                disabled={option.disabled}
                className={`
                  w-full flex items-center justify-between p-4 bg-white border-2 rounded-xl transition-all
                  ${option.disabled
                    ? 'border-gray-300 opacity-50 cursor-not-allowed'
                    : 'border-black cursor-pointer shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-x-[4px] active:translate-y-[4px] active:shadow-none'
                  }
                `}
              >
                {/* 左侧：图标框 */}
                <div className={`w-12 h-12 rounded-lg border-2 border-black flex items-center justify-center flex-shrink-0 ${option.disabled ? 'bg-gray-200' : style.iconBg}`}>
                  <Icon className={`w-6 h-6 ${option.disabled ? 'text-gray-400' : 'text-black'}`} strokeWidth={2.5} />
                </div>

                {/* 中间：标题和描述 */}
                <div className="flex-1 ml-4 text-left">
                  <div className={`font-black text-lg ${option.disabled ? 'text-gray-400' : 'text-black'}`}>
                    {option.label}
                  </div>
                  <div className={`text-sm font-bold mt-1 ${option.disabled ? 'text-gray-400' : 'text-gray-600'}`}>
                    {getStatusDescription(option.value)}
                  </div>
                </div>

                {/* 右侧：数字和箭头 */}
                <div className="flex items-center gap-3">
                  {/* 数字标签 */}
                  <div className={`
                    w-14 h-14 flex items-center justify-center text-2xl font-black border-2 border-black rounded-lg
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
        <div className="p-4 border-t-2 border-black bg-[#f4f4f5]">
          <p className="text-center text-sm font-bold text-gray-700">
            🎮 选择范围开始学习，掌握每一个单词！
          </p>
        </div>
      </div>
    </div>
  )
}
