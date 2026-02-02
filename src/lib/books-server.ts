/**
 * 词书数据获取服务端函数
 *
 * 使用 React cache 机制确保在同一请求中，相同的查询只执行一次
 * 避免在首页、设置页等多个页面重复查询相同的词书数据
 */

import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * 词书数据类型定义
 */
export interface BookData {
  id: string
  title: string
  abbreviation?: string // 英文缩写（如 "CET-4", "IELTS"）
  description?: string
  total_words?: number
  cover_color?: string
  cover_url?: string | null
  created_by?: string
  is_official?: boolean
  coverType?: 'cn' | 'global' | 'k12' | 'uni'
  categoryLabel?: string
  code?: string // 封面大字代码（如 "CET", "IEL", "TOE"）
}

/**
 * 获取所有词书数据（带权限过滤）
 *
 * 🚀 性能优化：
 * - 使用 React cache 确保在同一请求中只查询一次数据库
 * - 权限参数由调用者传入，避免重复查询用户权限
 *
 * @param userId - 当前用户ID（用于权限过滤）
 * @param userPermissions - 用户权限对象（外部传入，避免重复查询）
 * @returns 过滤后的词书数据数组
 */
export const getAllBooks = cache(async (
  userId?: string,
  userPermissions?: { bookPermissions: string[] }
): Promise<BookData[]> => {
  console.log('[Books Server] Fetching all books from database')

  const supabase = await createClient()

  // 1. 获取基础词书数据 - 只查询需要的字段以提升性能
  const { data: booksData, error: booksError } = await supabase
    .from('books')
    .select('id, title, abbreviation, description, total_words, cover_color, cover_url, created_by, is_official, is_published, created_at')
    .order('created_at', { ascending: false })

  if (booksError) {
    console.error('[Books Server] Error fetching books:', booksError)
    return []
  }

  if (!booksData || booksData.length === 0) {
    console.log('[Books Server] No books found')
    return []
  }

  // 2. 如果没有 userId，返回所有已发布的词书
  if (!userId) {
    console.log('[Books Server] No userId provided, filtering published books only')
    return booksData
      .filter((book: any) => book.is_published !== false)
      .map((book: any) => normalizeBookData(book))
  }

  // 3. 使用传入的权限信息进行过滤
  const hasAllBooks = userPermissions?.bookPermissions?.includes('*') ||
                       userPermissions?.bookPermissions?.includes('全部') || false
  const userBookIds = userPermissions?.bookPermissions || []

  // 4. 根据权限过滤词书
  const filteredBooks = booksData.filter((book: any) => {
    // 用户自定义词书：只显示自己创建的
    if (book.is_official === false) {
      return book.created_by === userId
    }

    // 官方词书：检查权限
    if (book.is_official === true) {
      return hasAllBooks || userBookIds.includes(book.id)
    }

    // 未明确标记的词书，默认不显示
    return false
  })

  console.log(`[Books Server] Returning ${filteredBooks.length} books for user ${userId}`)

  // 5. 标准化词书数据格式
  return filteredBooks.map((book: any) => normalizeBookData(book))
})

/**
 * 标准化词书数据格式
 *
 * 确保返回的数据结构一致，添加必要的辅助字段
 */
function normalizeBookData(book: any): BookData {
  // ✅ 直接计算，不访问不存在的数据库字段
  const categoryLabel = extractCategoryLabel(book.description)
  const coverType = determineCoverType(book.title, book.description)

  // ✅ 使用 abbreviation 生成 code（如果数据库有）
  const code = (() => {
    if (book.abbreviation) {
      // "CET-4" → "CET", "IELTS" → "IEL"
      const match = book.abbreviation.match(/^([A-Z]+-?[A-Z]*)/)
      if (match) {
        return match[1].replace('-', '').substring(0, 3).toUpperCase()
      }
      return book.abbreviation.substring(0, 3).toUpperCase()
    }
    if (book.title) {
      const titlePrefix = book.title.substring(0, 3).toUpperCase()
      // 检查是否是纯字母（避免中文字符）
      if (/^[A-Z-]+$/.test(titlePrefix)) {
        return titlePrefix.replace('-', '')
      }
    }
    return 'BK'
  })()

  return {
    id: book.id,
    title: book.title,
    abbreviation: book.abbreviation,
    description: book.description || '',
    total_words: book.total_words || 0,
    cover_color: book.cover_color || 'from-green-400 to-green-500',
    cover_url: book.cover_url || null,
    created_by: book.created_by,
    is_official: book.is_official,
    coverType,
    categoryLabel,
    code
  }
}

/**
 * 从描述中提取分类标签（辅助函数）
 */
