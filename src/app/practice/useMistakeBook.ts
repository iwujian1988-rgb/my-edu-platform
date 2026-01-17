/**
 * 错题本管理 Hook
 *
 * 功能：
 * - 记录错误单词及错误次数
 * - 实时持久化到 localStorage
 * - 支持添加、删除、清空、更新
 * - 支持标记为"已掌握"
 */

import { useState, useEffect, useCallback } from 'react'

export interface MistakeEntry {
  word: string
  trans: string
  phonetic?: string
  mistakeCount: number
  lastMistakeAt: number // 时间戳
  mastered: boolean // 是否已掌握
}

const MISTAKE_BOOK_KEY = 'sagevocab-mistake-book-v2'

export function useMistakeBook() {
  const [mistakes, setMistakes] = useState<Record<string, MistakeEntry>>({})
  const [isLoading, setIsLoading] = useState(true)

  // 从 localStorage 加载错题本
  useEffect(() => {
    try {
      const saved = localStorage.getItem(MISTAKE_BOOK_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        setMistakes(parsed)
      }
    } catch (error) {
      console.warn('[useMistakeBook] Failed to load mistakes:', error)
    } finally {
      setIsLoading(false)
    }
  }, [])

  // 保存到 localStorage
  useEffect(() => {
    if (!isLoading) {
      try {
        localStorage.setItem(MISTAKE_BOOK_KEY, JSON.stringify(mistakes))
      } catch (error) {
        console.warn('[useMistakeBook] Failed to save mistakes:', error)
      }
    }
  }, [mistakes, isLoading])

  // 添加或更新错误记录
  const addMistake = useCallback((word: string, trans: string, phonetic?: string) => {
    setMistakes((prev) => {
      const existing = prev[word]
      return {
        ...prev,
        [word]: {
          word,
          trans,
          phonetic,
          mistakeCount: existing ? existing.mistakeCount + 1 : 1,
          lastMistakeAt: Date.now(),
          mastered: false,
        },
      }
    })
  }, [])

  // 增加错误次数（用于连续错误计数）
  const incrementMistakeCount = useCallback((word: string) => {
    setMistakes((prev) => {
      const existing = prev[word]
      if (!existing) return prev

      return {
        ...prev,
        [word]: {
          ...existing,
          mistakeCount: existing.mistakeCount + 1,
          lastMistakeAt: Date.now(),
        },
      }
    })
  }, [])

  // 标记为已掌握
  const markAsMastered = useCallback((word: string) => {
    setMistakes((prev) => {
      const existing = prev[word]
      if (!existing) return prev

      return {
        ...prev,
        [word]: {
          ...existing,
          mastered: true,
        },
      }
    })
  }, [])

  // 删除错题
  const removeMistake = useCallback((word: string) => {
    setMistakes((prev) => {
      const newMistakes = { ...prev }
      delete newMistakes[word]
      return newMistakes
    })
  }, [])

  // 清空所有错题
  const clearAll = useCallback(() => {
    setMistakes({})
  }, [])

  // 清空已掌握的错题
  const clearMastered = useCallback(() => {
    setMistakes((prev) => {
      const newMistakes: Record<string, MistakeEntry> = {}
      for (const [word, entry] of Object.entries(prev)) {
        if (!entry.mastered) {
          newMistakes[word] = entry
        }
      }
      return newMistakes
    })
  }, [])

  // 获取错题列表（按错误次数降序）
  const getMistakeList = useCallback((): MistakeEntry[] => {
    return Object.values(mistakes).sort((a, b) => b.mistakeCount - a.mistakeCount)
  }, [mistakes])

  // 获取未掌握的错题列表
  const getUnmasteredList = useCallback((): MistakeEntry[] => {
    return Object.values(mistakes)
      .filter((m) => !m.mastered)
      .sort((a, b) => b.mistakeCount - a.mistakeCount)
  }, [mistakes])

  // 获取某个单词的错误次数
  const getMistakeCount = useCallback((word: string): number => {
    return mistakes[word]?.mistakeCount || 0
  }, [mistakes])

  // 检查是否是错题
  const isMistake = useCallback((word: string): boolean => {
    return !!mistakes[word] && !mistakes[word].mastered
  }, [mistakes])

  return {
    mistakes,
    isLoading,
    addMistake,
    incrementMistakeCount,
    markAsMastered,
    removeMistake,
    clearAll,
    clearMastered,
    getMistakeList,
    getUnmasteredList,
    getMistakeCount,
    isMistake,
  }
}
