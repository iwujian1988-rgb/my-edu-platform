/**
 * 小说词卡复习页（/read/[bookId]/review?range=chapter|notebook|star|all&chapter=N）
 *
 * 静态段 review 优先于动态段 [chapter]（Next.js 路由规则）。
 */

import { notFound, redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccessForBook } from '@/lib/novel-permissions'
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
  const admin = await createAdminClient()

  // getUser + 书行并行，权限判定只补 user 行一次往返
  const [{ data: { user } }, bookRes] = await Promise.all([
    supabase.auth.getUser(),
    admin
      .from('books')
      .select('id, title, is_novel, is_published, package_ids')
      .eq('id', bookId)
      .maybeSingle(),
  ])

  const book = bookRes.data
  if (!user) {
    const qs = new URLSearchParams()
    if (rangeParam) qs.set('range', rangeParam)
    if (chapterParam) qs.set('chapter', chapterParam)
    const s = qs.toString()
    redirect(`/login?redirect=${encodeURIComponent(`/read/${bookId}/review${s ? `?${s}` : ''}`)}`)
  }
  if (!book || !(await hasNovelAccessForBook(user.id, book))) {
    notFound()
  }

  const range = (rangeParam && VALID_RANGES.has(rangeParam) ? rangeParam : 'all') as ReviewRange
  const chapter = chapterParam ? parseInt(chapterParam, 10) : undefined

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
