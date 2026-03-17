/**
 * 单词服务
 *
 * 提供单词相关的数据获取方法
 */

import { createClient } from '@/lib/supabase/server'
import type { Word, CardContent } from '@/types/word'

/**
 * 单词查询选项
 */
export interface GetWordsOptions {
  /** 章节 ID 筛选 */
  chapterId?: string
  /** 状态筛选 */
  status?: 'new' | 'known' | 'fuzzy' | 'unknown' | 'all'
  /** 搜索关键词 */
  search?: string
  /** 排序字段 */
  sortBy?: 'word' | 'order_index' | 'created_at'
  /** 排序方向 */
  sortOrder?: 'asc' | 'desc'
  /** 分页：页码 */
  page?: number
  /** 分页：每页数量 */
  pageSize?: number
}

/**
 * 单词列表结果
 */
export interface GetWordsResult {
  words: Word[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

/**
 * 获取指定单词本下的所有单词
 *
 * @param bookId - 单词本 ID
 * @param options - 查询选项
 * @returns 单词列表和分页信息
 */
export async function getWordsByBookId(
  bookId: string,
  options: GetWordsOptions = {}
): Promise<GetWordsResult> {
  const {
    chapterId,
    status = 'all',
    search,
    sortBy = 'order_index',
    sortOrder = 'asc',
    page = 1,
    pageSize = 100,
  } = options

  try {
    const supabase = await createClient()
    const offset = (page - 1) * pageSize

    // 构建基础查询
    let query = supabase
      .from('words')
      .select(`
        id,
        chapter_id,
        book_id,
        word,
        phonetic,
        part_of_speech,
        definition,
        definition_en,
        collocation,
        collocation_en,
        example_sentence,
        example_sentence_en,
        order_index,
        created_at,
        updated_at,
        language_data,
        gender,
        plural,
        feminine_form
      `, { count: 'exact' })
      .eq('book_id', bookId)

    // 章节筛选
    if (chapterId && chapterId !== 'all') {
      query = query.eq('chapter_id', chapterId)
    }

    // 搜索筛选
    if (search && search.trim()) {
      query = query.or(`word.ilike.%${search}%,definition.ilike.%${search}%`)
    }

    // 排序
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // 分页
    query = query.range(offset, offset + pageSize - 1)

    const { data: words, error, count } = await query

    if (error) {
      console.error('[getWordsByBookId] Error:', error)
      return {
        words: [],
        total: 0,
        page,
        pageSize,
        totalPages: 0,
      }
    }

    const totalPages = Math.ceil((count || 0) / pageSize)

    return {
      words: (words || []) as Word[],
      total: count || 0,
      page,
      pageSize,
      totalPages,
    }
  } catch (error) {
    console.error('[getWordsByBookId] Exception:', error)
    return {
      words: [],
      total: 0,
      page,
      pageSize,
      totalPages: 0,
    }
  }
}

/**
 * 获取单个单词详情
 *
 * @param wordId - 单词 ID
 * @returns 单词详情或 null
 */
export async function getWordById(wordId: string): Promise<Word | null> {
  try {
    const supabase = await createClient()

    const { data: word, error } = await supabase
      .from('words')
      .select(`
        id,
        chapter_id,
        book_id,
        word,
        phonetic,
        part_of_speech,
        definition,
        definition_en,
        collocation,
        collocation_en,
        example_sentence,
        example_sentence_en,
        order_index,
        created_at,
        updated_at,
        language_data,
        gender,
        plural,
        conjugation,
        feminine_form
      `)
      .eq('id', wordId)
      .single()

    if (error) {
      console.error('[getWordById] Error:', error)
      return null
    }

    return word as Word
  } catch (error) {
    console.error('[getWordById] Exception:', error)
    return null
  }
}

/**
 * 获取单词列表（用于卡片展示，返回 CardContent 格式）
 *
 * @param bookId - 单词本 ID
 * @param options - 查询选项
 * @returns CardContent 数组
 */
export async function getCardContentsByBookId(
  bookId: string,
  options: GetWordsOptions = {}
): Promise<CardContent[]> {
  const result = await getWordsByBookId(bookId, options)
  return result.words.map(word => ({
    ...word,
    type: 'word' as const,
  }))
}

/**
 * 获取随机单词（用于练习）
 *
 * @param bookId - 单词本 ID
 * @param count - 数量
 * @param excludeIds - 排除的单词 ID
 * @returns 单词数组
 */
export async function getRandomWords(
  bookId: string,
  count: number = 10,
  excludeIds: string[] = []
): Promise<Word[]> {
  try {
    const supabase = await createClient()

    let query = supabase
      .from('words')
      .select(`
        id,
        chapter_id,
        book_id,
        word,
        phonetic,
        part_of_speech,
        definition,
        definition_en,
        collocation,
        collocation_en,
        example_sentence,
        example_sentence_en,
        order_index,
        created_at,
        updated_at,
        language_data
      `)
      .eq('book_id', bookId)

    if (excludeIds.length > 0) {
      query = query.not('id', 'in', `(${excludeIds.join(',')})`)
    }

    // 使用 random() 进行随机排序
    const { data: words, error } = await query
      .order('order_index', { ascending: true })
      .limit(count * 3) // 获取更多，然后在前端随机

    if (error) {
      console.error('[getRandomWords] Error:', error)
      return []
    }

    // 在前端随机打乱并取指定数量
    const shuffled = (words || []).sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count) as Word[]
  } catch (error) {
    console.error('[getRandomWords] Exception:', error)
    return []
  }
}

/**
 * 搜索单词
 *
 * @param bookId - 单词本 ID
 * @param keyword - 搜索关键词
 * @param limit - 结果数量限制
 * @returns 匹配的单词数组
 */
export async function searchWords(
  bookId: string,
  keyword: string,
  limit: number = 20
): Promise<Word[]> {
  if (!keyword || !keyword.trim()) {
    return []
  }

  try {
    const supabase = await createClient()

    const { data: words, error } = await supabase
      .from('words')
      .select(`
        id,
        chapter_id,
        book_id,
        word,
        phonetic,
        part_of_speech,
        definition,
        definition_en,
        collocation,
        collocation_en,
        example_sentence,
        example_sentence_en,
        order_index,
        created_at,
        updated_at,
        language_data
      `)
      .eq('book_id', bookId)
      .or(`word.ilike.%${keyword}%,definition.ilike.%${keyword}%,definition_en.ilike.%${keyword}%`)
      .limit(limit)

    if (error) {
      console.error('[searchWords] Error:', error)
      return []
    }

    return (words || []) as Word[]
  } catch (error) {
    console.error('[searchWords] Exception:', error)
    return []
  }
}
