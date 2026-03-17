/**
 * useWordData Hook
 *
 * 职责：管理单词数据的获取、筛选和分页
 *
 * 核心逻辑：
 * 1. 从API获取单词数据（分页）
 * 2. 客户端筛选（章节/主题/场景）
 * 3. 支持追加模式（竖屏）和替换模式（横屏）
 *
 * 单一职责：只负责数据操作，不处理UI交互
 */

import { useState, useEffect, useMemo, useRef } from 'react'
import { useBookFilters } from './useBookFilters'
import { authenticatedFetch } from '@/lib/apiClient'

// 单词数据接口
export interface Word {
  id: string
  word: string
  phonetic: string
  uk_phonetic?: string
  us_phonetic?: string
  definition: string
  definition_en: string
  collocation: string
  collocation_en: string
  example_sentence: string
  example_sentence_en: string
  part_of_speech: string
  status: 'known' | 'fuzzy' | 'unknown' | 'new'
  theme?: string
  scene?: string
  chapter?: string
  chapter_id?: string | null
  // 🌍 多语言支持（Phase 3）
  language_data?: import('@/types/word').LanguageData
}

// 词书接口
export interface Book {
  id: string
  title: string
  description: string
  total_words: number
  is_official?: boolean
  created_by?: string
}

interface UseWordDataParams {
  book: Book
  isPortrait: boolean
  // 🆕 支持服务端传递的初始数据
  initialData?: Word[]
  initialTotal?: number
}

export function useWordData({
  book,
  isPortrait,
  initialData,
  initialTotal
}: UseWordDataParams) {
  const { filters } = useBookFilters()

  // 状态
  const [words, setWords] = useState<Word[]>(initialData || [])
  const [isLoading, setIsLoading] = useState(!initialData || initialData.length === 0)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalWords, setTotalWords] = useState(initialTotal || book.total_words)

  // 🔥 监听SSR数据的变化，同步更新words状态
  const prevInitialDataRef = useRef<Word[] | undefined>(initialData)
  useEffect(() => {
    // 检查initialData是否真的改变了（比较第一个单词的ID）
    const prevFirstId = prevInitialDataRef.current?.[0]?.id
    const currFirstId = initialData?.[0]?.id

    if (currFirstId && currFirstId !== prevFirstId) {
      console.log('🔄 [SSR Data Changed] Updating words state:', initialData?.length, 'words')
      setWords(initialData || [])
      setTotalWords(initialTotal || book.total_words)
      setIsLoading(false)
      prevInitialDataRef.current = initialData
    }
  }, [initialData, initialTotal])

  // ⭐ 优化：立即响应page变化，在useEffect执行前就显示loading
  const previousPageRef = useRef(filters.page)
  useEffect(() => {
    // 当page从1变成2或更大时，立即显示loading（乐观UI）
    if (filters.page > 1 && filters.page !== previousPageRef.current) {
      const append = isPortrait && filters.page > 1
      if (append) {
        console.log(`⚡ [Immediate] Setting isLoadingMore for page ${filters.page}`)
        setIsLoadingMore(true)
      } else {
        console.log(`⚡ [Immediate] Setting isLoading for page ${filters.page}`)
        setIsLoading(true)
      }
    }
    previousPageRef.current = filters.page
  }, [filters.page, isPortrait])

  // ⭐ 核心逻辑：从API获取单词
  useEffect(() => {
    const fetchWords = async () => {
      // 🔥 修复：只在首次加载、无章节筛选、且status是'all'时使用SSR数据
      // 💡 关键：当用户选择章节后，initialData不再有效，必须从API获取新数据
      const isFirstLoadWithDefaultFilter =
        filters.page === 1 &&
        filters.status === 'all' &&
        filters.chapter === 'all' &&  // 🔧 FIX: 只有无章节筛选时才使用SSR数据
        initialData &&
        initialData.length > 0

      if (isFirstLoadWithDefaultFilter) {
        console.log(`✅ [Skip] Using SSR data for page 1 with default filter`)
        setIsLoading(false)
        return
      }

      // 竖屏模式：追加加载（第一页之后都追加）
      // 横屏模式：替换加载（每次都替换）
      const append = isPortrait && filters.page > 1

      console.log(`📖 Fetching words (page ${filters.page}, status: ${filters.status}, chapter: ${filters.chapter}, append: ${append})`)

      try {
        // 构建API参数
        const params = new URLSearchParams({
          bookId: book.id,
          status: filters.status,
          page: filters.page.toString(),
          pageSize: '21'
        })

        // 🔧 FIX: 添加章节筛选参数
        if (filters.chapter !== 'all') {
          params.append('chapterId', filters.chapter)
        }

        const response = await authenticatedFetch(`/api/words?${params}`)

        if (!response.ok) {
          console.error(`❌ API request failed (${response.status})`)
          if (!append) {
            setWords([])
            setTotalWords(0)
          }
          return
        }

        const data = await response.json()

        if (append) {
          setWords(prev => [...prev, ...(data.data || [])])
          const totalCount = data.count || data.total || book.total_words || 0
          if (words.length + (data.data || []).length >= totalCount) {
            setHasMore(false)
          }
        } else {
          setWords(data.data || [])
          setTotalWords(data.count || data.total || book.total_words || 0)
          setHasMore(true)
        }
      } catch (error) {
        console.error('❌ Failed to fetch words:', error)
        if (!append) {
          setWords([])
        }
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
      }
    }

    fetchWords()
  }, [book.id, filters.page, filters.status, filters.chapter, filters.theme, filters.scenario, isPortrait]) // 🔧 FIX: 添加章节/主题/场景筛选依赖

  // ⭐ 核心逻辑2：客户端筛选（只处理主题/场景，章节已由服务端处理）
  const filteredWords = useMemo(() => {
    let result = [...words]

    // 🔧 FIX: 章节筛选已由服务端处理，这里不再筛选
    // if (filters.chapter !== 'all') {
    //   result = result.filter(word => word.chapter_id === filters.chapter)
    // }

    // 1. 主题筛选
    if (filters.theme !== 'all') {
      result = result.filter(word => word.theme === filters.theme)
    }

    // 2. 场景筛选
    if (filters.scenario !== 'all') {
      result = result.filter(word => word.scene === filters.scenario)
    }

    console.log(`✅ [Filter] Filtered to ${result.length} words (chapter:${filters.chapter}, theme:${filters.theme}, scenario:${filters.scenario})`)
    return result
  }, [words, filters.chapter, filters.theme, filters.scenario])

  return {
    // 数据
    words: filteredWords,
    rawWords: words, // 未筛选的原始数据（用于调试）
    totalWords,
    hasMore,

    // 加载状态
    isLoading,
    isLoadingMore,

    // 操作
    setWords,
    setHasMore,
    setTotalWords
  }
}
