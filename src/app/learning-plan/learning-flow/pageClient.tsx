'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { FlashcardQueue } from '@/components/learning-plan/FlashcardQueue'
import { DictationQueue } from '@/components/learning-plan/DictationQueue'
import { getTodayTask } from '@/services/learning-plan'

type LearningMode = 'flashcard' | 'dictation'

interface Word {
  id: string
  word: string
  phonetic?: string
  meaning?: string
  example?: string
  type: 'new' | 'review'
}

export default function LearningFlowClient({
  bookId,
  initialMode
}: {
  bookId: string
  initialMode: string
}) {
  const router = useRouter()
  const [mode, setMode] = useState<LearningMode>(initialMode as LearningMode)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [totalOriginalWords, setTotalOriginalWords] = useState(0)  // 🔧 新增
  const [completedOriginalWords, setCompletedOriginalWords] = useState(0)  // 🔧 新增

  useEffect(() => {
    loadWords()
  }, [bookId])

  const loadWords = async () => {
    try {
      setLoading(true)

      const response = await getTodayTask(bookId)

      if (!response.success || !response.data) {
        toast.error('获取今日任务失败')
        router.push('/learning-plan/daily-task')
        return
      }

      const task = response.data

      // 🔧 过滤已完成的单词
      const completedWordIds = new Set(task.completed_words || [])

      // 合并新学词和复习词，标记类型
      const newWords: Word[] = (task.new_words || [])
        .filter((w: any) => !completedWordIds.has(w.id || w.word_id))  // 🔧 过滤已完成
        .map((w: any) => ({
          ...w,
          type: 'new' as const
        }))

      const reviewWords: Word[] = (task.review_words || [])
        .filter((w: any) => !completedWordIds.has(w.id || w.word_id))  // 🔧 过滤已完成
        .map((w: any) => ({
          ...w,
          type: 'review' as const
        }))

      // 混合队列（先复习后新学）
      const allWords = [...reviewWords, ...newWords]

      console.log('[LearningFlow] 过滤后的单词列表:', {
        原始新学: task.new_words?.length || 0,
        原始复习: task.review_words?.length || 0,
        已完成: completedWordIds.size,
        过滤后新学: newWords.length,
        过滤后复习: reviewWords.length,
        总计: allWords.length
      })

      setWords(allWords)

      // 🔧 计算原始进度（用于显示）
      const totalOriginalWords = (task.new_words?.length || 0) + (task.review_words?.length || 0)
      const completedOriginalWords = completedWordIds.size

      // 🔧 保存原始进度数据
      setTotalOriginalWords(totalOriginalWords)
      setCompletedOriginalWords(completedOriginalWords)

      // 如果没有单词，跳转到完成页
      if (allWords.length === 0) {
        toast.info('今日任务已完成')
        router.push(`/learning-complete?bookId=${bookId}`)
      }
    } catch (error: any) {
      console.error('Failed to load words:', error)
      toast.error('加载失败')
    } finally {
      setLoading(false)
    }
  }

  const handleComplete = async () => {
    // 🔥 先刷新路由数据（更新首页的今日任务进度）
    router.refresh()
    // 等待一小段时间确保刷新生效
    await new Promise(resolve => setTimeout(resolve, 100))
    // 然后跳转到完成页面
    router.push(`/learning-complete?bookId=${bookId}`)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (words.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--bg-primary)' }}>
        <p style={{ color: 'var(--text-secondary)' }}>暂无学习任务</p>
      </div>
    )
  }

  return (
    <>
      {mode === 'flashcard' ? (
        <FlashcardQueue
          initialWords={words}
          bookId={bookId}
          onComplete={handleComplete}
          totalOriginalWords={totalOriginalWords}
          completedOriginalWords={completedOriginalWords}
        />
      ) : (
        <DictationQueue
          initialWords={words}
          bookId={bookId}
          onComplete={handleComplete}
          totalOriginalWords={totalOriginalWords}
          completedOriginalWords={completedOriginalWords}
        />
      )}
    </>
  )
}
