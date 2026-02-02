/**
 * 词库数据模型
 * 统一的Book类型定义
 */

export type BookCategory = 'all' | 'hot' | 'domestic' | 'international' | 'k12' | 'university'
export type CoverType = 'cn' | 'global' | 'k12' | 'uni'

/**
 * Book - 词库数据模型
 *
 * @field id - 词库ID (UUID)
 * @field title - 词库标题
 * @field description - 词库描述
 * @field total_words - 总单词数
 * @field cover_url - 封面URL (可选)
 * @field cover_color - 封面颜色 (CSS渐变类)
 * @field created_by - 创建者用户ID (UUID, 可选)
 * @field is_official - 是否为官方词库
 * @field is_published - 是否已上架
 * @field isRecent - 是否最近访问 (前端标记)
 * @field category - 词库分类
 * @field coverType - 封面类型
 * @field code - 封面大字代码
 * @field categoryLabel - 分类标签
 */
export interface Book {
  id: string
  title: string
  description: string
  total_words: number
  cover_url: string | null
  cover_color: string
  created_by?: string | null
  is_official?: boolean
  is_published?: boolean
  // 前端添加的字段
  isRecent?: boolean
  category?: BookCategory
  coverType?: CoverType
  code?: string
  categoryLabel?: string
}

/**
 * 用于兼容旧的name字段（已废弃）
 * @deprecated 使用 title 替代
 */
export type BookLegacy = Omit<Book, 'title'> & { name?: string }

/**
 * 统一的Book类型，兼容新旧字段
 */
export type UnifiedBook = Book & Partial<BookLegacy>
