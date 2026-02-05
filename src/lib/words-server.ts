/**
 * 服务端单词数据获取函数
 *
 * 用于在服务端组件中获取单词数据，传递给客户端组件
 * 这样可以避免客户端的认证问题，提升性能
 */

import { createClient } from '@/lib/supabase/server'

// Word type definition (inline to avoid circular dependencies)
export interface Word {
  id: string
  word: string
  phonetic?: string
  uk_phonetic?: string
  us_phonetic?: string
  definition?: string
  definition_en?: string
  collocation?: string
  collocation_en?: string
  example_sentence?: string
  example_sentence_en?: string
  part_of_speech?: string
  chapter?: string
  chapter_id?: string | null  // 🔧 添加章节ID字段
  theme?: string
  scene?: string
  status?: 'new' | 'unknown' | 'fuzzy' | 'known'
}

/**
 * 服务端获取单词数据
 *
 * @param bookId - 词书ID
 * @param user - 当前用户对象
 * @param page - 页码（默认1）
 * @param pageSize - 每页数量（默认21）
 * @param status - 状态筛选 (all|unknown|fuzzy|known|new，默认all)
 * @param chapterId - 章节筛选（默认'all'表示所有章节）
 * @returns 单词数据和总数
 */
export async function getWordsForBookServer(
  bookId: string,
  user: any,
  page: number = 1,
  pageSize: number = 21,
  status: string = 'all',
  chapterId: string = 'all'
): Promise<{
  words: Word[]
  total: number
  count: number
  success: boolean
  error?: string
}> {
  try {
    console.log(`📖 [Server] Fetching words for book ${bookId}, page ${page}, status ${status}, chapter ${chapterId}`)

    const supabase = await createClient()

    // 1. 检查book权限和获取book信息
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, is_official, created_by, title, total_words')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      console.error('❌ [Server] Book not found:', bookError)
      return {
        words: [],
        total: 0,
        count: 0,
        success: false,
        error: 'Book not found'
      }
    }

    // 2. 权限检查
    if (book.is_official === false && book.created_by !== user.id) {
      console.error('❌ [Server] Permission denied')
      return {
        words: [],
        total: 0,
        count: 0,
        success: false,
        error: 'Permission denied'
      }
    }

    // 3. 获取用户进度（用于附加status）
    const { data: progressData } = await supabase
      .from('word_progress')
      .select('word_id, status')
      .eq('user_id', user.id)
      .eq('book_id', bookId)

    const statusMap = new Map<string, string>()
    progressData?.forEach((p: any) => {
      statusMap.set(p.word_id, p.status)
    })

    // 4. 尝试使用优化的RPC函数
    const offset = (page - 1) * pageSize

    let words: any[] | null = null
    let wordsError = null

    // 跳过 'new' 状态使用RPC（因为RPC不支持状态筛选的"先分页后筛选"问题）
    if (status !== 'new') {
      console.log('🔍 [Server] Trying optimized RPC...')

      try {
        // ⚠️ 添加超时保护，避免RPC调用hang住
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error('RPC timeout')), 5000) // 5秒超时
        )

        const result = await Promise.race([
          supabase.rpc('get_book_words_paginated_optimized', {
            book_uuid: bookId,
            offset_val: offset,
            limit_val: pageSize
          }),
          timeoutPromise
        ]) as any

        words = result.data
        wordsError = result.error

        if (!wordsError && words && words.length > 0) {
          console.log(`✅ [Server] RPC returned ${words.length} words`)

          // 附加status信息
          words = words.map((word: any) => ({
            ...word,
            status: statusMap.get(word.id) || 'new'
          }))
        }
      } catch (e: any) {
        console.log('⚠️ [Server] RPC exception:', e.message)
        // RPC失败或超时，使用fallback
        wordsError = { message: e.message || 'RPC exception' }
      }
    }

    // 5. Fallback: 使用普通查询
    if (wordsError || !words) {
      console.log('🔍 [Server] Using fallback query...')

      // 获取chapters
      // 🔧 FIX: 支持章节筛选
      const chaptersQuery = supabase
        .from('chapters')
        .select('id')

      if (chapterId !== 'all') {
        chaptersQuery.eq('id', chapterId)
      } else {
        chaptersQuery.eq('book_id', bookId)
      }

      const { data: chaptersData } = await chaptersQuery

      if (!chaptersData) {
        return {
          words: [],
          total: book.total_words || 0,
          count: 0,
          success: true
        }
      }

      const chapterIds = chaptersData.map((c: any) => c.id)

      // 查询words
      const { data: fallbackWords, error: fallbackError } = await supabase
        .from('words')
        .select('id, word, phonetic, uk_phonetic, us_phonetic, definition, definition_en, collocation, collocation_en, example_sentence, example_sentence_en, part_of_speech, chapter_id')
        .in('chapter_id', chapterIds)
        .order('order_index', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (fallbackError) {
        console.error('❌ [Server] Fallback query failed:', fallbackError)
        return {
          words: [],
          total: book.total_words || 0,
          count: 0,
          success: false,
          error: 'Failed to fetch words'
        }
      }

      // 🔥 保留chapter_id字段（用于验证和调试），chapter设为空（fallback不查询章节标题）
      words = fallbackWords?.map((word: any) => ({
        ...word,
        status: statusMap.get(word.id) || 'new',
        chapter: '',  // fallback不查询章节标题，保持空字符串
        theme: '',
        scene: ''
      })) || []

      console.log(`✅ [Server] Fallback returned ${words.length} words`)
    }

    // 6. 状态筛选（如果指定了status且不是'all'）
    let filteredWords = words || []
    let totalCount = book.total_words || 0

    if (status !== 'all' && words) {
      if (status === 'new') {
        const allProgressIds = new Set(progressData?.map((p: any) => p.word_id) || [])
        const newStatusIds = new Set(
          progressData
            ?.filter((p: any) => p.status === 'new')
            .map((p: any) => p.word_id) || []
        )

        filteredWords = words.filter((word: any) => {
          return !allProgressIds.has(word.id) || newStatusIds.has(word.id)
        })

        totalCount = book.total_words - allProgressIds.size + newStatusIds.size
      } else {
        filteredWords = words.filter((word: any) => word.status === status)
        totalCount = filteredWords.length
      }
    }

    console.log(`✅ [Server] Returning ${filteredWords.length} words (total: ${totalCount})`)

    return {
      words: filteredWords as Word[],
      total: book.total_words || 0,
      count: totalCount,
      success: true
    }

  } catch (error: any) {
    console.error('❌ [Server] Error:', error)
    return {
      words: [],
      total: 0,
      count: 0,
      success: false,
      error: error.message
    }
  }
}
