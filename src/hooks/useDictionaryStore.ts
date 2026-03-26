'use client'

import { useState, useCallback, useEffect } from 'react'
import { lookupWord, getFromCache } from '@/lib/dictionary'
import type { UnifiedDictEntry, DictionaryLanguage } from '@/lib/dictionary/types'

// 模块级单例：所有 WordTooltip 共享同一份状态，互不干扰
let globalEntry: UnifiedDictEntry | null = null
let globalLoading = false
let globalError: string | null = null
const listeners = new Set<() => void>()

function notify() {
  listeners.forEach(fn => fn())
}

export function useDictionaryStore() {
  const [, forceUpdate] = useState(0)

  useEffect(() => {
    const rerender = () => forceUpdate(n => n + 1)
    listeners.add(rerender)
    return () => {
      listeners.delete(rerender)
    }
  }, [])

  const lookup = useCallback(async (word: string, language: DictionaryLanguage = 'fr') => {
    const normalized = word.trim()
    if (!normalized) return

    // 命中缓存直接用，不触发 loading
    const cached = getFromCache(normalized, language)
    if (cached) {
      globalEntry = cached
      globalLoading = false
      globalError = null
      notify()
      return
    }

    globalLoading = true
    globalError = null
    notify()

    try {
      const result = await lookupWord(normalized, language)
      globalEntry = result
      globalError = result.success ? null : '未找到该单词'
    } catch (err) {
      globalError = err instanceof Error ? err.message : '查询失败'
      globalEntry = null
    } finally {
      globalLoading = false
      notify()
    }
  }, [])

  return {
    entry: globalEntry,
    loading: globalLoading,
    error: globalError,
    lookup,
  }
}
