'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import {
  Trophy,
  Target,
  Calendar,
  Award,
  TrendingUp,
  Home,
  Share2,
  ArrowRight,
  Flame,
  Zap,
  CheckCircle2,
  BookOpen
} from 'lucide-react'
import { getTodayTask, getLearningPlanProgress } from '@/services/learning-plan'
import { useTheme } from '@/contexts/ThemeContext'

interface StatsData {
  totalCompleted: number
  newCompleted: number
  reviewCompleted: number
  planDay: number
  totalWords: number
  learnedWords: number
  progressPercentage: number
  remainingWords: number
  streakDays: number
  tomorrowNewWords: number
  tomorrowReviewWords: number
}

export default function LearningCompleteClient() {
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'
  const router = useRouter()
  const searchParams = useSearchParams()
  const bookId = searchParams.get('bookId')

  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!bookId) {
      toast.error('缺少单词书参数')
      router.push('/')
      return
    }

    loadStats()
  }, [bookId])

  const loadStats = async () => {
    try {
      setLoading(true)

      // 并行获取今日任务和学习进度
      const [taskResponse, progressResponse] = await Promise.all([
        getTodayTask(bookId),
        getLearningPlanProgress(bookId)
      ])

      if (!taskResponse.success || !taskResponse.data) {
        toast.error('获取任务数据失败')
        router.push('/')
        return
      }

      const task = taskResponse.data

      // 计算今日完成的单词数
      const totalCompleted = task.completed_words.length
      const newCompleted = task.new_words.filter(w => task.completed_words.includes(w.id)).length
      const reviewCompleted = task.review_words.filter(w => task.completed_words.includes(w.id)).length

      // 学习进度数据
      const progressData = progressResponse.data || {
        totalWords: 0,
        learnedWords: 0,
        progressPercentage: 0,
        streakDays: 0
      }

      // 估算明日任务数量
      // 明日复习词 = 今日新学词中标记"认识"的数量 + 今日复习词
      // 这是一个简化的估算，实际应该从后端计算
      const tomorrowNewWords = Math.min(20, 50 - reviewCompleted) // 假设每日新学20词
      const tomorrowReviewWords = newCompleted // 今日新学且认识的词，明天会复习

      setStats({
        totalCompleted,
        newCompleted,
        reviewCompleted,
        planDay: task.plan_day,
        totalWords: progressData.totalWords,
        learnedWords: progressData.learnedWords,
        progressPercentage: progressData.progressPercentage,
        remainingWords: progressData.totalWords - progressData.learnedWords,
        streakDays: progressData.streakDays,
        tomorrowNewWords,
        tomorrowReviewWords
      })
    } catch (error: any) {
      console.error('Failed to load stats:', error)
      toast.error('加载统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!stats) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>加载失败</p>
      </div>
    )
  }

  // 成就数据
  const achievements = [
    {
      icon: Flame,
      name: '连续学习',
      unlocked: stats.streakDays >= 1,
      value: `${stats.streakDays}天`
    },
    {
      icon: Zap,
      name: '快速学习',
      unlocked: stats.totalCompleted >= 30,
      value: '30+词'
    },
    {
      icon: CheckCircle2,
      name: '全认识',
      unlocked: stats.totalCompleted === stats.newCompleted + stats.reviewCompleted,
      value: '100%'
    },
    {
      icon: Trophy,
      name: '百日打卡',
      unlocked: stats.streakDays >= 100,
      value: '100天'
    }
  ]

  return (
    <div className="min-h-screen py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto space-y-6">

        {/* 顶部奖杯和标题 */}
        <div className="text-center space-y-4 py-8">
          <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center shadow-lg">
            <Trophy className="w-14 h-14 text-white" />
          </div>

          <h1 className="text-3xl md:text-4xl font-black" style={{ color: 'var(--text-primary)' }}>
            🎉 今日任务完成！
          </h1>

          <p className="text-lg" style={{ color: 'var(--text-secondary)' }}>
            太棒了！所有单词都标记"认识"了
          </p>
        </div>

        {/* 统计卡片 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="p-6 border-2 rounded-xl text-center" style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border)'
          }}>
            <div className="text-3xl md:text-4xl font-black mb-2" style={{ color: '#6366f1' }}>
              {stats.totalCompleted}
            </div>
            <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
              完成单词
            </div>
            <div className="space-y-1 text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              <div>复习 {stats.reviewCompleted}</div>
              <div>新学 {stats.newCompleted}</div>
            </div>
          </div>

          <div className="p-6 border-2 rounded-xl text-center" style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border)'
          }}>
            <div className="text-3xl md:text-4xl font-black mb-2" style={{ color: '#f59e0b' }}>
              {stats.streakDays}
            </div>
            <div className="text-sm font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
              连续打卡
            </div>
            <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              天
            </div>
          </div>
        </div>

        {/* 学习计划进度 */}
        <div className="p-6 border-2 rounded-xl" style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border)'
        }}>
          <div className="flex items-center gap-2 mb-4">
            <BookOpen className="w-5 h-5" style={{ color: '#6366f1' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              📚 学习计划进度
            </h2>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-sm">
              <span style={{ color: 'var(--text-secondary)' }}>第 {stats.planDay} 天</span>
              <span className="font-mono" style={{ color: 'var(--text-secondary)' }}>
                {Math.floor(stats.learnedWords / 20)} 天
              </span>
            </div>

            {/* 进度条 */}
            <div className="w-full h-3 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-secondary)' }}>
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                style={{ width: `${Math.min(stats.progressPercentage, 100)}%` }}
              />
            </div>

            <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
              {stats.progressPercentage.toFixed(1)}%
            </div>

            <div className="space-y-2 pt-2 border-t" style={{ borderColor: 'var(--border)' }}>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>已完成单词</span>
                <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stats.learnedWords.toLocaleString()} / {stats.totalWords.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>还剩单词</span>
                <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  {stats.remainingWords.toLocaleString()} 个
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span style={{ color: 'var(--text-secondary)' }}>剩余天数</span>
                <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                  约 {Math.ceil(stats.remainingWords / 20)} 天
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 成就解锁 */}
        <div className="p-6 border-2 rounded-xl" style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border)'
        }}>
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-5 h-5" style={{ color: '#f59e0b' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              🏅 成就解锁
            </h2>
          </div>

          <div className="grid grid-cols-4 gap-3">
            {achievements.map((achievement) => {
              const Icon = achievement.icon
              return (
                <div
                  key={achievement.name}
                  className={`p-3 rounded-lg text-center ${
                    achievement.unlocked
                      ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/30 dark:to-orange-900/30'
                      : 'opacity-40'
                  }`}
                  style={{ backgroundColor: achievement.unlocked ? undefined : 'var(--bg-secondary)' }}
                >
                  <Icon
                    className={`w-8 h-8 mx-auto mb-2 ${
                      achievement.unlocked
                        ? 'text-yellow-600 dark:text-yellow-400'
                        : 'text-gray-400'
                    }`}
                  />
                  <div className="text-xs font-bold mb-1" style={{ color: 'var(--text-secondary)' }}>
                    {achievement.name}
                  </div>
                  <div className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                    {achievement.value}
                  </div>
                  <div className="text-xs mt-1" style={{ color: achievement.unlocked ? '#10b981' : 'var(--text-muted)' }}>
                    {achievement.unlocked ? '已解锁' : '未解锁'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 明日预告 */}
        <div className="p-6 border-2 rounded-xl" style={{
          backgroundColor: 'var(--card-bg)',
          borderColor: 'var(--border)'
        }}>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" style={{ color: '#6366f1' }} />
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              📅 明日预告
            </h2>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>学习日期</span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                第 {stats.planDay + 1} 天
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>新学单词</span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                ~{stats.tomorrowNewWords} 个
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ color: 'var(--text-secondary)' }}>复习单词</span>
              <span className="font-mono font-bold" style={{ color: 'var(--text-primary)' }}>
                {stats.tomorrowReviewWords} 个
              </span>
            </div>
            <div className="pt-2 border-t text-xs" style={{ borderColor: 'var(--border)', color: 'var(--text-muted)' }}>
              * 复习词基于今天标记"认识"的单词
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="space-y-3 pt-4">
          <button
            onClick={async () => {
              // 🔥 刷新路由数据（确保首页显示最新的今日任务进度）
              router.refresh()
              // 等待刷新生效
              await new Promise(resolve => setTimeout(resolve, 100))
              // 然后返回首页
              router.push('/')
            }}
            className="w-full px-6 py-4 text-base font-bold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
          >
            <Home className="w-5 h-5" />
            <span>返回首页</span>
          </button>

          <button
            onClick={() => {
              // TODO: 实现分享功能
              toast.info('分享功能开发中...')
            }}
            className="w-full px-6 py-4 text-base font-bold rounded-xl border-2 transition-all hover:opacity-80 flex items-center justify-center gap-2"
            style={{
              borderColor: 'var(--border)',
              backgroundColor: 'var(--card-bg)',
              color: 'var(--text-primary)'
            }}
          >
            <Share2 className="w-5 h-5" />
            <span>分享成就</span>
          </button>
        </div>

      </div>
    </div>
  )
}
