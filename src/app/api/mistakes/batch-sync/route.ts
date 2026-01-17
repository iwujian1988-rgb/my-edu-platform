import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withTimeout, safeJsonParse } from '@/lib/timeout'

/**
 * POST /api/mistakes/batch-sync
 * 批量同步错题（打字练习专用）
 *
 * @see typejishu.md - 接口定义
 * @see TYPING_PRACTICE_PRD.md - 功能需求
 */

interface MistakeItem {
  wordId: string
  wrongCount: number
  typingWrongCount: number
}

interface BatchSyncRequest {
  bookId: string
  mistakes: MistakeItem[]
}

/**
 * 批量同步错题
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ POST /api/mistakes/batch-sync - Unauthorized:', userError)
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: '未登录' },
        { status: 401 }
      )
    }

    // 2. 解析请求体（安全解析，带超时和大小限制）
    const body = await safeJsonParse<BatchSyncRequest>(request, {
      timeout: 5000,   // 5秒超时
      maxSize: 1024 * 1024  // 最大1MB
    })

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'INVALID_MISTAKES_DATA', message: '错题数据格式错误' },
        { status: 400 }
      )
    }

    const { bookId, mistakes } = body

    // 3. 验证必需参数
    if (!bookId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_BOOK_ID', message: '缺少词书ID' },
        { status: 400 }
      )
    }

    if (!Array.isArray(mistakes) || mistakes.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_MISTAKES_DATA', message: '错题数据必须是非空数组' },
        { status: 400 }
      )
    }

    // 4. 验证词书是否存在
    const { data: book, error: bookError } = await withTimeout(
      supabase.from('books').select('id').eq('id', bookId).single(),
      5000,
      'Book query timeout'
    )

    if (bookError || !book) {
      console.error('❌ POST /api/mistakes/batch-sync - Book not found:', bookId)
      return NextResponse.json(
        { success: false, error: 'BOOK_NOT_FOUND', message: '词书不存在' },
        { status: 404 }
      )
    }

    // 5. 批量同步错题（使用事务）
    let synced = 0
    let failed = 0
    const errors: string[] = []

    // 注意：Supabase JS客户端不直接支持事务，这里使用循环模拟
    // 在生产环境中，建议使用数据库函数或RPC来实现真正的原子性
    for (const mistake of mistakes) {
      try {
        const { wordId, wrongCount, typingWrongCount } = mistake

        // 验证字段
        if (!wordId || typeof wrongCount !== 'number' || typeof typingWrongCount !== 'number') {
          failed++
          errors.push(`Word ${wordId}: 无效的字段格式`)
          continue
        }

        // 检查单词是否存在
        const { data: word } = await withTimeout(
          supabase.from('words').select('id').eq('id', wordId).eq('book_id', bookId).single(),
          3000,
          'Word query timeout'
        )

        if (!word) {
          failed++
          errors.push(`Word ${wordId}: 不存在`)
          continue
        }

        // 查询现有错题记录
        const { data: existing } = await supabase
          .from('mistakes')
          .select('wrong_count, typing_wrong_count')
          .eq('user_id', user.id)
          .eq('word_id', wordId)
          .eq('book_id', bookId)
          .single()

        if (existing) {
          // 更新现有记录（累加）
          const { error: updateError } = await supabase
            .from('mistakes')
            .update({
              wrong_count: existing.wrong_count + wrongCount,
              typing_wrong_count: existing.typing_wrong_count + typingWrongCount,
              last_wrong_at: new Date().toISOString(),
              is_resolved: false,
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('word_id', wordId)
            .eq('book_id', bookId)

          if (updateError) {
            throw updateError
          }
        } else {
          // 插入新记录
          const { error: insertError } = await supabase
            .from('mistakes')
            .insert({
              user_id: user.id,
              word_id: wordId,
              book_id: bookId,
              wrong_count: wrongCount,
              typing_wrong_count: typingWrongCount,
              last_wrong_at: new Date().toISOString(),
              is_resolved: false
            })

          if (insertError) {
            throw insertError
          }
        }

        synced++
      } catch (error) {
        failed++
        errors.push(`Word ${mistake.wordId}: ${error instanceof Error ? error.message : '未知错误'}`)
        console.error('❌ POST /api/mistakes/batch-sync - Sync failed for word:', mistake.wordId, error)
      }
    }

    // 6. 返回结果
    console.log(`✅ POST /api/mistakes/batch-sync - Synced: ${synced}, Failed: ${failed}`)

    return NextResponse.json({
      success: true,
      data: {
        synced,
        failed,
        errors: errors.length > 0 ? errors : undefined
      }
    })

  } catch (error) {
    console.error('❌ Error in POST /api/mistakes/batch-sync:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
