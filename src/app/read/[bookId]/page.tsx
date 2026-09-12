/**
 * 小说目录页（/read/[bookId]）
 *
 * 权限卡点：未登录/无套餐 → notFound()（完全隐藏，不泄露存在性）
 */

import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccess } from '@/lib/novel-permissions'
import { ChapterIndexClient } from '@/components/novel/ChapterIndexClient'

export const dynamic = 'force-dynamic'

export default async function NovelIndexPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await hasNovelAccess(user.id, bookId))) {
    notFound()
  }

  const admin = await createAdminClient()

  const { data: book } = await admin
    .from('books')
    .select('id, title, description, total_chapters')
    .eq('id', bookId)
    .maybeSingle()

  if (!book) notFound()

  const { data: chapters } = await admin
    .from('novel_chapters')
    .select('chapter_number, title, new_word_count')
    .eq('book_id', bookId)
    .eq('is_published', true)
    .order('chapter_number', { ascending: true })

  return (
    <ChapterIndexClient
      bookId={bookId}
      bookTitle={book.title}
      description={book.description}
      chapters={chapters || []}
    />
  )
}
