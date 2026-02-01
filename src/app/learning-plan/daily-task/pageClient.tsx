'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookOpen,
  Flame,
  Settings,
  Sparkles,
  Volume2,
  Keyboard,
  CheckCircle2,
  Info
} from 'lucide-react'
import { getTodayTask, getLearningPlanProgress } from '@/services/learning-plan'
import { useTheme } from '@/contexts/ThemeContext'

type LearningMode = 'flashcard' | 'dictation'

export default function DailyTaskClient({ bookId }: { bookId: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'

  const [task, setTask] = useState<any>(null)
  const [progress, setProgress] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [selectedMode, setSelectedMode] = useState<LearningMode>('flashcard')

  useEffect(() => {
    loadData()
  }, [bookId])

  const loadData = async () => {
    try {
      setLoading(true)

      const [taskRes, progressRes] = await Promise.all([
        getTodayTask(bookId),
        getLearningPlanProgress(bookId)
      ])

      if (taskRes.success && taskRes.data) {
        setTask(taskRes.data)
      } else {
        toast.error('获取今日任务失败')
        router.push('/')
        return
      }

      if (progressRes.success && progressRes.data) {
        setProgress(progressRes.data)
      }
    } catch (error: any) {
      console.error('Failed to load data:', error)
      toast.error('加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const handleStartLearning = () => {
    if (!task) return

    const params = new URLSearchParams({
      mode: selectedMode,
      bookId
    })

    router.push(`/learning-plan/learning-flow?${params.toString()}`)
  }

  const handleGoToComplete = () => {
    router.push(`/learning-complete?bookId=${bookId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!task || !progress) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>加载失败</p>
      </div>
    )
  }

  const completedCount = task.completed_words?.length || 0
  const totalCount = task.total_words || 0
  const taskProgress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* 顶部导航 */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg hover:opacity-70 transition-opacity"
              style={{ color: 'var(--text-secondary)' }}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                今日学习任务
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold"
                 style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{progress.streak_days || 0}</span>
            </div>
            <button className="p-2 rounded-lg hover:opacity-70 transition-opacity"
                    style={{ color: 'var(--text-muted)' }}>
              <Settings className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 📚 学习计划进度卡片 */}
        <div className="p-5 border-2 rounded-xl mb-4" style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border)'
        }}>
          <div className="flex items-center gap-2 mb-3">
            <BookOpen className="w-5 h-5" style={{ color: '#6366f1' }} />
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              📚 学习计划进度
            </h3>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>已完成</span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                {progress.learned_words?.toLocaleString() || 0} / {progress.total_words?.toLocaleString() || 0} 个单词
              </span>
            </div>

            {/* 进度条 */}
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(progress.progress_percentage || 0, 100)}%` }}
              />
            </div>

            <div className="flex justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
              <span>第 {task.plan_day} 天</span>
              <span>还剩约 {Math.ceil((progress.total_words - progress.learned_words) / progress.daily_new_words)} 天</span>
            </div>
          </div>
        </div>

        {/* 今日单词卡片 */}
        <div className="p-5 border-2 rounded-xl mb-4" style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border)'
        }}>
          <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
            今日单词
          </h3>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>
                {task.review_words?.length || 0}个复习 · {task.new_words?.length || 0}个新学
              </span>
            </div>
            <div className="text-sm font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
              {completedCount}/{totalCount} 已完成
            </div>
          </div>

          {/* 进度条 */}
          <div className="w-full h-3 rounded-full overflow-hidden mb-2" style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${Math.min(taskProgress, 100)}%` }}
            />
          </div>

          <div className="text-xs text-right font-mono" style={{ color: 'var(--text-muted)' }}>
            {taskProgress.toFixed(0)}%
          </div>
        </div>

        {/* 选择学习模式 */}
        <div className="mb-4">
          <h3 className="font-bold text-sm mb-3" style={{ color: 'var(--text-primary)' }}>
            选择学习模式
          </h3>

          <div className="grid grid-cols-2 gap-3 mb-4">
            {/* 卡片背单词 */}
            <button
              onClick={() => setSelectedMode('flashcard')}
              className={`p-4 border-2 rounded-xl transition-all ${
                selectedMode === 'flashcard'
                  ? 'bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30 border-indigo-500'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedMode !== 'flashcard' ? 'var(--card-bg)' : undefined,
                borderColor: selectedMode !== 'flashcard' ? 'var(--border)' : undefined
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                     style={{ backgroundColor: selectedMode === 'flashcard' ? '#6366f1' : 'var(--bg-secondary)' }}>
                  <Sparkles className="w-6 h-6" style={{ color: selectedMode === 'flashcard' ? 'white' : 'var(--text-primary)' }} />
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    卡片背单词
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    点击翻转，标记认识/不认识
                  </div>
                </div>
              </div>
            </button>

            {/* 听写模式 */}
            <button
              onClick={() => setSelectedMode('dictation')}
              className={`p-4 border-2 rounded-xl transition-all ${
                selectedMode === 'dictation'
                  ? 'bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-900/30 dark:to-pink-900/30 border-purple-500'
                  : 'hover:opacity-80'
              }`}
              style={{
                backgroundColor: selectedMode !== 'dictation' ? 'var(--card-bg)' : undefined,
                borderColor: selectedMode !== 'dictation' ? 'var(--border)' : undefined
              }}
            >
              <div className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-full flex items-center justify-center"
                     style={{ backgroundColor: selectedMode === 'dictation' ? '#a855f7' : 'var(--bg-secondary)' }}>
                  <Volume2 className="w-6 h-6" style={{ color: selectedMode === 'dictation' ? 'white' : 'var(--text-primary)' }} />
                </div>
                <div className="text-center">
                  <div className="font-bold text-sm mb-1" style={{ color: 'var(--text-primary)' }}>
                    听写模式
                  </div>
                  <div className="text-xs" style={{ color: 'var(--text-muted)' }}>
                    听发音，输入拼写
                  </div>
                </div>
              </div>
            </button>
          </div>

          {/* 开始学习按钮 */}
          {task.all_completed ? (
            <button
              onClick={handleGoToComplete}
              className="w-full px-6 py-4 text-base font-bold text-white rounded-xl bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              <span>🎉 完成今日任务</span>
            </button>
          ) : (
            <button
              onClick={handleStartLearning}
              className="w-full px-6 py-4 text-base font-bold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              <span>开始学习</span>
              <ArrowLeft className="w-5 h-5 rotate-180" />
            </button>
          )}
        </div>

        {/* 💡 学习提示 */}
        <div className="p-4 border-2 rounded-xl" style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border)'
        }}>
          <div className="flex items-center gap-2 mb-2">
            <Info className="w-4 h-4" style={{ color: '#6366f1' }} />
            <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
              💡 学习提示
            </h3>
          </div>
          <ul className="space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
            <li>• 每个词必须标记"认识"才算完成</li>
            <li>• 标记"不认识"的词会在当天循环出现</li>
            <li>• 复习词和新学词混合在一起</li>
          </ul>
        </div>

      </div>
    </div>
  )
}
