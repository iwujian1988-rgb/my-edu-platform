'use client'

/**
 * 小说点词弹卡（点正文 b.fw → 词形别名命中 → 展示）
 *
 * 沿用 video/CardPopover 的词典能力；非模态底栏让查词后仍可继续操作正文：
 * - CEFR / 场景 / ★核心 徽标 + 词性 + 阴阳性
 * - 🔊 法语发音（useFrenchTTS 三层降级）
 * - ＋生词本（写 novel_word_progress.in_notebook）
 * - 未命中形态显示"暂无释义"
 * 视觉：videos MaxTube token。
 */

import { useCallback, useEffect } from 'react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { X, Volume2, BookmarkPlus, BookmarkCheck, Check, RotateCcw, ChevronLeft, ChevronRight, PenLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFrenchTTS } from '@/hooks/useFrenchTTS'
import { sanitizeNovelHtml } from '@/lib/novelSanitize'
import { NOVEL_WORD_STATUS_LABELS } from '@/lib/novel-word-status'
import type { NovelWordStatus } from '@/types/database'

export interface LexiconEntry {
  form_key: string
  lemma: string
  display_form: string
  phonetic: string | null
  pos: string | null
  gender: string | null
  definition: string
  cefr: string | null
  scene: string | null
  example_html: string | null
  chapter_first: number | null
  chapters: number[] | null
}

interface WordPopoverProps {
  entry: LexiconEntry | null
  /** 未命中时的原始点词文本 */
  rawText?: string
  inNotebook?: boolean
  onToggleNotebook?: (lemma: string, next: boolean) => void
  wordStatus?: NovelWordStatus
  onMarkStatus?: (lemma: string, status: 'known' | 'unknown') => void
  position?: number
  total?: number
  onPrevious?: () => void
  onNext?: () => void
  onHandwrite?: () => void
  saving?: boolean
  saveError?: string
  progressReady?: boolean
  progressError?: boolean
  onRetryProgress?: () => void
  onHeightChange?: (height: number) => void
  onClose: () => void
}

const CEFR_STYLE: Record<string, string> = {
  A1: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  A2: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  B1: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  B2: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  C1: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
  C2: 'bg-fuchsia-50 text-fuchsia-700 dark:bg-fuchsia-500/10 dark:text-fuchsia-400',
}

