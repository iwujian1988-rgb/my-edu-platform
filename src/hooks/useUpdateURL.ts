/**
 * useUpdateURL Hook
 * 用于更新URL参数而不刷新页面
 *
 * 使用场景：
 * - 翻页时更新 page 参数
 * - 筛选时更新 theme、status、chapter 等参数
 * - 任何需要保持状态到URL的场景
 */

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'

export function useUpdateURL() {
  const router = useRouter()
  const searchParams = useSearchParams()

  /**
   * 更新URL参数
   * @param params - 要更新的参数对象
   * @param options - 配置选项
   */
  const updateURL = useCallback((
    params: Record<string, string | number | null | undefined>,
    options: {
      scroll?: boolean  // 是否滚动到页面顶部
      replace?: boolean // 是否替换历史记录（默认true，避免创建大量历史）
    } = {}
  ) => {
    const { scroll = false, replace = true } = options

    // 创建新的URL参数
    const newParams = new URLSearchParams(searchParams.toString())

    Object.entries(params).forEach(([key, value]) => {
      // 如果值是 null、undefined 或 'all'，删除该参数
      if (value === null || value === undefined || value === 'all' || value === '') {
        newParams.delete(key)
      } else {
        newParams.set(key, String(value))
      }
    })

    // 构建新的URL
    const queryString = newParams.toString()
    const newUrl = `${window.location.pathname}${queryString ? '?' + queryString : ''}`

    // 导航到新URL
    if (replace) {
      router.replace(newUrl, { scroll })
    } else {
      router.push(newUrl, { scroll })
    }
  }, [router, searchParams])

  /**
   * 清除所有URL参数
   */
  const clearURL = useCallback(() => {
    router.replace(window.location.pathname, { scroll: false })
  }, [router])

  /**
   * 获取当前URL参数的值
   */
  const getParam = useCallback((key: string): string | null => {
    return searchParams.get(key)
  }, [searchParams])

  return {
    updateURL,
    clearURL,
    getParam,
    searchParams
  }
}
