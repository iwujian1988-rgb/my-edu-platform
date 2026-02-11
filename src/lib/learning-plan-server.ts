/**
 * 学习计划核心业务逻辑库
 *
 * 独立实现，不依赖 words-server.ts（彻底解耦）
 * 文档: tech-design-learning-plan.md
 * PRD: prdeveryday.md
 */

import { createClient } from '@/lib/supabase/server'
import type {
  LearningPlan,
  DailyTaskRecord,
  WordWithStatus,
  TodayTaskResponse,
  CreateLearningPlanRequest
} from '@/types/learning-plan'
// [Upgrade] 两阶段系统：导入 Strategy 模式
import {
  getPhaseStrategyForUser,
  type PhaseStrategy
} from '@/lib/learning-plan-strategies'

// ============================================
// 核心函数：创建学习计划
// ============================================

/**
 * 创建新的学习计划
 *
 * @param userId 用户 ID
 * @param request 创建计划请求
 * @returns 创建的学习计划
 */
export async function createLearningPlan(
  userId: string,
  request: CreateLearningPlanRequest
): Promise<LearningPlan> {
  const supabase = await createClient()

  // 1. 获取单词书信息
  const { data: book, error: bookError } = await supabase
    .from('books')
    .select('id, title, total_words')
    .eq('id', request.bookId)
    .single()

  if (bookError || !book) {
    throw new Error('单词书不存在')
  }

  // 2. ✨ v4.0: 预计结束日期将动态计算，初始设为 null
  // 之后的查询会根据实际进度动态更新此字段

  // 3. 创建学习计划 ✨ v4.0
  const { data: plan, error: planError } = await supabase
    .from('learning_plans')
    .insert({
      user_id: userId,
      book_id: request.bookId,
      daily_new_words: request.dailyNewWords,
      review_ratio: request.reviewRatio, // ✨ v4.0: 复习比例
      total_words: book.total_words,
      start_date: new Date().toISOString(),
      estimated_end_date: null, // ✨ v4.0: 动态计算
      status: 'active',
      phase: 'learning'  // [Upgrade] 两阶段系统：默认启用学习阶段
    })
    .select()
    .single()

  if (planError || !plan) {
    throw new Error(`创建学习计划失败: ${planError?.message}`)
  }

  // ✨ 自动生成今日任务（提升用户体验）
  try {
    await generateTodayTask(userId, request.bookId)
    console.log('[createLearningPlan] ✅ 自动生成今日任务成功')
  } catch (error: any) {
    // 生成任务失败不影响计划创建，只记录错误
    console.error('[createLearningPlan] ⚠️ 自动生成今日任务失败:', error)
  }

  return plan as LearningPlan
}

// ============================================
// 核心函数：生成今日任务（系统大脑）
// ============================================

/**
 * 生成今日学习任务
 *
 * 算法流程：
 * 1. 查询用户的学习计划
 * 2. 获取今日需要复习的单词数量（调用数据库函数）
 * 3. 计算剩余名额：remaining = daily_max_words - review_count
 * 4. 计算新学词数量：new_count = Math.min(daily_new_words, remaining)
 * 5. 如果复习过多，new_count 可能为 0
 * 6. 从 words 表中随机抽取 new_count 个未学过的单词
 * 7. 创建今日任务记录
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID
 * @returns 今日任务记录（包含单词详情）
 */
