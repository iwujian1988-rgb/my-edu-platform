/**
 * 学习计划前端服务层
 *
 * 封装学习计划相关的 API 调用
 * 使用原生 fetch API（项目未安装 axios）
 */

import type {
  CreateLearningPlanRequest,
  LearningPlan,
  TodayTaskResponse,
  GetTodayTaskResponse,
  GenerateTodayTaskResponse
} from '@/types/learning-plan'

// ============================================
// API 基础配置
// ============================================

const API_BASE_URL = '/api/v3'

/**
 * 通用 fetch 封装（简化版，带 JSON 解析保护）
 */
async function fetchAPI<T>(
  url: string,
  options?: RequestInit
): Promise<T> {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    })

    // 先检查响应状态
    if (!response.ok) {
      // 尝试解析错误信息，如果失败则使用默认错误
      let errorMessage = `HTTP ${response.status}`
      try {
        const data = await response.json()
        errorMessage = data.error || errorMessage
      } catch (e) {
        console.error(`❌ 解析错误响应失败 [${url}]:`, e)
      }
      throw new Error(errorMessage)
    }

    // 解析成功响应
    try {
      const data = await response.json()
      return data as T
    } catch (e) {
      console.error(`❌ 解析成功响应失败 [${url}]:`, e)
      throw new Error('Invalid JSON response from server')
    }
  } catch (error) {
    console.error(`❌ API 请求失败 [${url}]:`, error)
    throw error
  }
}

// ============================================
// 学习计划 API
// ============================================

/**
 * 创建新的学习计划
 *
 * POST /api/v3/learning-plan
 *
 * @param data 创建计划请求
 * @returns 创建的学习计划
 */
export async function createLearningPlan(
  data: CreateLearningPlanRequest
): Promise<{ success: boolean; data?: LearningPlan }> {
  return fetchAPI<{ success: boolean; data?: LearningPlan }>(
    `${API_BASE_URL}/learning-plan`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )
}

/**
 * 查询学习计划（可选参数）
 *
 * GET /api/v3/learning-plan?bookId=xxx
 *
 * @param bookId 单词书 ID（可选）
 * @returns 学习计划列表
 */
export async function getLearningPlans(bookId?: string): Promise<{
  success: boolean
  data: LearningPlan[]
}> {
  const params = new URLSearchParams()
  if (bookId) {
    params.append('bookId', bookId)
  }

  const url = `${API_BASE_URL}/learning-plan${params.toString() ? `?${params.toString()}` : ''}`

  return fetchAPI(url)
}

// ============================================
// 今日任务 API
// ============================================

/**
 * 获取今日任务（如果不存在则自动生成）
 *
 * GET /api/v3/daily-task?bookId=xxx
 *
 * @param bookId 单词书 ID
 * @returns 今日任务
 */
export async function getTodayTask(
  bookId: string
): Promise<GetTodayTaskResponse> {
  return fetchAPI<GetTodayTaskResponse>(
    `${API_BASE_URL}/daily-task?bookId=${encodeURIComponent(bookId)}`
  )
}

/**
 * 强制生成新的今日任务
 *
 * POST /api/v3/daily-task
 *
 * @param bookId 单词书 ID
 * @returns 生成结果
 */
export async function generateTodayTask(
  bookId: string
): Promise<GenerateTodayTaskResponse> {
  return fetchAPI<GenerateTodayTaskResponse>(
    `${API_BASE_URL}/daily-task`,
    {
      method: 'POST',
      body: JSON.stringify({ bookId }),
    }
  )
}

// ============================================
// 学习计划进度 API
// ============================================

/**
 * 查询学习计划进度
 *
 * GET /api/v3/learning-plan/progress?bookId=xxx
 *
 * @param bookId 单词书 ID
 * @returns 进度统计
 */
export async function getLearningPlanProgress(bookId: string): Promise<{
  success: boolean
  data: {
    totalWords: number
    learnedWords: number
    progressPercentage: number
    streakDays: number
  }
}> {
  return fetchAPI(
    `${API_BASE_URL}/learning-plan/progress?bookId=${encodeURIComponent(bookId)}`
  )
}

/**
 * 删除学习计划
 *
 * DELETE /api/v3/learning-plan?planId=xxx
 *
 * @param planId 学习计划 ID
 * @returns 删除结果
 */
