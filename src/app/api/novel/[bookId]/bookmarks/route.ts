/**
 * 小说书签 API（每章一个，📍 开关式）
 *
 * GET    /api/novel/[bookId]/bookmarks           → 全部书签
 * POST   /api/novel/[bookId]/bookmarks { chapter, percent } → upsert
 * DELETE /api/novel/[bookId]/bookmarks?chapter=N  → 移除
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
      .from('novel_bookmarks')
      .select('chapter_number, scroll_percent, created_at')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .order('chapter_number', { ascending: true })

    if (error) {
      console.error('[novel bookmarks GET] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('[novel bookmarks GET] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(
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

    const body = await request.json()
    const chapter = Number(body?.chapter)
    const percent = Number(body?.percent)
    if (!Number.isInteger(chapter) || chapter < 1 || !Number.isFinite(percent) || percent < 0 || percent > 100) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    const admin = await createAdminClient()
    const { error } = await admin
      .from('novel_bookmarks')
      .upsert({
        user_id: user.id,
        book_id: bookId,
        chapter_number: chapter,
        scroll_percent: Math.round(percent * 100) / 100,
      }, { onConflict: 'user_id,book_id,chapter_number' })

    if (error) {
      console.error('[novel bookmarks POST] Error:', error)
      return NextResponse.json({ error: 'Failed to save bookmark' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[novel bookmarks POST] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const chapterParam = new URL(request.url).searchParams.get('chapter')
    const chapter = parseInt(chapterParam || '', 10)
    if (!Number.isInteger(chapter) || chapter < 1) {
      return NextResponse.json({ error: 'Bad request' }, { status: 400 })
    }

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await hasNovelAccess(user.id, bookId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const admin = await createAdminClient()
    const { error } = await admin
      .from('novel_bookmarks')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('chapter_number', chapter)

    if (error) {
      console.error('[novel bookmarks DELETE] Error:', error)
      return NextResponse.json({ error: 'Failed to delete bookmark' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[novel bookmarks DELETE] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
