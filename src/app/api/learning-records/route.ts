import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withTimeout, safeJsonParse } from '@/lib/timeout'

/**
 * POST /api/learning-records
 * 创建学习记录（支持 typing 模式）
 *
 * @see typejishu.md - 接口定义
 * @see TYPING_PRACTICE_PRD.md - 功能需求
 */

interface LearningRecordRequest {
  bookId: string
  wordIds: string[]
  practiceMode: 'dictation' | 'match_game' | 'flashcard' | 'typing'
  action: string
  timeSpentSeconds: number
  metadata?: {
    totalWords?: number
    completedWords?: number
    skippedWords?: number
    wpm?: number
    accuracy?: number
    mistakeCount?: number
  }
}

/**
 * 创建学习记录
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ POST /api/learning-records - Unauthorized:', userError)
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: '未登录' },
        { status: 401 }
      )
    }

    // 2. 解析请求体（安全解析，带超时和大小限制）
    const body = await safeJsonParse<LearningRecordRequest>(request, {
      timeout: 5000,   // 5秒超时
      maxSize: 1024 * 1024  // 最大1MB
    })

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'INVALID_RECORD_DATA', message: '记录数据格式错误' },
        { status: 400 }
      )
    }

    const { bookId, wordIds, practiceMode, action, timeSpentSeconds, metadata } = body

    // 3. 验证必需参数
    if (!bookId || !wordIds || !practiceMode || !action) {
      return NextResponse.json(
        { success: false, error: 'INVALID_RECORD_DATA', message: '缺少必填字段' },
        { status: 400 }
      )
    }

    // 验证 practice_mode
    const validModes = ['dictation', 'match_game', 'flashcard', 'typing']
    if (!validModes.includes(practiceMode)) {
      return NextResponse.json(
        { success: false, error: 'INVALID_RECORD_DATA', message: `practice_mode 必须是: ${validModes.join(', ')}` },
        { status: 400 }
      )
    }

    // 4. 验证词书是否存在
    const { data: book } = await withTimeout(
      supabase.from('books').select('id').eq('id', bookId).single(),
      5000,
      'Book query timeout'
    )

    if (!book) {
      console.error('❌ POST /api/learning-records - Book not found:', bookId)
      return NextResponse.json(
        { success: false, error: 'BOOK_NOT_FOUND', message: '词书不存在' },
        { status: 404 }
      )
    }

    // 5. 创建学习记录
    const recordData = {
      user_id: user.id,
      book_id: bookId,
      word_id: null,  // 打字练习模式不记录单个单词，只记录整体会话
      practice_mode: practiceMode,
      action,
      is_correct: null,  // 打字练习模式不设置此字段
      time_spent_seconds: timeSpentSeconds || 0,
      device_info: {
        userAgent: request.headers.get('user-agent'),
        timestamp: new Date().toISOString()
      },
      metadata: metadata || {}
    }

    const { data: record, error: insertError } = await withTimeout(
      supabase.from('learning_records').insert(recordData).select().single(),
      10000,
      'Learning record insert timeout'
    )

    if (insertError) {
      console.error('❌ POST /api/learning-records - Insert error:', insertError)
      return NextResponse.json(
        { success: false, error: 'INTERNAL_ERROR', message: '创建记录失败' },
        { status: 500 }
      )
    }

    // 6. 返回结果
    console.log(`✅ POST /api/learning-records - Record created: ${record.id}, mode: ${practiceMode}`)

    return NextResponse.json({
      success: true,
      data: {
        recordId: record.id,
        createdAt: record.created_at
      }
    })

  } catch (error) {
    console.error('❌ Error in POST /api/learning-records:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
