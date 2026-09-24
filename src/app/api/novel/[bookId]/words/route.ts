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
import { normForm } from '@/lib/novel-forms'
import type { NovelWord } from '@/types/novel'

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

    // 生词本以 progress lemma 为准，并通过词典 lemma 回查词面；词形别名不要求与 word 字段完全相等。
    if (notebookOnly) {
      const { data: progressRows, error: pError } = await admin
        .from('novel_word_progress')
        .select('lemma, next_review_at, repetition_count')
        .eq('user_id', user.id)
        .eq('book_id', bookId)
        .eq('in_notebook', true)

      if (pError) {
        console.error('[novel words notebook] Progress error:', pError)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      const lemmas = (progressRows || []).map((row) => row.lemma)
      if (lemmas.length === 0) {
        return NextResponse.json({ data: { words: [], progress: {} } })
      }

      const [wordResult, lexiconResult] = await Promise.all([
        admin
          .from('novel_words')
          .select('chapter_number, word, phonetic, definition, part_of_speech, gender, cefr, theme, star, order_index, example_sentence')
          .eq('book_id', bookId)
          .in('word', lemmas)
          .order('chapter_number', { ascending: true }),
        admin
          .from('novel_lexicon')
          .select('lemma, display_form, phonetic, pos, gender, definition, cefr, scene, chapter_first')
          .eq('book_id', bookId)
          .in('lemma', lemmas)
          .order('chapter_first', { ascending: true }),
      ])

      if (wordResult.error || lexiconResult.error) {
        console.error('[novel words notebook] Word lookup error:', wordResult.error || lexiconResult.error)
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
      }

      const wordsByLemma = new Map<string, (typeof wordResult.data)[number]>()
      for (const word of wordResult.data || []) {
        const key = normForm(word.word)
        if (!wordsByLemma.has(key)) wordsByLemma.set(key, word)
      }
      const lexiconByLemma = new Map<string, (typeof lexiconResult.data)[number]>()
      for (const entry of lexiconResult.data || []) {
        const key = normForm(entry.lemma)
        if (!lexiconByLemma.has(key)) lexiconByLemma.set(key, entry)
      }

      const words: NovelWord[] = []
      const progress: Record<string, { next_review_at: string | null; repetition_count: number }> = {}
      const included = new Set<string>()
      for (const row of progressRows || []) {
        const key = normForm(row.lemma)
        if (included.has(key)) continue

        const chapterWord = wordsByLemma.get(key)
        const lexiconEntry = lexiconByLemma.get(key)
        // 忽略词库已删除后遗留的进度行，避免把失效词塞进复习队列。
        if (!chapterWord && !lexiconEntry) continue

        included.add(key)
        words.push(chapterWord ? {
          ...chapterWord,
          lemma: lexiconEntry?.lemma ?? row.lemma,
        } : {
          chapter_number: lexiconEntry?.chapter_first ?? 1,
          word: lexiconEntry?.lemma ?? row.lemma,
          lemma: lexiconEntry?.lemma ?? row.lemma,
          phonetic: lexiconEntry?.phonetic ?? null,
          definition: lexiconEntry?.definition ?? '',
          part_of_speech: lexiconEntry?.pos ?? null,
          gender: lexiconEntry?.gender ?? null,
          cefr: lexiconEntry?.cefr ?? null,
          theme: lexiconEntry?.scene ?? null,
          star: false,
          order_index: 0,
          example_sentence: null,
        })
        progress[key] = {
          next_review_at: row.next_review_at,
          repetition_count: row.repetition_count,
        }
      }

      return NextResponse.json({ data: { words, progress } })
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

    const wordForms = (words || []).map((word) => normForm(word.word))
    const { data: lexiconRows, error: lexiconError } = wordForms.length > 0
      ? await admin
          .from('novel_lexicon')
          .select('form_key, lemma')
          .eq('book_id', bookId)
          .in('form_key', wordForms)
      : { data: [], error: null }

    if (lexiconError) {
      console.error('[novel words] Lexicon lookup error:', lexiconError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const lemmaByForm = new Map((lexiconRows || []).map((row) => [normForm(row.form_key), row.lemma]))
    const uniqueWords: NovelWord[] = []
    const seenLemmas = new Set<string>()
    for (const word of words || []) {
      const form = normForm(word.word)
      const lemma = lemmaByForm.get(form) || word.word
      const lemmaKey = normForm(lemma)
      if (seenLemmas.has(lemmaKey)) continue
      seenLemmas.add(lemmaKey)
      uniqueWords.push({ ...word, lemma })
    }

    const { data: progressRows, error: progressError } = uniqueWords.length > 0
      ? await admin
          .from('novel_word_progress')
          .select('lemma, next_review_at, repetition_count')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
          .in('lemma', uniqueWords.map((word) => word.lemma || word.word))
      : { data: [], error: null }

    if (progressError) {
      console.error('[novel words] Progress lookup error:', progressError)
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }

    const progress: Record<string, { next_review_at: string | null; repetition_count: number }> = {}
    for (const row of progressRows || []) {
      progress[normForm(row.lemma)] = {
        next_review_at: row.next_review_at,
        repetition_count: row.repetition_count,
      }
    }

    return NextResponse.json({ data: { words: uniqueWords, progress } })
  } catch (error) {
    console.error('[novel words] Exception:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
