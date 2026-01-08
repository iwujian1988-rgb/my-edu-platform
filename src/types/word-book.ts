/**
 * 单词书管理相关类型定义
 */

/**
 * 单词书类型
 */
export type WordBookCategory = 'exam' | 'textbook' | 'scenario' | 'custom'

/**
 * 单词书基本信息
 */
export interface WordBook {
  id: string
  title: string
  description?: string
  category: WordBookCategory
  is_official: boolean
  total_words: number
  total_chapters: number
  cover_url?: string
  difficulty_level?: number
  created_at: string
  updated_at: string
}

/**
 * 创建单词书请求
 */
export interface CreateWordBookRequest {
  title: string
  description?: string
  category: WordBookCategory
  is_official?: boolean
  cover_url?: string
  difficulty_level?: number
}

/**
 * 更新单词书请求
 */
export interface UpdateWordBookRequest {
  title?: string
  description?: string
  category?: WordBookCategory
  is_official?: boolean
  cover_url?: string
  difficulty_level?: number
}

/**
 * 单词书列表查询参数
 */
export interface WordBookListQuery {
  page?: number
  pageSize?: number
  category?: WordBookCategory
  isOfficial?: boolean
  search?: string
  sortBy?: 'created_at' | 'updated_at' | 'title' | 'total_words'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 单词书列表响应
 */
export interface WordBookListResponse {
  data: WordBook[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}
