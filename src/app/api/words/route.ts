import { createClient, getCurrentUser, createAdminClient } from '@/lib/supabase/server'
import { getUserPermissions } from '@/lib/permissions'
import { NextRequest, NextResponse } from 'next/server'
import { withTimeout, safeLoop } from '@/lib/timeout'

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
  // 尝试从cookies获取用户（标准方式）
  let user = await getCurrentUser()

  // 如果cookies方式失败，尝试从Authorization header获取
  if (!user) {
    try {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7)
        const supabase = await createClient()

        // 使用token设置session
        const { data: { user: userFromToken }, error: tokenError } = await supabase.auth.getUser(token)

        if (!tokenError && userFromToken) {
          user = userFromToken
          console.log('✅ Authenticated via Authorization header')
        }
      }
    } catch (error) {
      console.log('⚠️ Authorization header authentication failed:', error.message)
    }
  }

  if (!user) {
    console.log('❌ Unauthorized: No valid user found')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  console.log('✅ Authenticated user:', user.id)

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

    // 🔒 并行检查：权限检查 + 获取用户进度数据（总是获取以附加status）
    // ✅ 修复：添加超时保护
    const [bookResult, progressResult] = await withTimeout(
      Promise.all([
        // 检查词库权限并获取书名
        supabase
          .from('books')
          .select('id, is_official, created_by, title, total_words')
          .eq('id', bookId)
          .single(),
        // 总是获取用户进度（用于附加status到每个单词）
        supabase
          .from('word_progress')
          .select('word_id, status')
          .eq('user_id', user.id)
          .eq('book_id', bookId)
      ]),
      15000,  // 15秒超时
      'Database query timeout'
    )

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

    // 保存book信息供后面使用
    const bookTitle = bookData.title || 'Unknown Book'
    const totalWordsFromBook = bookData.total_words

    // 尝试使用优化的分页RPC函数（更快，返回更少字段）
    const offset = (page - 1) * pageSize
    let words, wordsError

    // 🎯 对于 'new' 状态，跳过 RPC 直接使用特殊处理
    // 因为 RPC 函数不支持按状态筛选，会导致"先分页后筛选"的问题
    if (status === 'new') {
      console.log('🔍 Skipping RPC for "new" status, using special handling')
      wordsError = { message: 'Use fallback for new status' }
    } else {
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
    }

    // Fallback 1: 尝试标准RPC函数（也跳过 'new' 状态）
    if (wordsError || !words) {
      if (status !== 'new') {
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
      } else {
        console.log('🔍 Skipping standard RPC for "new" status')
      }
    }

    // 声明变量（需要在RPC处理之前）
    let alreadyFiltered = false
    let statusTotalCount = 0

    // 🔴 关键修复：如果RPC返回成功但words没有status字段，需要附加
    if (!wordsError && words && words.length > 0) {
      if (!words[0].status) {
        console.log('🔧 RPC returned words without status, attaching from progress data')

        const statusMap = new Map<string, string>()
        progressResult.data?.forEach((p: any) => {
          statusMap.set(p.word_id, p.status)
        })

        words = words.map((word: any) => ({
          ...word,
          status: statusMap.get(word.id) || 'new'
        }))

        console.log(`✅ Attached status to ${words.length} words from RPC`)
      }

      // RPC返回的是当前页的单词（已分页），需要根据status筛选
      if (status !== 'all') {
        console.log(`🔍 Filtering RPC results by status: ${status}`)

        if (status === 'new') {
          // 'new' 状态：没有进度记录 或 status='new' 的单词
          const allProgressIds = new Set(progressResult.data?.map((p: any) => p.word_id) || [])
          const newStatusIds = new Set(
            progressResult.data
              ?.filter((p: any) => p.status === 'new')
              .map((p: any) => p.word_id) || []
          )

          // 🔧 修复：RPC已返回当前页数据，只需筛选，不要再次分页
          words = words.filter((word: any) => {
            return !allProgressIds.has(word.id) || newStatusIds.has(word.id)
          })

          statusTotalCount = (totalWordsFromBook || 0) - allProgressIds.size + newStatusIds.size
          console.log(`✅ Filtered to ${words.length} 'new' words (total: ${statusTotalCount})`)
        } else {
          // 🔧 修复：RPC已返回当前页数据，只需筛选，不要再次分页
          words = words.filter((word: any) => word.status === status)
          console.log(`✅ Filtered to ${words.length} '${status}' words`)
        }
      } else {
        // status='all'，RPC已返回分页数据，直接使用
        console.log(`✅ Using paginated RPC results: ${words.length} words (page ${page})`)
      }
    }

    // Fallback 2: 使用普通查询
    if (wordsError || !words) {
      console.log('🔍 Using fallback query with explicit field selection...')

      // 🎯 优化：对于 'new' 状态，使用更高效的查询方式
      if (status === 'new') {
        console.log('🔍 Optimized query for "new" status - using direct SQL approach')

        // 获取所有进度记录的word_id
        const allProgressIds = new Set(progressResult.data?.map((p: any) => p.word_id) || [])

        // 获取所有chapters
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('id')
          .eq('book_id', bookId)

        if (!chaptersData) {
          return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
        }

        // ⚡ 优化：直接查询带分页，避免获取所有单词
        // 获取当前页的单词（已经考虑分页）
        const chapterIds = chaptersData.map((c: any) => c.id)
        const { data: pagedWords, error: pagedError, count } = await supabase
          .from('words')
          .select('id, word, phonetic, uk_phonetic, us_phonetic, definition, definition_en, collocation, collocation_en, example_sentence, example_sentence_en, part_of_speech', { count: 'exact' })
          .in('chapter_id', chapterIds)
          .order('order_index', { ascending: true })
          .range(offset, offset + pageSize - 1)

        if (pagedError) {
          console.error('Failed to fetch paginated words:', pagedError)
          return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 })
        }

        // 客户端筛选：过滤出没有进度记录的单词
        const filteredPagedWords = (pagedWords || []).filter((w: any) => !allProgressIds.has(w.id))

        // 如果当前页筛选后没有足够的单词，需要加载更多来填补
        let finalWords = filteredPagedWords
        let loadedCount = (pagedWords || []).length
        let currentOffset = offset + pageSize
        let maxIterations = 10 // 防止无限循环
        let iterations = 0

        // ✅ 修复：使用safeLoop替代while循环，添加超时保护
        await safeLoop(
          async () => {
            // 如果已经凑齐一页，停止循环
            if (finalWords.length >= pageSize) {
              return false  // 停止
            }

            // 如果上次加载的数据少于pageSize，说明没有更多数据了
            if (loadedCount < pageSize) {
              return false  // 停止
            }

            iterations++
            if (iterations > 3) {
              console.log(`⚠️  Warning: Loading iteration ${iterations}, may indicate performance issue`)
            }
            console.log(`🔄 Loading more words to fill page (${finalWords.length}/${pageSize} so far)`)

            const { data: moreWords, error: moreError } = await withTimeout(
              supabase
                .from('words')
                .select('id, word, phonetic, uk_phonetic, us_phonetic, definition, definition_en, collocation, collocation_en, example_sentence, example_sentence_en, part_of_speech')
                .in('chapter_id', chapterIds)
                .order('order_index', { ascending: true })
                .range(currentOffset, currentOffset + pageSize - 1),
              10000,  // 10秒超时
              'Loading more words timeout'
            )

            if (moreError || !moreWords || moreWords.length === 0) {
              console.log('✅ No more words available')
              return false  // 停止循环
            }

            // 筛选并添加
            const newFilteredWords = moreWords.filter((w: any) => !allProgressIds.has(w.id))
            finalWords = [...finalWords, ...newFilteredWords]
            loadedCount = moreWords.length
            currentOffset += pageSize

            return true  // 继续循环
          },
          {
            maxIterations: 5,  // ✅ 减少最大迭代次数
            timeout: 30000,    // ✅ 添加总超时30秒
            iterationDelay: 0
          }
        )

        // 计算总数：从全部单词中减去有进度记录的
        const totalNewWords = (count || 0) - allProgressIds.size

        words = finalWords.map((w: any) => ({ ...w, status: 'new' as const })) // 附加status
        statusTotalCount = Math.max(0, totalNewWords)
        alreadyFiltered = true // 标记已筛选
        console.log(`✅ Returning page ${page} with ${words.length} unmarked words (total: ${statusTotalCount})`)
      } else {
        // 其他状态：使用原来的逻辑
        const { data: chaptersData } = await supabase
          .from('chapters')
          .select('id')
          .eq('book_id', bookId)

        if (!chaptersData) {
          return NextResponse.json({ error: 'Failed to fetch chapters' }, { status: 500 })
        }

        const chapterIdsFallback = chaptersData.map((c: any) => c.id)
        const { data: fallbackWords, error: fallbackError } = await supabase
          .from('words')
          .select('id, word, phonetic, uk_phonetic, us_phonetic, definition, definition_en, collocation, collocation_en, example_sentence, example_sentence_en, part_of_speech')
          .in('chapter_id', chapterIdsFallback)
          .order('order_index', { ascending: true })
          .range(offset, offset + pageSize - 1)

        if (fallbackError) {
          console.error('Fallback query also failed:', fallbackError)
          return NextResponse.json({ error: 'Failed to fetch words' }, { status: 500 })
        }

        words = fallbackWords
        console.log('✅ Fallback query result, fields:', words?.[0] ? Object.keys(words[0]) : 'no data')
      }
    }

    // 🎯 根据status参数筛选单词（如果还没有筛选）
    let filteredWords = words || []

    if (alreadyFiltered) {
      // 已经在fallback中完成筛选，直接使用
      filteredWords = words
      // statusTotalCount 已经在上面设置
    } else if (status !== 'all') {
      // 构建符合状态的word_id集合
      const targetWordIds = new Set<string>()

      if (status === 'new') {
        // 'new' 状态：返回没有进度记录 或 status='new' 的单词
        const allProgressIds = new Set(progressResult.data?.map((p: any) => p.word_id) || [])
        const newStatusIds = new Set(
          progressResult.data
            ?.filter((p: any) => p.status === 'new')
            .map((p: any) => p.word_id) || []
        )

        // 目标单词 = 没有进度记录的 + status='new'的
        filteredWords = filteredWords.filter((word: any) => {
          return !allProgressIds.has(word.id) || newStatusIds.has(word.id)
        })

        // 计算总数：所有没有进度记录的 + status='new'的
        statusTotalCount = (totalWordsFromBook || 0) - allProgressIds.size + newStatusIds.size
        console.log(`🔍 Filtered for 'new': ${filteredWords.length} words (total: ${statusTotalCount})`)
      } else {
        // 其他状态：只返回匹配指定状态的单词
        const statusWordIds = new Set(
          progressResult.data
            ?.filter((p: any) => p.status === status)
            .map((p: any) => p.word_id) || []
        )

        filteredWords = filteredWords.filter((word: any) => statusWordIds.has(word.id))
        statusTotalCount = statusWordIds.size // 使用实际总数
        console.log(`🔍 Filtered for '${status}': ${filteredWords.length} words (total: ${statusTotalCount})`)
      }
    }

    // 🏷️ 为每个单词附加status信息（用于前端显示颜色样式）
    if (progressResult.data && status === 'all') {
      // 只在 'all' 状态下需要附加（其他状态已经知道status）
      const statusMap = new Map<string, string>()
      progressResult.data.forEach((p: any) => {
        statusMap.set(p.word_id, p.status)
      })

      filteredWords = filteredWords.map((word: any) => ({
        ...word,
        status: statusMap.get(word.id) || 'new'
      }))
    } else if (status !== 'all') {
      // 对于筛选状态，所有单词的status都是筛选的status
      filteredWords = filteredWords.map((word: any) => ({
        ...word,
        status: status
      }))
    }

    // 🎲 如果需要乱序，使用基于bookId+status的种子随机
    if (shuffle && filteredWords.length > 0) {
      const seed = `${bookId}-${status}`
      filteredWords = shuffleArray(filteredWords, seed)
      console.log(`🔀 Shuffled ${filteredWords.length} words with seed: ${seed}`)
    }

    console.log(`📊 Returning page ${page}: ${filteredWords.length} words`)

    // 对于 'all' 状态，count 应该等于整个单词书的总数
    // 对于其他状态，count 是该状态下的所有单词数（跨所有页）
    const count = status === 'all'
      ? (totalWordsFromBook || filteredWords.length)
      : statusTotalCount

    return NextResponse.json({
      success: true,
      data: filteredWords,
      page,
      pageSize,
      total: totalWordsFromBook || 5862,
      count: count,  // 用于统计显示的实际单词数
      bookTitle: bookTitle  // 返回书名供前端使用
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
