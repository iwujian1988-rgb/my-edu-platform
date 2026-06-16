'use client'

/**
 * 1:1 移植自 MAXCLASS_V1_HANDOFF_2026-06-14/src/composables/usePageReady.js
 *
 * 轻量级页面加载状态：首次 mount 后 ready=true。
 * 用于骨架屏占位，建立"页面加载"模式；后续接入异步数据时替换为真实 loading。
 */

import { useEffect, useState } from 'react'

export function usePageReady() {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    setReady(true)
  }, [])
  return { ready }
}
