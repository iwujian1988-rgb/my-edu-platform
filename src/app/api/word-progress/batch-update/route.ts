import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { withTimeout, safeJsonParse } from '@/lib/timeout'
import { cacheService } from '@/lib/cache/redis'

/**
 * POST /api/word-progress/batch-update
 * 批量更新学习进度（打字练习专用）
 *
 * @see typejishu.md - 接口定义
 * @see TYPING_PRACTICE_PRD.md - 功能需求
 */

interface ProgressItem {
  wordId: string
  typingCorrectCount: number
  typingTotalAttempts: number
  accuracy: number
}

interface BatchUpdateRequest {
  bookId: string
  progress: ProgressItem[]
}

/**
 * 根据正确率计算学习状态（核心算法）
 */
function calculateStatus(accuracy: number): 'known' | 'fuzzy' | 'unknown' {
  if (accuracy >= 0.9) return 'known'      // ≥90%: 认识
  if (accuracy >= 0.6) return 'fuzzy'      // 60%-89%: 模糊
  return 'unknown'                         // <60%: 不认识
}

/**
 * 计算掌握程度（核心算法）
 */
function calculateMasteryLevel(correctCount: number, totalCount: number): number {
  if (totalCount === 0) return 0

  const accuracy = correctCount / totalCount

  // 考虑练习次数的权重（练习越多，掌握程度越高）
  const practiceWeight = Math.min(totalCount / 10, 1.0) // 最多10次达到满权重

  return Math.round((accuracy * 0.7 + practiceWeight * 0.3) * 100)
}

/**
 * 批量更新学习进度
 */
export async function POST(request: NextRequest) {
  try {
    // 1. 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ POST /api/word-progress/batch-update - Unauthorized:', userError)
      return NextResponse.json(
        { success: false, error: 'UNAUTHORIZED', message: '未登录' },
        { status: 401 }
      )
    }

    // 2. 解析请求体（安全解析，带超时和大小限制）
    const body = await safeJsonParse<BatchUpdateRequest>(request, {
      timeout: 5000,   // 5秒超时
      maxSize: 2 * 1024 * 1024  // 最大2MB（批量数据）
    })

    if (!body) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PROGRESS_DATA', message: '进度数据格式错误' },
        { status: 400 }
      )
    }

    const { bookId, progress } = body

    // 3. 验证必需参数
    if (!bookId) {
      return NextResponse.json(
        { success: false, error: 'MISSING_BOOK_ID', message: '缺少词书ID' },
        { status: 400 }
      )
    }

    if (!Array.isArray(progress) || progress.length === 0) {
      return NextResponse.json(
        { success: false, error: 'INVALID_PROGRESS_DATA', message: '进度数据必须是非空数组' },
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
      console.error('❌ POST /api/word-progress/batch-update - Book not found:', bookId)
      return NextResponse.json(
        { success: false, error: 'BOOK_NOT_FOUND', message: '词书不存在' },
        { status: 404 }
      )
    }

    // 5. 批量更新进度
    let updated = 0
    let failed = 0
    const errors: string[] = []
    const summary = { known: 0, fuzzy: 0, unknown: 0 }

    // 注意：Supabase JS客户端不直接支持事务，这里使用循环模拟
    // 在生产环境中，建议使用数据库函数或RPC来实现真正的原子性
    for (const item of progress) {
      try {
        const { wordId, typingCorrectCount, typingTotalAttempts, accuracy } = item

        // 验证字段
        if (!wordId || typeof typingCorrectCount !== 'number' || typeof typingTotalAttempts !== 'number') {
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

        // 1. 根据正确率计算学习状态（核心业务逻辑）
        const status = calculateStatus(accuracy)
        summary[status]++

        // 2. 计算掌握程度（0-100）
        const masteryLevel = calculateMasteryLevel(typingCorrectCount, typingTotalAttempts)

        // 3. 查询现有进度（使用乐观锁）
        const { data: existing } = await supabase
          .from('word_progress')
          .select('typing_correct_count, typing_total_attempts, version')
          .eq('user_id', user.id)
          .eq('word_id', wordId)
          .eq('book_id', bookId)
          .single()

        if (existing) {
          // 4. 更新现有记录（累加拼写统计，保留其他模式统计）
          const newTypingCorrectCount = (existing.typing_correct_count || 0) + typingCorrectCount
          const newTypingTotalAttempts = (existing.typing_total_attempts || 0) + typingTotalAttempts
          const currentVersion = existing.version || 1

          const { error: updateError } = await supabase
            .from('word_progress')
            .update({
              status,
              typing_correct_count: newTypingCorrectCount,
              typing_total_attempts: newTypingTotalAttempts,
              mastery_level: masteryLevel,
              version: currentVersion + 1,  // 乐观锁：版本号递增
              last_practiced_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('word_id', wordId)
            .eq('book_id', bookId)
            .eq('version', currentVersion)  // 乐观锁：检查版本号

          if (updateError) {
            // 版本冲突或其他错误
            failed++
            errors.push(`Word ${wordId}: ${updateError.message}`)
            continue
          }
        } else {
          // 5. 插入新记录
          const { error: insertError } = await supabase
            .from('word_progress')
            .insert({
              user_id: user.id,
              word_id: wordId,
              book_id: bookId,
              status,
              typing_correct_count: typingCorrectCount,
              typing_total_attempts: typingTotalAttempts,
              mastery_level: masteryLevel,
              practice_count: 0,
              correct_count: 0,
              version: 1,
              last_practiced_at: new Date().toISOString()
            })

          if (insertError) {
            failed++
            errors.push(`Word ${wordId}: ${insertError.message}`)
            continue
          }
        }

        updated++
      } catch (error) {
        failed++
        errors.push(`Word ${item.wordId}: ${error instanceof Error ? error.message : '未知错误'}`)
        console.error('❌ POST /api/word-progress/batch-update - Update failed for word:', item.wordId, error)
      }
    }

    // 6. 清除缓存
    try {
      await cacheService.invalidateStats(user.id, bookId)
    } catch (cacheError) {
      console.warn('⚠️ POST /api/word-progress/batch-update - Cache invalidation failed:', cacheError)
      // 缓存清除失败不影响主流程
    }

    // 7. 返回结果
    console.log(`✅ POST /api/word-progress/batch-update - Updated: ${updated}, Failed: ${failed}`)

    return NextResponse.json({
      success: true,
      data: {
        updated,
        failed,
        errors: errors.length > 0 ? errors : undefined,
        summary
      }
    })

  } catch (error) {
    console.error('❌ Error in POST /api/word-progress/batch-update:', error)
    return NextResponse.json(
      { success: false, error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
