/**
 * 单词管理相关类型定义
 */

/**
 * 单词基本信息
 */
export interface Word {
  id: string
  chapter_id: string | null
  book_id: string
  word: string
  phonetic?: string
  part_of_speech?: string
  definition: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
  order_index: number
  created_at: string
  updated_at: string
}

/**
 * 创建单词请求
 */
export interface CreateWordRequest {
  chapter_id?: string | null
  book_id: string
  word: string
  phonetic?: string
  part_of_speech?: string
  definition: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
  order_index?: number
}

/**
 * 更新单词请求
 */
export interface UpdateWordRequest {
  word?: string
  phonetic?: string
  part_of_speech?: string
  definition?: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
  order_index?: number
  chapter_id?: string | null
}

/**
 * 单词列表查询参数
 */
export interface WordListQuery {
  page?: number
  pageSize?: number
  chapterId?: string
  search?: string
  sortBy?: 'word' | 'order_index' | 'created_at'
  sortOrder?: 'asc' | 'desc'
}

/**
 * 单词列表响应
 */
export interface WordListResponse {
  data: Word[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * Excel导入行数据
 */
export interface ExcelImportRow {
  chapter?: string
  word: string
  phonetic?: string
  part_of_speech?: string
  definition: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
}

/**
 * Excel导入错误行
 */
export interface ExcelImportError {
  rowIndex: number
  chapter: string
  word: string
  error: string
}

/**
 * Excel导入结果
 */
export interface ExcelImportResult {
  total: number
  imported: number
  skipped: number
  errors: ExcelImportError[]
}
