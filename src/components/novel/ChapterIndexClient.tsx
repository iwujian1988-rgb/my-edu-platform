'use client'

/**
 * 小说目录页客户端（《落地》/read/[bookId]）
 *
 * - 继续阅读卡（断点续读：章号+%，带 ?p= 滚动恢复）
 * - 词卡复习 / 生词本 入口
 * - 章节列表（书签 📍 标记 + 仅看书签过滤 + 当前进度章高亮）
 */

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRight, RefreshCw, Bookmark, BookOpen, Play, BookmarkCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getNovelProgress } from '@/lib/readingProgress'

interface ChapterMeta {
  chapter_number: number
  title: string
  new_word_count: number
}

interface ChapterIndexClientProps {
  bookId: string
  bookTitle: string
  description?: string | null
  coverUrl?: string | null
  chapters: ChapterMeta[]
  /** 服务端随 RSC 下发的书签章号（免客户端往返） */
  initialBookmarks?: number[]
}

export function ChapterIndexClient({ bookId, bookTitle, description, coverUrl, chapters, initialBookmarks }: ChapterIndexClientProps) {
  const [resume, setResume] = useState<{ chapter: number; percent: number } | null>(null)
  const [resumeLoaded, setResumeLoaded] = useState(false)
  const [bookmarks, setBookmarks] = useState<number[]>(initialBookmarks || [])
  const [onlyBookmarks, setOnlyBookmarks] = useState(false)

  useEffect(() => {
    getNovelProgress(bookId).then((p) => {
      if (p) setResume({ chapter: p.chapter, percent: p.percent })
      setResumeLoaded(true)
    })
  }, [bookId])

  const totalWords = chapters.reduce((sum, c) => sum + (c.new_word_count || 0), 0)
  const visibleChapters = onlyBookmarks
    ? chapters.filter((c) => bookmarks.includes(c.chapter_number))
    : chapters

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] text-[#121729] dark:from-[#101626] dark:to-[#0c1120] dark:text-[#edf1ff]">
      <div className="mx-auto max-w-[880px] px-4 py-6 md:py-10">
        {/* 书头 */}
        <div className="mb-6 flex items-start gap-4">
          {coverUrl && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={coverUrl}
              alt={bookTitle}
              className="w-20 shrink-0 rounded-lg shadow-[0_12px_30px_rgba(31,42,104,0.25)] md:w-24"
            />
          )}
          <div className="min-w-0">
            <h1 className="text-2xl font-extrabold tracking-[-0.01em] md:text-3xl">{bookTitle}</h1>
            <p className="mt-2 text-sm text-[#68718a] dark:text-[#a7b0c8]">
              共 {chapters.length} 章 · {totalWords} 个新词 · 点正文蓝色词看释义
            </p>
            {description && (
              <p className="mt-2 line-clamp-2 text-sm text-[#68718a] dark:text-[#a7b0c8]">{description}</p>
            )}
          </div>
        </div>

        {/* 继续阅读卡 */}
        {resume && (
          <Link
            href={`/read/${bookId}/${resume.chapter}?p=${resume.percent}`}
            className="mb-4 flex cursor-pointer items-center justify-between gap-3 rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_9px_24px_rgba(31,42,104,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_rgba(31,42,104,0.10)] dark:border-[#273149] dark:bg-[#141b2d]"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff]">
                <Play className="ml-0.5 h-4 w-4 fill-white text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">继续阅读</p>
                <p className="truncate text-xs text-[#68718a] dark:text-[#a7b0c8]">
                  第 {resume.chapter} 章 · 已读 {resume.percent}%
                </p>
              </div>
            </div>
            <div className="w-24 shrink-0">
              <div className="h-1.5 rounded-full bg-[#f3f5fb] dark:bg-[#192238]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#2633a8] to-[#6550ff] transition-[width] duration-300"
                  style={{ width: `${resume.percent}%` }}
                />
              </div>
            </div>
          </Link>
        )}
        {!resume && resumeLoaded && chapters.length > 0 && (
          <Link
            href={`/read/${bookId}/1`}
            className="mb-4 flex cursor-pointer items-center justify-center gap-2 rounded-[12px] bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
          >
            <BookOpen className="h-4 w-4" />
            开始阅读
          </Link>
        )}

        {/* 三入口 */}
        <div className="mb-6 grid grid-cols-2 gap-3">
          <Link
            href={`/read/${bookId}/review`}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#e7eaf2] bg-white px-4 py-3 text-sm font-semibold text-[#121729] shadow-[0_9px_24px_rgba(31,42,104,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6550ff]/30 dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#edf1ff]"
          >
            <RefreshCw className="h-4 w-4 text-[#6550ff]" />
            词卡复习
          </Link>
          <Link
            href={`/read/${bookId}/review?range=notebook`}
            className="flex cursor-pointer items-center justify-center gap-2 rounded-[12px] border border-[#e7eaf2] bg-white px-4 py-3 text-sm font-semibold text-[#121729] shadow-[0_9px_24px_rgba(31,42,104,0.06)] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6550ff]/30 dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#edf1ff]"
          >
            <BookmarkCheck className="h-4 w-4 text-[#6550ff]" />
            生词本复习
          </Link>
        </div>

        {/* 章节列表 */}
        <div className="rounded-[12px] border border-[#e7eaf2] bg-white shadow-[0_9px_24px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d]">
          <div className="flex items-center justify-between border-b border-[#e7eaf2] px-4 py-3 dark:border-[#273149]">
            <h2 className="text-sm font-extrabold">目录</h2>
            {bookmarks.length > 0 && (
              <button
                onClick={() => setOnlyBookmarks((v) => !v)}
                className={cn(
                  'flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold transition-colors duration-200',
                  onlyBookmarks
                    ? 'bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] text-white'
                    : 'text-[#68718a] hover:bg-[#f3f5fb] dark:text-[#a7b0c8] dark:hover:bg-[#192238]'
                )}
              >
                <Bookmark className={cn('h-3.5 w-3.5', onlyBookmarks && 'fill-white')} />
                仅看书签 ({bookmarks.length})
              </button>
            )}
          </div>

          <div className="divide-y divide-[#e7eaf2] dark:divide-[#273149]">
            {visibleChapters.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-[#68718a] dark:text-[#a7b0c8]">
                还没有书签，读到喜欢的位置点顶栏 📍 收藏一下
              </p>
            )}
            {visibleChapters.map((c) => {
              const marked = bookmarks.includes(c.chapter_number)
              const isCurrent = resume?.chapter === c.chapter_number
              return (
                <Link
                  key={c.chapter_number}
                  href={`/read/${bookId}/${c.chapter_number}`}
                  prefetch={false}
                  className={cn(
                    'flex cursor-pointer items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-[#f8faff] dark:hover:bg-[#192238]',
                    isCurrent && 'bg-gradient-to-r from-[#2633a8]/5 to-[#6550ff]/5'
                  )}
                >
                  <span
                    className={cn(
                      'w-7 shrink-0 text-center text-xs font-bold',
                      isCurrent ? 'text-[#2d39bb] dark:text-[#bcc5ff]' : 'text-[#68718a] dark:text-[#a7b0c8]'
                    )}
                  >
                    {c.chapter_number.toString().padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-medium text-[#121729] dark:text-[#edf1ff]">
                    {c.title}
                  </span>
                  {c.new_word_count > 0 && (
                    <span className="shrink-0 rounded bg-[#f3f5fb] px-1.5 py-0.5 text-[10px] font-semibold text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                      {c.new_word_count} 词
                    </span>
                  )}
                  {isCurrent && resume && (
                    <span className="shrink-0 text-[10px] font-bold text-[#6550ff]">{resume.percent}%</span>
                  )}
                  {marked && <Bookmark className="h-3.5 w-3.5 shrink-0 fill-[#6550ff] text-[#6550ff]" />}
                  <ChevronRight className="h-4 w-4 shrink-0 text-[#c8cede]" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