export function WordPopover({
  entry,
  rawText,
  inNotebook = false,
  onToggleNotebook,
  wordStatus = 'new',
  onMarkStatus,
  position,
  total,
  onPrevious,
  onNext,
  onHandwrite,
  saving = false,
  saveError,
  progressReady = true,
  progressError = false,
  onRetryProgress,
  onHeightChange,
  onClose,
}: WordPopoverProps) {
  const { speak, stop, status: speechStatus, error: speechError } = useFrenchTTS()

  useEffect(() => () => stop(), [entry?.form_key, rawText, stop])

  // Radix mounts its portal after the parent's layout effect; observe the actual DOM attachment.
  const measurePanel = useCallback((panel: HTMLDivElement | null) => {
    if (!panel || !onHeightChange) return
    const measure = () => onHeightChange(panel.getBoundingClientRect().height)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(panel)
    return () => { observer.disconnect(); onHeightChange(0) }
  }, [onHeightChange])

  const handleToggleNotebook = () => {
    if (!entry?.lemma || !onToggleNotebook) return
    onToggleNotebook(entry.lemma, !inNotebook)
  }

  return (
    <DialogPrimitive.Root open modal={false} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Content
          ref={measurePanel}
          onOpenAutoFocus={event => event.preventDefault()}
          onCloseAutoFocus={event => event.preventDefault()}
          // A reader may scroll or select the next highlighted word without dismissing this card.
          onInteractOutside={event => event.preventDefault()}
          className={cn(
            'novel-word-dock fixed inset-x-0 bottom-0 z-40 flex max-h-[55dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-[#e7eaf2] bg-white pb-[env(safe-area-inset-bottom)] sm:left-auto sm:right-5 sm:bottom-5 sm:max-h-[min(60dvh,480px)] sm:w-[440px] sm:max-w-[calc(100vw-40px)] sm:rounded-2xl',
            'shadow-[0_-8px_40px_rgba(31,42,104,0.14)] outline-none dark:border-[#35415d] dark:bg-[#141b2d]'
          )}
        >
        {/* 头部 */}
        <div className="flex shrink-0 items-center justify-between gap-1 border-b border-[#e7eaf2] bg-[#f8faff] px-5 dark:border-[#273149] dark:bg-[#192238]">
          <p className="shrink-0 text-xs font-semibold text-[#59647e] dark:text-[#bbc4de]">
            本章词卡 {position !== undefined && total !== undefined && <span className="ml-1 tabular-nums">{position} / {total}</span>}
          </p>
          <div className="flex items-center gap-0.5">
            <button type="button" aria-label="上一词" onClick={onPrevious} disabled={!onPrevious} className="novel-dock-navigation"><ChevronLeft className="h-4 w-4" /><span>上一词</span></button>
            <button type="button" aria-label="下一词" onClick={onNext} disabled={!onNext} className="novel-dock-navigation"><span>下一词</span><ChevronRight className="h-4 w-4" /></button>
            <DialogPrimitive.Close asChild>
              <button type="button" aria-label="关闭" className="novel-dock-navigation !w-11 !px-0"><X className="h-4 w-4" /></button>
            </DialogPrimitive.Close>
          </div>
        </div>

        {/* 内容 */}
        <div className="min-h-0 overflow-y-auto px-5 py-3">
          <div className="mb-2 flex flex-wrap items-center gap-1.5">
            {entry?.cefr && (
              <span
                className={cn(
                  'rounded px-1.5 py-0.5 text-[10px] font-bold',
                  CEFR_STYLE[entry.cefr] || 'bg-[#f3f5fb] text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]'
                )}
              >
                {entry.cefr}
              </span>
            )}
            {entry?.scene && (
              <span className="max-w-[140px] truncate rounded bg-[#f3f5fb] px-1.5 py-0.5 text-[10px] text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                {entry.scene}
              </span>
            )}
            {entry?.chapters && entry.chapters.length > 1 && (
              <span className="rounded bg-[#f3f5fb] px-1.5 py-0.5 text-[10px] text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                出现 {entry.chapters.length} 章
              </span>
            )}
          </div>
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <DialogPrimitive.Title className="break-words text-2xl font-bold tracking-[-0.02em] text-[#121729] dark:text-[#edf1ff]">
                {entry?.display_form || rawText}
              </DialogPrimitive.Title>
              <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-[#68718a] dark:text-[#a7b0c8]">
                {entry?.gender && (
                  <span className="rounded bg-[#f3f5fb] px-1.5 py-0.5 dark:bg-[#192238]">
                    {entry.gender === 'f' ? 'n.f.' : 'n.m.'}
                  </span>
                )}
                {entry?.pos && <span>{entry.pos}</span>}
                {entry?.phonetic && <span className="font-mono">[{entry.phonetic}]</span>}
              </div>
            </div>
          </div>

          {entry ? (
            <>
              <DialogPrimitive.Description className="mt-2 text-sm font-medium leading-relaxed text-[#121729] dark:text-[#edf1ff]">
                {entry.definition}
              </DialogPrimitive.Description>

              {entry.example_html && (
                <details key={entry.form_key} className="mt-2 border-t border-[#e7eaf2] dark:border-[#273149]">
                  <summary className="min-h-11 cursor-pointer py-3 text-sm font-semibold text-[#59647e] dark:text-[#bbc4de]">查看例句</summary>
                  <div className="novel-popover-example rounded-xl bg-[#f8faff] p-4 text-sm leading-relaxed text-[#3c4459] dark:bg-[#192238] dark:text-[#c5cce0]" dangerouslySetInnerHTML={{ __html: sanitizeNovelHtml(entry.example_html) }} />
                </details>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button" onClick={() => speak(entry.display_form)}
                  className="flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border border-[#e7eaf2] bg-white px-3 py-2 text-sm font-semibold text-[#2d39bb] transition-colors hover:bg-[#f8faff] focus-visible:ring-2 focus-visible:ring-indigo-500 dark:border-[#35415d] dark:bg-[#192238] dark:text-[#bcc5ff]"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  {speechStatus === 'loading' ? '加载发音…' : speechStatus === 'playing' ? '正在发音' : speechError ? '重试发音' : '发音'}
                </button>
                {onToggleNotebook && (
                  <button
                    type="button" onClick={handleToggleNotebook} disabled={saving || !progressReady}
                    aria-pressed={inNotebook}
                    className={cn(
                      'flex min-h-11 flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-50',
                      inNotebook
                        ? 'bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] text-white'
                        : 'border border-[#e7eaf2] bg-white text-[#121729] hover:border-[#6550ff]/40 hover:bg-[#f8faff] dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#edf1ff]'
                    )}
                  >
                    {inNotebook ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                    {inNotebook ? '已在生词本' : '加入生词本'}
                  </button>
                )}
              </div>
              {speechError && <p role="alert" className="mt-2 text-sm text-rose-600 dark:text-rose-400">{speechError}</p>}
            </>
          ) : (
            <DialogPrimitive.Description className="py-4 text-center text-sm text-[#68718a] dark:text-[#a7b0c8]">
              暂无释义：该词不在本书词库中
            </DialogPrimitive.Description>
          )}
        </div>
        {entry && onMarkStatus && <div className="shrink-0 border-t border-[#e7eaf2] px-5 pb-3 pt-2 dark:border-[#273149]">
          <div className="mb-2 flex min-h-6 items-center justify-between gap-2 text-xs text-[#59647e] dark:text-[#bbc4de]">
            <span role="status">{saving ? '保存中…' : progressError ? '学习记录暂未加载' : !progressReady ? '加载学习记录…' : NOVEL_WORD_STATUS_LABELS[wordStatus]}</span>
            {progressError && <button type="button" onClick={onRetryProgress} className="min-h-11 px-2 font-semibold underline">重试加载</button>}
          </div>
          <div className="grid grid-cols-2 gap-2" role="group" aria-label="标记词汇状态">
            <button type="button" disabled={saving || !progressReady} aria-pressed={wordStatus === 'unknown'} onClick={() => onMarkStatus(entry.lemma, 'unknown')}
              className="novel-word-mark" data-mark="unknown"><RotateCcw className="h-4 w-4" />没记住</button>
            <button type="button" disabled={saving || !progressReady} aria-pressed={wordStatus === 'known'} onClick={() => onMarkStatus(entry.lemma, 'known')}
              className="novel-word-mark" data-mark="known"><Check className="h-4 w-4" />记住了</button>
          </div>
          {saveError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{saveError}</p>}
        </div>}
        {onHandwrite && <button type="button" onClick={onHandwrite} className="novel-dock-write"><PenLine className="h-4 w-4" />手写这个词 <span aria-hidden="true">↗</span></button>}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
