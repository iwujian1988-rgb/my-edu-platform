/**
 * 学习计划阶段策略（Strategy Pattern）
 *
 * [Upgrade] 两阶段学习系统：通过 Strategy 模式隔离新旧逻辑
 * 设计原则：向后兼容、逻辑隔离、易于扩展
 * 文档: docs/REFACTOR_PLAN_COMPATIBILITY.md
 */

import { createClient } from '@/lib/supabase/server'

// ============================================
// 1. Strategy 接口定义
// ============================================

/**
 * 单词数据结构
 */
export interface Word {
  id: string
  word: string
  phonetic?: string
  meaning?: string
}

/**
 * 学习阶段策略接口
 *
 * [Upgrade] 两阶段系统：统一的策略接口，支持新旧逻辑
 */
export interface PhaseStrategy {
  /**
   * 获取新学单词
   *
   * @param userId 用户 ID
   * @param bookId 单词书 ID
   * @param limit 数量限制
   * @returns 单词列表
   */
  getNewWords(userId: string, bookId: string, limit: number): Promise<Word[]>

  /**
   * 获取复习单词
   *
   * @param userId 用户 ID
   * @param bookId 单词书 ID
   * @param limit 数量限制
   * @returns 单词列表（带复习次数）
   */
  getReviewWords(
    userId: string,
    bookId: string,
    limit: number
  ): Promise<Array<{ word_id: string; review_count: number; source?: string }>>

  /**
   * 检测阶段是否完成
   *
   * @param userId 用户 ID
   * @param bookId 单词书 ID
   * @returns 是否完成
   */
  isCompleted(userId: string, bookId: string): Promise<boolean>
}

// ============================================
// 2. Legacy 策略（v4.0 逻辑 - 向后兼容）
// ============================================

/**
 * Legacy 策略：保持 v4.0 逻辑不变
 *
 * [Legacy] v4.0: 新词 = status != 'known'
 * [Legacy] v4.0: 完成检测 = 全部 known
 */
export class LegacyPhaseStrategy implements PhaseStrategy {
  async getNewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    const supabase = await createClient()

    if (limit <= 0) return []

    // [Legacy] v4.0 逻辑：查询 status != 'known' 的词
    const { data, error } = await supabase.rpc('get_words_not_known', {
      p_user_id: userId,
      p_book_id: bookId,
      p_limit: limit
    })

    if (error) {
      console.error('[LegacyStrategy] 查询新词失败:', error)
      throw new Error(`查询新词失败: ${error.message}`)
    }

    return (data || []).map((w: any) => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic || '',
      meaning: w.definition || ''
    }))
  }

  async getReviewWords(
    userId: string,
    bookId: string,
    limit: number
  ): Promise<Array<{ word_id: string; review_count: number }>> {
    const supabase = await createClient()

    // [Legacy] v4.0 逻辑：只复习标记为 known 的词
    const { data, error } = await supabase
      .from('review_schedule')
      .select('word_id, review_count')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .lte('next_review_date', new Date().toISOString().split('T')[0])
      .order('next_review_date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[LegacyStrategy] 查询复习词失败:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      word_id: row.word_id,
      review_count: row.review_count
    }))
  }

  async isCompleted(userId: string, bookId: string): Promise<boolean> {
    const supabase = await createClient()

    // [Legacy] v4.0 逻辑：全部标记为 known 才算完成
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('total_words')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      console.error('[LegacyStrategy] 查询词书失败:', bookError)
      return false
    }

    const { count: knownCount } = await supabase
      .from('word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('status', 'known')

    return (knownCount || 0) >= book.total_words
  }
}

// ============================================
// 3. Learning 策略（学习阶段 - 新逻辑）
// ============================================

/**
 * Learning 策略：学习阶段逻辑
 *
 * [Upgrade] 两阶段系统: 新词 = 完全未标记（word_progress 表无记录）
 * [Upgrade] 两阶段系统: 完成检测 = 全部标记过（任何状态）
 */
export class LearningPhaseStrategy implements PhaseStrategy {
  async getNewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    const supabase = await createClient()

    if (limit <= 0) return []

    // [Upgrade] 两阶段系统：查询完全未标记的词
    const { data, error } = await supabase.rpc('get_unmarked_words', {
      p_user_id: userId,
      p_book_id: bookId,
      p_limit: limit
    })

    if (error) {
      console.error('[LearningStrategy] 查询新词失败:', error)
      // 降级到旧逻辑（向后兼容）
      console.warn('[LearningStrategy] 降级到 Legacy 策略')
      return await new LegacyPhaseStrategy().getNewWords(userId, bookId, limit)
    }