export async function generateTodayTask(
  userId: string,
  bookId: string
): Promise<TodayTaskResponse> {
  const supabase = await createClient()

  // 1. 获取活跃的学习计划
  const { data: plan, error: planError } = await supabase
    .from('learning_plans')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('status', 'active')
    .single()

  if (planError || !plan) {
    throw new Error('未找到活跃的学习计划')
  }

  const learningPlan = plan as LearningPlan

  // 2. 检查今日任务是否已存在
  // 🔧 修复：使用本地时间而不是 UTC 时间
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`

  const { data: existingTask, error: taskError } = await supabase
    .from('daily_task_records')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('task_date', today)
    .single()

  if (existingTask && !taskError) {
    // 今日任务已存在，返回带单词详情的响应
    return await enrichTodayTaskWithWords(userId, bookId, existingTask as DailyTaskRecord)
  }

  // [Upgrade] 两阶段系统：获取用户对应的策略
  const strategy: PhaseStrategy = await getPhaseStrategyForUser(userId, bookId)

  // ✨ v4.0 新逻辑：固定数量的新学词
  const newWordsCount = learningPlan.daily_new_words

  // 3. [Upgrade] 两阶段系统：通过 Strategy 获取新学单词（支持新旧逻辑）
  const newWords = await strategy.getNewWords(userId, bookId, newWordsCount)

  // 4. 查询昨天未完成的词（优先作为今天的复习词）✨ v4.0
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`

  const { data: yesterdayTask } = await supabase
    .from('daily_task_records')
    .select('new_words, review_words, completed_words, all_completed')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('task_date', yesterdayStr)
    .single()

  let yesterdayUncompletedWords: string[] = []
  if (yesterdayTask && !yesterdayTask.all_completed) {
    // 计算昨天未完成的词
    const yesterdayAllWords = [...(yesterdayTask.new_words || []), ...(yesterdayTask.review_words || [])]
    const yesterdayCompletedWords = yesterdayTask.completed_words || []
    yesterdayUncompletedWords = yesterdayAllWords.filter(id => !yesterdayCompletedWords.includes(id))
  }

  // 5. 计算需要的复习词数量 ✨ v4.0 优化
  const expectedReviewCount = newWordsCount * learningPlan.review_ratio
  const remainingReviewSlots = expectedReviewCount - yesterdayUncompletedWords.length

  // 6. [Upgrade] 两阶段系统：通过 Strategy 获取复习词（支持新旧逻辑）
  const dueReviewWordsLimit = Math.max(0, remainingReviewSlots)
  const allDueReviewWords = dueReviewWordsLimit > 0
    ? await strategy.getReviewWords(userId, bookId, dueReviewWordsLimit)
    : []

  // 7. 合并复习词（昨天未完成的优先）✨ v4.0
  const allReviewWords = [
    ...yesterdayUncompletedWords.map(id => ({ word_id: id, review_count: 0, source: 'yesterday' })),
    ...allDueReviewWords.map(w => ({ ...w, source: 'due' }))
  ]

  // 8. 最终复习词（二次保险，确保不超过预期数量）✨ v4.0 优化
  const limitedReviewWords = allReviewWords.slice(0, expectedReviewCount)

  // [Upgrade] 两阶段系统：检测是否需要切换到复习阶段
  if (learningPlan.phase === 'learning' || learningPlan.phase === 'legacy') {
    const isCompleted = await strategy.isCompleted(userId, bookId)
    if (isCompleted) {
      console.log('[generateTodayTask] 学习阶段完成，切换到复习阶段')
      // 调用数据库函数切换阶段
      await supabase.rpc('transition_to_review_phase', {
        p_user_id: userId,
        p_book_id: bookId
      })
    }
  }

  // 8. 计算是第几天（查询之前的任务数量 + 1）
  const { count: previousTasksCount } = await supabase
    .from('daily_task_records')
    .select('*', { count: 'exact', head: false })
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .lt('task_date', today)

  const planDay = (previousTasksCount || 0) + 1

  // 9. 创建今日任务记录 ✨ v4.0
  const reviewWordsToInsert = limitedReviewWords.map(w => w.word_id)

  const { data: task, error: createError } = await supabase
    .from('daily_task_records')
    .insert({
      user_id: userId,
      book_id: bookId,
      plan_id: learningPlan.id,
      task_date: today,
      plan_day: planDay,
      new_words: newWords.map(w => w.id),
      review_words: reviewWordsToInsert,
      completed_words: [],
      uncompleted_words: [], // 今日刚开始，还没有未完成的词 ✨ v4.0
      // total_words 是 GENERATED ALWAYS AS 字段，不能手动设置
      all_completed: false,
      started_at: new Date().toISOString()
    })
    .select()
    .single()

  // 🔧 高并发修复：处理唯一性约束冲突（竞态条件）
  if (createError) {
    // 如果是唯一性约束冲突（23505），说明其他请求已经创建了任务
    // 重新查询并返回
    if (createError.code === '23505' || createError.message.includes('unique')) {
      const { data: existingTask, error: queryError } = await supabase
        .from('daily_task_records')
        .select('*')
        .eq('user_id', userId)
        .eq('book_id', bookId)
        .eq('task_date', today)
        .single()

      if (queryError || !existingTask) {
        throw new Error(`并发冲突后查询失败: ${queryError?.message}`)
      }

      return await enrichTodayTaskWithWords(userId, bookId, existingTask as DailyTaskRecord)
    }

    // 其他错误，抛出原始错误
    throw new Error(`创建今日任务失败: ${createError?.message}`)
  }

  if (!task) {
    throw new Error('创建今日任务失败: 未返回数据')
  }

  // 8. 返回带单词详情的响应
  return await enrichTodayTaskWithWords(userId, bookId, task as DailyTaskRecord)
}

