'use client'

/**
 * 小说阅读器（《落地》/read/[bookId]/[chapter]）
 *
 * - 正文 dangerouslySetInnerHTML（先过 novelSanitize 白名单）
 * - 点词：onClick 委托 closest('b.fw') → data-w 查 lexicon Map → WordPopover
 * - 断点续读：每 30s + 翻章离开 + 页面隐藏时 saveNovelProgress（章号+%）
 * - 书签：每章一个（📍 开关），记录滚动 %
 * - 字号：Aa 菜单，localStorage 持久化
 * - 显示模式：Aa 菜单（中法对照 / 隐藏中文注释 / 隐藏法语词），localStorage 持久化
 * - 布局：移动全屏沉浸（sticky 顶栏 + 底部上/下章条）；PC lg: 双栏 + sticky 侧栏
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, Bookmark, Type, List, ArrowRight, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'
import { sanitizeNovelHtml, wrapZhGlosses } from '@/lib/novelSanitize'
import { normForm } from '@/lib/novel-forms'
import { saveNovelProgress } from '@/lib/readingProgress'
import { WordPopover, type LexiconEntry } from './WordPopover'
import { NewWordsPanel, type NovelWord } from './NewWordsPanel'

interface NovelReaderProps {
  bookId: string
  totalChapters: number
  chapter: { number: number; title: string; contentHtml: string }
  newWords: NovelWord[]
  /** 从目录"继续阅读"进入时带回的滚动位置（%） */
  initialPercent?: number
}

const FONT_KEY = 'novel-font-size'
const FONT_SIZES = [15, 16, 17, 18, 19, 20, 21, 22]

/** 显示模式：中法对照 / 隐藏中文注释 / 隐藏法语词 */
type DisplayMode = 'all' | 'hide-zh' | 'hide-fr'
const DISPLAY_KEY = 'novel-display-mode'
const DISPLAY_MODES: Array<{ id: DisplayMode; name: string }> = [
  { id: 'all', name: '中法对照' },
  { id: 'hide-zh', name: '隐藏中文' },
  { id: 'hide-fr', name: '隐藏法语' },
]

interface ChapterMeta {
  chapter_number: number
  title: string
  new_word_count: number
}

