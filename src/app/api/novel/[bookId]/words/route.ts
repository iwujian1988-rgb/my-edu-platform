/**
 * 小说新词 API（词卡数据源）
 *
 * GET /api/novel/[bookId]/words                  → 全书词（按章/序）
 * GET /api/novel/[bookId]/words?chapter=N        → 某章新词（章末面板/本章复习）
 * GET /api/novel/[bookId]/words?star=true        → ★核心词（全部章）
 * GET /api/novel/[bookId]/words?notebook=true    → 生词本（进度 join 词面）
 *
 * 返回统一 shape：{ words: NovelWord[], progress?: Record<lemma, NovelProgress> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { hasNovelAccess } from '@/lib/novel-permissions'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const { searchParams } = new URL(request.url)
    const chapterParam = searchParams.get('chapter')
    const starOnly = searchParams.get('star') === 'true'
    const notebookOnly = searchParams.get('notebook') === 'true'

    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !(await hasNovelAccess(user.id, bookId))) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const admin = await createAdminClient()

    // 生词本：进度行（in_notebook）为主，join 词面
    if (notebookOnly) {
      const { data: progressRows, error: pError } = await admin
        .from('novel_word_progress')
        .select('lemma, status, in_notebook, next_review_at, repetition_count, easiness_factor')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('in_notebook', true)

      if (pError) {
        console.error('[novel words notebook] Progress error:', pError)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      const lemmas = (progressRows || []).map((r: any) => r.lemma)
      if (lemmas.length === 0) {
        return NextResponse.json({ data: { words: [], progress: {} } })
      }

      const { data: words, error: wError } = await admin
        .from('novel_words')
        .select('chapter_number, word, phonetic, definition, part_of_speech, gender, cefr, theme, star, order_index, example_sentence')
        .eq('book_id', bookId)
        .in('word', lemmas)
        .order('chapter_number', { ascending: true })

      if (wError) {
        console.error('[novel words notebook] Words error:', wError)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      const progress: Record<string, unknown> = {}
      for (const row of progressRows || []) progress[row.lemma] = row

      return NextResponse.json({ data: { words: words || [], progress } })
    }

    // 词面查询：全书 / 某章 / ★核心
    let query = admin
      .from('novel_words')
      .select('chapter_number, word, phonetic, definition, part_of_speech, gender, cefr, theme, star, order_index, example_sentence')
      .eq('book_id', bookId)

    if (chapterParam) {
      const chapter = parseInt(chapterParam, 10)
      if (!Number.isInteger(chapter) || chapter < 1) {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 })
      }
      query = query.eq('chapter_number', chapter)
    }
    if (starOnly) {
      query = query.eq('star', true)
    }

    const { data: words, error } = await query
      .order('chapter_number', { ascending: true })
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[novel words] Error:', error)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    return NextResponse.json({ data: { words: words || [] } })
  } catch (error) {
    console.error('[novel words] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
