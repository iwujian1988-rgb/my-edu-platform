// src/hooks/useDictationWords.ts
// 对应方案：Section 6.6.3 - useDictationWords: 获取单词列表

import { useState, useEffect, useCallback, useRef } from 'react'
import { dictationService } from '@/services/dictationService'
import { DictationScopeType } from '@/types/dictation'

interface UseDictationWordsResult {
  words: any[]
  loading: boolean
  error: Error | null
  totalWords: number
  loadMore: () => Promise<void>
  hasMore: boolean
  isLoadingMore: boolean
  isLoadingMoreRef: React.MutableRefObject<boolean>  // 🔥 暴露给外部，避免同步问题
}

/**
 * useDictationWords: 获取单词列表（支持分页和懒加载）
 * 对应方案：Section 6.6.3
 */
export function useDictationWords(
  bookId: string,
  scopeType: DictationScopeType,
  shuffle: boolean = false
): UseDictationWordsResult {
  const [words, setWords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [error, setError] = useState<Error | null>(null)
  const [totalWords, setTotalWords] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [hasMore, setHasMore] = useState(true)
  const pageSize = 50  // 🔧 改为50个，快速开始，避免加载时间过长

  // 🔥 关键修复：初始值 false，通过 useEffect 设置为 true
  const mountedRef = useRef(false)
  const isLoadingMoreRef = useRef(false)

  // 🔥 设置 mounted flag
  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    async function fetchWords() {
      if (!bookId || !scopeType) return

      // 🔥 修复：重置状态，避免 shuffle 切换时数据混乱
      setWords([])
      setCurrentPage(1)
      setHasMore(true)
      setLoading(true)
      setError(null)

      try {
        const { data, total } = await dictationService.getWordsWithTotal(
          bookId,
          scopeType,
          shuffle,
          1,
          pageSize
        )

        if (!mounted || !mountedRef.current) return

        setWords(data)
        setTotalWords(total)
        setHasMore(data.length < total)
        setCurrentPage(1)
        console.log(`✅ [useDictationWords] Initial load: ${data.length}/${total} words`)
      } catch (err) {
        console.error('❌ [useDictationWords] 获取单词列表失败:', err)
        if (!mounted) return
        setError(err as Error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchWords()

    return () => {
      mounted = false
    }
  }, [bookId, scopeType, shuffle])

  // 加载更多单词
  const loadMore = useCallback(async () => {
    // 🔥 关键修复：使用 ref 检查，避免闭包和时序问题
    if (isLoadingMoreRef.current || !hasMore) {
      console.log('⚠️ [useDictationWords] Skip loadMore:', { isLoadingMore: isLoadingMoreRef.current, hasMore })
      return
    }

    console.log(`🔄 [useDictationWords] Loading page ${currentPage + 1}...`)

    // 🔥 立即设置 ref，确保同步（不依赖异步 setState）
    isLoadingMoreRef.current = true
    setIsLoadingMore(true)

    const nextPage = currentPage + 1
    try {
      const { data, total } = await dictationService.getWordsWithTotal(
        bookId,
        scopeType,
        shuffle,
        nextPage,
        pageSize
      )

      // 🔥 修复：双重检查组件是否已卸载
      if (!mountedRef.current) {
        console.log('⚠️ [useDictationWords] Component unmounted, skipping state update')
        return
      }

      // 🔥 修复闭包陷阱和时序问题：使用函数式更新
      setWords(prev => {
        // 🔥 内存泄漏检查
        if (prev.length === 0 && data.length > 0) {
          console.log('⚠️ [useDictationWords] Words array empty, possible unmount')
          return prev
        }

        // 🔥 去重：过滤掉已存在的单词（基于 id）
        const existingIds = new Set(prev.map(w => w.id))
        const uniqueNewWords = data.filter(w => !existingIds.has(w.id))

        if (uniqueNewWords.length < data.length) {
          console.log(`⚠️ [useDictationWords] Filtered ${data.length - uniqueNewWords.length} duplicate words`)
        }

        const newWords = [...prev, ...uniqueNewWords]
        const newHasMore = newWords.length < total

        console.log(`✅ [useDictationWords] Loaded: ${newWords.length}/${total} words, hasMore: ${newHasMore}`)

        // 🔥 在同一个回调中更新 hasMore，确保时序正确
        setHasMore(newHasMore)
        return newWords
      })
      setCurrentPage(nextPage)
    } catch (err) {
      console.error('❌ [useDictationWords] 加载更多失败:', err)
      setError(err as Error)
    } finally {
      // 🔥 确保重置 ref
      isLoadingMoreRef.current = false
      setIsLoadingMore(false)
    }
  }, [bookId, scopeType, shuffle, currentPage, hasMore])

  return {
    words,
    loading,
    error,
    totalWords,
    loadMore,
    hasMore,
    isLoadingMore,
    isLoadingMoreRef  // 🔥 暴露 ref 给外部组件使用
  }
}
