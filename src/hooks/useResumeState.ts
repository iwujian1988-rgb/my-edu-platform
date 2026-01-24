/**
 * useResumeState - 断点续做状态管理
 *
 * 获取用户的上次学习进度，用于"继续上次学习"功能
 *
 * @date 2026-01-14
 */

'use client'

import { useState, useEffect, useRef } from 'react'
import { DictationScopeType } from '@/types/dictation'

/**
 * 断点续做状态接口
 */
export interface ResumeState {
  mode: 'dictation' | 'flashcard'
  bookId: string
  bookTitle?: string
  updatedAt: number
  context: {
    scopeType: DictationScopeType
    currentIndex: number
    totalWords: number
    currentWord?: {
      id: string
      word: string
    }
  }
}

/**
 * Hook返回值
 */
export interface UseResumeStateReturn {
  resumeState: ResumeState | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
}

/**
 * useResumeState Hook
 *
 * @param bookId - 词书ID
 * @returns 断点续做状态
 *
 * @example
 * ```tsx
 * const { resumeState, loading } = useResumeState('book-123')
 *
 * if (loading) return <div>加载中...</div>
 * if (resumeState) {
 *   console.log(`上次学习: ${resumeState.context.scopeType}, 第${resumeState.context.currentIndex + 1}题`)
 * }
 * ```
 */
export function useResumeState(bookId: string): UseResumeStateReturn {
  const [resumeState, setResumeState] = useState<ResumeState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // 使用 ref 存储 AbortController，避免在 cleanup 时访问闭包旧值
  const abortControllerRef = useRef<AbortController | null>(null)
  const isMountedRef = useRef(true)

  /**
   * 获取断点续做状态
   */
  const fetchResumeState = async () => {
    if (!bookId) {
      setLoading(false)
      return
    }

    // 取消之前的请求
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    // 创建新的 AbortController
    abortControllerRef.current = new AbortController()

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/user-preferences?book_id=${bookId}`, {
        signal: abortControllerRef.current.signal
      })

      if (!isMountedRef.current) return

      if (!response.ok) {
        throw new Error(`Failed to fetch resume state: ${response.statusText}`)
      }

      const result = await response.json()

      if (!isMountedRef.current) return

      if (result.success && result.data?.last_resume_state) {
        const state = result.data.last_resume_state

        // 🔥 修复：移除 mode 检查，允许显示任何模式的进度
        // 因为不同模式（word-list, dictation, flashcards）会相互覆盖，
        // 但我们应该显示最近的学习进度，让用户知道"上次你在学什么"
        setResumeState(state)
      }
    } catch (err) {
      if (!isMountedRef.current) return
      // 忽略被取消的请求错误
      if (err instanceof Error && err.name === 'AbortError') {
        return
      }
      console.error('[useResumeState] Failed to fetch resume state:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      if (isMountedRef.current) {
        setLoading(false)
      }
    }
  }

  /**
   * 刷新断点续做状态
   */
  const refresh = async () => {
    await fetchResumeState()
  }

  // 初始加载
  useEffect(() => {
    isMountedRef.current = true
    fetchResumeState()

    return () => {
      isMountedRef.current = false
      // 取消正在进行的请求
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
        abortControllerRef.current = null
      }
    }
  }, [bookId])

  return {
    resumeState,
    loading,
    error,
    refresh
  }
}

/**
 * 格式化断点续做信息为可读文本
 */
export function formatResumeState(state: ResumeState): string {
  const { context } = state
  const scopeLabels: Record<DictationScopeType, string> = {
    all: '全部单词',
    unknown: '不认识的',
    fuzzy: '模糊的',
    known: '认识的',
    new: '未标注的'
  }

  const scopeLabel = scopeLabels[context.scopeType] || context.scopeType
  const progressText = `第 ${context.currentIndex + 1} 题 / 共 ${context.totalWords} 题`

  return `${scopeLabel}，${progressText}`
}

/**
 * 计算断点续做的时间差（人性化显示）
 */
export function formatResumeTime(timestamp: number): string {
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
