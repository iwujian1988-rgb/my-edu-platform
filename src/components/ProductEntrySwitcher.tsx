'use client'

import { useEffect, useState } from 'react'
import { BookOpen, Check, ChevronDown, GraduationCap, Languages, LayoutGrid, Play } from 'lucide-react'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { logger } from '@/lib/logger'
import type { ProductEntry, ProductPermissions } from '@/lib/product-entries'

const PERMISSIONS_PATH = '/api/auth/check-permissions'
const ENTRY_ICONS = { maxnote: BookOpen, video: Play, novel: BookOpen, 'work-english': GraduationCap, 'french-atlas': Languages } as const
type EntryState = { status: 'loading' | 'error' } | { status: 'ready'; entries: ProductEntry[] }

export function ProductEntrySwitcher({ currentEntryId }: { currentEntryId: string }) {
  const [open, setOpen] = useState(false)
  const [state, setState] = useState<EntryState>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    async function loadEntries() {
      try {
        const response = await fetch(PERMISSIONS_PATH, { method: 'POST', credentials: 'include', cache: 'no-store', signal: controller.signal })
        if (!response.ok) throw new Error(`Product permissions returned ${response.status}`)
        const data: ProductPermissions = await response.json()
        if (!Array.isArray(data.entries)) throw new Error('Product entries missing from permissions response')
        if (!controller.signal.aborted) setState({ status: 'ready', entries: data.entries })
      } catch (error: unknown) {
        if (controller.signal.aborted) return
        logger.warn('[ProductEntrySwitcher] 权限查询失败:', error)
        setState({ status: 'error' })
      }
    }
    void loadEntries()
    return () => controller.abort()
  }, [open, attempt])

  return (
    <DropdownMenu open={open} onOpenChange={nextOpen => {
      if (nextOpen) setState({ status: 'loading' })
      setOpen(nextOpen)
    }}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="切换入口"
          title="切换学习入口"
          onKeyDown={event => event.stopPropagation()}
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#e7eaf2] bg-white px-2 text-xs font-semibold text-[#343947] transition-colors hover:bg-[#f3f5fb] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#c5cce0] dark:hover:bg-[#202941] sm:px-3"
        >
          <LayoutGrid className="h-4 w-4" aria-hidden="true" />
          <span className="sm:hidden">切换</span><span className="hidden sm:inline">切换入口</span>
          <ChevronDown className="h-3 w-3" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        collisionPadding={12}
        className="z-[100] w-72 max-w-[calc(100vw-1.5rem)] rounded-xl border-[#e7eaf2] bg-white p-1.5 text-[#343947] shadow-xl dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#c5cce0]"
        onKeyDown={event => {
          // 复习页有全局评分快捷键，菜单操作不能同时触发评分或翻卡。
          event.stopPropagation()
          if (event.key === 'Escape') setOpen(false)
        }}
      >
        {state.status === 'loading' && <p role="status" className="px-3 py-4 text-sm">正在加载学习入口…</p>}
        {state.status === 'error' && <div className="px-3 py-3">
          <p role="alert" className="text-sm">暂时无法加载入口</p>
          <button type="button" className="mt-2 min-h-11 rounded-lg px-3 text-sm font-semibold text-indigo-600 focus-visible:outline dark:text-indigo-300" onClick={() => {
            setState({ status: 'loading' })
            setAttempt(value => value + 1)
          }}>重新加载入口</button>
        </div>}
        {state.status === 'ready' && state.entries.length === 0 && <p role="status" className="px-3 py-4 text-sm">暂无可切换的学习入口</p>}
        {state.status === 'ready' && state.entries.map(entry => {
          const Icon = ENTRY_ICONS[entry.kind]
          const current = entry.id === currentEntryId
          return (
            <DropdownMenuItem key={entry.id} asChild className="min-h-11 cursor-pointer rounded-lg px-3 py-3 focus:bg-[#f1f2ff] dark:focus:bg-[#202a4d]">
              <a href={entry.href} aria-current={current ? 'location' : undefined}>
                <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="min-w-0 flex-1 break-words text-sm font-semibold">{entry.title}</span>
                {current && <span className="flex shrink-0 items-center gap-1 text-xs text-indigo-600 dark:text-indigo-300"><Check className="h-4 w-4" aria-hidden="true" />当前</span>}
              </a>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
