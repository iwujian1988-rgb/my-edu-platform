/**
 * 小说阅读页（/read/[bookId]/[chapter]?p=百分比）
 *
 * 服务端取正文（admin client，绕 RLS）+ 权限卡点；
 * ?p= 由目录"继续阅读"带入，阅读器挂载后滚到上次位置。
 */

import { notFound, redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccessForBook } from '@/lib/novel-permissions'
import { NovelReader } from '@/components/novel/NovelReader'

export const dynamic = 'force-dynamic'

export default async function NovelChapterPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string; chapter: string }>
  searchParams: Promise<{ p?: string }>
}) {
  const { bookId, chapter: chapterParam } = await params
  const { p } = await searchParams

  const chapterNumber = parseInt(chapterParam, 10)
  if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
    notFound()
  }

  const supabase = await createClient()
  const admin = await createAdminClient()

  // getUser + 章节 + 新词 + 书行并行，权限判定只补 user 行一次往返
  const [{ data: { user } }, chapterRes, wordsRes, bookRes] = await Promise.all([
    supabase.auth.getUser(),
    admin
      .from('novel_chapters')
      .select('chapter_number, title, content_html, new_word_count, is_published')
      .eq('book_id', bookId)
      .eq('chapter_number', chapterNumber)
      .maybeSingle(),
    admin
      .from('novel_words')
      .select('chapter_number, word, phonetic, definition, part_of_speech, gender, cefr, theme, star, order_index, example_sentence')
      .eq('book_id', bookId)
      .eq('chapter_number', chapterNumber)
      .order('order_index', { ascending: true }),
    admin
      .from('books')
      .select('total_chapters, is_novel, is_published, package_ids')
      .eq('id', bookId)
      .maybeSingle(),
  ])

  const chapter = chapterRes.data
  const book = bookRes.data
  if (!user) redirect(`/login?redirect=${encodeURIComponent(`/read/${bookId}/${chapterNumber}`)}`)
  if (!book || !chapter || !chapter.is_published) notFound()

  // 权限判定与书签/生词本并行（两者随 RSC 下发，省两次客户端往返）
  const [hasAccess, bookmarksRes, notebookRes] = await Promise.all([
    hasNovelAccessForBook(user.id, book),
    admin
      .from('novel_bookmarks')
      .select('chapter_number, scroll_percent')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .order('chapter_number', { ascending: true }),
    admin
      .from('novel_word_progress')
      .select('lemma')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('in_notebook', true),
  ])
  if (!hasAccess) notFound()

  const initialPercent = p ? Math.min(99, Math.max(0, parseInt(p, 10) || 0)) : undefined

  return (
    <NovelReader
      bookId={bookId}
      totalChapters={book?.total_chapters || chapterNumber}
      chapter={{
        number: chapter.chapter_number,
        title: chapter.title,
        contentHtml: chapter.content_html,
      }}
      newWords={wordsRes.data || []}
      initialPercent={initialPercent}
      initialBookmarks={bookmarksRes.data || []}
      initialNotebook={(notebookRes.data || []).map((r) => r.lemma)}
    />
  )
}
