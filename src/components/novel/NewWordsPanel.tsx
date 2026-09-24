'use client'

/**
 * 章末"本章词汇"面板
 *
 * 新词（首现，服务端 novel_words 直出）+ 复现（阅读器从正文标记+词典推导），
 * 点击弹卡（同正文点词），底部入口跳小说专属词卡复习（range=chapter，牌组=新词）。
 */

import { Star, ArrowRight, Undo2 } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import type { NovelWord } from '@/types/novel'
export type { NovelWord } from '@/types/novel'

/** 复现词：以前章节学过、本章正文再次出现的词 */
export interface ReappearanceWord {
  form: string
  lemma: string
  phonetic: string | null
  pos: string | null
  gender: string | null
  definition: string
  cefr: string | null
  chapterFirst: number | null
}

interface NewWordsPanelProps {
  bookId: string
  chapter: number
  words: NovelWord[]
  reappearances?: ReappearanceWord[]
  onWordClick?: (word: NovelWord) => void
  onReappearanceClick?: (word: ReappearanceWord) => void
}

const CEFR_STYLE: Record<string, string> = {
  A1: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  A2: 'bg-teal-50 text-teal-700 dark:bg-teal-500/10 dark:text-teal-400',
  B1: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-400',
  B2: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400',
  C1: 'bg-purple-50 text-purple-700 dark:bg-purple-500/10 dark:text-purple-400',
}

export function NewWordsPanel({
  bookId,
  chapter,
  words,
  reappearances = [],
  onWordClick,
  onReappearanceClick,
}: NewWordsPanelProps) {
  if ((!words || words.length === 0) && reappearances.length === 0) return null

  const starCount = words.filter((w) => w.star).length

  return (
    <section className="mt-12 rounded-[12px] border border-[#e7eaf2] bg-white p-4 shadow-[0_9px_24px_rgba(31,42,104,0.06)] md:p-6 dark:border-[#273149] dark:bg-[#141b2d]">
      <div className="mb-4 flex items-center justify-between gap-2">
        <h2 className="text-base font-extrabold tracking-[-0.01em] text-[#121729] md:text-lg dark:text-[#edf1ff]">
          本章词汇
          <span className="ml-2 text-sm font-semibold text-[#68718a] dark:text-[#a7b0c8]">
            {words.length > 0 ? `新词 ${words.length} 个` : ''}
            {reappearances.length > 0 && `${words.length > 0 ? ' · ' : ''}复现 ${reappearances.length} 个`}
            {starCount > 0 && ` · ★核心 ${starCount}`}
          </span>
        </h2>
      </div>

      {words.length > 0 && (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {words.map((w) => (
            <button
              key={`${w.chapter_number}-${w.word}`}
              onClick={() => onWordClick?.(w)}
              className="group flex cursor-pointer items-start justify-between gap-2 rounded-lg border border-transparent bg-[#f8faff] px-3 py-2.5 text-left transition-all duration-200 hover:border-[#6550ff]/30 hover:bg-[#f3f5fb] dark:bg-[#192238] dark:hover:bg-[#1c2540]"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-semibold text-[#121729] dark:text-[#edf1ff]">{w.word}</span>
                  {w.star && <Star className="h-3 w-3 fill-amber-400 text-amber-400" />}
                  {w.cefr && (
                    <span
                      className={cn(
                        'rounded px-1 py-px text-[10px] font-bold',
                        CEFR_STYLE[w.cefr] || 'bg-[#f3f5fb] text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]'
                      )}
                    >
                      {w.cefr}
                    </span>
                  )}
                  {w.gender && (
                    <span className="text-[10px] text-[#68718a] dark:text-[#a7b0c8]">
                      {w.gender === 'f' ? 'n.f.' : 'n.m.'}
                    </span>
                  )}
                </div>
                <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#68718a] dark:text-[#a7b0c8]">
                  {w.definition}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}

      {reappearances.length > 0 && (
        <>
          <div className={cn('mb-2 flex items-center gap-1.5 text-xs font-bold text-[#68718a] dark:text-[#a7b0c8]', words.length > 0 && 'mt-5')}>
            <Undo2 className="h-3.5 w-3.5" />
            以前学过，这章又用出来了
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {reappearances.map((w) => (
              <button
                key={`reap-${w.lemma}`}
                onClick={() => onReappearanceClick?.(w)}
                className="group flex cursor-pointer items-start justify-between gap-2 rounded-lg border border-transparent bg-[#f8fafc] px-3 py-2.5 text-left transition-all duration-200 hover:border-[#6550ff]/30 hover:bg-[#f3f5fb] dark:bg-[#161d31] dark:hover:bg-[#1c2540]"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-semibold text-[#3c4459] dark:text-[#c5cce0]">{w.lemma}</span>
                    {w.cefr && (
                      <span
                        className={cn(
                          'rounded px-1 py-px text-[10px] font-bold',
                          CEFR_STYLE[w.cefr] || 'bg-[#f3f5fb] text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]'
                        )}
                      >
                        {w.cefr}
                      </span>
                    )}
                    {w.gender && (
                      <span className="text-[10px] text-[#68718a] dark:text-[#a7b0c8]">
                        {w.gender === 'f' ? 'n.f.' : 'n.m.'}
                      </span>
                    )}
                    <span className="rounded bg-[#f3f5fb] px-1 py-px text-[10px] font-semibold text-[#68718a] dark:bg-[#192238] dark:text-[#a7b0c8]">
                      ↩ 第{w.chapterFirst}章
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#68718a] dark:text-[#a7b0c8]">
                    {w.definition}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {words.length > 0 && (
        <Link
          href={`/read/${bookId}/review?range=chapter&chapter=${chapter}`}
          className="mt-4 flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-gradient-to-br from-[#2633a8] via-[#3447dd] to-[#6550ff] px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
        >
          进词卡复习 · 本章
          <ArrowRight className="h-4 w-4" />
        </Link>
      )}
    </section>
  )
}
