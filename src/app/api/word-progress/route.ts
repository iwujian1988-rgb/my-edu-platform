import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { cacheService } from '@/lib/cache/redis'
import { withTimeout, safeJsonParse } from '@/lib/timeout'

type WordProgressItem = {
  word_id: string
  status: string
  practice_count?: number
  correct_count?: number
  last_practiced_at?: string
}

/**
 * GET /api/word-progress?book_id=xxx
 * 获取指定词书的单词状态
 */
export async function GET(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 获取查询参数
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('book_id')
    const wordIdsParam = searchParams.get('word_ids')

    if (!bookId) {
      return NextResponse.json({ error: 'book_id is required' }, { status: 400 })
    }

    // 构建查询
    let query = supabase
      .from('word_progress')
      .select('word_id, status, practice_count, correct_count, last_practiced_at, match_count, fail_count')
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    // 如果指定了word_ids，只查询单词的进度
    if (wordIdsParam) {
      const wordIds = wordIdsParam.split(',')
      query = query.in('word_id', wordIds)
    }

    // 查询单词状态
    // ✅ 修复：添加超时保护
    const { data: wordProgress, error: progressError } = await withTimeout(
      query,
      10000,  // 10秒超时
      'Word progress query timeout'
    )

    if (progressError) {
      console.error('Error fetching word progress:', progressError)
      return NextResponse.json({ error: 'Failed to fetch word progress' }, { status: 500 })
    }

    // 转换为 Map 格式方便前端使用
    const progressMap: Record<string, any> = {}
    wordProgress?.forEach((item: any) => {
      progressMap[item.word_id] = item
    })

    return NextResponse.json({
      success: true,
      data: progressMap
    })

  } catch (error) {
    console.error('Error in GET /api/word-progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/word-progress
 * 保存或更新单词状态
 */
export async function POST(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      console.error('❌ POST /api/word-progress - Unauthorized:', userError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ✅ 修复：使用安全的JSON解析，带超时和大小限制
    const body = await safeJsonParse(request, {
      timeout: 5000,   // 5秒超时
      maxSize: 1024 * 1024  // 最大1MB
    })
    console.log('📝 POST /api/word-progress - Request body:', body)

    const { word_id, book_id, status, consecutive_correct_count, match_count, fail_count } = body

    // 验证必需参数
    if (!word_id || !book_id || !status) {
      console.error('❌ POST /api/word-progress - Missing required params:', { word_id, book_id, status })
      return NextResponse.json(
        { error: 'word_id, book_id, and status are required' },
        { status: 400 }
      )
    }

    // 验证状态值
    const validStatuses = ['new', 'known', 'fuzzy', 'unknown']
    if (!validStatuses.includes(status)) {
      console.error('❌ POST /api/word-progress - Invalid status:', status)
      return NextResponse.json(
        { error: `status must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // 构建更新对象
    const updateData: any = {
      user_id: user.id,
      word_id,
      book_id,
      status,
      updated_at: new Date().toISOString()
    }

    console.log('✅ Ready to upsert word progress:', updateData)

    // 如果提供了consecutive_correct_count，则更新该字段
    if (typeof consecutive_correct_count === 'number') {
      updateData.consecutive_correct_count = consecutive_correct_count
    }

    // 如果提供了match_count，则更新该字段（消消乐匹配成功计数）
    if (typeof match_count === 'number') {
      updateData.match_count = match_count
    }

    // 如果提供了fail_count，则更新该字段（消消乐匹配失败计数）
    if (typeof fail_count === 'number') {
      updateData.fail_count = fail_count
    }

    // 使用 UPSERT 保存或更新单词状态
    // ✅ 修复：添加超时保护
    const { data: progressData, error: upsertError } = await withTimeout(
      supabase
        .from('word_progress')
        .upsert(updateData, {
          onConflict: 'user_id,word_id,book_id',
          ignoreDuplicates: false
        })
        .select(),
      10000,  // 10秒超时
      'Word progress upsert timeout'
    )

    if (upsertError) {
      console.error('❌ POST /api/word-progress - Database error:', upsertError)
      return NextResponse.json({ error: 'Failed to save word progress', details: upsertError }, { status: 500 })
    }

    // 手动处理错题本逻辑（绕过触发器的 RLS 问题）
    try {
      if (status === 'unknown' || status === 'fuzzy') {
        // 添加到错题本
        await supabase
          .from('mistakes')
          .upsert({
            user_id: user.id,
            word_id,
            book_id,
            wrong_count: 1,
            last_wrong_at: new Date().toISOString(),
            is_resolved: false
          } as any, {
            onConflict: 'user_id,word_id,book_id',
            ignoreDuplicates: false
          })
      } else if (status === 'known') {
        // 标记错题已解决
        await supabase
          .from('mistakes')
          // @ts-ignore - Supabase type inference issue
          .update({
            is_resolved: true,
            updated_at: new Date().toISOString()
          })
          .match({
            user_id: user.id,
            word_id,
            book_id
          })
      }
    } catch (mistakesError) {
      // 错题本操作失败不影响主流程，只记录日志
      console.error('⚠️ POST /api/word-progress - Mistakes update failed:', mistakesError)
    }

    console.log('✅ POST /api/word-progress - Success:', progressData?.[0])

    // 对应方案：Section 5.1.2 - 失效相关缓存
    await cacheService.invalidateStats(user.id, book_id)

    return NextResponse.json({
      success: true,
      data: progressData?.[0] || null
    })

  } catch (error) {
    console.error('❌ Error in POST /api/word-progress:', error)
    return NextResponse.json({ error: 'Internal server error', details: error }, { status: 500 })
  }
}

/**
 * PUT /api/word-progress
 * 批量更新单词状态（用于批量标记）
 */
export async function PUT(request: NextRequest) {
  try {
    // 获取当前用户
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()

    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 解析请求体
    const body = await request.json()
    const { updates } = body // 格式: [{ word_id, book_id, status }, ...]

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { error: 'updates must be a non-empty array' },
        { status: 400 }
      )
    }

    // 批量准备数据
    const records = updates.map(update => ({
      user_id: user.id,
      word_id: update.word_id,
      book_id: update.book_id,
      status: update.status,
      updated_at: new Date().toISOString()
    }))

    // 批量插入/更新
    const { data: progressData, error: upsertError } = await supabase
      .from('word_progress')
      .upsert(records as any, {
        onConflict: 'user_id,word_id,book_id',
        ignoreDuplicates: false
      })
      .select()

    if (upsertError) {
      console.error('Error batch updating word progress:', upsertError)
      return NextResponse.json({ error: 'Failed to batch update word progress' }, { status: 500 })
    }

    // ✨ v4.0 新增：更新复习计划和今日任务
    try {
      for (const update of updates) {
        await updateReviewScheduleAndTodayTask(
          user.id,
          update.word_id,
          update.book_id,
          update.status,
          supabase
        )
      }
    } catch (taskError) {
      // 非关键错误，不影响主流程
      console.warn('⚠️ Failed to update review schedule/today task:', taskError)
    }

    // 对应方案：Section 5.1.2 - 批量更新后失效相关缓存
    // 获取所有受影响的book_id
    const affectedBookIds = new Set(updates.map((u: any) => u.book_id))
    for (const bookId of Array.from(affectedBookIds)) {
      await cacheService.invalidateStats(user.id, bookId)
    }

    return NextResponse.json({
      success: true,
      data: progressData,
      count: progressData?.length || 0
    })

  } catch (error) {
    console.error('Error in PUT /api/word-progress:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ============================================
// 辅助函数：集成学习计划系统
// ============================================

/**
 * 更新复习计划和今日任务进度
 * ✨ v4.0 新增
 */
async function updateReviewScheduleAndTodayTask(
  userId: string,
  wordId: string,
  bookId: string,
  status: 'known' | 'fuzzy' | 'unknown',
  supabase: any
): Promise<void> {
  // 1. 更新复习计划表 (review_schedule)
  const nextReviewDate = new Date()

  if (status === 'known') {
    // 获取当前复习次数
    const { data: scheduleData } = await supabase
      .from('review_schedule')
      .select('review_count')
      .eq('user_id', userId)
      .eq('word_id', wordId)
      .eq('book_id', bookId)
      .maybeSingle()

    const currentReviewCount = scheduleData?.review_count || 0

    // 计算下次复习间隔（艾宾浩斯遗忘曲线：7/15/30天）
    const intervals = [7, 15, 30]
    const nextInterval = intervals[Math.min(currentReviewCount, intervals.length - 1)]

    nextReviewDate.setDate(nextReviewDate.getDate() + nextInterval)

    const year = nextReviewDate.getFullYear()
    const month = String(nextReviewDate.getMonth() + 1).padStart(2, '0')
    const day = String(nextReviewDate.getDate()).padStart(2, '0')
    const nextReviewDateStr = `${year}-${month}-${day}`

    await supabase
      .from('review_schedule')
      .upsert({
        user_id: userId,
        word_id: wordId,
        book_id: bookId,
        review_count: currentReviewCount + 1,
        next_review_date: nextReviewDateStr,
        interval_days: nextInterval,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,word_id,book_id'
      })
  } else {
    // fuzzy 或 unknown，重置为 7 天后复习
    nextReviewDate.setDate(nextReviewDate.getDate() + 7)

    const year = nextReviewDate.getFullYear()
    const month = String(nextReviewDate.getMonth() + 1).padStart(2, '0')
    const day = String(nextReviewDate.getDate()).padStart(2, '0')
    const nextReviewDateStr = `${year}-${month}-${day}`

    await supabase
      .from('review_schedule')
      .upsert({
        user_id: userId,
        word_id: wordId,
        book_id: bookId,
        review_count: 0,
        next_review_date: nextReviewDateStr,
        interval_days: 7,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id,word_id,book_id'
      })
  }

  // 2. 检查并更新今日任务
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`

  const { data: todayTask } = await supabase
    .from('daily_task_records')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('task_date', today)
    .maybeSingle()

  if (todayTask) {
    // 检查单词是否在今日任务中
    const newWords = Array.isArray(todayTask.new_words)
      ? todayTask.new_words.map((w: any) => typeof w === 'string' ? w : w.word_id || w.id)
      : []
    const reviewWords = Array.isArray(todayTask.review_words)
      ? todayTask.review_words.map((w: any) => typeof w === 'string' ? w : w.word_id || w.id)
      : []
    const allWords = [...newWords, ...reviewWords]

    if (allWords.includes(wordId)) {
      // 更新完成单词列表
      let completed = Array.isArray(todayTask.completed_words)
        ? todayTask.completed_words
        : []

      if (status === 'known') {
        // 标记为"认识"，添加到完成列表
        if (!completed.includes(wordId)) {
          completed.push(wordId)
        }
      } else {
        // 标记为"fuzzy"或"unknown"，从完成列表移除
        completed = completed.filter((id: string) => id !== wordId)
      }

      // 计算未完成的词 ✨ v4.0
      const uncompleted = allWords.filter((id: string) => !completed.includes(id))

      // 检查是否全部完成
      const allCompleted = completed.length === allWords.length

      const updateData: any = {
        completed_words: completed,
        uncompleted_words: uncompleted, // ✨ v4.0 新增
        all_completed: allCompleted,
        updated_at: new Date().toISOString()
      }

      // 如果全部完成，记录完成时间
      if (allCompleted && !todayTask.all_completed) {
        updateData.completed_at = new Date().toISOString()
      }

      await supabase
        .from('daily_task_records')
        .update(updateData)
        .eq('id', todayTask.id)
    }
  }
}

