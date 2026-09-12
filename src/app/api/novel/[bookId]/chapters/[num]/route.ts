/**
 * 小说章节正文 API（付费内容卡点）
 *
 * GET /api/novel/[bookId]/chapters/[num]
 * 正文 content_html 唯一下发口。无权限 404 不泄露存在性。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccess } from '@/lib/novel-permissions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string; num: string }> }
) {
  try {
    const { bookId, num } = await params
    const chapterNumber = parseInt(num, 10)
    if (!Number.isInteger(chapterNumber) || chapterNumber < 1) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await hasNovelAccess(user.id, bookId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('novel_chapters')
      .select('chapter_number, title, content_html, new_word_count')
      .eq('book_id', bookId)
      .eq('chapter_number', chapterNumber)
      .eq('is_published', true)
      .maybeSingle()

    if (error) {
      console.error('[novel chapter] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[novel chapter] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
