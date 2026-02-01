/**
 * 统一单词标记 API ⭐ 核心
 *
 * POST /api/v3/word-mark
 *
 * 功能：
 * 1. 更新 word_progress 表（单词掌握状态）
 * 2. 更新 review_schedule 表（复习计划）
 * 3. 更新 daily_task_records 表（今日任务进度）
 * 4. 记录 learning_records（学习历史）
 *
 * 所有学习模式（卡片、听写、单词列表、消消乐等）统一调用此接口
 *
 * 文档：tech-design-learning-plan.md 第 3.3 节
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/v3/word-mark
 * 统一标记入口
 *
 * 请求体:
 * {
 *   "wordId": "word-uuid",
 *   "bookId": "book-uuid",
 *   "status": "known" | "fuzzy" | "unknown",
 *   "source": "flashcard" | "dictation" | "word-list" | "match-game" | "typing"
 * }
 *
 * 响应:
 * {
 *   "success": true,
 *   "data": {
 *     "wordMarked": true,
 *     "taskUpdated": boolean,
 *     "allCompleted": boolean,
 *     "reviewScheduled": boolean
 *   }
 * }
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient()

  // 1. 获取当前用户
  const { data: { user }, error: userError } = await supabase.auth.getUser()

  if (userError || !user) {
    return NextResponse.json(
      { success: false, error: 'Unauthorized' },
      { status: 401 }
    )
  }

  // 2. 解析请求体
  const body = await request.json()
  const { wordId, bookId, status, source } = body

  // 参数验证
  if (!wordId || !bookId || !status) {
    return NextResponse.json(
      { success: false, error: 'Missing required fields: wordId, bookId, status' },
      { status: 400 }
    )
  }

  // 验证 status 值
  const validStatuses = ['known', 'fuzzy', 'unknown']
  if (!validStatuses.includes(status)) {
    return NextResponse.json(
      { success: false, error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
      { status: 400 }
    )
  }

  try {
    // 使用 Supabase Client（自动处理连接池和事务）
    // 注意：Supabase JS Client 不直接支持 PostgreSQL 事务，
    // 这里使用多个操作，如果需要严格事务保证，可以考虑使用 RPC 函数

    // ========================================
    // 步骤 1: 更新 word_progress 表
    // ========================================
    const { data: existingProgress, error: queryError } = await supabase
      .from('word_progress')
      .select('practice_count')
      .eq('user_id', user.id)
      .eq('word_id', wordId)
      .eq('book_id', bookId)
      .maybeSingle()

    if (queryError) {
      console.error('❌ Query word_progress error:', queryError)
      throw new Error('查询单词进度失败')
    }

    const currentPracticeCount = existingProgress?.practice_count || 0

    const { error: upsertError } = await supabase
      .from('word_progress')
      .upsert({
        user_id: user.id,
        word_id: wordId,
        book_id: bookId,
        status: status,
        practice_count: currentPracticeCount + 1,
        last_practiced_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,word_id,book_id'
      })

    if (upsertError) {
      console.error('❌ Upsert word_progress error:', upsertError)
      throw new Error('更新单词进度失败')
    }

    // ========================================
    // 步骤 1.5: 手动维护错题本 (mistakes 表)
    // 替代触发器，避免栈溢出
    // ========================================
    try {
      if (status === 'fuzzy' || status === 'unknown') {
        // 标记为模糊或不认识，添加到错题本
        await supabase
          .from('mistakes')
          .upsert({
            user_id: user.id,
            word_id: wordId,
            book_id: bookId,
            wrong_count: 1,
            last_wrong_at: new Date().toISOString(),
            is_resolved: false,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,word_id,book_id'
          })
        console.log(`✅ [错题本] 已添加到错题本: ${wordId}`)
      } else if (status === 'known') {
        // 标记为认识，标记错题已解决
        await supabase
          .from('mistakes')
          .update({
            is_resolved: true,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)
          .eq('word_id', wordId)
          .eq('book_id', bookId)
        console.log(`✅ [错题本] 已标记为已解决: ${wordId}`)
      }
    } catch (mistakeError) {
      console.error('❌ [错题本] 更新失败:', mistakeError)
      // 非关键错误，不中断流程
    }

    // ========================================
    // 步骤 1.6: 手动维护生词日历 (vocabulary_calendar 表)
    // 替代触发器，避免栈溢出
    // ========================================
    try {
      if (status === 'fuzzy' || status === 'unknown') {
        // 🔧 修复：使用本地时间而不是 UTC 时间
        const calendarDate = new Date()
        const year = calendarDate.getFullYear()
        const month = String(calendarDate.getMonth() + 1).padStart(2, '0')
        const day = String(calendarDate.getDate()).padStart(2, '0')
        const todayStr = `${year}-${month}-${day}`

        // 记录到生词日历
        await supabase
          .from('vocabulary_calendar')
          .upsert({
            user_id: user.id,
            word_id: wordId,
            book_id: bookId,
            date: todayStr, // 本地日期
            status: status,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'user_id,word_id,date'
          })
        console.log(`✅ [生词日历] 已记录到生词日历: ${wordId}`)
      }
    } catch (calendarError) {
      console.error('❌ [生词日历] 更新失败:', calendarError)
      // 非关键错误，不中断流程
    }

    // ========================================
    // 步骤 2: 更新复习计划表 (review_schedule)
    // ========================================
    let reviewScheduled = false
    const nextReviewDate = new Date()

    if (status === 'known') {
      // 获取当前复习次数
      const { data: scheduleData, error: scheduleQueryError } = await supabase
        .from('review_schedule')
        .select('review_count')
        .eq('user_id', user.id)
        .eq('word_id', wordId)
        .eq('book_id', bookId)
        .maybeSingle()

      if (scheduleQueryError) {
        console.error('❌ Query review_schedule error:', scheduleQueryError)
      }

      const currentReviewCount = scheduleData?.review_count || 0

      // 计算下次复习间隔（艾宾浩斯遗忘曲线：7/15/30天）
      const intervals = [7, 15, 30]
      const nextInterval = intervals[Math.min(currentReviewCount, intervals.length - 1)]

      nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval)

      // 🔧 修复：使用本地日期格式，与查询时保持一致
      const year = nextReviewDate.getFullYear()
      const month = String(nextReviewDate.getMonth() + 1).padStart(2, '0')
      const day = String(nextReviewDate.getDate()).padStart(2, '0')
      const nextReviewDateStr = `${year}-${month}-${day}`

      const { error: scheduleUpsertError } = await supabase
        .from('review_schedule')
        .upsert({
          user_id: user.id,
          word_id: wordId,
          book_id: bookId,
          review_count: currentReviewCount + 1,
          next_review_date: nextReviewDateStr,
          interval_days: nextInterval,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,word_id,book_id'
        })

      if (scheduleUpsertError) {
        console.error('❌ Upsert review_schedule error:', scheduleUpsertError)
      } else {
        reviewScheduled = true
      }
    } else {
      // fuzzy 或 unknown，重置为 7 天后复习
      nextReviewDate.setDate(nextReviewDate.getDate() + 7)

      // 🔧 修复：使用本地日期格式，与查询时保持一致
      const year = nextReviewDate.getFullYear()
      const month = String(nextReviewDate.getMonth() + 1).padStart(2, '0')
      const day = String(nextReviewDate.getDate()).padStart(2, '0')
      const nextReviewDateStr = `${year}-${month}-${day}`

      const { error: scheduleResetError } = await supabase
        .from('review_schedule')
        .upsert({
          user_id: user.id,
          word_id: wordId,
          book_id: bookId,
          review_count: 0,
          next_review_date: nextReviewDateStr,
          interval_days: 7,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id,word_id,book_id'
        })

      if (scheduleResetError) {
        console.error('❌ Reset review_schedule error:', scheduleResetError)
      } else {
        reviewScheduled = true
      }
    }

    // ========================================
    // 步骤 3: 更新今日任务完成度
    // ========================================
    let taskUpdated = false
    let allCompleted = false

    // 🔧 修复：使用本地时间而不是 UTC 时间
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    const todayStr = `${year}-${month}-${day}`

    console.log(`\n📅 [word-mark] 查询今日任务:`, {
      userId: user.id,
      bookId,
      wordId,
      status,
      todayDate: todayStr,
      本地时间: now.toLocaleString('zh-CN'),
      UTC时间: now.toISOString()
    })

    // 查询今日任务
    const { data: todayTask, error: taskQueryError } = await supabase
      .from('daily_task_records')
      .select('*')
      .eq('user_id', user.id)
      .eq('book_id', bookId)
      .eq('task_date', todayStr)
      .maybeSingle()

    if (taskQueryError) {
      console.error('❌ Query daily_task_records error:', taskQueryError)
    } else if (todayTask) {
      console.log('✅ [word-mark] 找到今日任务:', {
        taskId: todayTask.id,
        taskDate: todayTask.task_date,
        totalWords: todayTask.total_words,
        newWordsCount: Array.isArray(todayTask.new_words) ? todayTask.new_words.length : 0,
        reviewWordsCount: Array.isArray(todayTask.review_words) ? todayTask.review_words.length : 0,
        completedWordsCount: Array.isArray(todayTask.completed_words) ? todayTask.completed_words.length : 0,
        allCompleted: todayTask.all_completed
      })
      // 检查单词是否在今日任务中
      const newWords = Array.isArray(todayTask.new_words)
        ? todayTask.new_words
        : []
      const reviewWords = Array.isArray(todayTask.review_words)
        ? todayTask.review_words
        : []

      // 处理可能包含完整单词对象的情况，提取 word_id
      const newWordIds = newWords.map((w: any) => typeof w === 'string' ? w : w.word_id || w.id)
      const reviewWordIds = reviewWords.map((w: any) => typeof w === 'string' ? w : w.word_id || w.id)
      const allWords = [...newWordIds, ...reviewWordIds]

      console.log('📝 [word-mark] 检查单词是否在今日任务:', {
        wordId,
        allWordsCount: allWords.length,
        inTask: allWords.includes(wordId)
      })

      if (allWords.includes(wordId)) {
        // 更新完成单词列表
        let completed = Array.isArray(todayTask.completed_words)
          ? todayTask.completed_words
          : []

        console.log('🔄 [word-mark] 更新前 completed_words:', {
          completedCount: completed.length,
          completed: completed
        })

        if (status === 'known') {
          // 标记为"认识"，添加到完成列表
          if (!completed.includes(wordId)) {
            completed.push(wordId)
            console.log('➕ [word-mark] 添加到完成列表:', wordId)
          } else {
            console.log('⏭️ [word-mark] 已在完成列表中:', wordId)
          }
        } else {
          // 标记为"fuzzy"或"unknown"，从完成列表移除
          completed = completed.filter((id: string) => id !== wordId)
          console.log('➖ [word-mark] 从完成列表移除:', wordId)
        }

        console.log('✅ [word-mark] 更新后 completed_words:', {
          completedCount: completed.length,
          completed: completed
        })

        // 检查是否全部完成
        allCompleted = completed.length === allWords.length

        const updateData: any = {
          completed_words: completed,
          all_completed: allCompleted,
          updated_at: new Date().toISOString()
        }

        // 如果全部完成，记录完成时间
        if (allCompleted && !todayTask.all_completed) {
          updateData.completed_at = new Date().toISOString()
        }

        console.log('💾 [word-mark] 准备更新今日任务:', {
          updateData
        })

        const { error: taskUpdateError } = await supabase
          .from('daily_task_records')
          .update(updateData)
          .eq('id', todayTask.id)

        if (taskUpdateError) {
          console.error('❌ Update daily_task_records error:', taskUpdateError)
        } else {
          console.log('✅ [word-mark] 今日任务更新成功!')
          taskUpdated = true
        }
      } else {
        console.log('⚠️ [word-mark] 单词不在今日任务中，跳过更新')
      }
    } else {
      console.log('⚠️ [word-mark] 没有找到今日任务')
    }

    // ========================================
    // 步骤 4: 记录学习历史 (learning_records)
    // ========================================
    const { error: recordError } = await supabase
      .from('learning_records')
      .insert({
        user_id: user.id,
        word_id: wordId,
        book_id: bookId,
        practice_mode: source || 'unknown',
        created_at: new Date().toISOString()
      })

    if (recordError) {
      console.error('❌ Insert learning_records error:', recordError)
      // 非关键操作，不中断流程
    }

    // ========================================
    // 返回成功响应
    // ========================================
    return NextResponse.json({
      success: true,
      data: {
        wordMarked: true,
        taskUpdated,
        allCompleted,
        reviewScheduled
      }
    })

  } catch (error: any) {
    console.error('❌ POST /api/v3/word-mark - Error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal server error'
      },
      { status: 500 }
    )
  }
}
