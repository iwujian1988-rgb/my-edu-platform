import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type Chapter = {
  id: string
}

/**
 * GET /api/books/[bookId]/words
 * 获取单词书的所有单词
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  try {
    const { bookId } = await params
    const supabase = await createClient()

    // Get all chapters for this book
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', bookId)

    if (chaptersError) {
      console.error('Error fetching chapters:', chaptersError)
      return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
    }

    if (!chapters || chapters.length === 0) {
      return NextResponse.json({
        success: true,
        data: []
      })
    }

    const chapterIds = chapters.map((ch: Chapter) => ch.id)

    // Get all words for these chapters
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('*')
      .in('chapter_id', chapterIds)
      .order('order_index', { ascending: true })

    if (wordsError) {
      console.error('Error fetching words:', wordsError)
      return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: words || []
    })
  } catch (error) {
    console.error('Error in GET /api/books/[bookId]/words:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
