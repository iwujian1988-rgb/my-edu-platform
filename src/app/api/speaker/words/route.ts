/**
 * 演说家模块 - 魔鬼生词本 API
 *
 * 路由：
 * - GET /api/speaker/words - 获取生词列表
 * - PUT /api/speaker/words/:id - 标记单词为已掌握
 *
 * 严格按照三个文档实现：
 * - shangwenjie.md 第 2.5 节（魔鬼生词本）
 * - TECHNICAL_MODIFICATION_PLAN.md（技术方案）
 * - AI_DEVELOPMENT_GUIDE.md（开发指南）
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * GET 处理器：获取用户的魔鬼生词列表
 *
 * 功能：
 * 1. 查询 speaker_ghost_words 表
 * 2. 调用有道 API 获取音标和释义（TODO）
 * 3. 按创建时间倒序排列
 */
export async function GET(request: Request) {
  console.log('[Speaker Words API] 获取生词列表')

  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')

    // P2修复：添加分页参数
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const offset = (page - 1) * pageSize

    console.log('[Speaker Words API] userId:', userId, 'page:', page, 'pageSize:', pageSize)

    if (!userId) {
      return NextResponse.json(
        { error: 'MISSING_USER_ID', message: '缺少用户 ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    console.log('[Speaker Words API] supabase client created')

    // 查询生词列表（排除已掌握的，带分页）
    const { data, error, count } = await supabase
      .from('speaker_ghost_words')
      .select('*', { count: 'exact' })
      .eq('user_id', userId)
      .eq('is_mastered', false)
      .order('created_at', { ascending: false })
      .range(offset, offset + pageSize - 1)

    console.log('[Speaker Words API] query completed')

    if (error) {
      console.error('[Speaker Words API] ❌ 查询生词失败:', error)
      throw error
    }

    const totalCount = count || 0
    const totalPages = Math.ceil(totalCount / pageSize)

    console.log('[Speaker Words API] 查询到生词数量:', data?.length || 0, '总数:', totalCount, '总页数:', totalPages)

    // 立即返回数据，不阻塞
    let wordsWithDict = data || []

    // P3修复：移除重复更新逻辑，只保留通知日志
    // 数据填充由听写提交时的异步任务负责
    const wordsNeedingDict = wordsWithDict.filter(w => !w.phonetic && !w.definition)

    if (wordsNeedingDict.length > 0) {
      const uniqueWords = Array.from(new Set(wordsNeedingDict.map(w => w.word)))

      console.log('[Speaker Words API] 发现', uniqueWords.length, '个生词缺失词典数据，将由听写提交任务填充')
      // 不再在这里更新，避免重复IO
    }

    console.log('[Speaker Words API] ✅ 查询成功')

    return NextResponse.json({
      success: true,
      words: wordsWithDict,
      pagination: {
        page,
        pageSize,
        totalCount,
        totalPages,
        hasMore: page < totalPages
      }
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Words API] ❌ 获取生词失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}

/**
 * PUT 处理器：标记单词为已掌握
 *
 * 路由：PUT /api/speaker/words?id={wordId}
 * 功能：将 is_mastered 设置为 true
 */
export async function PUT(request: Request) {
  console.log('[Speaker Words API] 标记单词为已掌握')

  try {
    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get('id')

    if (!wordId) {
      return NextResponse.json(
        { error: 'MISSING_WORD_ID', message: '缺少单词 ID' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { userId } = body

    if (!userId) {
      return NextResponse.json(
        { error: 'MISSING_USER_ID', message: '缺少用户 ID' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 标记为已掌握
    const { data, error } = await supabase
      .from('speaker_ghost_words')
      .update({
        is_mastered: true,
        mastered_at: new Date().toISOString()
      })
      .eq('id', wordId)
      .eq('user_id', userId)  // 安全检查：只能操作自己的生词
      .select()
      .single()

    if (error) {
      console.error('[Speaker Words API] ❌ 标记失败:', error)
      throw error
    }

    console.log('[Speaker Words API] ✅ 单词已标记为掌握')

    return NextResponse.json({
      success: true,
      word: data
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker Words API] ❌ 标记单词失败:', { error: errorMessage })

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
