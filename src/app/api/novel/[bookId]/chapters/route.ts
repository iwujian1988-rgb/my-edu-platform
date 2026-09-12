/**
 * 小说章节列表 API（无正文）
 *
 * GET /api/novel/[bookId]/chapters
 * 返回章号/标题/新词数。正文必须走 chapters/[num]（正文卡点同权限）。
 * 无权限一律 404，不泄露书的存在性。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccess } from '@/lib/novel-permissions'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await hasNovelAccess(user.id, bookId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('novel_chapters')
      .select('chapter_number, title, new_word_count, is_published')
      .eq('book_id', bookId)
      .eq('is_published', true)
      .order('chapter_number', { ascending: true })

    if (error) {
      console.error('[novel chapters] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[novel chapters] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