/**
 * 为今日任务添加单词详情（优化版本 - 并行查询）
 *
 * [Upgrade] 两阶段系统：添加新字段（phase, marked_words, known_words, etc.）
 */
async function enrichTodayTaskWithWords(
  userId: string,
  bookId: string,
  task: DailyTaskRecord
): Promise<TodayTaskResponse> {
  const supabase = await createClient()

  // [Upgrade] 两阶段系统：查询当前阶段
  const { data: plan } = await supabase
    .from('learning_plans')
    .select('phase')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('status', 'active')
    .single()

  const currentPhase = plan?.phase || 'legacy'

  // 合并所有单词 ID
  const allWordIds = [...task.new_words, ...task.review_words]

  if (allWordIds.length === 0) {
    return {
      ...task,
      new_words: [],
      review_words: [],
      // [Upgrade] 两阶段系统：添加新字段
      phase: currentPhase,
      marked_words: [],
      known_words: [],
      fuzzy_words: [],
      unknown_words: []
    }
  }

  // 🔧 计算今天的时间范围（用于统计今日学习记录）
  const todayStart = new Date()
  todayStart.setHours(0, 0, 0, 0)
  const todayEnd = new Date()
  todayEnd.setHours(23, 59, 59, 999)

  // ⚡ 性能优化：并行查询所有需要的数据
  const [wordsResult, progressResult, scheduleResult, todayProgressResult] = await Promise.all([
    // 查询单词详情
    supabase
      .from('words')
      .select('id, word, phonetic, definition, example_sentence')
      .in('id', allWordIds),

    // 查询单词状态（所有历史记录，用于显示单词的当前状态）
    supabase
      .from('word_progress')
      .select('word_id, status, practice_count')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .in('word_id', allWordIds),

    // 查询复习计划
    supabase
      .from('review_schedule')
      .select('word_id, review_count, next_review_date')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .in('word_id', allWordIds),

    // 🔧 FIX: 只查询今天创建的学习记录（用于统计今日已标记）
    supabase
      .from('word_progress')
      .select('word_id, status')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .in('word_id', allWordIds)
      .gte('created_at', todayStart.toISOString())
      .lte('created_at', todayEnd.toISOString())
  ])

  const { data: words, error: wordsError } = wordsResult
  if (wordsError || !words) {
    throw new Error(`查询单词详情失败: ${wordsError?.message}`)
  }

  // 构建映射
  const progressMap = new Map(progressResult.data?.map(p => [p.word_id, p]) || [])
  const scheduleMap = new Map(scheduleResult.data?.map(s => [s.word_id, s]) || [])

  // [Upgrade] 两阶段系统：统计各状态的单词ID（只统计今天的学习记录）
  const markedWordIds: string[] = []
  const knownWordIds: string[] = []
  const fuzzyWordIds: string[] = []
  const unknownWordIds: string[] = []

  // 🔧 FIX: 只统计今天创建的学习记录，而不是所有历史记录
  // 这样可以避免：今天第一次使用，但显示"15/35 已标记"的问题
  todayProgressResult.data?.forEach(p => {
    markedWordIds.push(p.word_id)
    if (p.status === 'known') knownWordIds.push(p.word_id)
    else if (p.status === 'fuzzy') fuzzyWordIds.push(p.word_id)
    else if (p.status === 'unknown') unknownWordIds.push(p.word_id)
  })

  // 组装新学词
  const newWordsWithStatus: WordWithStatus[] = task.new_words
    .map(wordId => {
      const word = words.find(w => w.id === wordId)
      const progress = progressMap.get(wordId)
      const schedule = scheduleMap.get(wordId)

      return {
        id: word!.id,
        word: word!.word,
        phonetic: word!.phonetic || '',
        meaning: word!.definition || '',
        example: word!.example_sentence || '',
        status: progress?.status || 'new',
        practice_count: progress?.practice_count || 0,
        review_count: schedule?.review_count || 0,
        next_review_date: schedule?.next_review_date,
        type: 'new' as const
      }
    })

  // 组装复习词
  const reviewWordsWithStatus: WordWithStatus[] = task.review_words
    .map(wordId => {
      const word = words.find(w => w.id === wordId)
      const progress = progressMap.get(wordId)
      const schedule = scheduleMap.get(wordId)

      return {
        id: word!.id,
        word: word!.word,
        phonetic: word!.phonetic || '',
        meaning: word!.definition || '',
        example: word!.example_sentence || '',
        status: progress?.status || 'unknown',
        practice_count: progress?.practice_count || 0,
        review_count: schedule?.review_count || 0,
        next_review_date: schedule?.next_review_date,
        type: 'review' as const
      }
    })

  return {
    ...task,
    new_words: newWordsWithStatus,
    review_words: reviewWordsWithStatus,
    // [Upgrade] 两阶段系统：添加新字段（保持向后兼容）
    phase: currentPhase,
    marked_words: markedWordIds,
    known_words: knownWordIds,
    fuzzy_words: fuzzyWordIds,
    unknown_words: unknownWordIds
  }
}

