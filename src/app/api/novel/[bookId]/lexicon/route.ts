/**
 * 小说点词词典 API（全量形态别名）
 *
 * GET /api/novel/[bookId]/lexicon
 * 客户端一次性预载到 Map（点词 0 延迟查释义）。
 * ETag + 304：重复会话零正文传输（词典仅在重新导入时变化）。
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
      .from('novel_lexicon')
      .select('form_key, lemma, display_form, phonetic, pos, gender, definition, cefr, scene, example_html, chapter_first, chapters')
      .eq('book_id', bookId)
      .order('chapter_first', { ascending: true })

    if (error) {
      console.error('[novel lexicon] Error:', error)
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
    console.error('[novel lexicon] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
