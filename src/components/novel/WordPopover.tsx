'use client'

/**
 * 小说点词弹卡（点正文 b.fw → 词形别名命中 → 展示）
 *
 * 改造自 video/CardPopover 的定位逻辑，扩展：
 * - CEFR / 场景 / ★核心 徽标 + 词性 + 阴阳性
 * - 🔊 法语发音（useFrenchTTS 三层降级）
 * - ＋生词本（写 novel_word_progress.in_notebook）
 * - 未命中形态显示"暂无释义"
 * 视觉：videos MaxTube token。
 */

import { useEffect, useState } from 'react'
import { X, Volume2, BookmarkPlus, BookmarkCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFrenchTTS } from '@/hooks/useFrenchTTS'
import { sanitizeNovelHtml } from '@/lib/novelSanitize'

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
  position: { x: number; y: number } | null
  inNotebook?: boolean
  onToggleNotebook?: (lemma: string, next: boolean) => void
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
  position,
  inNotebook = false,
  onToggleNotebook,
  onClose,
}: WordPopoverProps) {
  const { speak } = useFrenchTTS()
  const [notebook, setNotebook] = useState(inNotebook)

  useEffect(() => setNotebook(inNotebook), [inNotebook, entry?.form_key])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const getPopoverStyle = () => {
    if (!position) {
      return { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }
    }

    const popoverWidth = 320
    const popoverHeight = 320
    const padding = 12

    let left = position.x
    let top = position.y + 12

    if (left + popoverWidth + padding > window.innerWidth) {
      left = window.innerWidth - popoverWidth - padding
    }
    if (top + popoverHeight + padding > window.innerHeight) {
      top = Math.max(padding, position.y - popoverHeight - 12)
    }
    if (left < padding) {
      left = padding
    }

    return { top: `${top}px`, left: `${left}px` }
  }

  const handleToggleNotebook = () => {
    if (!entry?.lemma || !onToggleNotebook) return
    const next = !notebook
    setNotebook(next)
    onToggleNotebook(entry.lemma, next)
  }

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        className={cn(
          'fixed z-50 w-80 max-w-[calc(100vw-24px)] rounded-[12px] border border-[#e7eaf2] bg-white',
          'shadow-[0_12px_34px_rgba(31,42,104,0.14)] dark:border-[#273149] dark:bg-[#141b2d]'
        )}
        style={getPopoverStyle()}
        onClick={(e) => e.stopPropagation()}
      >
        {/* 头部 */}
        <div className="flex items-center justify-between border-b border-[#e7eaf2] bg-[#f8faff] px-3 py-2 dark:border-[#273149] dark:bg-[#192238]">
          <div className="flex items-center gap-1.5">
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
          <button
            onClick={onClose}
            aria-label="关闭"
            className="cursor-pointer rounded p-1 text-[#68718a] transition-colors hover:bg-[#f3f5fb] hover:text-[#121729] dark:text-[#a7b0c8] dark:hover:bg-[#192238] dark:hover:text-[#edf1ff]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* 内容 */}
        <div className="max-h-[52vh] overflow-y-auto p-3">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div>
              <h3 className="text-lg font-extrabold tracking-[-0.01em] text-[#121729] dark:text-[#edf1ff]">
                {entry?.display_form || rawText}
              </h3>
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
              <p className="text-sm font-medium leading-relaxed text-[#121729] dark:text-[#edf1ff]">
                {entry.definition}
              </p>

              {entry.example_html && (
                <div
                  className="novel-popover-example mt-2 rounded-lg bg-[#f8faff] p-2 text-sm leading-relaxed text-[#3c4459] dark:bg-[#192238] dark:text-[#c5cce0]"
                  dangerouslySetInnerHTML={{ __html: sanitizeNovelHtml(entry.example_html) }}
                />
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  onClick={() => speak(entry.display_form)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e7eaf2] bg-white px-3 py-1.5 text-xs font-semibold text-[#2d39bb] transition-all duration-200 hover:border-[#6550ff]/40 hover:bg-[#f8faff] dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#bcc5ff]"
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  发音
                </button>
                {onToggleNotebook && (
                  <button
                    onClick={handleToggleNotebook}
                    className={cn(
                      'flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all duration-200',
                      notebook
                        ? 'bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] text-white'
                        : 'border border-[#e7eaf2] bg-white text-[#121729] hover:border-[#6550ff]/40 hover:bg-[#f8faff] dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#edf1ff]'
                    )}
                  >
                    {notebook ? <BookmarkCheck className="h-3.5 w-3.5" /> : <BookmarkPlus className="h-3.5 w-3.5" />}
                    {notebook ? '已在生词本' : '加入生词本'}
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="py-4 text-center text-sm text-[#68718a] dark:text-[#a7b0c8]">
              暂无释义：该词不在本书词库中
            </p>
          )}
        </div>
      </div>
    </>
  )
}