function extractCategoryLabel(description?: string): string | undefined {
  if (!description) return undefined

  const keywords: Record<string, string> = {
    '小学': 'K12',
    '初中': 'K12',
    '中考': 'K12',
    '高中': 'K12',
    '高考': 'K12',
    '大学': '大学',
    '四级': 'CET',
    '六级': 'CET',
    '考研': '考研',
    '托福': 'TOEFL',
    '雅思': 'IELTS',
    'GRE': 'GRE',
    '专四': 'TEM',
    '专八': 'TEM'
  }

  for (const [keyword, label] of Object.entries(keywords)) {
    if (description.includes(keyword)) {
      return label
    }
  }

  return undefined
}

/**
 * 根据标题和描述确定封面类型（辅助函数）
 */
function determineCoverType(title?: string, description?: string): 'cn' | 'global' | 'k12' | 'uni' {
  const text = `${title || ''} ${description || ''}`.toLowerCase()

  if (text.includes('小学') || text.includes('初中') || text.includes('高中') ||
      text.includes('中考') || text.includes('高考')) {
    return 'k12'
  }

  if (text.includes('大学') || text.includes('四级') || text.includes('六级') ||
      text.includes('考研') || text.includes('cet')) {
    return 'uni'
  }

  if (text.includes('托福') || text.includes('雅思') || text.includes('toefl') ||
      text.includes('ielts')) {
    return 'global'
  }

  return 'cn' // 默认国内
}

/**
 * 获取单个词书详情（带权限检查）
 *
 * @param bookId - 词书ID
 * @param userId - 当前用户ID
 * @param userPermissions - 用户权限对象（外部传入，避免重复查询）
 * @returns 词书数据或null
 */
export const getBookById = cache(async (
  bookId: string,
  userId?: string,
  userPermissions?: { bookPermissions: string[] }
): Promise<BookData | null> => {
  console.log('[Books Server] Fetching book by ID:', bookId)

  const supabase = await createClient()

  const { data: book, error } = await supabase
    .from('books')
    .select('id, title, abbreviation, description, total_words, cover_color, cover_url, created_by, is_official, is_published, created_at')
    .eq('id', bookId)
    .single()

  if (error || !book) {
    console.error('[Books Server] Error fetching book by ID:', error)
    return null
  }

  // 权限检查
  if (userId && userPermissions) {
    const hasAllBooks = userPermissions?.bookPermissions?.includes('*') ||
                         userPermissions?.bookPermissions?.includes('全部') || false
    const userBookIds = userPermissions?.bookPermissions || []

    // 用户自定义词书：必须是自己创建的
    if (book.is_official === false && book.created_by !== userId) {
      console.warn('[Books Server] User does not have permission to access this custom book')
      return null
    }

    // 官方词书：检查权限
    if (book.is_official === true && !hasAllBooks && !userBookIds.includes(book.id)) {
      console.warn('[Books Server] User does not have permission to access this official book')
      return null
    }
  }

  console.log('[Books Server] Book found and accessible:', bookId)
  return normalizeBookData(book)
})

/**
 * 获取多个词书详情（批量查询，带权限检查）
 *
 * 🚀 性能优化：使用 IN 查询一次性获取多个词书
 *
 * @param bookIds - 词书ID数组
 * @param userId - 当前用户ID
 * @param userPermissions - 用户权限对象（外部传入，避免重复查询）
 * @returns 词书数据数组
 */
export const getBooksByIds = cache(async (
  bookIds: string[],
  userId?: string,
  userPermissions?: { bookPermissions: string[] }
): Promise<BookData[]> => {
  if (!bookIds || bookIds.length === 0) {
    console.log('[Books Server] No book IDs provided')
    return []
  }

  console.log('[Books Server] Fetching books by IDs:', bookIds.length)

  const supabase = await createClient()

  const { data: books, error } = await supabase
    .from('books')
    .select('id, title, abbreviation, description, total_words, cover_color, cover_url, created_by, is_official, is_published, created_at')
    .in('id', bookIds)

  if (error) {
    console.error('[Books Server] Error fetching books by IDs:', error)
    return []
  }

  if (!books || books.length === 0) {
    console.log('[Books Server] No books found for provided IDs')
    return []
  }

  // 权限过滤
  let filteredBooks = books

  if (userId && userPermissions) {
    const hasAllBooks = userPermissions?.bookPermissions?.includes('*') ||
                         userPermissions?.bookPermissions?.includes('全部') || false
    const userBookIds = userPermissions?.bookPermissions || []

    filteredBooks = books.filter((book: any) => {
      // 用户自定义词书：必须是自己创建的
      if (book.is_official === false) {
        return book.created_by === userId
      }

      // 官方词书：检查权限
      if (book.is_official === true) {
        return hasAllBooks || userBookIds.includes(book.id)
      }

      return false
    })
  }

  console.log(`[Books Server] Returning ${filteredBooks.length} books for ${bookIds.length} IDs`)

  return filteredBooks.map((book: any) => normalizeBookData(book))
})
