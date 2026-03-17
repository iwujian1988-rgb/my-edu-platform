'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { FlashcardQueue } from '@/components/learning-plan/FlashcardQueue'
import { DictationQueue } from '@/components/learning-plan/DictationQueue'
import { getTodayTask } from '@/services/learning-plan'
import type { LearningPlanPhase } from '@/types/learning-plan'

type LearningMode = 'flashcard' | 'dictation'

interface Word {
  id: string
  word: string
  phonetic?: string
  uk_phonetic?: string  // 英式音标
  us_phonetic?: string  // 美式音标
  meaning?: string
  definition?: string
  definition_en?: string
  example?: string
  example_sentence?: string  // 中文例句
  example_sentence_en?: string  // 英文例句
  collocation?: string
  collocation_en?: string
  part_of_speech?: string
  audio_url?: string | null
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
  const searchParams = useSearchParams()
  const consolidateMode = searchParams.get('consolidate') === 'true'  // [Upgrade] 巩固模式参数

  const [mode, setMode] = useState<LearningMode>(initialMode as LearningMode)
  const [words, setWords] = useState<Word[]>([])
  const [loading, setLoading] = useState(true)
  const [totalOriginalWords, setTotalOriginalWords] = useState(0)
  const [completedOriginalWords, setCompletedOriginalWords] = useState(0)
  const [phase, setPhase] = useState<LearningPlanPhase>('legacy')
  const [isConsolidateMode, setIsConsolidateMode] = useState(false)

  const hasLoadedRef = useRef(false)  // 🔥 防止重复加载
  const lastConsolidateModeRef = useRef(consolidateMode)  // 🔥 记录上次的 consolidateMode

  useEffect(() => {
    // 🔥 只在首次加载或 consolidateMode 变化时才加载
    const shouldLoad = !hasLoadedRef.current || lastConsolidateModeRef.current !== consolidateMode

    if (shouldLoad) {
      hasLoadedRef.current = true
      lastConsolidateModeRef.current = consolidateMode
      loadWords()
    }
  }, [bookId, consolidateMode])

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

      // [Upgrade] 两阶段系统：提取学习阶段（默认 legacy 保持向后兼容）
      const currentPhase = task.phase || 'legacy'
      setPhase(currentPhase)

      // [Upgrade] 巩固模式：检查是否需要进入巩固模式
      const normalizeToArray = <T,>(value: T[] | Record<string, T> | undefined | null): T[] => {
        if (!value) return []
        if (Array.isArray(value)) return value
        return Object.values(value)
      }

      const fuzzyWords = normalizeToArray(task.fuzzy_words || [])
      const unknownWords = normalizeToArray(task.unknown_words || [])
      const unmasteredWords = [...fuzzyWords, ...unknownWords]

      // [Upgrade] 巩固模式：加载未掌握的单词
      if (consolidateMode && unmasteredWords.length > 0) {
        console.log('[LearningFlow] 🎯 巩固模式：加载未掌握的单词', {
          fuzzyCount: fuzzyWords.length,
          unknownCount: unknownWords.length,
          totalUnmastered: unmasteredWords.length
        })

        // 将未掌握的单词转换为 Word 对象
        const consolidateWords: Word[] = unmasteredWords.map((w: any) => ({
          ...w,
          type: 'review' as const  // 巩固模式都标记为复习
        }))

        setWords(consolidateWords)
        setIsConsolidateMode(true)
        setTotalOriginalWords(unmasteredWords.length)
        setCompletedOriginalWords(0)

        console.log('[LearningFlow] ✅ 巩固模式已激活，单词数量:', consolidateWords.length)
        return
      }

      // [Upgrade] 两阶段系统：根据阶段选择过滤字段
      // learning/review: 使用 marked_words（所有标记过的词）
      // legacy: 使用 completed_words（只包含"认识"的词）
      const filterWordIds = currentPhase === 'learning' || currentPhase === 'review'
        ? new Set(task.marked_words || [])
        : new Set(task.completed_words || [])

      console.log('[LearningFlow] 使用过滤字段:', {
        phase: currentPhase,
        filterField: currentPhase === 'learning' || currentPhase === 'review' ? 'marked_words' : 'completed_words',
        filterCount: filterWordIds.size,
        consolidateMode
      })

      // 合并新学词和复习词，标记类型
      const newWords: Word[] = (task.new_words || [])
        .filter((w: any) => !filterWordIds.has(w.id || w.word_id))  // 🔧 根据阶段过滤
        .map((w: any) => ({
          ...w,
          type: 'new' as const
        }))

      const reviewWords: Word[] = (task.review_words || [])
        .filter((w: any) => !filterWordIds.has(w.id || w.word_id))  // 🔧 根据阶段过滤
        .map((w: any) => ({
          ...w,
          type: 'review' as const
        }))

      // 混合队列（先复习后新学）
      const allWords = [...reviewWords, ...newWords]

      console.log('[LearningFlow] 过滤后的单词列表:', {
        phase: currentPhase,
        原始新学: task.new_words?.length || 0,
        原始复习: task.review_words?.length || 0,
        已过滤: filterWordIds.size,
        过滤后新学: newWords.length,
        过滤后复习: reviewWords.length,
        总计: allWords.length
      })

      setWords(allWords)
      setIsConsolidateMode(false)

      // 🔧 计算原始进度（用于显示）
      const totalOriginalWords = (task.new_words?.length || 0) + (task.review_words?.length || 0)
      const completedOriginalWords = filterWordIds.size

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
          phase={phase}
          isConsolidateMode={isConsolidateMode}  // [Upgrade] 巩固模式
        />
      ) : (
        <DictationQueue
          initialWords={words}
          bookId={bookId}
          onComplete={handleComplete}
          totalOriginalWords={totalOriginalWords}
          completedOriginalWords={completedOriginalWords}
          phase={phase}
          isConsolidateMode={isConsolidateMode}  // [Upgrade] 巩固模式
        />
      )}
    </>
  )
}
