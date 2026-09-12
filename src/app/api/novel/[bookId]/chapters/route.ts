/**
 * 小说章节列表 API（无正文）
 *
 * GET /api/novel/[bookId]/chapters
 * 返回章号/标题/新词数。正文必须走 chapters/[num]（正文卡点同权限）。
 * 无权限一律 404，不泄露书的存在性。
 * ETag + 304：章节列表仅重新导入时变化，重复进入走浏览器缓存（同 lexicon）。
 */

import { NextRequest, NextResponse } from 'next/server'
import { createHash } from 'crypto'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccess } from '@/lib/novel-permissions'

const CACHE_HEADERS = {
  'Cache-Control': 'private, max-age=86400',
}

export async function GET(
  request: NextRequest,
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

    const body = JSON.stringify({ data })
    const etag = `"${createHash('sha1').update(body).digest('hex').slice(0, 32)}"`

    if (request.headers.get('if-none-match') === etag) {
      return new NextResponse(null, { status: 304, headers: { ETag: etag, ...CACHE_HEADERS } })
    }

    return new NextResponse(body, {
      status: 200,
      headers: { 'Content-Type': 'application/json', ETag: etag, ...CACHE_HEADERS },
    })
  } catch (error) {
    console.error('[novel chapters] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
