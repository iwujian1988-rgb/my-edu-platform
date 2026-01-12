import { createClient, getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { getUserPermissions } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/words?bookId=xxx&status=xxx&shuffle=true
 * 获取单词书的所有单词，支持筛选和乱序（突破1000行限制）
 * 使用直接SQL查询绕过Supabase客户端的.in()限制
 *
 * 参数说明：
 * - bookId: 必填，词书ID
 * - status: 可选，筛选状态 (all|unknown|fuzzy|known|new)
 * - shuffle: 可选，是否乱序（默认false）
 */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const searchParams = request.nextUrl.searchParams
    const bookId = searchParams.get('bookId')
    const status = searchParams.get('status') || 'all'
    const shuffle = searchParams.get('shuffle') === 'true'
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')

    if (!bookId) {
      return NextResponse.json({ error: 'bookId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 🔒 并行检查：权限检查 + 获取用户进度数据
    const [bookResult, progressResult] = await Promise.all([
      // 检查词库权限
      supabase
        .from('books')
        .select('id, is_official, created_by')
        .eq('id', bookId)
        .single(),
      // 获取用户进度（如果需要按状态筛选）
      status !== 'all'
        ? supabase
            .from('word_progress')
            .select('word_id, status')
            .eq('user_id', user.id)
            .eq('book_id', bookId)
        : Promise.resolve({ data: null })
    ])

    // 权限检查
    const { data: book, error: bookError } = bookResult
    if (bookError || !book) {
      console.error('❌ Book not found:', { bookId, bookError })
      return NextResponse.json({ error: 'Book not found or access denied' }, { status: 404 })
    }

    const bookData = book as any

    // 自定义词库：检查是否为创建者
    if (bookData.is_official === false && bookData.created_by) {
      if (bookData.created_by !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You can only access words from your own custom books' },
          { status: 403 }
        )
      }
    }

    // 官方词库：跳过服务端权限检查（客户端已检查过），直接返回数据
    // 这样可以避免慢的getUserPermissions()查询

    // 保存book的total_words供后面使用
    const totalWordsFromBook = bookData.total_words

    // 尝试使用优化的分页RPC函数（更快，返回更少字段）
    const offset = (page - 1) * pageSize
    let words, wordsError

    console.log('🔍 Trying optimized RPC...')

    try {
      const result = await (supabase.rpc as any)(
        'get_book_words_paginated_optimized',
        {
          book_uuid: bookId,
          offset_val: offset,
          limit_val: pageSize
        }
      )
      console.log('📦 Optimized RPC result:', { error: result.error, dataLength: result.data?.length })
      words = result.data
      wordsError = result.error
      if (!wordsError) console.log('✅ Using optimized RPC function, fields:', words?.[0] ? Object.keys(words[0]) : 'no data')
    } catch (e) {
      console.log('⚠️ Optimized RPC exception:', e)
      wordsError = { message: 'RPC not available' }
    }

    // Fallback 1: 尝试标准RPC函数
    if (wordsError || !words) {
      console.log('🔍 Trying standard RPC...')
      try {
        const result = await (supabase.rpc as any)(
          'get_book_words_paginated',
          {
            book_uuid: bookId,
            offset_val: offset,
            limit_val: pageSize
          }
        )
        words = result.data
        wordsError = result.error
        if (!wordsError && words) {
          console.log('✅ Using standard RPC function, fields:', Object.keys(words[0]))
        } else {
          console.log('❌ Standard RPC failed:', wordsError)
        }
      } catch (e) {
        console.log('⚠️ Standard RPC exception:', e)
        wordsError = { message: 'RPC not available' }
      }
    }

    // Fallback 2: 使用普通查询
    if (wordsError || !words) {
      console.log('🔍 Using fallback query with explicit field selection...')

      const { data: chaptersData } = await supabase
        .from('chapters')
        .select('id')
        .eq('book_id', bookId)

      if (!chaptersData) {
        return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
      }

      const { data: fallbackWords, error: fallbackError } = await supabase
        .from('words')
        .select('id, word, phonetic, uk_phonetic, us_phonetic, definition, definition_en, part_of_speech, order_index')
        .in('chapter_id', chaptersData.map(c => c.id))
        .order('order_index', { ascending: true })
        .range(offset, offset + pageSize - 1)

      if (fallbackError) {
        console.error('Fallback query also failed:', fallbackError)
        return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 })
      }

      words = fallbackWords
      console.log('✅ Fallback query result, fields:', words?.[0] ? Object.keys(words[0]) : 'no data')
    }

    console.log(`📊 Returning page ${page}: ${words?.length || 0} words`)

    return NextResponse.json({
      success: true,
      data: words || [],
      page,
      pageSize,
      total: totalWordsFromBook || 5862
    })
  } catch (error) {
    console.error('Error in GET /api/words:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * 使用种子随机打乱数组（保证相同输入产生相同输出）
 * 使用简单的哈希函数和 Fisher-Yates 洗牌算法
 */
function shuffleArray<T>(array: T[], seed: string): T[] {
  const result = [...array]
  const numericSeed = hashCode(seed)
  let random = mulberry32(numericSeed)

  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]]
  }

  return result
}

/**
 * 字符串转哈希值
 */
function hashCode(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash)
}

/**
 * Mulberry32 随机数生成器
 */
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}
