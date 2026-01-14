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
  // 🆕 使用初始数据作为初始值
  const [words, setWords] = useState<Word[]>(initialData || [])
  const [isLoading, setIsLoading] = useState(!initialData || initialData.length === 0)  // 🆕 如果有初始数据则不loading
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [totalWords, setTotalWords] = useState(initialTotal || book.total_words)  // 🆕 使用initialTotal

  // 🆕 标记是否已经加载过初始数据（安全处理undefined）
  const hasInitialData = initialData && initialData.length > 0
  const initialDataLoadedRef = useRef(hasInitialData)

  // 🆕 调试日志
  console.log(`🔍 [useWordData] Initial state:`, {
    hasInitialData,
    initialDataLength: initialData?.length || 0,
    wordsLength: words.length,
    isLoading,
    filtersPage: filters.page
  })

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

  // ⭐ 核心逻辑1：从API获取单词
  useEffect(() => {
    const fetchWords = async () => {
      // 🆕 优化：如果是第一页且已有初始数据，跳过API调用
      if (filters.page === 1 && initialDataLoadedRef.current) {
        console.log(`✅ [Skip] Using initial data for page 1, skipping API call`)
        setIsLoading(false)
        return
      }

      // 竖屏模式：追加加载（第一页之后都追加）
      // 横屏模式：替换加载（每次都替换）
      const append = isPortrait && filters.page > 1

      console.log(`📖 Fetching words (page ${filters.page}, append: ${append}, isPortrait: ${isPortrait})`)

      // 注意：loading状态已在page变化时立即设置（乐观UI），这里不再重复设置

      try {
        // 构建API参数
        const params = new URLSearchParams({
          bookId: book.id,
          status: filters.status,
          page: filters.page.toString(),
          pageSize: '21'
        })

        // 使用authenticatedFetch，它会自动添加Authorization header和credentials
        const response = await authenticatedFetch(`/api/words?${params}`)

        // 检查HTTP状态
        if (!response.ok) {
          const errorText = await response.text()
          console.error(`❌ API request failed (${response.status}):`, errorText)

          if (response.status === 401) {
            console.error('❌ Authentication failed - user may not be logged in')
          } else if (response.status === 403) {
            console.error('❌ Authorization failed - user may not have permission to access this book')
          } else if (response.status === 404) {
            console.error('❌ Book not found')
          }

          // 设置为空数组，避免页面崩溃
          if (!append) {
            setWords([])
            setTotalWords(0)
          }
          return
        }

        const data = await response.json()
        console.log(`✅ API response:`, { success: data.success, dataLength: data.data?.length, total: data.total })

        if (append) {
          // 竖屏追加模式：添加到现有列表
          setWords(prev => {
            const newWords = [...prev, ...(data.data || [])]
            console.log(`➕ Words appended: ${prev.length} -> ${newWords.length}`)

            // 检查是否还有更多
            const totalCount = data.count || data.total || book.total_words || 0
            if (newWords.length >= totalCount || (data.data || []).length < 21) {
              console.log('🚫 No more words (loaded all or last page)')
              setHasMore(false)
            }

            return newWords
          })
        } else {
          // 横屏替换模式/竖屏第一页：重新加载
          setWords(data.data || [])
          setTotalWords(data.count || data.total || book.total_words || 0)
          setHasMore(true)
          console.log(`🔄 Words replaced: ${data.data?.length || 0} words, total: ${data.count || data.total}`)
        }
      } catch (error) {
        console.error('❌ Failed to fetch words:', error)
        if (!append) {
          setWords([])
        }
      } finally {
        setIsLoading(false)
        setIsLoadingMore(false)
        console.log(`✅ Fetch complete (page ${filters.page})`)
      }
    }

    fetchWords()
  }, [book.id, filters.page, filters.status, isPortrait, book.total_words]) // 🆕 不需要initialData作为依赖，它只在初始化时使用

  // ⭐ 核心逻辑2：客户端筛选（章节/主题/场景）
  const filteredWords = useMemo(() => {
    let result = [...words]

    // 1. 章节筛选
    if (filters.chapter !== 'all') {
      result = result.filter(word => word.chapter_id === filters.chapter)
    }

    // 2. 主题筛选
    if (filters.theme !== 'all') {
      result = result.filter(word => word.theme === filters.theme)
    }

    // 3. 场景筛选
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
