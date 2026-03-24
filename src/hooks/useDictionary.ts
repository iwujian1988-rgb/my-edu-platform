/**
 * 词典查询 Hook
 *
 * 提供便捷的 React Hook 接口，供组件使用
 *
 * 使用示例:
 * ```tsx
 * function WordCard({ word }: { word: string }) {
 *   const { entry, loading, error, lookup } = useDictionary()
 *
 *   useEffect(() => {
 *     lookup(word, 'en')
 *   }, [word])
 *
 *   if (loading) return <Spinner />
 *   if (error) return <Error message={error} />
 *   if (!entry?.success) return <NotFound />
 *
 *   return (
 *     <div>
 *       <h1>{entry.word}</h1>
 *       <p>{entry.phonetic}</p>
 *       <p>{entry.definition}</p>
 *     </div>
 *   )
 * }
 * ```
 */

'use client'

import { useState, useCallback, useEffect } from 'react'
import {
  lookupWord,
  lookupBatch,
  getFromCache
} from '@/lib/dictionary'
import type {
  UseDictionaryReturn,
  UnifiedDictEntry,
  DictionaryLanguage
} from '@/lib/dictionary/types'

// ============================================
// useDictionary Hook
// ============================================

export function useDictionary(): UseDictionaryReturn {
  const [entry, setEntry] = useState<UnifiedDictEntry | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async (
    word: string,
    language: DictionaryLanguage = 'en'
  ) => {
    const normalizedWord = word.trim()

    if (!normalizedWord) {
      setError('Empty word')
      setEntry(null)
      return
    }

    setLoading(true)
    setError(null)

    try {
      const result = await lookupWord(normalizedWord, language)
      setEntry(result)

      if (!result.success) {
        setError('未找到该单词')
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '查询失败'
      setError(errorMessage)
      setEntry(null)

    } finally {
      setLoading(false)
    }
  }, [])

  const lookupBatchFn = useCallback(async (
    words: string[],
    language: DictionaryLanguage = 'en'
  ): Promise<UnifiedDictEntry[]> => {
    setLoading(true)
    setError(null)

    try {
      const results = await lookupBatch(words, language)
      return results

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量查询失败'
      setError(errorMessage)
      return words.map(word => ({
        word,
        language,
        source: 'ultimate' as const,
        success: false
      }))

    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setEntry(null)
    setError(null)
    setLoading(false)
  }, [])

  const getCached = useCallback((
    word: string,
    language: DictionaryLanguage = 'en'
  ): UnifiedDictEntry | null => {
    return getFromCache(word, language) || null
  }, [])

  return {
    entry,
    loading,
    error,
    lookup,
    lookupBatch: lookupBatchFn,
    clear,
    getCached
  }
}

// ============================================
// useDictionaryBatch Hook（批量查询专用）
// ============================================

interface UseDictionaryBatchReturn {
  entries: UnifiedDictEntry[]
  loading: boolean
  progress: { current: number; total: number }
  error: string | null
  lookup: (words: string[], language?: DictionaryLanguage) => Promise<void>
  clear: () => void
}

export function useDictionaryBatch(): UseDictionaryBatchReturn {
  const [entries, setEntries] = useState<UnifiedDictEntry[]>([])
  const [loading, setLoading] = useState(false)
  const [progress, setProgress] = useState({ current: 0, total: 0 })
  const [error, setError] = useState<string | null>(null)

  const lookup = useCallback(async (
    words: string[],
    language: DictionaryLanguage = 'en'
  ) => {
    if (!words || words.length === 0) {
      setEntries([])
      return
    }

    setLoading(true)
    setError(null)
    setProgress({ current: 0, total: words.length })

    try {
      const results = await lookupBatch(words, language)
      setEntries(results)
      setProgress({ current: words.length, total: words.length })

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '批量查询失败'
      setError(errorMessage)
      setEntries(words.map(word => ({
        word,
        language,
        source: 'ultimate' as const,
        success: false
      })))

    } finally {
      setLoading(false)
    }
  }, [])

  const clear = useCallback(() => {
    setEntries([])
    setProgress({ current: 0, total: 0 })
    setError(null)
    setLoading(false)
  }, [])

  return {
    entries,
    loading,
    progress,
    error,
    lookup,
    clear
  }
}

// ============================================
// useDictionaryCache Hook（仅缓存读取）
// ============================================

interface UseDictionaryCacheReturn {
  getCached: (word: string, language?: DictionaryLanguage) => UnifiedDictEntry | null
  hasCached: (word: string, language?: DictionaryLanguage) => boolean
}

export function useDictionaryCache(): UseDictionaryCacheReturn {
  const getCached = useCallback((
    word: string,
    language: DictionaryLanguage = 'en'
  ): UnifiedDictEntry | null => {
    return getFromCache(word, language) || null
  }, [])

  const hasCached = useCallback((
    word: string,
    language: DictionaryLanguage = 'en'
  ): boolean => {
    return !!getFromCache(word, language)
  }, [])

  return {
    getCached,
    hasCached
  }
}

// ============================================
// 辅助组件
// ============================================

/**
 * 词典条目显示组件 Props
 */
export interface DictEntryDisplayProps {
  entry: UnifiedDictEntry
  showExamples?: boolean
  showCollocations?: boolean
  showPhonetic?: boolean
}

/**
 * 格式化词典条目为显示文本
 */
export function formatDictEntry(
  entry: UnifiedDictEntry,
  options?: {
    showExamples?: boolean
    showCollocations?: boolean
  }
): string {
  if (!entry.success) {
    return `未找到: ${entry.word}`
  }

  const lines: string[] = []

  // 单词和音标
  lines.push(`【${entry.word}】`)
  if (entry.phonetic) {
    lines.push(`音标: ${entry.phonetic}`)
  }
  if (entry.uk_phonetic || entry.us_phonetic) {
    const phonetics = []
    if (entry.uk_phonetic) phonetics.push(`英[${entry.uk_phonetic}]`)
    if (entry.us_phonetic) phonetics.push(`美[${entry.us_phonetic}]`)
    lines.push(phonetics.join(' '))
  }

  // 词性
  if (entry.part_of_speech || entry.posDetail) {
    lines.push(`词性: ${entry.posDetail || entry.part_of_speech}`)
  }

  // 释义
  if (entry.definition) {
    lines.push(`释义: ${entry.definition}`)
  }

  // 例句
  if (options?.showExamples && entry.examples?.length) {
    lines.push('\n例句:')
    entry.examples.forEach((ex, i) => {
      const original = ex.fr || ex.en || ''
      lines.push(`${i + 1}. ${original}`)
      if (ex.zh) lines.push(`   ${ex.zh}`)
    })
  }

  // 搭配
  if (options?.showCollocations && entry.collocation) {
    lines.push(`\n搭配: ${entry.collocation}`)
  }

  return lines.join('\n')
}

export default useDictionary
