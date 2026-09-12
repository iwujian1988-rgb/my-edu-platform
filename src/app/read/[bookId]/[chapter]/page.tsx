/**
 * 小说阅读页（/read/[bookId]/[chapter]?p=百分比）
 *
 * 服务端取正文（admin client，绕 RLS）+ 权限卡点；
 * ?p= 由目录"继续阅读"带入，阅读器挂载后滚到上次位置。
 */

import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccess } from '@/lib/novel-permissions'
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
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await hasNovelAccess(user.id, bookId))) {
    notFound()
  }

  const admin = await createAdminClient()

  const { data: chapter } = await admin
    .from('novel_chapters')
    .select('chapter_number, title, content_html, new_word_count, is_published')
    .eq('book_id', bookId)
    .eq('chapter_number', chapterNumber)
    .maybeSingle()

  if (!chapter || !chapter.is_published) notFound()

  const { data: newWords } = await admin
    .from('novel_words')
    .select('chapter_number, word, phonetic, definition, part_of_speech, gender, cefr, theme, star, order_index, example_sentence')
    .eq('book_id', bookId)
    .eq('chapter_number', chapterNumber)
    .order('order_index', { ascending: true })

  const { data: book } = await admin
    .from('books')
    .select('total_chapters')
    .eq('id', bookId)
    .single()

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
      newWords={newWords || []}
      initialPercent={initialPercent}
    />
  )
}
