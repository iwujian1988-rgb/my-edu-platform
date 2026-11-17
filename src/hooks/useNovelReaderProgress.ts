'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { logger } from '@/lib/logger'
import { normForm } from '@/lib/novel-forms'
import type { NovelTypingSchedule } from '@/lib/novel-typing'
import type { NovelWordStatus } from '@/types/database'

interface ReadingProgressRow extends NovelTypingSchedule {
  lemma: string
  status: NovelWordStatus
  in_notebook: boolean
}

interface ReaderProgressState {
  bookId: string
  loaded: boolean
  loadError: boolean
  schedules: ReadonlyMap<string, ReadingProgressRow>
  notebook: ReadonlySet<string>
  pending: ReadonlySet<string>
  errors: ReadonlyMap<string, string>
}

type ReadingMutation =
  | { action: 'status'; lemma: string; status: NovelWordStatus }
  | { action: 'notebook'; lemma: string; inNotebook: boolean }

const EMPTY_NOTEBOOK: ReadonlyArray<string> = []
const SAVE_ERROR = '未能保存，已恢复原状态，请重试。'

function emptyState(bookId: string, notebook: ReadonlyArray<string>): ReaderProgressState {
  return { bookId, loaded: false, loadError: false, schedules: new Map(),
    notebook: new Set(notebook.map(normForm)), pending: new Set(), errors: new Map() }
}

/** Reading marks earn no spaced-repetition credit; a reported lapse makes the word due again. */
export function useNovelReaderProgress(bookId: string, initialNotebook: ReadonlyArray<string> = EMPTY_NOTEBOOK) {
  const [state, setState] = useState(() => emptyState(bookId, initialNotebook))
  const [reloadId, setReloadId] = useState(0)
  const requests = useRef(new Set<string>())

  useEffect(() => {
    const controller = new AbortController()
    setState(emptyState(bookId, initialNotebook))
    fetch(`/api/novel/${bookId}/progress`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error('Reading progress unavailable')
        return response.json() as Promise<{ data: ReadingProgressRow[] }>
      })
      .then(({ data }) => {
        if (controller.signal.aborted) return
        const rows = data || []
        setState({ ...emptyState(bookId, rows.filter(row => row.in_notebook).map(row => row.lemma)),
          loaded: true, schedules: new Map(rows.map(row => [normForm(row.lemma), row])) })
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        logger.warn('[NovelReader] Reading progress unavailable', error)
        // Offline exercises remain usable; saved marks must not be fabricated from an empty response.
        setState(previous => previous.bookId === bookId ? { ...previous, loaded: true, loadError: true } : previous)
      })
    return () => controller.abort()
  }, [bookId, initialNotebook, reloadId])

  const save = useCallback(async (mutation: ReadingMutation) => {
    const key = normForm(mutation.lemma)
    const requestKey = `${bookId}:${key}`
    if (state.bookId !== bookId || !state.loaded || state.loadError || requests.current.has(requestKey)) return
    requests.current.add(requestKey)
    const previousSchedule = state.schedules.get(key)
    const previousNotebook = state.notebook.has(key)
    setState(previous => {
      if (previous.bookId !== bookId) return previous
      const schedules = new Map(previous.schedules)
      const notebook = new Set(previous.notebook)
      const errors = new Map(previous.errors)
      errors.delete(key)
      if (mutation.action === 'status') {
        schedules.set(key, { lemma: mutation.lemma, next_review_at: null, in_notebook: previousNotebook,
          ...previousSchedule, status: mutation.status,
          ...(mutation.status === 'unknown' ? { next_review_at: new Date().toISOString() } : {}) })
      } else if (mutation.inNotebook) notebook.add(key)
      else notebook.delete(key)
      return { ...previous, schedules, notebook, errors, pending: new Set([...previous.pending, key]) }
    })
    try {
      const response = await fetch(`/api/novel/${bookId}/progress`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mutation),
      })
      if (!response.ok) throw new Error('Reading mark save failed')
    } catch (error: unknown) {
      logger.warn('[NovelReader] Reading mark save failed', error)
      setState(previous => {
        if (previous.bookId !== bookId) return previous
        const schedules = new Map(previous.schedules)
        const notebook = new Set(previous.notebook)
        if (mutation.action === 'status') {
          if (previousSchedule) schedules.set(key, previousSchedule)
          else schedules.delete(key)
        } else if (previousNotebook) notebook.add(key)
        else notebook.delete(key)
        return { ...previous, schedules, notebook, errors: new Map(previous.errors).set(key, SAVE_ERROR) }
      })
    } finally {
      requests.current.delete(requestKey)
      setState(previous => {
        if (previous.bookId !== bookId) return previous
        const pending = new Set(previous.pending)
        pending.delete(key)
        return { ...previous, pending }
      })
    }
  }, [bookId, state])

  const reload = useCallback(() => setReloadId(value => value + 1), [])
  const current = state.bookId === bookId ? state : emptyState(bookId, initialNotebook)
  return { ...current, reload, save, canSave: current.loaded && !current.loadError }
}
