/**
 * 小说目录页（/read/[bookId]）
 *
 * 权限卡点：未登录/无套餐 → notFound()（完全隐藏，不泄露存在性）
 */

import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccessForBook } from '@/lib/novel-permissions'
import { ChapterIndexClient } from '@/components/novel/ChapterIndexClient'

export const dynamic = 'force-dynamic'

export default async function NovelIndexPage({
  params,
}: {
  params: Promise<{ bookId: string }>
}) {
  const { bookId } = await params

  const supabase = await createClient()
  const admin = await createAdminClient()

  // getUser + 书行 + 章节列表并行，权限判定只补 user 行一次往返
  const [{ data: { user } }, bookRes, chaptersRes] = await Promise.all([
    supabase.auth.getUser(),
    admin
      .from('books')
      .select('id, title, description, total_chapters, is_novel, is_published, package_ids')
      .eq('id', bookId)
      .maybeSingle(),
    admin
      .from('novel_chapters')
      .select('chapter_number, title, new_word_count')
      .eq('book_id', bookId)
      .eq('is_published', true)
      .order('chapter_number', { ascending: true }),
  ])

  const book = bookRes.data
  if (!user || !book || !(await hasNovelAccessForBook(user.id, book))) {
    notFound()
  }

  return (
    <ChapterIndexClient
      bookId={bookId}
      bookTitle={book.title}
      description={book.description}
      chapters={chaptersRes.data || []}
    />
  )
}
