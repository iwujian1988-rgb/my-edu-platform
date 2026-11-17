'use client'

import { useCallback, useState, useSyncExternalStore } from 'react'
import { logger } from '@/lib/logger'

export type NovelInputMethod = 'keyboard' | 'handwriting'
const INPUT_METHOD_KEY = 'novel-input-method'
const TOUCH_TABLET_QUERY = '(min-width: 640px) and (any-pointer: coarse)'
const INPUT_METHOD_EVENT = 'novel-input-method-change'

function subscribe(onChange: () => void) {
  const tablet = window.matchMedia(TOUCH_TABLET_QUERY)
  tablet.addEventListener('change', onChange)
  window.addEventListener('storage', onChange)
  window.addEventListener(INPUT_METHOD_EVENT, onChange)
  return () => {
    tablet.removeEventListener('change', onChange)
    window.removeEventListener('storage', onChange)
    window.removeEventListener(INPUT_METHOD_EVENT, onChange)
  }
}

function snapshot(): NovelInputMethod {
  const fallback = window.matchMedia(TOUCH_TABLET_QUERY).matches ? 'handwriting' : 'keyboard'
  try {
    const saved = localStorage.getItem(INPUT_METHOD_KEY)
    return saved === 'keyboard' || saved === 'handwriting' ? saved : fallback
  } catch { return fallback }
}

const serverSnapshot = (): NovelInputMethod => 'keyboard'

export function useNovelInputMethod() {
  const detected = useSyncExternalStore(subscribe, snapshot, serverSnapshot)
  const [selected, setSelected] = useState<NovelInputMethod | null>(null)

  const changeInputMethod = useCallback((method: NovelInputMethod) => {
    setSelected(method)
    try { localStorage.setItem(INPUT_METHOD_KEY, method) }
    catch (error: unknown) { logger.warn('[NovelReader] Input preference not saved', error) }
    window.dispatchEvent(new Event(INPUT_METHOD_EVENT))
  }, [])

  return { inputMethod: selected || detected, changeInputMethod }
}
