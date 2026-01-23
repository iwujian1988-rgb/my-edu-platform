/**
 * useBookFilters Hook
 *
 * 职责：管理URL参数与组件状态的同步
 *
 * 核心逻辑：
 * 1. 从URL参数恢复筛选状态
 * 2. 筛选条件改变时同步到URL
 * 3. 页码改变时同步到URL
 * 4. 自动保存阅读进度
 *
 * 单一职责：只负责URL同步，不处理数据获取
 */

import { useState, useEffect, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import { useUpdateURL } from '@/hooks/useUpdateURL'
import { saveReadingProgress, type ReadingProgress } from '@/lib/readingProgress'

type StatusFilter = 'all' | 'new' | 'known' | 'fuzzy' | 'unknown'

export interface BookFilters {
  page: number
  theme: string
  scenario: string
  chapter: string
  status: StatusFilter
}

const DEFAULT_FILTERS: BookFilters = {
  page: 1,
  theme: 'all',
  scenario: 'all',
  chapter: 'all',
  status: 'all'
}

/**
 * 从URL参数恢复筛选状态
 */
function restoreFiltersFromURL(searchParams: URLSearchParams): BookFilters {
  return {
    page: parseInt(searchParams.get('page') || '1', 10),
    theme: searchParams.get('theme') || 'all',
    scenario: searchParams.get('scenario') || 'all',
    chapter: searchParams.get('chapter') || 'all',
    status: (searchParams.get('status') || 'all') as StatusFilter
  }
}

// 🔥 全局标志：防止 React StrictMode 双重挂载导致重复初始化
// 在客户端是持久的，能跨越组件实例
const globalInitFlags = new Map<string, boolean>()

/**
 * 主Hook：管理词书筛选状态
 */
export function useBookFilters(bookId?: string) {
  const searchParams = useSearchParams()
  const { updateURL } = useUpdateURL()
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)

  // 🔥 使用全局标志 + ref 组合，防止重复初始化
  const key = bookId || 'default'
  const isGloballyInitialized = globalInitFlags.get(key)
  const isInitializedRef = useRef(isGloballyInitialized || false)

  // 状态 - 从URL恢复
  const [filters, setFilters] = useState<BookFilters>(() =>
    restoreFiltersFromURL(searchParams)
  )

  // ⭐ 自动保存阅读进度
  const saveProgress = (currentFilters: BookFilters) => {
    if (!bookId) return

    console.log('💾 [useBookFilters] saveProgress called with:', currentFilters)

    // 防抖：避免频繁保存
    if (saveTimeoutRef.current) {
      console.log('⏰ [useBookFilters] Clearing existing timeout')
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      const progress: ReadingProgress = {
        bookId,
        page: currentFilters.page,
        theme: currentFilters.theme,
        scenario: currentFilters.scenario,
        chapter: currentFilters.chapter,
        status: currentFilters.status
      }
      console.log('🚀 [useBookFilters] Executing saveReadingProgress:', progress)
      saveReadingProgress(progress)
    }, 1000) // 1秒后保存
    console.log('⏳ [useBookFilters] Scheduled save in 1 second')
  }

  // 监听filters变化，自动保存
  useEffect(() => {
    // 🔧 跳过首次初始化时的保存（避免覆盖真实进度）
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      globalInitFlags.set(key, true) // 🔥 设置全局标志
      console.log('🔄 [useBookFilters] First initialization, skipping save')
      return
    }

    console.log('🔄 [useBookFilters] Filters changed:', filters)
    saveProgress(filters)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]) // saveProgress是稳定的，不需要加入依赖

  // 使用 ref 来保存最新的 filters，避免 beforeUnload 闭包问题
  const filtersRef = useRef(filters)

  // 当 filters 变化时更新 ref
  useEffect(() => {
    filtersRef.current = filters
  }, [filters])

  // 🔥 组件卸载时清理全局标志（确保下次进入同一本书时能正常初始化）
  useEffect(() => {
    return () => {
      console.log('🧹 [useBookFilters] Cleanup - clearing global flag for:', key)
      globalInitFlags.delete(key)
    }
  }, [key])

  // 监听页面卸载和beforeunload事件
  useEffect(() => {
    const handleBeforeUnload = () => {
      const currentFilters = filtersRef.current
      console.log('👋 [useBookFilters] beforeUnload triggered, filters:', currentFilters)

      if (saveTimeoutRef.current) {
        console.log('⏰ [useBookFilters] Clearing timeout on beforeunload')
        clearTimeout(saveTimeoutRef.current)
      }

      // 使用 ref 中的最新值保存
      const progress: ReadingProgress = {
        bookId: bookId || '',
        page: currentFilters.page,
        theme: currentFilters.theme,
        scenario: currentFilters.scenario,
        chapter: currentFilters.chapter,
        status: currentFilters.status
      }
      console.log('🚀 [useBookFilters] Saving on beforeunload:', progress)
      saveReadingProgress(progress)
    }

    console.log('📌 [useBookFilters] Adding beforeunload listener')
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      console.log('🧹 [useBookFilters] Cleanup - removing listener and saving')
      window.removeEventListener('beforeunload', handleBeforeUnload)
      // 组件卸载时保存
      handleBeforeUnload()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookId]) // 只依赖 bookId，不再依赖 filters

  // ⭐ 监听URL变化，同步filters状态（不用key时需要）
  // 🔥 修复：跳过首次初始化，避免覆盖断点续读进度
  useEffect(() => {
    // 🔧 如果URL为空或只有默认参数，不覆盖filters（让断点续读逻辑处理）
    const hasParams = Array.from(searchParams.keys()).some(key => {
      const value = searchParams.get(key)
      return value && value !== '1' && value !== 'all'
    })

    if (!hasParams) {
      console.log('🔍 [useBookFilters] URL has no params, skipping restore to allow resume logic')
      return
    }

    const restoredFilters = restoreFiltersFromURL(searchParams)
    console.log('🔍 [useBookFilters] Restoring from URL:', restoredFilters)
    setFilters(restoredFilters)
  }, [searchParams])

  // ⭐ 核心逻辑：更新筛选条件并同步到URL
  const updateFilter = <K extends keyof BookFilters>(
    key: K,
    value: BookFilters[K]
  ) => {
    console.log(`🔄 [useBookFilters] updateFilter called: ${key} = ${value}, bookId = ${bookId}`)

    // 🔥 如果不是page参数改变，需要重置page为1
    if (key !== 'page') {
      setFilters(prev => ({ ...prev, [key]: value, page: 1 }))
      updateURL({ [key]: value, page: 1 })
    } else {
      setFilters(prev => ({ ...prev, [key]: value }))
      updateURL({ [key]: value })
    }
  }

  // ⭐ 批量更新筛选条件（用于恢复进度）
  const updateFilters = (newFilters: Partial<BookFilters>) => {
    console.log('🔄 Batch updating filters:', newFilters)

    // 更新状态
    setFilters(prev => ({ ...prev, ...newFilters }))

    // 同步到URL（不重置页码）
    updateURL(newFilters)
  }

  return {
    filters,
    updateFilter,
    updateFilters, // 新增：批量更新方法
    // 便捷方法
    setPage: (page: number) => updateFilter('page', page),
    setTheme: (theme: string) => updateFilter('theme', theme),
    setScenario: (scenario: string) => updateFilter('scenario', scenario),
    setChapter: (chapter: string) => updateFilter('chapter', chapter),
    setStatus: (status: StatusFilter) => updateFilter('status', status)
  }
}
