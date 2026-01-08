/**
 * 章节管理相关类型定义
 */

/**
 * 章节基本信息
 */
export interface Chapter {
  id: string
  book_id: string
  title: string
  order_index: number
  word_count: number
  theme_id?: string
  scene_id?: string
  created_at: string
  updated_at: string
}

/**
 * 创建章节请求
 */
export interface CreateChapterRequest {
  book_id: string
  title: string
  order_index?: number
  theme_id?: string
  scene_id?: string
}

/**
 * 更新章节请求
 */
export interface UpdateChapterRequest {
  title?: string
  order_index?: number
  theme_id?: string
  scene_id?: string
}

/**
 * 章节列表响应
 */
export interface ChapterListResponse {
  data: Chapter[]
  total: number
}
