import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

type ThemeData = {
  id: string
}

type SceneData = {
  id: string
}

type Chapter = {
  id: string
}

/**
 * GET /api/words?bookId=xxx&theme=xxx&scene=xxx&status=xxx
 * 获取单词书的所有单词，支持筛选
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')
    const theme = searchParams.get('theme')
    const scene = searchParams.get('scene')
    const status = searchParams.get('status')

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Get all chapters for this book
    let chaptersQuery = supabase
      .from('chapters')
      .select('id, id')

    // Apply theme filter if provided
    if (theme && theme !== 'all') {
      // Get theme_id from themes table
      const { data: themeData } = await supabase
        .from('themes')
        .select('id')
        .eq('name', theme)
        .single()

      if (themeData) {
        chaptersQuery = chaptersQuery.eq('theme_id', (themeData as ThemeData).id)
      }
    }

    // Apply scene filter if provided
    if (scene && scene !== 'all') {
      // Get scene_id from scenes table
      const { data: sceneData } = await supabase
        .from('scenes')
        .select('id')
        .eq('name', scene)
        .single()

      if (sceneData) {
        chaptersQuery = chaptersQuery.eq('scene_id', (sceneData as SceneData).id)
      }
    }

    const { data: chapters, error: chaptersError } = await chaptersQuery.eq('book_id', bookId)

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
    let wordsQuery = supabase
      .from('words')
      .select('*')
      .in('chapter_id', chapterIds)
      .order('order_index', { ascending: true })

    const { data: words, error: wordsError } = await wordsQuery

    if (wordsError) {
      console.error('Error fetching words:', wordsError)
      return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 })
    }

    // Apply status filter if provided (requires user authentication)
    let filteredWords = words || []
    if (status && status !== 'all' && status !== 'new') {
      // Get user's progress for this book
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data: progress } = await supabase
          .from('word_progress')
          .select('word_id, status')
          .eq('user_id', user.id)
          .eq('book_id', bookId)

        if (progress) {
          const progressMap = new Map(progress.map((p: any) => [p.word_id, p.status]))
          filteredWords = filteredWords.filter((word: any) => {
            const wordStatus = progressMap.get(word.id)
            if (status === 'unknown') {
              return !wordStatus || wordStatus === 'unknown'
            }
            return wordStatus === status
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: filteredWords
    })
  } catch (error) {
    console.error('Error in GET /api/words:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
