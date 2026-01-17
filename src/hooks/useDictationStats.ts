// src/hooks/useDictationStats.ts
// 对应方案：Section 6.6.1 - useDictationStats: 获取和管理统计数据

import { useState, useEffect } from 'react'
import { dictationService } from '@/services/dictationService'
import { DictationStats, DictationScopeType, DICTATION_SCOPE_LABELS } from '@/types/dictation'

interface ScopeOption {
  value: DictationScopeType
  label: string
  count: number
  disabled: boolean
}

/**
 * useDictationStats: 获取和管理统计数据
 * 对应方案：Section 6.6.1
 */
export function useDictationStats(bookId: string) {
  const [stats, setStats] = useState<DictationStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [cached, setCached] = useState(false)  // 对应方案：Section 6.6.1 - 标记是否来自缓存
  const [error, setError] = useState<Error | null>(null)

  useEffect(() => {
    let mounted = true

    async function fetchStats() {
      // 对应方案：防御性编程 - 参数校验
      if (!bookId) return

      setLoading(true)
      setError(null)

      try {
        const data = await dictationService.getStats(bookId)

        // 对应方案：防御性编程 - 防止组件卸载后更新状态
        if (!mounted) return

        setStats(data)
        setCached(false)  // TODO: 从API响应中获取_cached标记
      } catch (err) {
        console.error('❌ [useDictationStats] 获取统计失败:', err)
        if (!mounted) return
        setError(err as Error)
      } finally {
        if (mounted) {
          setLoading(false)
        }
      }
    }

    fetchStats()

    return () => {
      mounted = false
    }
  }, [bookId])

  /**
   * 获取范围选项列表（用于UI渲染）
   * 对应方案：Section 6.6.1
   */
  const getScopeOptions = (): ScopeOption[] => {
    if (!stats) return []

    const scopeTypes: DictationScopeType[] = ['all', 'unknown', 'fuzzy', 'known', 'new']

    return scopeTypes.map(scopeType => ({
      value: scopeType,
      label: DICTATION_SCOPE_LABELS[scopeType],
      count: stats[scopeType],
      disabled: stats[scopeType] === 0
    }))
  }

  return {
    stats,
    loading,
    cached,
    error,
    getScopeOptions
  }
}
