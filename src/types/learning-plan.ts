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
 * 学习计划实体（对应 learning_plans 表）
 * 版本: v4.0
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
 */
export interface LearningPlanProgress {
  plan_id: string
  total_words: number
  learned_words: number
  progress_percentage: number
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
