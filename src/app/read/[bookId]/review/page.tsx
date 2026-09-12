/**
 * 小说词卡复习页（/read/[bookId]/review?range=chapter|notebook|star|all&chapter=N）
 *
 * 静态段 review 优先于动态段 [chapter]（Next.js 路由规则）。
 */

import { notFound } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccess } from '@/lib/novel-permissions'
import { ReviewClient, type ReviewRange } from '@/components/novel/ReviewClient'

export const dynamic = 'force-dynamic'

const VALID_RANGES = new Set(['chapter', 'notebook', 'star', 'all'])

export default async function NovelReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ bookId: string }>
  searchParams: Promise<{ range?: string; chapter?: string }>
}) {
  const { bookId } = await params
  const { range: rangeParam, chapter: chapterParam } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !(await hasNovelAccess(user.id, bookId))) {
    notFound()
  }

  const range = (rangeParam && VALID_RANGES.has(rangeParam) ? rangeParam : 'all') as ReviewRange
  const chapter = chapterParam ? parseInt(chapterParam, 10) : undefined

  const admin = await createAdminClient()
  const { data: book } = await admin
    .from('books')
    .select('id, title')
    .eq('id', bookId)
    .maybeSingle()

  if (!book) notFound()

  // 阅读进度章（服务端直查，getNovelProgress 是浏览器实现不能在此用）
  const { data: pref } = await admin
    .from('user_book_preferences')
    .select('last_reading_progress')
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .maybeSingle()
  const saved = (pref as any)?.last_reading_progress
  const progressChapter =
    saved?.type === 'novel' && saved.novelBookId === bookId ? (saved.chapter as number) : undefined

  return (
    <ReviewClient
      bookId={bookId}
      bookTitle={book.title}
      range={range}
      chapter={Number.isInteger(chapter) ? chapter : undefined}
      progressChapter={progressChapter}
    />
  )
}