// ============================================
// 辅助函数：获取复习单词
// ============================================

/**
 * 获取今日需要复习的单词
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID
 * @param limit 最大数量（daily_max_words）
 * @returns 复习单词 ID 列表（按优先级排序）
 */
export async function getDueReviewWords(
  userId: string,
  bookId: string,
  limit: number
): Promise<Array<{ word_id: string; review_count: number }>> {
  const supabase = await createClient()

  // 🔧 修复：使用本地时间而不是 UTC 时间
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`

  console.log('📅 [getDueReviewWords] 本地日期:', { today, now: now.toISOString() })

  // 查询到期需要复习的单词，按优先级排序
  // 优先级：过期的优先（next_review_date < 今天）
  const { data, error } = await supabase
    .from('review_schedule')
    .select('word_id, review_count, next_review_date')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .lte('next_review_date', today)
    .order('next_review_date', { ascending: true })
    .limit(limit)

  if (error) {
    throw new Error(`查询复习单词失败: ${error.message}`)
  }

  return (data || []).map((row: any) => ({
    word_id: row.word_id,
    review_count: row.review_count
  }))
}

// ============================================
// 辅助函数：获取新学单词（优化版 - 防止内存溢出）
// ============================================

/**
 * 获取未学过的单词（用于新学词）
 *
 * ✅ v4.0 改进：只查询标记为"认识"的词作为"已学过"
 * ✅ 优化版：分步查询，防止内存溢出
 *
 * 步骤：
 * 1. 只查询单词 ID（不查详情）
 * 2. 查询标记为"known"的单词 ID（只有"认识"才算学过）
 * 3. 在内存中过滤未学过的 ID
 * 4. 随机抽取指定数量
 * 5. 只查询最终抽取的 ID 的完整详情
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID
 * @param limit 数量
 * @returns 单词列表
 */
export async function getNewWordsForPlan(
  userId: string,
  bookId: string,
  limit: number
): Promise<Array<{ id: string; word: string; phonetic?: string; meaning?: string }>> {
  const supabase = await createClient()

  if (limit <= 0) {
    return []
  }

  // ✅ 优化：使用数据库函数直接查询未学过的单词（避免加载整个单词表）
  const { data, error } = await supabase.rpc('get_new_words_for_learning', {
    p_user_id: userId,
    p_book_id: bookId,
    p_limit: limit
  })

  if (error) {
    // 如果数据库函数不存在，回退到原来的方法（但要限制查询数量）
    console.warn('⚠️ 数据库函数 get_new_words_for_learning 不存在，使用备用方法')
    return await getNewWordsForPlanFallback(userId, bookId, limit)
  }

  if (!data || data.length === 0) {
    return []
  }

  // 映射数据库字段到接口字段 (definition -> meaning)
  return data.map((w: any) => ({
    id: w.id,
    word: w.word,
    phonetic: w.phonetic,
    meaning: w.definition
  }))
}

/**
 * 备用方法：如果数据库函数不存在，使用这个方法
 * ⚠️ 这个方法使用 Supabase 的查询能力，避免加载整个单词表
 */
async function getNewWordsForPlanFallback(
  userId: string,
  bookId: string,
  limit: number
): Promise<Array<{ id: string; word: string; phonetic?: string; meaning?: string }>> {
  const supabase = await createClient()

  // 使用更大的限制来确保能获取足够的未学单词
  // 策略：查询 limit * 10 个单词，然后过滤，如果不够就递归查询更多
  const BATCH_SIZE = limit * 10
  let offset = 0
  let result: Array<{ id: string; word: string; phonetic?: string; meaning?: string }> = []

  // 第一步：查询已标记为"认识"的单词 ID（只查询一次）
  const { data: learnedWords, error: learnedError } = await supabase
    .from('word_progress')
    .select('word_id')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('status', 'known')

  if (learnedError) {
    throw new Error(`查询已学单词失败: ${learnedError.message}`)
  }

  const learnedIds = new Set(learnedWords?.map(w => w.word_id) || [])

  // 第二步：循环查询直到获取足够的未学单词
  while (result.length < limit) {
    // 查询单批单词
    const { data: words, error: wordsError } = await supabase
      .from('words')
      .select('id, word, phonetic, definition')
      .eq('book_id', bookId)
      .range(offset, offset + BATCH_SIZE - 1)

    if (wordsError || !words || words.length === 0) {
      // 没有更多单词了
      break
    }

    // 过滤未学过的单词
    const unlearnedWords = words.filter(w => !learnedIds.has(w.id))
    result.push(...unlearnedWords.map(w => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic,
      meaning: w.definition
    })))

    // 移动偏移量
    offset += BATCH_SIZE

    // 如果这批单词都是学过的，继续查询下一批
    if (unlearnedWords.length === 0 && words.length === BATCH_SIZE) {
      continue
    }

    // 如果已经获取足够的单词，停止
    if (result.length >= limit) {
      break
    }
  }

  // 第三步：随机抽取指定数量
  const shuffled = result.sort(() => Math.random() - 0.5)
  const selected = shuffled.slice(0, limit)

  return selected
}

// ============================================
// 辅助函数：查询学习计划
// ============================================

/**
 * 获取用户的学习计划
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID（可选）
 * @returns 学习计划列表
 */
export async function getLearningPlans(
  userId: string,
  bookId?: string
): Promise<LearningPlan[]> {
  const supabase = await createClient()

  let query = supabase
    .from('learning_plans')
    .select('*')
    .eq('user_id', userId)

  if (bookId) {
    query = query.eq('book_id', bookId)
  }

  const { data, error } = await query

  if (error) {
    throw new Error(`查询学习计划失败: ${error.message}`)
  }

  return (data || []) as LearningPlan[]
}

/**
 * 获取活跃的学习计划
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID
 * @returns 学习计划或 null
 */
export async function getActiveLearningPlan(
  userId: string,
  bookId: string
): Promise<LearningPlan | null> {
  const plans = await getLearningPlans(userId, bookId)
  return plans.find(p => p.status === 'active') || null
}

// ============================================
// 辅助函数：获取今日任务
// ============================================

/**
 * 获取今日任务（如果不存在则生成）
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID
 * @returns 今日任务
 */
export async function getTodayTask(
  userId: string,
  bookId: string
): Promise<TodayTaskResponse> {
  const supabase = await createClient()

  // 🔧 修复：使用本地时间而不是 UTC 时间
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const today = `${year}-${month}-${day}`

  console.log('📅 [getTodayTask] 本地日期:', { today, now: now.toISOString() })

  // 先查询今日任务是否存在
  const { data: existingTask } = await supabase
    .from('daily_task_records')
    .select('*')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('task_date', today)
    .single()

  if (existingTask) {
    console.log('✅ [getTodayTask] 找到今日任务:', { taskDate: existingTask.task_date })
    // 今日任务已存在，返回带详情的响应
    return await enrichTodayTaskWithWords(userId, bookId, existingTask as DailyTaskRecord)
  }

  console.log('⚠️ [getTodayTask] 今日任务不存在，生成新任务')
  // 今日任务不存在，生成新的
  return await generateTodayTask(userId, bookId)
}

// ============================================
// 辅助函数：计算学习计划进度（优化版 - 使用 RPC）
// ============================================

/**
 * 计算学习计划的总体进度
 *
 * ✅ 优化：直接调用数据库 RPC 函数，避免多次查询
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID
 * @returns 进度统计
 */
export async function getLearningPlanProgress(
  userId: string,
  bookId: string
): Promise<{
  totalWords: number
  learnedWords: number
  progressPercentage: number
  streakDays: number
  // ✨ v4.0 新增字段
  completedDays: number
  remainingDays: number
  estimatedEndDate: string
  reviewRatio: number
}> {
  const supabase = await createClient()

  // 直接调用数据库中的 RPC 函数
  const { data, error } = await supabase.rpc('get_learning_plan_progress', {
    p_user_id: userId,
    p_book_id: bookId
  })

  if (error) {
    throw new Error(`查询学习计划进度失败: ${error.message}`)
  }

  if (!data) {
    throw new Error('未找到学习计划进度数据')
  }

  // 将数据库的 snake_case 映射为 TypeScript 的 camelCase
  const progress = data as any

  return {
    totalWords: progress.total_words || 0,
    learnedWords: progress.learned_words || 0,
    progressPercentage: Math.round((progress.progress_percentage || 0) * 100) / 100,
    streakDays: progress.streak_days || 0,
    // ✨ v4.0 新增字段
    completedDays: progress.completed_days || 0,
    remainingDays: progress.remaining_days || 0,
    estimatedEndDate: progress.estimated_end_date || '',
    reviewRatio: progress.review_ratio || 3
  }
}

// ============================================
// 核心函数：删除学习计划
// ============================================

/**
 * 删除学习计划
 *
 * 注意：这会级联删除相关的：
 * - 每日任务记录 (daily_task_records)
 * - 复习计划 (review_schedule) - 通过数据库触发器
 *
 * @param userId 用户 ID
 * @param planId 学习计划 ID
 * @returns 是否成功
 */
export async function deleteLearningPlan(
  userId: string,
  planId: string
): Promise<boolean> {
  const supabase = await createClient()

  // 先验证计划属于当前用户
  const { data: plan, error: planError } = await supabase
    .from('learning_plans')
    .select('id, book_id')
    .eq('id', planId)
    .eq('user_id', userId)
    .single()

  if (planError) {
    console.error('查询学习计划失败:', planError)
    throw new Error('查询学习计划失败')
  }

  if (!plan) {
    throw new Error('学习计划不存在或无权删除')
  }

  // ===== 显式删除 daily_task_records 记录（不依赖数据库级联） =====
  const { error: tasksDeleteError } = await supabase
    .from('daily_task_records')
    .delete()
    .eq('plan_id', planId)

  if (tasksDeleteError) {
    console.error('删除每日任务记录失败:', tasksDeleteError)
    // 非关键错误，继续执行
  }

  // ===== 删除学习计划 =====
  const { error: deleteError } = await supabase
    .from('learning_plans')
    .delete()
    .eq('id', planId)
    .eq('user_id', userId)

  if (deleteError) {
    throw new Error(`删除学习计划失败: ${deleteError.message}`)
  }

  return true
}

/**
 * 获取单个学习计划的详情
 *
 * @param userId 用户 ID
 * @param planId 学习计划 ID
 * @returns 学习计划或 null
 */
export async function getLearningPlan(
  userId: string,
  planId: string
): Promise<LearningPlan | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('learning_plans')
    .select('*')
    .eq('id', planId)
    .eq('user_id', userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as LearningPlan
}

/**
 * 更新学习计划设置
 *
 * @param userId 用户 ID
 * @param planId 学习计划 ID
 * @param updates 更新字段
 * @returns 更新后的学习计划
 */
export async function updateLearningPlan(
  userId: string,
  planId: string,
  updates: {
    dailyNewWords?: number
    reviewRatio?: number  // ✨ v4.0
    status?: LearningPlanStatus
  }
): Promise<LearningPlan> {
  const supabase = await createClient()

  // 构建更新数据（使用数据库字段名）
  const updateData: any = {}

  if (updates.dailyNewWords !== undefined) {
    updateData.daily_new_words = updates.dailyNewWords
  }

  if (updates.reviewRatio !== undefined) {  // ✨ v4.0
    updateData.review_ratio = updates.reviewRatio
  }

  if (updates.status !== undefined) {
    updateData.status = updates.status
  }

  // ✨ v4.0: 移除静态的结束日期计算，现在由动态计算逻辑处理

  const { data, error } = await supabase
    .from('learning_plans')
    .update(updateData)
    .eq('id', planId)
    .eq('user_id', userId)
    .select()
    .single()

  if (error || !data) {
    throw new Error(`更新学习计划失败: ${error?.message}`)
  }

  return data as LearningPlan
}
