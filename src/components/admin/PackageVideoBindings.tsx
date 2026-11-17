'use client'

import { useEffect, useRef, useState } from 'react'
import { VIDEO_LANGUAGE_LABELS } from '@/types/video'
import { MAX_VIDEO_BINDING_CHANGES, VIDEO_BINDINGS_PATH, VIDEO_BINDING_BULK_PAGE_SIZE, VIDEO_BINDING_PAGE_SIZE, type VideoBindingChanges, type VideoBindingOption, type VideoBindingPage } from '@/lib/package-video-bindings'
import { logger } from '@/lib/logger'

const SEARCH_DELAY_MS = 300

export function PackageVideoBindings({ packageId, changes, onChange, disabled = false, onBusyChange }: {
  packageId?: string
  changes: VideoBindingChanges
  onChange: (changes: VideoBindingChanges) => void
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const [language, setLanguage] = useState('fr')
  const [search, setSearch] = useState('')
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)
  const [data, setData] = useState<VideoBindingPage>({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [bulkLoading, setBulkLoading] = useState(false)
  const [error, setError] = useState('')
  const [retry, setRetry] = useState(0)
  const bulkRequest = useRef<AbortController | null>(null)

  useEffect(() => () => bulkRequest.current?.abort(), [])

  useEffect(() => {
    onBusyChange?.(bulkLoading)
    return () => onBusyChange?.(false)
  }, [bulkLoading, onBusyChange])

  useEffect(() => {
    const timer = setTimeout(() => { setQuery(search.trim()); setPage(1) }, SEARCH_DELAY_MS)
    return () => clearTimeout(timer)
  }, [search])

  function queryUrl(targetPage: number, pageSize: number) {
    const params = new URLSearchParams({ language, search: query, page: String(targetPage), page_size: String(pageSize) })
    return `${VIDEO_BINDINGS_PATH}?${params}`
  }

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setData({ items: [], total: 0 })
    const params = new URLSearchParams({ language, search: query, page: String(page), page_size: String(VIDEO_BINDING_PAGE_SIZE) })
    fetch(`${VIDEO_BINDINGS_PATH}?${params}`, { credentials: 'include', signal: controller.signal, cache: 'no-store' })
      .then(async response => {
        if (!response.ok) throw new Error('视频列表加载失败')
        const result: VideoBindingPage = await response.json()
        if (!controller.signal.aborted) setData(result)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        logger.warn('[PackageVideoBindings] 视频列表加载失败:', error)
        setError('视频列表加载失败，请重试')
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [language, query, page, retry, packageId])

  function selectVideos(videos: VideoBindingOption[], checked: boolean) {
    const next = { ...changes }
    for (const video of videos) {
      const originallyBound = !!packageId && !!video.package_ids?.includes(packageId)
      if (originallyBound === checked) delete next[video.id]
      else next[video.id] = checked
    }
    if (Object.keys(next).length > MAX_VIDEO_BINDING_CHANGES) {
      setError(`一次最多修改 ${MAX_VIDEO_BINDING_CHANGES} 条视频关联，请分批保存`)
      return
    }
    onChange(next)
  }

  async function selectFilteredVideos() {
    const controller = new AbortController()
    bulkRequest.current = controller
    setBulkLoading(true)
    setError('')
    try {
      const videos: VideoBindingOption[] = []
      let total = data.total
      for (let targetPage = 1; videos.length < total; targetPage++) {
        const response = await fetch(queryUrl(targetPage, VIDEO_BINDING_BULK_PAGE_SIZE), { credentials: 'include', cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error('批量选择失败，请重试')
        const result: VideoBindingPage = await response.json()
        total = result.total
        if (total > MAX_VIDEO_BINDING_CHANGES) throw new Error(`筛选结果超过 ${MAX_VIDEO_BINDING_CHANGES} 条，请缩小范围后选择`)
        videos.push(...result.items)
        if (!result.items.length) break
      }
      if (!controller.signal.aborted) selectVideos(videos, true)
    } catch (error: unknown) {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : '批量选择失败，请重试')
    } finally {
      if (!controller.signal.aborted) setBulkLoading(false)
    }
  }

  const controlsDisabled = disabled || bulkLoading
  return (
    <section className="space-y-3 border-[3px] border-red-500 bg-red-50 p-4 text-red-950 dark:bg-red-950 dark:text-red-100" aria-label="视频内容授权">
      <h3 className="text-sm font-bold">视频学习 - 关联视频</h3>
      <p className="text-xs leading-relaxed">仅勾选“视频学习”不会分配内容。请先选视频语言，再勾选视频；保存后，拥有本套餐的用户即可访问所选内容，视频已关联的其他套餐保持不变。</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <label className="flex items-center gap-2 text-xs font-semibold">视频语言
          <select value={language} disabled={controlsDisabled} onChange={event => { setLanguage(event.target.value); setPage(1) }} className="min-h-11 rounded border bg-white px-2 text-gray-900 dark:bg-gray-800 dark:text-white">
            <option value="all">全部语言</option>
            {Object.entries(VIDEO_LANGUAGE_LABELS).map(([code, title]) => <option value={code} key={code}>{title}</option>)}
          </select>
        </label>
        <input aria-label="搜索视频标题" placeholder="搜索视频标题" value={search} disabled={controlsDisabled} onChange={event => setSearch(event.target.value)} className="min-h-11 w-full min-w-0 flex-1 rounded border bg-white px-3 text-sm text-gray-900 dark:bg-gray-800 dark:text-white sm:w-auto" />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        <button type="button" disabled={controlsDisabled || loading || !data.total} onClick={() => void selectFilteredVideos()} className="min-h-11 rounded border border-red-400 px-3 font-semibold disabled:opacity-50">{bulkLoading ? '正在选择…' : `关联全部筛选结果（${data.total} 条）`}</button>
        <button type="button" disabled={controlsDisabled || loading || !data.items.length} onClick={() => selectVideos(data.items, false)} className="min-h-11 rounded border border-red-300 px-3 disabled:opacity-50">取消本页关联</button>
      </div>
      {loading ? <p role="status" className="text-sm">正在加载视频…</p> : <div className="max-h-72 overflow-y-auto rounded border border-red-200 bg-white dark:bg-gray-900">
        {data.items.map(video => <label key={video.id} className="flex min-h-11 cursor-pointer items-start gap-3 border-b border-red-100 p-3 text-sm last:border-b-0 dark:border-gray-700">
          <input type="checkbox" disabled={controlsDisabled} checked={changes[video.id] ?? (!!packageId && !!video.package_ids?.includes(packageId))} onChange={event => selectVideos([video], event.target.checked)} className="mt-1 h-4 w-4 shrink-0" />
          <span className="min-w-0 break-words">{video.title}<span className="ml-2 text-xs opacity-70">{VIDEO_LANGUAGE_LABELS[video.language] ?? video.language}</span></span>
        </label>)}
        {!data.items.length && <p className="p-3 text-sm">没有符合条件的已发布视频</p>}
      </div>}
      {error && <div role="alert" className="text-sm">{error}<button type="button" onClick={() => setRetry(value => value + 1)} className="ml-2 min-h-11 underline">重新加载</button></div>}
      <div className="flex flex-col items-start gap-2 text-xs sm:flex-row sm:items-center sm:justify-between">
        <span>待变更 {Object.keys(changes).length} 条，点击套餐“保存”后生效</span>
        <div className="flex shrink-0 items-center gap-2">
          <button type="button" disabled={controlsDisabled || loading || page === 1} onClick={() => setPage(value => value - 1)} className="min-h-11 px-2 disabled:opacity-50">上一页</button>
          <span>{page} / {Math.max(1, Math.ceil(data.total / VIDEO_BINDING_PAGE_SIZE))}</span>
          <button type="button" disabled={controlsDisabled || loading || page * VIDEO_BINDING_PAGE_SIZE >= data.total} onClick={() => setPage(value => value + 1)} className="min-h-11 px-2 disabled:opacity-50">下一页</button>
        </div>
      </div>
      <p className="text-xs opacity-80">只关联这次选中的已发布内容；之后新增视频需再关联。这里的语言筛选与上方的语言包权限独立。</p>
    </section>
  )
}
