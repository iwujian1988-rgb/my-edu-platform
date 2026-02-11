import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { retryWithBackoff, parseYoudaoResponse, sleep } from '@/lib/utils/retry'
import { getCachedWordData, cacheWordData, isRedisAvailable } from '@/lib/utils/cache'

/**
 * 智能录入API（重构版）
 * 调用免费词典API获取单词释义、音标等信息
 * 新增功能：
 * - Redis缓存（30天TTL）
 * - 指数退避重试
 * - 支持选择章节
 * - 提取英式和美式音标
 * 限制：每日500词配额
 */
export async function POST(request: Request) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const { words, bookId, chapterId } = body // 新增：支持选择章节

    if (!Array.isArray(words) || words.length === 0) {
      return NextResponse.json({ error: '单词列表不能为空' }, { status: 400 })
    }

    if (!bookId) {
      return NextResponse.json({ error: '词库ID不能为空' }, { status: 400 })
    }

    // 🔒 输入验证：限制每次导入的单词数量
    const MAX_WORDS_PER_IMPORT = 500
    if (words.length > MAX_WORDS_PER_IMPORT) {
      return NextResponse.json({
        error: `每次最多导入${MAX_WORDS_PER_IMPORT}个单词`,
        requested: words.length,
        limit: MAX_WORDS_PER_IMPORT
      }, { status: 400 })
    }

    // 🔒 输入验证：单词去重和格式验证
    const originalCount = words.length
    const uniqueWords = [...new Set(words.map(w => w.trim()).filter(w => w.length > 0))]
    const duplicateCount = originalCount - uniqueWords.length

    // 如果有重复，记录但继续处理
    if (duplicateCount > 0) {
      console.log(`[SmartImport] 检测到重复: ${originalCount}个输入，${duplicateCount}个重复，${uniqueWords.length}个唯一`)
    }

    // 验证单词格式（允许字母、连字符、空格、单引号）
    const wordRegex = /^[a-zA-Z\- ']+$/
    const invalidWords = uniqueWords.filter(w => !wordRegex.test(w))
    if (invalidWords.length > 0) {
      return NextResponse.json({
        error: '单词格式不正确，只允许英文字母、连字符(-)、空格和单引号',
        invalidWords: invalidWords.slice(0, 5) // 只显示前5个
      }, { status: 400 })
    }

    const supabase = await createClient()

    // 🔒 安全检查1：验证bookId存在性
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id, created_by, is_official, total_words, total_chapters')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json({ error: '词库不存在' }, { status: 404 })
    }

    // 🔒 安全检查2：验证用户权限
    const bookData = book as any
    if (bookData.is_official === false && bookData.created_by !== user.id) {
      return NextResponse.json({
        error: '您只能给自己的词库添加单词'
      }, { status: 403 })
    }

    // 🔒 安全检查3：官方词库不允许智能导入
    if (bookData.is_official === true) {
      return NextResponse.json({
        error: '官方词库不支持智能导入'
      }, { status: 403 })
    }

    // 🔒 安全检查4：验证目标章节（如果提供了）
    if (chapterId) {
      const { data: targetChapter } = await supabase
        .from('chapters')
        .select('id, book_id')
        .eq('id', chapterId)
        .eq('book_id', bookId)
        .maybeSingle()

      if (!targetChapter) {
        return NextResponse.json({ error: '指定的章节不存在' }, { status: 404 })
      }
    }

    // 1. 检查今日已使用的配额
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: quotaData, error: quotaError } = await supabase
      .from('smart_import_quota')
      .select('count')
      .eq('user_id', user.id)
      .eq('quota_date', todayStr)
      .maybeSingle()

    const todayUsed = (quotaData as any)?.count || 0
    const DAILY_LIMIT = 500

    if (todayUsed + uniqueWords.length > DAILY_LIMIT) {
      return NextResponse.json({
        error: '超过每日配额限制',
        remaining: DAILY_LIMIT - todayUsed,
        requested: uniqueWords.length
      }, { status: 429 })
    }

    // 2. 检查Redis是否可用
    const cacheAvailable = await isRedisAvailable()

    // 3. 调用有道词典API获取单词信息（带缓存和重试）
    const results = []
    const totalBatches = Math.ceil(uniqueWords.length / MAX_CONCURRENT)

    // 🔒 安全性：使用Promise.allSettle并发调用，设置超时
    const API_TIMEOUT = 6000 // 6秒超时（降低以提高响应速度）
    const MAX_CONCURRENT = 20 // 最多并发20个请求（提升吞吐量）

    for (let i = 0; i < uniqueWords.length; i += MAX_CONCURRENT) {
      const batch = uniqueWords.slice(i, i + MAX_CONCURRENT)
      const currentBatch = Math.floor(i / MAX_CONCURRENT) + 1

      console.log(`[SmartImport] 进度: ${currentBatch}/${totalBatches} 批次`)

      const batchResults = await Promise.allSettled(
        batch.map(async (word) => {
          try {
            // ✅ 新增：检查缓存
            if (cacheAvailable) {
              const cached = await getCachedWordData(word)
              if (cached) {
                console.log(`✅ [Cache Hit] ${word}`)
                return cached
              }
            }

            // ✅ 新增：使用重试机制调用API
            const data = await retryWithBackoff(async () => {
              const controller = new AbortController()
              const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT)

              try {
                const response = await fetch(
                  `https://dict.youdao.com/jsonapi?q=${encodeURIComponent(word)}`,
                  {
                    signal: controller.signal,
                    headers: {
                      'User-Agent': 'Mozilla/5.0 (compatible; EducationalApp/1.0)'
                    }
                  }
                )

                clearTimeout(timeoutId)

                if (!response.ok) {
                  throw new Error(`API返回${response.status}`)
                }

                const jsonData = await response.json()

                // 🔒 安全性：验证API返回的数据结构
                if (!jsonData || typeof jsonData !== 'object') {
                  throw new Error('API返回格式错误')
                }

                return jsonData
              } catch (fetchError: any) {
                clearTimeout(timeoutId)
                throw fetchError
              }
            }, 3) // 最多重试3次

            // 解析响应
            const parsed = parseYoudaoResponse(data, word)

            // ✅ 新增：写入缓存
            if (cacheAvailable) {
              await cacheWordData(word, parsed)
            }

            return parsed

          } catch (error: any) {
            console.error(`Error fetching word "${word}":`, error.message)
            return {
              word: word.trim(),
              phonetic: '',
              uk_phonetic: '',
              us_phonetic: '',
              definition: '',
              definition_en: '',
              collocation: '',
              collocation_en: '',
              example_sentence: '',
              example_sentence_en: '',
              part_of_speech: '',
              success: false
            }
          }
        })
      )

      // 处理批次结果
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value)
        } else {
          console.error('Promise rejected:', result.reason)
        }
      })
    }

    // 4. 查找或使用指定章节
    let finalChapterId = chapterId

    if (!finalChapterId) {
      // 如果没有指定章节，查找或创建默认章节
      const { data: existingChapter } = await supabase
        .from('chapters')
        .select('id')
        .eq('book_id', bookId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      finalChapterId = existingChapter?.id

      if (!finalChapterId) {
        // 创建默认章节
        console.log(`[DEBUG] Creating chapter for book ${bookId}`)

        const { data: chapterData, error: chapterError } = await supabase
          .from('chapters')
          .insert({
            book_id: bookId,
            title: '默认章节',
            order_index: 1,
            word_count: results.length,
            is_default: true
          } as any)
          .select()
          .single()

        if (chapterError || !chapterData) {
          console.error('[ERROR] Failed to create chapter:', chapterError)
          return NextResponse.json({ error: '创建章节失败' }, { status: 500 })
        }

        finalChapterId = (chapterData as any).id
        console.log(`[DEBUG] Default chapter created successfully with ID: ${finalChapterId}`)
      }
    }

    // 5. 批量插入到words表
    const wordsToInsert = results.map((result, index) => ({
      book_id: bookId,
      chapter_id: finalChapterId,
      word: result.word,
      phonetic: result.phonetic,
      uk_phonetic: result.uk_phonetic, // ✅ 新增：英式音标
      us_phonetic: result.us_phonetic, // ✅ 新增：美式音标
      definition: result.definition,
      definition_en: result.definition_en,
      collocation: result.collocation,
      collocation_en: result.collocation_en,
      example_sentence: result.example_sentence,
      example_sentence_en: result.example_sentence_en,
      part_of_speech: result.part_of_speech,
      order_index: bookData.total_words + index + 1
    }))

    const { data: insertedWords, error: insertError } = await supabase
      .from('words')
      .insert(wordsToInsert as any)
      .select()

    console.log('[SmartImport] 插入结果:', {
      请求插入: wordsToInsert.length,
      实际插入: insertedWords?.length || 0,
      error: insertError?.message
    })

    if (insertError) {
      console.error('[SmartImport] 插入失败详情:', insertError)
      return NextResponse.json({ error: '保存单词失败', details: insertError.message }, { status: 500 })
    }

    if (!insertedWords || insertedWords.length === 0) {
      console.error('[SmartImport] 插入返回为空')
      return NextResponse.json({ error: '插入失败：未返回数据' }, { status: 500 })
    }

    // 6. 更新词库统计
    const newTotalWords = bookData.total_words + results.length

    console.log('[SmartImport] 更新词库统计:', {
      bookId,
      原总数: bookData.total_words,
      新增: results.length,
      新总数: newTotalWords
    })

    const { error: updateError } = await supabase
      .from('books')
      .update({
        total_words: newTotalWords,
        is_published: true
      })
      .eq('id', bookId)

    if (updateError) {
      console.error('[SmartImport] 更新词库统计失败:', updateError)
    } else {
      console.log('[SmartImport] 词库统计更新成功')
    }

    // 更新章节单词计数
    await supabase.rpc('increment_chapter_word_count', {
      chapter_uuid: finalChapterId,
      increment_by: results.length
    })

    // 7. 更新配额
    const { error: quotaUpdateError } = await supabase
      .from('smart_import_quota')
      .upsert({
        user_id: user.id,
        count: todayUsed + uniqueWords.length,
        quota_date: todayStr,
        updated_at: new Date().toISOString()
      } as any, {
        onConflict: 'user_id,quota_date'
      })

    if (quotaUpdateError) {
      console.error('Error updating quota:', quotaUpdateError)
    }

    return NextResponse.json({
      success: true,
      words: insertedWords,
      imported: insertedWords?.length || 0,
      remaining: DAILY_LIMIT - (todayUsed + uniqueWords.length),
      chapterId: finalChapterId,
      message: `已导入${insertedWords?.length || 0}个单词`,
      // 添加去重信息
      originalCount,
      duplicateCount,
      uniqueCount: uniqueWords.length
    })
  } catch (error: any) {
    console.error('Error in POST /api/smart-import:', error)
    return NextResponse.json({
      error: error.message || '服务器错误'
    }, { status: 500 })
  }
}

/**
 * GET /api/smart-import - 获取今日剩余配额
 */
export async function GET() {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const supabase = await createClient()
    const todayStr = new Date().toISOString().split('T')[0]

    const { data: quotaData } = await supabase
      .from('smart_import_quota')
      .select('count')
      .eq('user_id', user.id)
      .eq('quota_date', todayStr)
      .maybeSingle()

    const todayUsed = (quotaData as any)?.count || 0
    const DAILY_LIMIT = 500

    return NextResponse.json({
      used: todayUsed,
      remaining: DAILY_LIMIT - todayUsed,
      limit: DAILY_LIMIT
    })
  } catch (error) {
    console.error('Error in GET /api/smart-import:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
