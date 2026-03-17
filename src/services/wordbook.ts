/**
 * 单词本服务
 *
 * 提供单词本相关的数据获取方法
 */

import { createClient } from '@/lib/supabase/server'

/**
 * 单词本详情数据类型
 */
export interface WordbookDetail {
  id: string
  title: string
  abbreviation?: string
  description?: string
  total_words: number
  cover_color?: string
  cover_url?: string | null
  is_official: boolean
  created_by?: string
  language?: string
  created_at: string
  updated_at?: string
}

/**
 * 获取单个单词本详情
 *
 * @param id - 单词本 ID
 * @returns 单词本详情或 null
 */
export async function getWordbook(id: string): Promise<WordbookDetail | null> {
  try {
    const supabase = await createClient()

    const { data: book, error } = await supabase
      .from('books')
      .select(`
        id,
        title,
        abbreviation,
        description,
        total_words,
        cover_color,
        cover_url,
        is_official,
        created_by,
        language,
        created_at,
        updated_at
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('[getWordbook] Error fetching wordbook:', error)
      return null
    }

    if (!book) {
      return null
    }

    return book as WordbookDetail
  } catch (error) {
    console.error('[getWordbook] Exception:', error)
    return null
  }
}

/**
 * 获取多个单词本详情（批量）
 *
 * @param ids - 单词本 ID 数组
 * @returns 单词本详情数组
 */
export async function getWordbooksByIds(ids: string[]): Promise<WordbookDetail[]> {
  if (!ids || ids.length === 0) {
    return []
  }

  try {
    const supabase = await createClient()

    const { data: books, error } = await supabase
      .from('books')
      .select(`
        id,
        title,
        abbreviation,
        description,
        total_words,
        cover_color,
        cover_url,
        is_official,
        created_by,
        language,
        created_at,
        updated_at
      `)
      .in('id', ids)

    if (error) {
      console.error('[getWordbooksByIds] Error:', error)
      return []
    }

    return (books || []) as WordbookDetail[]
  } catch (error) {
    console.error('[getWordbooksByIds] Exception:', error)
    return []
  }
}

/**
 * 获取单词本的章节列表
 *
 * @param bookId - 单词本 ID
 * @returns 章节列表
 */
export async function getWordbookChapters(bookId: string): Promise<{
  id: string
  title: string
  order_index: number
  word_count: number
}[]> {
  try {
    const supabase = await createClient()

    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('id, title, order_index, word_count')
      .eq('book_id', bookId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('[getWordbookChapters] Error:', error)
      return []
    }

    return chapters || []
  } catch (error) {
    console.error('[getWordbookChapters] Exception:', error)
    return []
  }
}