export async function deleteLearningPlan(planId: string): Promise<{
  success: boolean
  error?: string
}> {
  return fetchAPI(
    `${API_BASE_URL}/learning-plan?planId=${encodeURIComponent(planId)}`,
    {
      method: 'DELETE',
    }
  )
}

/**
 * 更新学习计划
 *
 * PUT /api/v3/learning-plan
 *
 * @param planId 学习计划 ID
 * @param data 更新数据
 * @returns 更新结果
 */
export async function updateLearningPlan(
  planId: string,
  data: {
    dailyNewWords: number
    reviewRatio: number  // ✨ v4.0
  }
): Promise<{
  success: boolean
  data?: LearningPlan
  error?: string
}> {
  return fetchAPI(
    `${API_BASE_URL}/learning-plan`,
    {
      method: 'PUT',
      body: JSON.stringify({
        planId,
        ...data
      }),
    }
  )
}

// ============================================
// 定时任务 API
// ============================================

/**
 * 手动触发今日任务生成（用于测试）
 *
 * POST /api/v3/learning-plan/schedule
 *
 * @returns 触发结果
 */
export async function triggerDailyTaskGeneration(): Promise<{
  success: boolean
  data?: {
    date: string
    generated: number
    skipped: number
    errors: number
    error_details: any[]
  }
  error?: string
}> {
  return fetchAPI(
    `${API_BASE_URL}/learning-plan/schedule`,
    {
      method: 'POST',
    }
  )
}

/**
 * 获取定时任务状态
 *
 * GET /api/v3/learning-plan/schedule
 *
 * @returns 定时任务状态
 */
export async function getScheduleStatus(): Promise<{
  success: boolean
  data?: {
    active_plans_count: number
    today_tasks_count: number
    schedule_info: {
      enabled: boolean
      schedule: string
      description: string
    }
  }
  error?: string
}> {
  return fetchAPI(`${API_BASE_URL}/learning-plan/schedule`)
}

/**
 * 检查学习计划状态
 *
 * GET /api/v3/learning-plan/status?bookId=xxx
 *
 * @param bookId 单词书 ID
 * @returns 状态信息（延迟、积压、完成进度）
 */
export async function getPlanStatus(bookId: string): Promise<{
  success: boolean
  data?: {
    delay: {
      has_plan: boolean
      is_delayed: boolean
      delayed_days: number
      last_task_date: string | null
    }
    backlog: {
      total_due: number
      overdue_count: number
      can_fit_today: number
      backlog_count: number
      has_backlog: boolean
    }
    completion: {
      has_book: boolean
      is_completed: boolean
      learned_words: number
      total_words: number
      remaining_words: number
      progress_percentage: number
    }
  }
  error?: string
}> {
  return fetchAPI(`${API_BASE_URL}/learning-plan/status?bookId=${encodeURIComponent(bookId)}`)
}

/**
 * 更新学习计划状态
 *
 * PUT /api/v3/learning-plan/status
 *
 * @param bookId 单词书 ID
 * @param status 新状态: 'active' | 'paused' | 'completed' | 'delayed'
 * @returns 更新结果
 */
export async function updatePlanStatus(
  bookId: string,
  status: 'active' | 'paused' | 'completed' | 'delayed'
): Promise<{
  success: boolean
  data?: {
    old_status: string
    new_status: string
    plan_id: string
  }
  error?: string
}> {
  return fetchAPI(`${API_BASE_URL}/learning-plan/status`, {
    method: 'PUT',
    body: JSON.stringify({ bookId, status })
  })
}

// ============================================
// 统一标记 API（核心）
// ============================================

/**
 * 统一单词标记接口 ⭐
 *
 * POST /api/v3/word-mark
 *
 * 功能：
 * - 更新 word_progress 表（单词掌握状态）
 * - 更新 review_schedule 表（复习计划）
 * - 更新 daily_task_records 表（今日任务进度）
 * - 记录 learning_records（学习历史）
 *
 * 所有学习模式（卡片、听写、单词列表等）统一调用此接口
 *
 * @param params 标记参数
 * @returns 标记结果
 */
export async function markWord(params: {
  wordId: string
  bookId: string
  status: 'known' | 'fuzzy' | 'unknown'
  source?: string
}): Promise<{
  success: boolean
  data?: {
    wordMarked: boolean
    taskUpdated: boolean
    allCompleted: boolean
    reviewScheduled: boolean
  }
  error?: string
}> {
  return fetchAPI(`${API_BASE_URL}/word-mark`, {
    method: 'POST',
    body: JSON.stringify(params)
  })
}