interface BookmarkRow {
  chapter_number: number
  scroll_percent: number
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

export function NovelReader({ bookId, totalChapters, chapter, newWords, initialPercent }: NovelReaderProps) {
  const [fontSize, setFontSize] = useState(17)
  const [fontMenuOpen, setFontMenuOpen] = useState(false)
  const [displayMode, setDisplayMode] = useState<DisplayMode>('all')
  const [percent, setPercent] = useState(0)
  const [lexiconMap, setLexiconMap] = useState<Map<string, LexiconEntry> | null>(null)
  const [chapters, setChapters] = useState<ChapterMeta[]>([])
  const [bookmarks, setBookmarks] = useState<BookmarkRow[]>([])
  const [notebookSet, setNotebookSet] = useState<Set<string>>(new Set())
  const [popover, setPopover] = useState<{
    entry: LexiconEntry | null
    raw: string
    x: number
    y: number
  } | null>(null)

  const percentRef = useRef(0)
  const rafRef = useRef<number | null>(null)

  const hasPrev = chapter.number > 1
  const hasNext = chapter.number < totalChapters
  const chapterBookmark = bookmarks.find((b) => b.chapter_number === chapter.number)

  // 字号 / 显示模式恢复
  useEffect(() => {
    const saved = parseInt(localStorage.getItem(FONT_KEY) || '', 10)
    if (FONT_SIZES.includes(saved)) setFontSize(saved)
    const savedMode = localStorage.getItem(DISPLAY_KEY)
    if (savedMode === 'hide-zh' || savedMode === 'hide-fr') setDisplayMode(savedMode)
  }, [])

  // 词表 + 章节目录 + 书签 + 生词本一次性预载
  useEffect(() => {
    fetch(`/api/novel/${bookId}/lexicon`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        const map = new Map<string, LexiconEntry>()
        for (const row of json.data || []) map.set(row.form_key, row)
        setLexiconMap(map)
      })
      .catch(() => setLexiconMap(new Map()))

    fetch(`/api/novel/${bookId}/chapters`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setChapters(json.data || []))
      .catch(() => {})

    fetch(`/api/novel/${bookId}/bookmarks`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => setBookmarks(json.data || []))
      .catch(() => {})

    fetch(`/api/novel/${bookId}/progress`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((json) => {
        setNotebookSet(
          new Set((json.data || []).filter((p: any) => p.in_notebook).map((p: any) => p.lemma as string))
        )
      })
      .catch(() => {})
  }, [bookId])

  // 滚动进度
  useEffect(() => {
    const onScroll = () => {
      if (rafRef.current) return
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        const doc = document.documentElement
        const total = doc.scrollHeight - window.innerHeight
        const p = total > 0 ? Math.min(100, Math.max(0, (window.scrollY / total) * 100)) : 0
        percentRef.current = p
        setPercent(p)
      })
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [])

  // 断点续读：继续阅读进入时滚到上次位置
  useEffect(() => {
    window.scrollTo(0, 0)
    if (initialPercent && initialPercent > 2 && initialPercent < 100) {
      const doc = document.documentElement
      const total = doc.scrollHeight - window.innerHeight
      if (total > 0) {
        requestAnimationFrame(() => {
          window.scrollTo({ top: (total * initialPercent) / 100 })
        })
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 每 30s 保存阅读进度
  useEffect(() => {
    const timer = setInterval(() => {
      if (percentRef.current > 0) {
        saveNovelProgress(bookId, chapter.number, percentRef.current)
      }
    }, 30_000)
    return () => clearInterval(timer)
  }, [bookId, chapter.number])

  // 离开页面 / 组件卸载时保存
  useEffect(() => {
    const save = () => {
      if (percentRef.current > 0) {
        void saveNovelProgress(bookId, chapter.number, percentRef.current)
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') save()
    }
    window.addEventListener('pagehide', save)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      save()
      window.removeEventListener('pagehide', save)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [bookId, chapter.number])

  // 正文点词（事件委托）
  const handleArticleClick = (e: React.MouseEvent) => {
    const el = (e.target as HTMLElement).closest?.('b.fw') as HTMLElement | null
    if (!el) return
    const raw = el.getAttribute('data-w') || el.textContent || ''
    const entry = lexiconMap?.get(normForm(raw)) || null
    setPopover({ entry, raw, x: e.clientX, y: e.clientY })
  }

  // 章末新词面板点词（词条本身在词库，缺行时用面板数据合成）
  const handlePanelWordClick = (w: NovelWord, pos: { x: number; y: number }) => {
    const hit = lexiconMap?.get(normForm(w.word))
    const entry: LexiconEntry = hit || {
      form_key: normForm(w.word),
      lemma: w.word,
      display_form: w.word,
      phonetic: w.phonetic,
      pos: w.part_of_speech,
      gender: w.gender,
      definition: w.definition,
      cefr: w.cefr,
      scene: w.theme,
      example_html: w.example_sentence ? `<p>${escapeHtml(w.example_sentence)}</p>` : null,
      chapter_first: w.chapter_number,
      chapters: [w.chapter_number],
    }
    setPopover({ entry, raw: w.word, x: pos.x, y: pos.y })
  }

  // 生词本开关（乐观更新）
  const handleToggleNotebook = useCallback(
    (lemma: string, next: boolean) => {
      setNotebookSet((prev) => {
        const s = new Set(prev)
        if (next) s.add(lemma)
        else s.delete(lemma)
        return s
      })
      fetch(`/api/novel/${bookId}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'notebook', lemma, inNotebook: next }),
      }).catch(() => {})
    },
    [bookId]
  )

  // 书签开关（乐观更新）
  const toggleBookmark = () => {
    if (chapterBookmark) {
      setBookmarks((prev) => prev.filter((b) => b.chapter_number !== chapter.number))
      fetch(`/api/novel/${bookId}/bookmarks?chapter=${chapter.number}`, { method: 'DELETE' }).catch(() => {})
    } else {
      const p = Math.round(percentRef.current * 100) / 100
      setBookmarks((prev) => [...prev, { chapter_number: chapter.number, scroll_percent: p }])
      fetch(`/api/novel/${bookId}/bookmarks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chapter: chapter.number, percent: p }),
      }).catch(() => {})
    }
  }

  const applyFontSize = (size: number) => {
    setFontSize(size)
    localStorage.setItem(FONT_KEY, String(size))
    setFontMenuOpen(false)
  }

  const applyDisplayMode = (mode: DisplayMode) => {
    setDisplayMode(mode)
    localStorage.setItem(DISPLAY_KEY, mode)
  }

  const cleanHtml = wrapZhGlosses(sanitizeNovelHtml(chapter.contentHtml))

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] pb-24 text-[#121729] lg:pb-12 dark:from-[#101626] dark:to-[#0c1120] dark:text-[#edf1ff]">
      {/* 顶栏 */}
      <header className="sticky top-0 z-30 border-b border-[#e7eaf2] bg-white/95 backdrop-blur dark:border-[#273149] dark:bg-[#141b2d]/95">
        <div className="mx-auto flex h-14 max-w-[1140px] items-center justify-between gap-2 px-4">
          <Link
            href={`/read/${bookId}`}
            className="flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#68718a] transition-colors hover:bg-[#f3f5fb] hover:text-[#121729] dark:text-[#a7b0c8] dark:hover:bg-[#192238] dark:hover:text-[#edf1ff]"
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="hidden sm:inline">目录</span>
          </Link>

          <div className="min-w-0 flex-1 text-center">
            <p className="truncate text-sm font-bold">
              第 {chapter.number} 章 · {chapter.title}
            </p>
          </div>

          <div className="relative flex items-center gap-1">
            <button
              onClick={toggleBookmark}
              aria-label="书签"
              title={chapterBookmark ? '移除书签' : '添加书签'}
              className={cn(
                'cursor-pointer rounded-lg p-2 transition-colors',
                chapterBookmark
                  ? 'text-[#6550ff] hover:bg-[#f3f5fb]'
                  : 'text-[#68718a] hover:bg-[#f3f5fb] hover:text-[#121729] dark:text-[#a7b0c8] dark:hover:bg-[#192238] dark:hover:text-[#edf1ff]'
              )}
            >
              <Bookmark className={cn('h-5 w-5', chapterBookmark && 'fill-[#6550ff]')} />
            </button>
            <button
              onClick={() => setFontMenuOpen((v) => !v)}
              aria-label="字号与显示"
              className="cursor-pointer rounded-lg p-2 text-[#68718a] transition-colors hover:bg-[#f3f5fb] hover:text-[#121729] dark:text-[#a7b0c8] dark:hover:bg-[#192238] dark:hover:text-[#edf1ff]"
            >
              <Type className="h-5 w-5" />
            </button>

            {fontMenuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setFontMenuOpen(false)} />
                <div className="absolute right-0 top-11 z-20 flex w-56 flex-col gap-2 rounded-[12px] border border-[#e7eaf2] bg-white p-2.5 shadow-[0_12px_34px_rgba(31,42,104,0.14)] dark:border-[#273149] dark:bg-[#141b2d]">
                  <div>
                    <div className="mb-1 px-1 text-[11px] font-bold text-[#68718a] dark:text-[#a7b0c8]">字号</div>
                    <div className="grid w-full grid-cols-4 gap-1">
                      {FONT_SIZES.map((s) => (
                        <button
                          key={s}
                          onClick={() => applyFontSize(s)}
                          className={cn(
                            'cursor-pointer rounded-lg py-1.5 text-xs font-bold transition-all duration-200',
                            s === fontSize
                              ? 'bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] text-white'
                              : 'text-[#68718a] hover:bg-[#f3f5fb] dark:text-[#a7b0c8] dark:hover:bg-[#192238]'
                          )}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-[#e7eaf2] pt-2 dark:border-[#273149]">
                    <div className="mb-1 px-1 text-[11px] font-bold text-[#68718a] dark:text-[#a7b0c8]">显示</div>
                    <div className="grid w-full grid-cols-3 gap-1">
                      {DISPLAY_MODES.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => applyDisplayMode(m.id)}
                          className={cn(
                            'cursor-pointer rounded-lg px-1 py-1.5 text-[11px] font-bold transition-all duration-200',
                            m.id === displayMode
                              ? 'bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] text-white'
                              : 'text-[#68718a] hover:bg-[#f3f5fb] dark:text-[#a7b0c8] dark:hover:bg-[#192238]'
                          )}
                        >
                          {m.name}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
        {/* 阅读进度条 */}
        <div className="h-0.5 w-full bg-[#e7eaf2] dark:bg-[#273149]">
          <div
            className="h-full bg-gradient-to-r from-[#2633a8] to-[#6550ff] transition-[width] duration-300"
            style={{ width: `${percent}%` }}
          />
        </div>
      </header>

      {/* 主区：PC 双栏 */}
      <div className="mx-auto grid max-w-[1140px] grid-cols-1 gap-6 px-4 pt-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        {/* 正文 */}
        <main className="mx-auto w-full max-w-[760px]">
          <h1 className="mb-8 text-center text-xl font-extrabold tracking-[-0.01em] md:text-2xl">
            第 {chapter.number} 章 · {chapter.title}
          </h1>

          <article
            className="novel-content"
            data-mode={displayMode}
            style={{ fontSize: `${fontSize}px` }}
            onClick={handleArticleClick}
            dangerouslySetInnerHTML={{ __html: cleanHtml }}
          />

          <NewWordsPanel
            bookId={bookId}
            chapter={chapter.number}
            words={newWords}
            onWordClick={handlePanelWordClick}
          />

          {/* PC 上/下章 */}
          <div className="mt-8 hidden items-center justify-between gap-3 lg:flex">
            {hasPrev ? (
              <Link
                href={`/read/${bookId}/${chapter.number - 1}`}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-[#e7eaf2] bg-white px-5 py-2.5 text-sm font-semibold text-[#121729] shadow-[0_9px_24px_rgba(31,42,104,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(31,42,104,0.10)] dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#edf1ff]"
              >
                <ChevronLeft className="h-4 w-4" />
                上一章
              </Link>
            ) : (
              <span />
            )}
            {hasNext ? (
              <Link
                href={`/read/${bookId}/${chapter.number + 1}`}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-5 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
              >
                下一章
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <span className="text-sm text-[#68718a] dark:text-[#a7b0c8]">已是最新章</span>
            )}
          </div>
        </main>

        {/* PC 侧栏 */}
        <aside className="hidden lg:block">
          <div className="sticky top-[92px] space-y-4">
            {/* 目录 */}
            <div className="rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_9px_24px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d]">
              <div className="mb-3 flex items-center gap-1.5 text-sm font-extrabold text-[#121729] dark:text-[#edf1ff]">
                <List className="h-4 w-4 text-[#6550ff]" />
                目录
                <span className="text-xs font-semibold text-[#68718a] dark:text-[#a7b0c8]">
                  共 {totalChapters} 章
                </span>
              </div>
              <div className="max-h-[420px] space-y-0.5 overflow-y-auto pr-1">
                {chapters.map((c) => {
                  const marked = bookmarks.some((b) => b.chapter_number === c.chapter_number)
                  const current = c.chapter_number === chapter.number
                  return (
                    <Link
                      key={c.chapter_number}
                      href={`/read/${bookId}/${c.chapter_number}`}
                      className={cn(
                        'flex cursor-pointer items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-sm transition-colors duration-200',
                        current
                          ? 'bg-gradient-to-br from-[#2633a8]/10 to-[#6550ff]/10 font-bold text-[#2d39bb] dark:text-[#bcc5ff]'
                          : 'text-[#3c4459] hover:bg-[#f3f5fb] dark:text-[#c5cce0] dark:hover:bg-[#192238]'
                      )}
                    >
                      <span className="truncate">
                        {c.chapter_number.toString().padStart(2, '0')} {c.title}
                      </span>
                      {marked && <Bookmark className="h-3 w-3 shrink-0 fill-[#6550ff] text-[#6550ff]" />}
                    </Link>
                  )
                })}
              </div>
            </div>

            {/* 本章卡 */}
            <div className="rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_9px_24px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d]">
              <div className="mb-2 text-sm font-extrabold text-[#121729] dark:text-[#edf1ff]">本章</div>
              <div className="space-y-1.5 text-xs text-[#68718a] dark:text-[#a7b0c8]">
                <p>
                  新词 <span className="font-bold text-[#121729] dark:text-[#edf1ff]">{newWords.length}</span> 个
                </p>
                <p>
                  已读 <span className="font-bold text-[#121729] dark:text-[#edf1ff]">{Math.round(percent)}%</span>
                </p>
                {chapterBookmark && (
                  <p>
                    书签位置 <span className="font-bold text-[#121729] dark:text-[#edf1ff]">{Math.round(chapterBookmark.scroll_percent)}%</span>
                  </p>
                )}
              </div>
              <Link
                href={`/read/${bookId}/review?range=chapter&chapter=${chapter.number}`}
                className="mt-3 flex cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-[#e7eaf2] px-3 py-2 text-xs font-semibold text-[#2d39bb] transition-all duration-200 hover:border-[#6550ff]/40 hover:bg-[#f8faff] dark:border-[#273149] dark:text-[#bcc5ff] dark:hover:bg-[#192238]"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                词卡复习 · 本章
              </Link>
            </div>
          </div>
        </aside>
      </div>

      {/* 移动端底部上/下章 */}
      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[#e7eaf2] bg-white/95 backdrop-blur lg:hidden dark:border-[#273149] dark:bg-[#141b2d]/95">
        <div className="grid h-14 grid-cols-3">
          {hasPrev ? (
            <Link
              href={`/read/${bookId}/${chapter.number - 1}`}
              className="flex cursor-pointer items-center justify-center gap-1 text-sm font-semibold text-[#121729] transition-colors active:bg-[#f3f5fb] dark:text-[#edf1ff] dark:active:bg-[#192238]"
            >
              <ChevronLeft className="h-4 w-4" />
              上一章
            </Link>
          ) : (
            <span className="flex items-center justify-center gap-1 text-sm text-[#c8cede]">
              <ChevronLeft className="h-4 w-4" />
              上一章
            </span>
          )}
          <Link
            href={`/read/${bookId}`}
            className="flex cursor-pointer items-center justify-center border-x border-[#e7eaf2] text-sm font-semibold text-[#68718a] transition-colors active:bg-[#f3f5fb] dark:border-[#273149] dark:text-[#a7b0c8] dark:active:bg-[#192238]"
          >
            目录
          </Link>
          {hasNext ? (
            <Link
              href={`/read/${bookId}/${chapter.number + 1}`}
              className="flex cursor-pointer items-center justify-center gap-1 bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] text-sm font-semibold text-white"
            >
              下一章
              <ArrowRight className="h-4 w-4" />
            </Link>
          ) : (
            <span className="flex items-center justify-center text-sm text-[#c8cede]">已是最新章</span>
          )}
        </div>
      </nav>

      {/* 点词弹卡 */}
      {popover && (
        <WordPopover
          entry={popover.entry}
          rawText={popover.raw}
          position={{ x: popover.x, y: popover.y }}
          inNotebook={!!popover.entry && notebookSet.has(popover.entry.lemma)}
          onToggleNotebook={handleToggleNotebook}
          onClose={() => setPopover(null)}
        />
      )}
    </div>
  )
}
