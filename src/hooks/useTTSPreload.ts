'use client'

/**
 * TTS 预加载统一工具
 *
 * 职责：
 * 1. 限速预加载 TTS 音频（3 并发，间隔 150ms）
 * 2. 缓存 blob URL，避免重复请求
 * 3. isAvailable(word) 判断 API 是否有音频
 * 4. play(word) 从缓存播放
 * 5. AbortController 支持取消预加载
 *
 * 彻底删除 Web Speech 兜底 — 中国环境下不可用
 */

import { useEffect, useRef, useCallback, useState } from 'react'

// ── 限速常量 ──

const MAX_CONCURRENT = 3
const BATCH_INTERVAL_MS = 150

// ── 缓存条目 ──

type CacheEntry = {
  status: 'loading' | 'available' | 'unavailable'
  blobUrl?: string
}

// ── 语言映射 ──

const LANGUAGE_MAP: Record<string, string> = {
  fr: 'fr',
  en: 'en',
  ja: 'ja',
  es: 'es',
  de: 'de',
}

function normalizeLanguage(lang: string | undefined): string {
  return LANGUAGE_MAP[lang || 'fr'] || 'fr'
}

// ── 工厂函数（非 React 场景也可用） ──

export interface TTSPreloadInstance {
  preloadWords: (words: string[]) => void
  isAvailable: (word: string) => boolean
  play: (word: string) => Promise<boolean>
  destroy: () => void
  /** 内部：订阅状态变更（React hook 用） */
  _subscribe: (fn: () => void) => () => void
}

export function createTTSPreload(language: string): TTSPreloadInstance {
  const lang = normalizeLanguage(language)
  const cache = new Map<string, CacheEntry>()
  let abortController = new AbortController()
  /** 状态变更监听器（React 需要重渲染） */
  const listeners = new Set<() => void>()

  function notifyListeners() {
    listeners.forEach((fn) => fn())
  }

  function subscribe(fn: () => void): () => void {
    listeners.add(fn)
    return () => listeners.delete(fn)
  }

  const api = {
    preloadWords(words: string[]) {
      // 去重 + 过滤已处理的
      const pending = words.filter((w) => !cache.has(w.toLowerCase()))
      if (pending.length === 0) return

      // 为每个词标记 loading
      for (const w of pending) {
        cache.set(w.toLowerCase(), { status: 'loading' })
      }

      // 限速并发加载
      loadBatch(pending, 0)
    },

    isAvailable(word: string): boolean {
      return cache.get(word.toLowerCase())?.status === 'available'
    },

    async play(word: string): Promise<boolean> {
      const key = word.toLowerCase()
      const entry = cache.get(key)

      if (entry?.status === 'available' && entry.blobUrl) {
        const audio = new Audio(entry.blobUrl)
        await audio.play()
        return true
      }

      // 未缓存或不可用，尝试实时请求
      try {
        const res = await fetch(
          `/api/tts?text=${encodeURIComponent(word)}&type=2&language=${lang}`
        )
        if (!res.ok) return false

        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        cache.set(key, { status: 'available', blobUrl })
        notifyListeners()

        const audio = new Audio(blobUrl)
        await audio.play()
        return true
      } catch {
        return false
      }
    },

    destroy() {
      abortController.abort()
      // 释放 blob URL
      cache.forEach((entry) => {
        if (entry.blobUrl) URL.revokeObjectURL(entry.blobUrl)
      })
      cache.clear()
      listeners.clear()
    },

    /** 内部：订阅状态变更（React hook 用） */
    _subscribe: subscribe,
  }

  async function loadSingle(word: string): Promise<void> {
    const key = word.toLowerCase()
    try {
      const res = await fetch(
        `/api/tts?text=${encodeURIComponent(word)}&type=2&language=${lang}`,
        { signal: abortController.signal }
      )
      if (res.ok) {
        const blob = await res.blob()
        const blobUrl = URL.createObjectURL(blob)
        cache.set(key, { status: 'available', blobUrl })
      } else {
        // 静默处理 404 和其他错误，不打印日志避免控制台污染
        cache.set(key, { status: 'unavailable' })
      }
    } catch (err) {
      // 静默处理网络错误，不打印日志
      if (abortController.signal.aborted) return
      cache.set(key, { status: 'unavailable' })
    }
    notifyListeners()
  }

  function loadBatch(words: string[], startIndex: number) {
    if (startIndex >= words.length) return
    if (abortController.signal.aborted) return

    const batch = words.slice(startIndex, startIndex + MAX_CONCURRENT)

    Promise.all(batch.map(loadSingle)).then(() => {
      if (abortController.signal.aborted) return
      // 间隔后继续下一批
      setTimeout(() => loadBatch(words, startIndex + MAX_CONCURRENT), BATCH_INTERVAL_MS)
    })
  }

  return api
}

// ── React Hook ──

export function useTTSPreload(language: string | undefined) {
  const lang = normalizeLanguage(language)
  const instanceRef = useRef<TTSPreloadInstance | null>(null)
  // 用于触发重渲染的状态版本号
  const [, setVersion] = useState(0)

  // 创建或重建实例（language 变化时）
  if (!instanceRef.current) {
    instanceRef.current = createTTSPreload(lang)
  }

  const instance = instanceRef.current

  // 订阅状态变更以触发 React 重渲染
  useEffect(() => {
    return instance._subscribe(() => setVersion((v) => v + 1))
  }, [instance])

  // 组件卸载时销毁
  useEffect(() => {
    return () => {
      instanceRef.current?.destroy()
      instanceRef.current = null
    }
  }, [])

  return instance
}