    return (data || []).map((w: any) => ({
      id: w.id,
      word: w.word,
      phonetic: w.phonetic || '',
      meaning: w.definition || ''
    }))
  }

  async getReviewWords(
    userId: string,
    bookId: string,
    limit: number
  ): Promise<Array<{ word_id: string; review_count: number }>> {
    const supabase = await createClient()

    // [Upgrade] 学习阶段：复习标记为 known 且到期的词（与 v4.0 保持一致）
    const { data, error } = await supabase
      .from('review_schedule')
      .select('word_id, review_count')
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .lte('next_review_date', new Date().toISOString().split('T')[0])
      .order('next_review_date', { ascending: true })
      .limit(limit)

    if (error) {
      console.error('[LearningStrategy] 查询复习词失败:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      word_id: row.word_id,
      review_count: row.review_count
    }))
  }

  async isCompleted(userId: string, bookId: string): Promise<boolean> {
    const supabase = await createClient()

    // [Upgrade] 两阶段系统：检测学习阶段是否完成（所有词都标记过）
    const { data, error } = await supabase.rpc('check_learning_phase_completion', {
      p_user_id: userId,
      p_book_id: bookId
    })

    if (error) {
      console.error('[LearningStrategy] 检测完成状态失败:', error)
      // 降级到旧逻辑（向后兼容）
      return await new LegacyPhaseStrategy().isCompleted(userId, bookId)
    }

    return data || false
  }
}

// ============================================
// 4. Review 策略（复习阶段 - 新逻辑）
// ============================================

/**
 * Review 策略：复习阶段逻辑
 *
 * [Upgrade] 两阶段系统: 不生成新词（0个）
 * [Upgrade] 两阶段系统: 复习所有标记过的词（不只 known）
 * [Upgrade] 两阶段系统: 永不完成
 */
export class ReviewPhaseStrategy implements PhaseStrategy {
  async getNewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    // [Upgrade] 复习阶段：不生成新词
    console.log('[ReviewStrategy] 复习阶段：不生成新词')
    return []
  }

  async getReviewWords(
    userId: string,
    bookId: string,
    limit: number
  ): Promise<Array<{ word_id: string; review_count: number }>> {
    const supabase = await createClient()

    // [Upgrade] 复习阶段：复习所有标记过且到期的词（不只 known）
    const { data, error } = await supabase.rpc('get_due_review_words_all', {
      p_user_id: userId,
      p_book_id: bookId,
      p_limit: limit
    })

    if (error) {
      console.error('[ReviewStrategy] 查询复习词失败:', error)
      // 降级到 Learning 策略（向后兼容）
      return await new LearningPhaseStrategy().getReviewWords(userId, bookId, limit)
    }

    return (data || []).map((row: any) => ({
      word_id: row.word_id,
      review_count: row.review_count
    }))
  }

  async isCompleted(): Promise<boolean> {
    // [Upgrade] 复习阶段：永不完成
    return false
  }
}

// ============================================
// 5. Strategy 工厂（路由逻辑）
// ============================================

/**
 * Strategy 工厂类
 *
 * [Upgrade] 两阶段系统：根据阶段字段选择对应的策略
 * 支持：legacy / learning / review
 */
export class PhaseStrategyFactory {
  private strategies: Map<string, PhaseStrategy>

  constructor() {
    this.strategies = new Map([
      ['legacy', new LegacyPhaseStrategy()],      // v4.0 逻辑（兼容模式）
      ['learning', new LearningPhaseStrategy()],  // 学习阶段（新逻辑）
      ['review', new ReviewPhaseStrategy()]       // 复习阶段（新逻辑）
    ])
  }

  /**
   * 根据阶段获取对应的策略
   *
   * @param phase 阶段标识（legacy/learning/review）
   * @returns 对应的策略实例
   */
  getStrategy(phase?: string): PhaseStrategy {
    // 如果没有 phase 字段，使用 legacy 策略（向后兼容）
    const strategyKey = phase || 'legacy'

    const strategy = this.strategies.get(strategyKey)

    if (!strategy) {
      console.warn(`[StrategyFactory] 未知的阶段: ${strategyKey}，降级到 legacy 策略`)
      return this.strategies.get('legacy')!
    }

    console.log(`[StrategyFactory] 使用策略: ${strategyKey}`)
    return strategy
  }
}

// ============================================
// 6. 导出便捷函数
// ============================================

/**
 * 获取用户的学习计划策略
 *
 * [Upgrade] 两阶段系统：自动检测并返回对应策略
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID
 * @returns 对应的策略实例
 */
export async function getPhaseStrategyForUser(
  userId: string,
  bookId: string
): Promise<PhaseStrategy> {
  const supabase = await createClient()

  // 查询学习计划（包含 phase 字段）
  const { data: plan, error } = await supabase
    .from('learning_plans')
    .select('phase')
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('status', 'active')
    .single()

  if (error || !plan) {
    console.error('[getPhaseStrategyForUser] 查询学习计划失败:', error)
    // 降级到 legacy 策略（向后兼容）
    return new LegacyPhaseStrategy()
  }

  // 根据阶段返回对应策略
  return new PhaseStrategyFactory().getStrategy(plan.phase)
}
