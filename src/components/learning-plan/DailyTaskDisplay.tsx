'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { CheckCircle, Zap, RotateCcw, AlertCircle, X, Trash2, Edit, HelpCircle } from 'lucide-react'
import { toast } from 'sonner'
import { useTheme } from '@/contexts/ThemeContext'
import type { TodayTaskResponse, LearningPlan, LearningPlanPhase } from '@/types/learning-plan'
import { deleteLearningPlan } from '@/services/learning-plan'

interface Props {
  planId: string
  bookId: string
  plan?: LearningPlan  // 可选的学习计划信息
  bookTitle?: string   // 词书标题（用于删除确认）
  onDeletePlan?: (planId: string, bookTitle: string) => Promise<void>  // 删除回调
  onEditPlan?: (plan: LearningPlan, bookTitle: string) => void  // 编辑回调
}

export function DailyTaskDisplay({ planId, bookId, plan, bookTitle, onDeletePlan, onEditPlan }: Props) {
  const router = useRouter()
  const pathname = usePathname()  // 🔥 监听路由变化
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'

  // 从 API 获取真实数据
  const [taskData, setTaskData] = useState<TodayTaskResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [animatedProgress, setAnimatedProgress] = useState(0)

  // 🆕 缓存相关：记录上次获取时间
  const lastFetchTimeRef = useRef<number>(0)
  const CACHE_DURATION = 30000 // 30 秒缓存

  // 🆕 学习模式选择弹窗状态
  const [showModeSelector, setShowModeSelector] = useState(false)

  // 🆕 处理学习模式选择
  const handleStartLearning = () => {
    setShowModeSelector(true)
  }

  const handleModeSelect = (mode: 'flashcard' | 'dictation') => {
    setShowModeSelector(false)
    router.push(`/learning-plan/learning-flow?bookId=${bookId}&planId=${planId}&mode=${mode}`)
  }

  const handleCloseModal = () => {
    setShowModeSelector(false)
  }

  // 🆕 处理删除学习计划
  const handleDeletePlan = async () => {
    // 如果有父组件传入的删除回调，使用它（这样父组件可以重新加载计划列表）
    if (onDeletePlan && bookTitle) {
      await onDeletePlan(planId, bookTitle)
      return
    }

    // 否则使用原来的逻辑（兼容性处理）
    if (!confirm('确定要删除此学习计划吗？')) {
      return
    }

    try {
      const result = await deleteLearningPlan(planId)
      if (result.success) {
        toast.success('学习计划已删除')
        router.refresh()
      } else {
        toast.error(result.error || '删除失败')
      }
    } catch (error: any) {
      console.error('Failed to delete plan:', error)
      toast.error('删除学习计划失败')
    }
  }

  // 🆕 处理编辑学习计划
  const handleEditPlan = () => {
    if (onEditPlan && plan && bookTitle) {
      onEditPlan(plan, bookTitle)
    }
  }


  const fetchTodayTask = async (showToast = false, forceRefresh = false) => {
    // 🆕 缓存检查：如果数据未过期且不强制刷新，直接返回
    const now = Date.now()
    if (!forceRefresh && taskData && (now - lastFetchTimeRef.current < CACHE_DURATION)) {
      console.log('[DailyTaskDisplay] ✅ 使用缓存数据，距离上次刷新:', Math.round((now - lastFetchTimeRef.current) / 1000), '秒')
      return
    }

    try {
      console.log('[DailyTaskDisplay] Fetching today task for bookId:', bookId)
      // 🔥 禁用缓存，确保获取最新数据
      const response = await fetch(`/api/v3/daily-task?bookId=${bookId}&_t=${Date.now()}`, {
        cache: 'no-store'
      })
      const result = await response.json()

      if (result.success && result.data) {
        console.log('[DailyTaskDisplay] ✅ Data received:', {
          completedCount: result.data.completed_words?.length || 0,
          totalWords: result.data.total_words,
          newWords: result.data.new_words?.length || 0,
          reviewWords: result.data.review_words?.length || 0,
          allCompleted: result.data.all_completed,
          progress: result.data.total_words > 0
            ? Math.round(((result.data.completed_words?.length || 0) / result.data.total_words) * 100)
            : 0,
          completed_words: result.data.completed_words,
          task_date: result.data.task_date
        })
        setTaskData(result.data)
        setIsError(false)
        lastFetchTimeRef.current = now  // 🆕 更新缓存时间
        if (showToast) {
          toast.success('今日任务已刷新')
        }
      } else {
        // 没有找到今日任务
        console.log('[DailyTaskDisplay] ❌ No task found:', result.error)
        setIsError(true)
        if (showToast) {
          toast.error(result.error || '今日任务未生成')
        }
      }
    } catch (error) {
      console.error('[DailyTaskDisplay] ❌ Failed to fetch:', error)
      setIsError(true)
      if (showToast) {
        toast.error('加载今日任务失败，请点击刷新')
      }
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  // 🆕 手动刷新 / 生成今日任务
  const handleRefresh = async () => {
    setIsRefreshing(true)

    try {
      // 调用生成今日任务的 API
      const response = await fetch('/api/v3/daily-task', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ bookId })
      })

      const result = await response.json()

      if (result.success) {
        toast.success('今日任务已生成')
        // 重新获取今日任务数据
        fetchTodayTask(false)
      } else {
        toast.error(result.error || '生成今日任务失败')
        setIsRefreshing(false)
      }
    } catch (error) {
      console.error('Failed to generate daily task:', error)
      toast.error('生成今日任务失败，请稍后重试')
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    let isMounted = true

    const loadTask = async () => {
      if (!isMounted) return
      await fetchTodayTask(false, false)
    }

    loadTask()

    return () => {
      isMounted = false
    }
  // 🔥 只在 bookId 或 planId 变化时才重新请求
  }, [bookId, planId])

  // 🔥 监听窗口焦点：当用户从其他标签页返回时，自动刷新数据（仅在缓存过期时）
  useEffect(() => {
    let isMounted = true

    const handleFocus = () => {
      if (!isMounted) return

      const now = Date.now()
      const cacheAge = now - lastFetchTimeRef.current

      // 🆕 只在缓存超过 30 秒时才刷新
      if (cacheAge >= CACHE_DURATION) {
        console.log('[DailyTaskDisplay] Window focused, cache expired, refreshing...')
        fetchTodayTask()
      } else {
        console.log('[DailyTaskDisplay] Window focused, using cache (', Math.round(cacheAge / 1000), 'seconds old)')
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => {
      isMounted = false
      window.removeEventListener('focus', handleFocus)
    }
  }, [bookId, planId])

  // 🔧 修复：确保 completed_words, new_words, review_words 是数组
  // Supabase 可能会返回对象而不是数组（JSONB 字段的解析问题）
  const normalizeToArray = <T,>(value: T[] | Record<string, T> | undefined | null): T[] => {
    if (!value) return []
    if (Array.isArray(value)) return value
    // 如果是对象，提取所有值
    return Object.values(value)
  }

  const completedWordsArray = normalizeToArray(taskData?.completed_words)
  const newWordsArray = normalizeToArray(taskData?.new_words)
  const reviewWordsArray = normalizeToArray(taskData?.review_words)

  // [Upgrade] 两阶段系统：新增字段统计
  const markedWordsArray = normalizeToArray(taskData?.marked_words)
  const knownWordsArray = normalizeToArray(taskData?.known_words)

  // 计算进度
  const completedCount = completedWordsArray.length  // [Legacy] v4.0: 已标记"认识"的词
  const markedCount = markedWordsArray.length      // [Upgrade] 两阶段: 已标记（任何状态）的词
  const knownCount = knownWordsArray.length        // [Upgrade] 两阶段: 已标记"认识"的词

  const totalCount = taskData?.total_words || 0
  const newWordsCount = newWordsArray.length
  const reviewWordsCount = reviewWordsArray.length

  // [Upgrade] 两阶段系统：优先使用 marked_count 计算进度
  const primaryCount = markedCount > 0 ? markedCount : completedCount
  const realProgress = totalCount > 0 ? Math.round((primaryCount / totalCount) * 100) : 0

  // [Upgrade] 两阶段系统：完成检测逻辑（根据阶段使用不同字段）
  const currentPhase = taskData?.phase || 'legacy'
  const isAllCompleted =
    currentPhase === 'review'
      ? false  // [Upgrade] 复习阶段：永不完成
      : currentPhase === 'learning'
        ? taskData?.all_marked || false  // [Upgrade] 学习阶段：全部标记过
        : taskData?.all_completed || false  // [Legacy] v4.0: 全部标记为"认识"

  // 🔍 调试日志
  console.log('[DailyTaskDisplay] 进度计算:', {
    completedCount,
    totalCount,
    newWordsCount,
    reviewWordsCount,
    realProgress,
    isAllCompleted,
    completed_words_type: Array.isArray(taskData?.completed_words) ? 'array' : typeof taskData?.completed_words,
    原始completed_words: taskData?.completed_words
  })

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedProgress(realProgress)
    }, 300)
    return () => clearTimeout(timer)
  }, [realProgress])

  // 显示加载状态（使用快速骨架屏，减少卡顿感）
  if (isLoading) {
    return (
      <div className={`
        border-[3px] transition-colors duration-200
        ${isDark
          ? 'bg-[#0f172a] border-slate-700'
          : 'bg-gray-50 border-black'
        }
      `}>
        <div className="relative p-4 flex items-center justify-center" style={{ height: '244px' }}>
          <div className="flex items-center gap-3">
            <div className="w-6 h-6 border-3 border-black dark:border-slate-600 border-t-transparent rounded animate-spin" />
            <span className="text-xs font-bold text-gray-600 dark:text-gray-400">加载中...</span>
          </div>
        </div>
      </div>
    )
  }

  // 🆕 显示错误状态
  if (isError) {
    return (
      <div className={`
        border-[3px] transition-colors duration-200
        ${isDark
          ? 'bg-[#0f172a] border-slate-700'
          : 'bg-gray-50 border-black'
        }
      `}>
        <div className="relative p-4 flex flex-col items-center justify-center space-y-4" style={{ height: '244px' }}>
          <AlertCircle className="w-12 h-12 text-orange-500" strokeWidth={2} />
          <div className="text-center">
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider mb-2">
              今日任务未生成
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              点击下方按钮手动生成
            </p>
          </div>
          <button
            onClick={handleRefresh}
            disabled={isRefreshing}
            className={`
              flex items-center gap-2 px-6 py-3
              text-sm font-black uppercase tracking-wider
              border-[3px] border-black dark:border-slate-600
              bg-[#B4F416] dark:bg-[#86efac]
              shadow-[4px_4px_0px_0px_#000] dark:shadow-none
              hover:translate-x-[1px] hover:translate-y-[1px]
              hover:shadow-[2px_2px_0px_0px_#000]
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
              ${isRefreshing ? 'animate-pulse' : ''}
            `}
          >
            <RotateCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} strokeWidth={3} />
            <span>{isRefreshing ? '生成中...' : '生成今日任务'}</span>
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`
        border-[3px] transition-colors duration-200
        ${isDark
          ? 'bg-[#0f172a] border-slate-700'
          : 'bg-gray-50 border-black'
        }
      `}
    >
      {/* 🌟 核心大容器 (直角/微圆角) */}
      <div className="relative p-4 space-y-3 group/card" style={{ height: '244px' }}>

        {/* A. 内部 Header: Day & 删除按钮 */}
        <div className="flex items-center justify-between">
          {/* 左侧：预估结束时间 */}
          <div className="flex items-center gap-2">
            {/* 预估结束时间 */}
            {plan?.estimated_end_date && (
              <div className="text-[9px] font-mono font-bold text-gray-400 dark:text-slate-500 uppercase tracking-wide">
                预估结束：{new Date(plan.estimated_end_date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })}
              </div>
            )}
          </div>

          {/* 右侧：标签和操作按钮 */}
          <div className="flex items-center gap-2">
            <div className={`
              px-2 py-0.5 text-xs font-black border border-transparent
              ${isDark ? 'bg-slate-800 text-slate-300' : 'bg-black text-white'}
            `}>
              DAY {taskData?.plan_day || 1}
            </div>

            {/* [Upgrade] 两阶段系统：复习阶段标签 */}
            {taskData?.phase === 'review' && (
              <div className="px-2 py-0.5 text-[9px] font-black bg-purple-500 text-white rounded animate-pulse">
                复习阶段
              </div>
            )}

            {/* 记忆曲线帮助按钮 */}
            <button
              onClick={() => router.push('/guide/memory-curve')}
              className="
                p-1.5 rounded
                text-gray-400 dark:text-gray-600
                hover:text-green-600 dark:hover:text-green-400
                hover:bg-green-50 dark:hover:bg-green-900/20
                transition-all duration-200
              "
              title="了解记忆曲线原理"
            >
              <HelpCircle className="w-3.5 h-3.5" strokeWidth={2} />
            </button>

            {/* 编辑按钮 */}
            <button
              onClick={handleEditPlan}
              className="
                opacity-50 md:opacity-0 md:group-hover/card:opacity-50 hover:opacity-100
                p-1.5 rounded
                text-gray-400 dark:text-gray-600
                hover:text-blue-600 dark:hover:text-blue-400
                hover:bg-blue-50 dark:hover:bg-blue-900/20
                transition-all duration-200
              "
              title="编辑学习计划"
            >
              <Edit className="w-3.5 h-3.5" strokeWidth={2} />
            </button>

            {/* 删除按钮 */}
            <button
              onClick={handleDeletePlan}
              className="
                opacity-50 md:opacity-0 md:group-hover/card:opacity-50 hover:opacity-100
                p-1.5 rounded
                text-gray-400 dark:text-gray-600
                hover:text-red-600 dark:hover:text-red-400
                hover:bg-red-50 dark:hover:bg-red-900/20
                transition-all duration-200
              "
              title="删除此学习计划"
            >
              <Trash2 className="w-3.5 h-3.5" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* B. 数据展示 (字号加大，但布局紧凑) */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="text-center group cursor-default">
            <div className="text-5xl md:text-6xl font-black text-black dark:text-slate-100 leading-none mb-2 group-hover:scale-105 transition-transform duration-200">
              {newWordsCount}
            </div>
            <div className="text-[10px] font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">
              新学
            </div>
          </div>

          <div className="text-center group cursor-default">
            <div className="text-5xl md:text-6xl font-black text-gray-300 dark:text-slate-700 leading-none mb-2 group-hover:text-black dark:group-hover:text-slate-100 transition-colors duration-200">
              {reviewWordsCount}
            </div>
            <div className="text-[10px] font-bold text-gray-400 dark:text-slate-600 uppercase tracking-widest">
              复习
            </div>
          </div>
        </div>

        {/* C. 进度条按钮 (直角化) */}
        <div className="pt-0 -mt-2">
          <div className="flex justify-between items-end mb-1.5 px-0.5">
            <span className="text-[10px] font-bold text-gray-400 dark:text-slate-600 uppercase">今日进度</span>
            <span className="text-[10px] font-mono font-bold text-gray-500 dark:text-slate-400">
              {/* [Upgrade] 两阶段系统：优先显示已标记格式，保留旧格式作为 fallback */}
              {markedCount > 0 ? (
                <>{primaryCount} / {totalCount} 已标记 ({knownCount}个认识)</>
              ) : (
                <>{completedCount} / {totalCount} ({realProgress}%)</>
              )}
            </span>
          </div>

          <button
            onClick={handleStartLearning}
            disabled={totalCount === 0 || isAllCompleted}
            className={`
              relative w-full h-12 overflow-hidden
              border-[3px] border-black dark:border-transparent
              shadow-[4px_4px_0px_0px_#000] dark:shadow-none
              transition-all duration-200 group
              bg-white dark:bg-[#1e293b]

              hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-[2px_2px_0px_0px_#000]
              active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
              dark:hover:shadow-none
            `}
          >
            <div
              className="absolute top-0 left-0 h-full bg-[#B4F416] transition-all duration-1000 ease-out"
              style={{ width: `${animatedProgress}%` }}
            />

            <div
              className="absolute inset-0 opacity-10 pointer-events-none"
              style={{ backgroundImage: 'repeating-linear-gradient(45deg, #000 0, #000 1px, transparent 0, transparent 10px)' }}
            />

            <div className="absolute inset-0 flex items-center justify-center gap-2 z-10">
              {isAllCompleted ? (
                <>
                  <CheckCircle size={18} strokeWidth={3} className="text-black" />
                  <span className="text-sm font-black uppercase tracking-wide text-black">今日打卡完成</span>
                </>
              ) : (
                <>
                  <Zap size={18} strokeWidth={3} fill="currentColor" className="text-black" />
                  <span className="text-sm font-black uppercase tracking-wide text-black">
                    {/* [Upgrade] 两阶段系统：根据阶段显示不同提示文本 */}
                    {currentPhase === 'review'
                      ? (animatedProgress > 0 ? '继续复习' : '开始复习')
                      : (animatedProgress > 0 ? '继续学习' : '开始专注学习')
                    }
                  </span>
                </>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* 🆕 学习模式选择弹窗 */}
      {showModeSelector && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={handleCloseModal}
        >
          <div
            className={`
              relative w-full max-w-md mx-4
              border-[3px] border-black dark:border-slate-600
              bg-white dark:bg-[#0f172a]
              shadow-[8px_8px_0px_0px_#000] dark:shadow-none
              p-6
            `}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 关闭按钮 */}
            <button
              onClick={handleCloseModal}
              className="absolute top-4 right-4 text-gray-500 hover:text-black dark:hover:text-slate-300 transition-colors"
            >
              <X className="w-5 h-5" strokeWidth={2.5} />
            </button>

            {/* 标题 */}
            <div className="mb-6">
              <h3 className="text-xl font-black text-black dark:text-white mb-2">
                选择学习模式
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                请选择你想要的学习方式
              </p>
            </div>

            {/* 选项按钮 */}
            <div className="space-y-3">
              {/* 卡片背单词 */}
              <button
                onClick={() => handleModeSelect('flashcard')}
                className={`
                  w-full p-4 text-left
                  border-[3px] border-black dark:border-slate-600
                  bg-white dark:bg-[#1e293b]
                  shadow-[4px_4px_0px_0px_#000] dark:shadow-none
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  hover:shadow-[2px_2px_0px_0px_#000]
                  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                  transition-all duration-200
                  group
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-black dark:text-white mb-1">
                      卡片背单词
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      翻转卡片查看答案，适合快速记忆
                    </div>
                  </div>
                  <Zap
                    className="w-8 h-8 text-[#B4F416] group-hover:scale-110 transition-transform"
                    strokeWidth={2.5}
                    fill="currentColor"
                  />
                </div>
              </button>

              {/* 默写模式 */}
              <button
                onClick={() => handleModeSelect('dictation')}
                className={`
                  w-full p-4 text-left
                  border-[3px] border-black dark:border-slate-600
                  bg-white dark:bg-[#1e293b]
                  shadow-[4px_4px_0px_0px_#000] dark:shadow-none
                  hover:translate-x-[1px] hover:translate-y-[1px]
                  hover:shadow-[2px_2px_0px_0px_#000]
                  active:translate-x-[2px] active:translate-y-[2px] active:shadow-none
                  transition-all duration-200
                  group
                `}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-black dark:text-white mb-1">
                      默写模式
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      听音拼写，强化记忆效果
                    </div>
                  </div>
                  <CheckCircle
                    className="w-8 h-8 text-blue-500 group-hover:scale-110 transition-transform"
                    strokeWidth={2.5}
                  />
                </div>
              </button>
            </div>

            {/* 取消按钮 */}
            <button
              onClick={handleCloseModal}
              className="
                mt-4 w-full py-2
                text-xs font-bold text-gray-500 dark:text-gray-400
                hover:text-black dark:hover:text-slate-300
                transition-colors
              "
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
