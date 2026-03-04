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
import { z } from 'zod'

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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // 身份验证：检查用户是否登录
    if (authError || !user) {
      console.error('[Speaker Words API] 未授权访问')
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const userId = searchParams.get('userId')
    const articleIdParam = searchParams.get('articleId')  // 新增：支持按文章筛选

    // 权限检查：验证 userId 是否与当前登录用户一致
    if (userId && userId !== user.id) {
      console.error('[Speaker Words API] 权限验证失败：userId 不匹配', { userId, user_id: user.id })
      return NextResponse.json(
        { error: 'FORBIDDEN', message: '无权访问他人数据' },
        { status: 403 }
      )
    }

    // P2修复：添加分页参数
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const offset = (page - 1) * pageSize

    console.log('[Speaker Words API] userId:', userId, 'page:', page, 'pageSize:', pageSize, 'articleId:', articleIdParam)

    // 如果 userId 为空，使用当前登录用户的 ID
    const targetUserId = userId || user.id
    console.log('[Speaker Words API] targetUserId:', targetUserId)

    // 查询生词列表（排除已掌握的，带分页）
    let query = supabase
      .from('speaker_ghost_words')
      .select('*', { count: 'exact' })
      .eq('user_id', targetUserId)
      .eq('is_mastered', false)

    // 如果指定了文章ID，添加筛选条件
    if (articleIdParam) {
      query = query.eq('article_id', articleIdParam)
    }

    const { data, error, count } = await query
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

    // 性能优化：批量获取文章标题，避免前端逐个请求
    const uniqueArticleIds = Array.from(new Set(wordsWithDict.map(w => w.article_id).filter(Boolean)))
    let articlesMap: Record<string, { id: string; title: string }> = {}

    if (uniqueArticleIds.length > 0) {
      const { data: articlesData, error: articlesError } = await supabase
        .from('speaker_articles')
        .select('id, title')
        .in('id', uniqueArticleIds)

      if (!articlesError && articlesData) {
        articlesMap = articlesData.reduce((acc, article) => {
          acc[article.id] = article
          return acc
        }, {} as Record<string, { id: string; title: string }>)
        console.log('[Speaker Words API] ✅ 批量获取文章标题:', articlesData.length)
      }
    }

    console.log('[Speaker Words API] ✅ 查询成功')

    return NextResponse.json({
      success: true,
      words: wordsWithDict,
      articles: articlesMap,  // 返回文章映射，前端不再需要逐个请求
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
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    // 身份验证：检查用户是否登录
    if (authError || !user) {
      console.error('[Speaker Words API] 未授权访问')
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const wordId = searchParams.get('id')

    if (!wordId) {
      return NextResponse.json(
        { error: 'MISSING_WORD_ID', message: '缺少单词 ID' },
        { status: 400 }
      )
    }

    // 忽略请求体中的 userId，直接使用当前登录用户的 ID（更安全）
    const userId = user.id

    // 标记为已掌握
    const { data, error } = await supabase
      .from('speaker_ghost_words')
      .update({
        is_mastered: true,
        mastered_at: new Date().toISOString()
      })
      .eq('id', wordId)
      .eq('user_id', userId)
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
