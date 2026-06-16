'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/stores/progress.js (Pinia)
 *
 * 进度存储 — 全部走 localStorage，与 Vue Pinia 字段名一致：
 *   - completed: { exerciseId: { correct, total, level, date } }
 *   - bookmarks: number[]
 *   - vocabularyProgress: { wordId: { seen, correct, nextReview } }
 *
 * React 端用 useState + useEffect + localStorage 包装，避免 SSR 时 document 未定义。
 * 调用方用 useProgressStore() 读取派生值（completedCount / averageScore / levelProgress / isBookmarked）。
 */

import { useEffect, useState } from 'react'

interface CompletedEntry {
  correct: number
  total: number
  level: string
  date: number
}

interface ProgressData {
  completed: Record<number, CompletedEntry>
  bookmarks: number[]
  vocabularyProgress: Record<number, { seen: boolean; correct: number; nextReview: number }>
}

const STORAGE_KEY_COMPLETED = 'progress_completed'
const STORAGE_KEY_BOOKMARKS = 'progress_bookmarks'
const STORAGE_KEY_VOCAB = 'progress_vocab'

const EMPTY: ProgressData = {
  completed: {},
  bookmarks: [],
  vocabularyProgress: {},
}

function loadFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

export interface ProgressStore {
  completedCount: number
  averageScore: number
  bookmarks: number[]
  levelProgress: (level: string) => number
  isBookmarked: (id: number) => boolean
}

export function useProgressStore(): ProgressStore {
  const [data, setData] = useState<ProgressData>(EMPTY)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setData({
      completed: loadFromStorage(STORAGE_KEY_COMPLETED, {}),
      bookmarks: loadFromStorage(STORAGE_KEY_BOOKMARKS, []),
      vocabularyProgress: loadFromStorage(STORAGE_KEY_VOCAB, {}),
    })
    setMounted(true)
  }, [])

  const completedValues = Object.values(data.completed)
  const completedCount = completedValues.length

  const averageScore =
    completedValues.length === 0
      ? 0
      : Math.round(
          (completedValues.reduce((sum, e) => sum + e.correct / e.total, 0) /
            completedValues.length) *
            100,
        )

  function levelProgress(level: string): number {
    return completedValues.filter(e => e.level === level).length
  }

  function isBookmarked(id: number): boolean {
    return data.bookmarks.includes(id)
  }

  // SSR 阶段返回空数据；客户端 mount 后才有真实 localStorage
  // mounted 字段目前未直接暴露 — 调用方判定空态时，0 == 空态足够区分
  return {
    completedCount: mounted ? completedCount : 0,
    averageScore: mounted ? averageScore : 0,
    bookmarks: mounted ? data.bookmarks : [],
    levelProgress: mounted ? levelProgress : () => 0,
    isBookmarked: mounted ? isBookmarked : () => false,
  }
}
