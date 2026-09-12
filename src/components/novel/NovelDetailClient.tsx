'use client'

/**
 * 小说书详情页（《落地》/library/[bookId] 的 is_novel 分支）
 *
 * 词书详情巨石不动，小说书渲染独立入口页：
 * 继续阅读（断点续读）+ 目录/词卡复习/生词本 三入口。
 * 视觉：videos MaxTube token。
 */

import Link from 'next/link'
import { ChevronLeft, Play, BookOpen, RefreshCw, BookmarkCheck } from 'lucide-react'

interface NovelDetailClientProps {
  bookId: string
  title: string
  description: string | null
  totalChapters: number
  totalWords: number
  novelProgress?: { chapter: number; percent: number } | null
}

export function NovelDetailClient({
  bookId,
  title,
  description,
  totalChapters,
  totalWords,
  novelProgress,
}: NovelDetailClientProps) {
  const resumeHref = novelProgress
    ? `/read/${bookId}/${novelProgress.chapter}?p=${novelProgress.percent}`
    : `/read/${bookId}/1`

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#fbfcff] to-[#f7f9fd] text-[#121729] dark:from-[#101626] dark:to-[#0c1120] dark:text-[#edf1ff]">
      <div className="mx-auto max-w-[880px] px-4 py-6 md:py-10">
        {/* 返回 */}
        <Link
          href="/library"
          className="mb-5 inline-flex cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-[#68718a] transition-colors hover:bg-[#f3f5fb] hover:text-[#121729] dark:text-[#a7b0c8] dark:hover:bg-[#192238] dark:hover:text-[#edf1ff]"
        >
          <ChevronLeft className="h-4 w-4" />
          书库
        </Link>

        {/* 书籍卡 */}
        <div className="rounded-[12px] border border-[#e7eaf2] bg-white p-5 shadow-[0_9px_24px_rgba(31,42,104,0.06)] md:p-7 dark:border-[#273149] dark:bg-[#141b2d]">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
            {/* 封面占位（后期作图直接走 cover_url，此处大字渐变兜底） */}
            <div className="mx-auto flex h-44 w-32 shrink-0 flex-col items-center justify-center rounded-[12px] bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] p-3 text-white shadow-[0_12px_30px_rgba(45,57,187,0.35)] sm:mx-0">
              <span className="text-3xl font-extrabold leading-tight">{title.slice(1, 3) || title.slice(0, 2)}</span>
              <span className="mt-1 text-[10px] tracking-widest opacity-80">TCF NOUVELLE</span>
            </div>

            <div className="min-w-0 flex-1 text-center sm:text-left">
              <h1 className="text-2xl font-extrabold tracking-[-0.01em] md:text-3xl">{title}</h1>
              <div className="mt-2 flex flex-wrap justify-center gap-1.5 sm:justify-start">
                <span className="rounded bg-[#f3f5fb] px-2 py-0.5 text-xs font-semibold text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                  {totalChapters} 章
                </span>
                <span className="rounded bg-[#f3f5fb] px-2 py-0.5 text-xs font-semibold text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                  {totalWords} 新词
                </span>
                <span className="rounded bg-[#f3f5fb] px-2 py-0.5 text-xs font-semibold text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                  法语分级爽文
                </span>
              </div>
              {description && (
                <p className="mt-3 line-clamp-4 text-sm leading-relaxed text-[#68718a] dark:text-[#a7b0c8]">
                  {description}
                </p>
              )}
            </div>
          </div>

          {/* 主 CTA：继续阅读 / 开始阅读 */}
          <Link
            href={resumeHref}
            className="mt-6 flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-4 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:-translate-y-0.5 hover:opacity-95"
          >
            <Play className="h-4 w-4 fill-white" />
            {novelProgress
              ? `继续阅读 · 第 ${novelProgress.chapter} 章（已读 ${novelProgress.percent}%）`
              : '开始阅读 · 第 1 章'}
          </Link>

          {/* 三入口 */}
          <div className="mt-3 grid grid-cols-3 gap-2">
            <Link
              href={`/read/${bookId}`}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-[#e7eaf2] px-3 py-2.5 text-xs font-semibold text-[#121729] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6550ff]/30 dark:border-[#273149] dark:text-[#edf1ff]"
            >
              <BookOpen className="h-4 w-4 text-[#6550ff]" />
              目录
            </Link>
            <Link
              href={`/read/${bookId}/review`}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-[#e7eaf2] px-3 py-2.5 text-xs font-semibold text-[#121729] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6550ff]/30 dark:border-[#273149] dark:text-[#edf1ff]"
            >
              <RefreshCw className="h-4 w-4 text-[#6550ff]" />
              词卡复习
            </Link>
            <Link
              href={`/read/${bookId}/review?range=notebook`}
              className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-[#e7eaf2] px-3 py-2.5 text-xs font-semibold text-[#121729] transition-all duration-200 hover:-translate-y-0.5 hover:border-[#6550ff]/30 dark:border-[#273149] dark:text-[#edf1ff]"
            >
              <BookmarkCheck className="h-4 w-4 text-[#6550ff]" />
              生词本
            </Link>
          </div>
        </div>

        {/* 玩法提示 */}
        <div className="mt-4 rounded-[12px] border border-[#e7eaf2] bg-white p-4 text-sm text-[#68718a] shadow-[0_9px_24px_rgba(31,42,104,0.06)] dark:border-[#273149] dark:bg-[#141b2d] dark:text-[#a7b0c8]">
          <p className="mb-1.5 font-bold text-[#121729] dark:text-[#edf1ff]">怎么读</p>
          <p>正文里<span className="font-semibold text-[#2d39bb] dark:text-[#bcc5ff]">蓝色词</span>是本书词库里的词，点一下弹出释义和发音，还能加进生词本。读到哪章哪屏，下次自动接着读。</p>
        </div>
      </div>
    </div>
  )
}
