'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft,
  BookOpen,
  ChevronDown,
  Info,
  TrendingUp
} from 'lucide-react'
import { createLearningPlan } from '@/services/learning-plan'
import { useTheme } from '@/contexts/ThemeContext'

export default function PlanSelectClient({ bookId }: { bookId: string }) {
  const router = useRouter()
  const { theme, mounted } = useTheme()
  const isDark = mounted && theme === 'dark'

  const [book, setBook] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // 表单状态
  const [dailyNewWords, setDailyNewWords] = useState(20)
  const [dailyMaxWords, setDailyMaxWords] = useState(50)

  // 获取书籍信息
  useEffect(() => {
    fetchBook()
  }, [bookId])

  const fetchBook = async () => {
    try {
      const res = await fetch(`/api/books/${bookId}`)
      const data = await res.json()
      if (data.success) {
        setBook(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch book:', error)
      toast.error('获取书籍信息失败')
    } finally {
      setLoading(false)
    }
  }

  // 计算预计完成天数
  const calculateDays = () => {
    if (!book) return { ideal: 0, actual: 0 }

    const idealDays = Math.ceil(book.total_words / dailyNewWords)
    const actualDays = Math.ceil(idealDays * 1.5)

    return { ideal: idealDays, actual: actualDays }
  }

  const days = calculateDays()
  const isValid = dailyMaxWords >= dailyNewWords

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!isValid) {
      toast.error('每天最多学习数量必须大于等于每天新学数量')
      return
    }

    setSubmitting(true)

    try {
      const response = await createLearningPlan({
        bookId,
        dailyNewWords,
        dailyMaxWords
      })

      if (response.success && response.data) {
        toast.success('学习计划创建成功！')
        // 跳转到今日任务页
        router.push(`/learning-plan/daily-task?bookId=${bookId}`)
      } else {
        toast.error(response.error || '创建学习计划失败')
      }
    } catch (error: any) {
      console.error('Failed to create plan:', error)
      toast.error(error.message || '创建失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!book) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>书籍不存在</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-2xl mx-auto px-4 py-6">

        {/* 顶部导航 */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => router.back()}
            className="p-2 rounded-lg hover:opacity-70 transition-opacity"
            style={{ color: 'var(--text-secondary)' }}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              设置学习计划
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              {book.title}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">

          {/* 📚 书籍信息卡片 */}
          <div className="p-5 border-2 rounded-xl" style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border)'
          }}>
            <div className="flex items-start gap-3">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center flex-shrink-0">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold text-base mb-1" style={{ color: 'var(--text-primary)' }}>
                  {book.title}
                </h3>
                <p className="text-sm mb-2" style={{ color: 'var(--text-muted)' }}>
                  {book.description || '暂无描述'}
                </p>
                <p className="text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>
                  共 {book.total_words?.toLocaleString() || 0} 个单词
                </p>
              </div>
            </div>
          </div>

          {/* 每天新学单词 */}
          <div className="p-5 border-2 rounded-xl" style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border)'
          }}>
            <label className="block text-sm font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
              每天新学单词
            </label>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDailyNewWords(Math.max(1, dailyNewWords - 5))}
                className="w-10 h-10 rounded-lg font-bold border-2 transition-all hover:opacity-80"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              >
                -5
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  value={dailyNewWords}
                  onChange={(e) => setDailyNewWords(Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))}
                  min="1"
                  max="100"
                  className="w-24 text-center text-2xl font-black bg-transparent border-0"
                  style={{ color: '#6366f1' }}
                />
                <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>个</span>
              </div>

              <button
                type="button"
                onClick={() => setDailyNewWords(Math.min(100, dailyNewWords + 5))}
                className="w-10 h-10 rounded-lg font-bold border-2 transition-all hover:opacity-80"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              >
                +5
              </button>
            </div>

            <p className="text-xs mt-3 flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
              💡 建议设置：15-30个/天
            </p>
          </div>

          {/* 每天最多学习 */}
          <div className="p-5 border-2 rounded-xl" style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border)'
          }}>
            <div className="flex items-center gap-2 mb-3">
              <label className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                每天最多学习
              </label>
              <div className="group relative">
                <Info className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                <div className="absolute left-0 top-full mt-2 w-48 p-2 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity z-10"
                     style={{ backgroundColor: 'var(--bg-secondary)', color: 'var(--text-secondary)' }}>
                  新学 + 复习的总和上限，建议30-60个
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setDailyMaxWords(Math.max(dailyNewWords, dailyMaxWords - 10))}
                className="w-10 h-10 rounded-lg font-bold border-2 transition-all hover:opacity-80"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              >
                -10
              </button>

              <div className="flex-1 text-center">
                <input
                  type="number"
                  value={dailyMaxWords}
                  onChange={(e) => setDailyMaxWords(Math.max(dailyNewWords, parseInt(e.target.value) || dailyNewWords))}
                  min={dailyNewWords}
                  className="w-24 text-center text-2xl font-black bg-transparent border-0"
                  style={{ color: dailyMaxWords < dailyNewWords ? '#ef4444' : '#6366f1' }}
                />
                <span className="text-sm ml-1" style={{ color: 'var(--text-muted)' }}>个</span>
              </div>

              <button
                type="button"
                onClick={() => setDailyMaxWords(dailyMaxWords + 10)}
                className="w-10 h-10 rounded-lg font-bold border-2 transition-all hover:opacity-80"
                style={{
                  borderColor: 'var(--border)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--text-primary)'
                }}
              >
                +10
              </button>
            </div>

            <p className="text-xs mt-3" style={{ color: 'var(--text-muted)' }}>
              新学 + 复习的总和上限
            </p>
          </div>

          {/* 📊 预计完成天数 */}
          <div className="p-5 border-2 rounded-xl" style={{
            backgroundColor: 'var(--card-bg)',
            borderColor: 'var(--border)'
          }}>
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp className="w-5 h-5" style={{ color: '#6366f1' }} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                📊 预计完成天数
              </h3>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex-1 p-3 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-secondary)' }}>
                <div className="text-2xl font-black" style={{ color: '#6366f1' }}>
                  {days.actual}
                </div>
                <div className="text-xs" style={{ color: 'var(--text-muted)' }}>天</div>
              </div>
              <div className="flex-1 space-y-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                <div>理想：{days.ideal}天</div>
                <div>实际：根据复习情况动态调整</div>
              </div>
            </div>
          </div>

          {/* 提交按钮 */}
          <button
            type="submit"
            disabled={!isValid || submitting}
            className="w-full px-6 py-4 text-base font-bold text-white rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>创建中...</span>
              </>
            ) : (
              <>
                <span>开始学习计划</span>
                <ArrowLeft className="w-5 h-5 rotate-180" />
              </>
            )}
          </button>

        </form>
      </div>
    </div>
  )
}
