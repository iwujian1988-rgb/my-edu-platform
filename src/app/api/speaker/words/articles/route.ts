/**
 * 获取用户生词关联的所有文章列表
 * 用于魔鬼生词本的文章筛选下拉框
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    // 1. 获取用户所有生词关联的文章 ID（去重）
    const { data: ghostWords, error: wordsError } = await supabase
      .from('speaker_ghost_words')
      .select('article_id')
      .eq('user_id', user.id)
      .eq('is_mastered', false)

    if (wordsError) {
      console.error('[Ghost Word Articles API] 查询生词失败:', wordsError)
      throw wordsError
    }

    // 提取唯一的文章 ID
    const articleIds = [...new Set(ghostWords?.map(w => w.article_id).filter(Boolean) || [])]

    if (articleIds.length === 0) {
      return NextResponse.json({
        success: true,
        articles: {}
      })
    }

    // 2. 获取这些文章的标题
    const { data: articlesData, error: articlesError } = await supabase
      .from('speaker_articles')
      .select('id, title')
      .in('id', articleIds)

    if (articlesError) {
      console.error('[Ghost Word Articles API] 查询文章失败:', articlesError)
      throw articlesError
    }

    // 3. 转换为对象格式
    const articlesMap = (articlesData || []).reduce((acc, article) => {
      acc[article.id] = article
      return acc
    }, {} as Record<string, { id: string; title: string }>)

    console.log('[Ghost Word Articles API] ✅ 查询成功，文章数:', Object.keys(articlesMap).length)

    return NextResponse.json({
      success: true,
      articles: articlesMap
    })

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Ghost Word Articles API] ❌ 获取失败:', errorMessage)

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误' },
      { status: 500 }
    )
  }
}
