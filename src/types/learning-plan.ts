/**
 * 学习计划系统类型定义
 *
 * 与数据库表结构保持一致
 * 文档: tech-design-learning-plan.md
 */

// ============================================
// 学习计划相关类型
// ============================================

/**
 * 学习计划状态枚举
 */
export type LearningPlanStatus = 'active' | 'paused' | 'completed' | 'delayed'

/**
 * 学习计划阶段枚举
 *
 * [Upgrade] 两阶段系统：新增阶段概念
 */
export type LearningPlanPhase = 'legacy' | 'learning' | 'review'

/**
 * 学习计划实体（对应 learning_plans 表）
 * 版本: v4.0
 * [Upgrade] 两阶段系统：添加 phase 字段
 */
export interface LearningPlan {
  id: string
  user_id: string
  book_id: string
  daily_new_words: number      // 每天新学单词数量（1-100）
  review_ratio: number         // 复习比例（1=1:1, 2=1:2, 3=1:3, 4=1:4） ✨ v4.0
  total_words: number          // 单词书总词数
  start_date: string           // 开始日期（ISO 8601）
  estimated_end_date?: string  // 预计结束日期（动态更新） ✨ v4.0
  actual_end_date?: string     // 实际完成日期
  status: LearningPlanStatus   // 计划状态
  phase?: LearningPlanPhase    // [Upgrade] 两阶段系统：学习阶段（可选，默认 legacy）
  learning_phase_completed_at?: string  // [Upgrade] 学习阶段完成时间
  review_phase_started_at?: string      // [Upgrade] 复习阶段开始时间
  created_at: string           // 创建时间（ISO 8601）
  updated_at: string           // 更新时间（ISO 8601）
}

/**
 * 创建学习计划请求
 * 版本: v4.0
 */
export interface CreateLearningPlanRequest {
  bookId: string               // 单词书 ID
  dailyNewWords: number        // 每天新学单词数量（1-100）
  reviewRatio: number          // 复习比例（1/2/3/4） ✨ v4.0
}

/**
 * 学习计划进度统计
 * 版本: v4.0
 * [Upgrade] 两阶段系统：添加新字段（marked_words, phase, etc.）
 */
export interface LearningPlanProgress {
  plan_id: string
  total_words: number

  // [Legacy] v4.0 字段（保持兼容）
  learned_words: number          // 只统计 known
  progress_percentage: number   // 基于 learned_words

  // [Upgrade] 两阶段系统：新增字段
  phase?: LearningPlanPhase           // 当前阶段（legacy/learning/review）
  marked_words?: number              // 统计所有标记过的词
  marked_percentage?: number         // 基于 marked_words 的进度
  known_words?: number               // 统计 known
  fuzzy_words?: number               // 统计 fuzzy
  unknown_words?: number             // 统计 unknown
  learning_phase_completed_at?: string // 学习阶段完成时间
  review_phase_started_at?: string   // 复习阶段开始时间

  total_tasks: number
  completed_tasks: number
  streak_days: number          // 连续打卡天数
  daily_new_words: number
  review_ratio: number         // 复习比例 ✨ v4.0
  // ✨ v4.0 新增字段
  completedDays?: number        // 已完成天数
  remainingDays?: number        // 剩余天数（动态计算）
  estimatedEndDate?: string     // 预计结束日期（动态计算）
}

// ============================================
// 复习计划相关类型
// ============================================

/**
 * 复习间隔（天）
 */
export type ReviewInterval = 7 | 15 | 30

/**
 * 复习计划实体（对应 review_schedule 表）
 */
export interface ReviewSchedule {
  id: string
  user_id: string
  word_id: string
  book_id: string
  review_count: number         // 连续标记"known"的次数（0/1/2/3+）
  next_review_date: string     // 下次复习日期（ISO 8601）
  interval_days: ReviewInterval // 当前复习间隔：7/15/30
  created_at: string
  updated_at: string
}

/**
 * 复习单词详情（包含单词信息）
 */
export interface ReviewWordDetail extends ReviewSchedule {
  word: string                 // 单词拼写
  phonetic?: string            // 音标
  meaning?: string             // 释义
}

// ============================================
// 每日任务相关类型
// ============================================

/**
 * 每日任务记录实体（对应 daily_task_records 表）
 * 版本: v4.0
 */
export interface DailyTaskRecord {
  id: string
  user_id: string
  book_id: string
  plan_id: string              // 关联的学习计划 ID
  task_date: string            // 任务日期（ISO 8601）
  plan_day: number             // 学习计划的第几天（1/2/3...）
  new_words: string[]          // 新学词 ID 数组
  review_words: string[]       // 复习词 ID 数组
  completed_words: string[]    // 已完成（标记 known）的词 ID 数组
  uncompleted_words: string[]  // 未完成的词 ID 数组 ✨ v4.0（次日优先复习）
  total_words: number          // 总词数（自动计算）
  all_completed: boolean       // 是否全部完成
  started_at?: string          // 开始学习时间
  completed_at?: string        // 完成时间
  created_at: string
  updated_at: string
}

/**
 * 今日任务响应（包含单词详情）
 *
 * [Upgrade] 两阶段系统：添加新字段（phase, marked_words, known_words, etc.）
 */
export interface TodayTaskResponse {
  id: string
  task_date: string
  plan_day: number
  total_words: number
  new_words: WordWithStatus[]  // 新学词（包含单词详情）
  review_words: WordWithStatus[] // 复习词（包含单词详情）
  completed_words: string[]    // 已完成的词 ID
  all_completed: boolean
  started_at?: string
  completed_at?: string

  // [Upgrade] 两阶段系统：新增字段
  phase?: LearningPlanPhase           // 当前阶段（legacy/learning/review）
  marked_words?: string[]             // 已标记（任何状态）的词ID
  known_words?: string[]              // 已标记"认识"的词ID
  fuzzy_words?: string[]              // 已标记"模糊"的词ID
  unknown_words?: string[]            // 已标记"不认识"的词ID
  all_marked?: boolean                // 是否全部标记过（两阶段系统的完成标志）
}

/**
 * 单词及其状态
 */
export interface WordWithStatus {
  id: string
  word: string
  phonetic?: string
  meaning?: string
  example?: string
  status?: 'new' | 'known' | 'fuzzy' | 'unknown'
  practice_count?: number
  review_count?: number        // 复习计划中的复习次数
  next_review_date?: string
  type: 'new' | 'review'       // 在今日任务中的类型
}

// ============================================
// 统计相关类型
// ============================================

/**
 * 今日任务统计
 */
export interface TodayTaskStats {
  total_words: number          // 总词数
  new_words_count: number      // 新学词数量
  review_words_count: number   // 复习词数量
  completed_count: number      // 已完成数量
  progress: number             // 进度百分比（0-100）
  all_completed: boolean       // 是否全部完成
}

// ============================================
// API 请求/响应类型
// ============================================

/**
 * 创建学习计划 API 响应
 */
export interface CreateLearningPlanResponse {
  success: boolean
  data?: LearningPlan
  error?: string
}

/**
 * 查询学习计划 API 响应
 */
export interface GetLearningPlanResponse {
  success: boolean
  data?: LearningPlan[]
  error?: string
}

/**
 * 获取今日任务 API 响应
 */
export interface GetTodayTaskResponse {
  success: boolean
  data?: TodayTaskResponse
  error?: string
}

/**
 * 生成今日任务 API 响应
 */
export interface GenerateTodayTaskResponse {
  success: boolean
  data?: DailyTaskRecord
  message?: string            // 例如："复习词过多，已减少新学词数量"
  error?: string
}
