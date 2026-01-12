import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Flashcard进度数据结构
 * key: flashcard_progress_{bookId}_{scopeType}
 * value: {
 *   currentIndex: number
 *   totalWords: number
 *   lastStudyTime: number
 *   scopeType: 'all' | 'unknown' | 'fuzzy' | 'known' | 'new'
 * }
 */

/**
 * GET /api/flashcard-progress?bookId=xxx&scopeType=xxx
 * 获取指定范围的flashcard学习进度
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')
    const scopeType = searchParams.get('scopeType')

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 从 user_book_preferences 表获取进度
    const { data: preferences, error } = await supabase
      .from('user_book_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    if (error) {
      // 如果没有记录，返回默认进度
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    const allPreferences = (preferences as any)?.preferences || {}
    const progressKey = scopeType
      ? `flashcard_progress_${bookId}_${scopeType}`
      : null

    // 如果指定了scopeType，返回该范围的进度
    if (scopeType && progressKey) {
      const progress = allPreferences[progressKey] || null
      return NextResponse.json({
        success: true,
        data: progress
      })
    }

    // 如果没有指定scopeType，返回所有范围的进度
    const allProgress = Object.keys(allPreferences)
      .filter(key => key.startsWith(`flashcard_progress_${bookId}_`))
      .reduce((acc: any, key) => {
        acc[key] = allPreferences[key]
        return acc
      }, {})

    return NextResponse.json({
      success: true,
      data: allProgress
    })
  } catch (error) {
    console.error('Error in GET /api/flashcard-progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/flashcard-progress
 * 保存/更新flashcard学习进度
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { bookId, scopeType, currentIndex, totalWords } = body

    if (!bookId || !scopeType || currentIndex === undefined) {
      return NextResponse.json(
        { error: 'bookId, scopeType, and currentIndex are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 构建进度数据
    const progressKey = `flashcard_progress_${bookId}_${scopeType}`
    const progressData = {
      currentIndex,
      totalWords: totalWords || 0,
      lastStudyTime: Date.now(),
      scopeType
    }

    // 获取现有preferences
    const { data: existing } = await supabase
      .from('user_book_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    const currentPreferences = (existing as any)?.preferences || {}

    // 更新进度
    const updatedPreferences = {
      ...currentPreferences,
      [progressKey]: progressData
    }

    // 保存到数据库
    const { error } = await (supabase.from('user_book_preferences') as any)
      .upsert({
        user_id: user.id,
        book_id: bookId,
        preferences: updatedPreferences
      }, {
        onConflict: 'user_id,book_id'
      })

    if (error) {
      console.error('Error saving flashcard progress:', error)
      return NextResponse.json({ error: 'Failed to save progress' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: progressData
    })
  } catch (error) {
    console.error('Error in POST /api/flashcard-progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
