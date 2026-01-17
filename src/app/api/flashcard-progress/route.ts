import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { fromZodError } from 'zod-validation-error'

// 对应方案：Section 4.1.2 - Zod Schema: 支持mode参数
const GetProgressSchema = z.object({
  bookId: z.string().min(1, 'bookId不能为空').uuid('bookId格式错误'),
  scopeType: z.enum(['all', 'unknown', 'fuzzy', 'known', 'new']),
  mode: z.enum(['flashcards', 'dictation']).default('flashcards')
})

const PostProgressSchema = z.object({
  bookId: z.string().min(1, 'bookId不能为空').uuid('bookId格式错误'),
  scopeType: z.enum(['all', 'unknown', 'fuzzy', 'known', 'new']),
  mode: z.enum(['flashcards', 'dictation']).default('flashcards'),
  currentIndex: z.number().int().min(0, 'currentIndex不能为负数'),
  totalWords: z.number().int().min(0, 'totalWords不能为负数')
})

/**
 * Flashcard/Dictation进度数据结构
 * 对应方案：Section 4.1.2 - 支持两种模式
 * key: {mode}_progress_{bookId}_{scopeType}
 * value: {
 *   currentIndex: number
 *   totalWords: number
 *   lastStudyTime: number
 *   scopeType: 'all' | 'unknown' | 'fuzzy' | 'known' | 'new'
 * }
 */

/**
 * GET /api/flashcard-progress?bookId=xxx&scopeType=xxx&mode=flashcards|dictation
 * 对应方案：Section 4.1.2 - 获取指定范围和模式的学习进度
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({
      success: false,
      error: '未授权访问',
      code: 'UNAUTHORIZED'
    }, { status: 401 })
  }

  try {
    // 对应方案：Section 4.1.2 - 使用Zod验证
    const searchParams = Object.fromEntries(request.nextUrl.searchParams)
    const { bookId, scopeType, mode } = GetProgressSchema.parse(searchParams)

    const supabase = await createClient()

    // 对应方案：Section 3.1 - 从user_book_preferences表获取进度
    const { data: preferences, error } = await supabase
      .from('user_book_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    if (error) {
      // 如果没有记录，返回null
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    const allPreferences = (preferences as any)?.preferences || {}

    // 对应方案：Section 4.1.2 - 根据mode构建不同的progressKey
    const progressKey = `${mode}_progress_${bookId}_${scopeType}`
    const progress = allPreferences[progressKey] || null

    return NextResponse.json({
      success: true,
      data: progress
    })

  } catch (error) {
    // 对应方案：Section 4.1.2 - Zod错误处理
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: fromZodError(error).message,
        code: 'INVALID_PARAMS',
        details: (error as any).errors
      }, { status: 400 })
    }

    console.error('❌ [Progress GET] 服务器错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}

/**
 * POST /api/flashcard-progress
 * 对应方案：Section 4.1.2 - 保存/更新学习进度（支持flashcards和dictation两种模式）
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({
      success: false,
      error: '未授权访问',
      code: 'UNAUTHORIZED'
    }, { status: 401 })
  }

  try {
    // 对应方案：Section 4.1.2 - 使用Zod验证
    const body = await request.json()
    const { bookId, scopeType, mode, currentIndex, totalWords } =
      PostProgressSchema.parse(body)

    const supabase = await createClient()

    // 对应方案：Section 4.1.2 - 根据mode构建不同的progressKey
    const progressKey = `${mode}_progress_${bookId}_${scopeType}`
    const progressData = {
      currentIndex,
      totalWords: totalWords || 0,
      lastStudyTime: Date.now(),
      scopeType
    }

    // 对应方案：Section 3.1 - 获取现有preferences
    const { data: existing } = await supabase
      .from('user_book_preferences')
      .select('preferences')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .maybeSingle()

    const currentPreferences = (existing as any)?.preferences || {}

    // 对应方案：Section 3.1 - 更新进度
    const updatedPreferences = {
      ...currentPreferences,
      [progressKey]: progressData
    }

    // 对应方案：Section 3.1 - 保存到数据库
    const { error } = await supabase
      .from('user_book_preferences')
      .upsert({
        user_id: user.id,
        book_id: bookId,
        preferences: updatedPreferences
      }, {
        onConflict: 'user_id,book_id'
      })

    if (error) {
      console.error('❌ [Progress POST] 保存失败:', error)
      return NextResponse.json({
        success: false,
        error: '保存进度失败',
        code: 'INTERNAL_ERROR'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: progressData
    })

  } catch (error) {
    // 对应方案：Section 4.1.2 - Zod错误处理
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: fromZodError(error).message,
        code: 'INVALID_PARAMS',
        details: (error as any).errors
      }, { status: 400 })
    }

    console.error('❌ [Progress POST] 服务器错误:', error)
    return NextResponse.json({
      success: false,
      error: '服务器内部错误',
      code: 'INTERNAL_ERROR'
    }, { status: 500 })
  }
}
