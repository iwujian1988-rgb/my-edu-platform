/**
 * 演说家模块 - 文章详情 API
 *
 * 路由：GET /api/speaker/articles/:id
 * 功能：返回单篇演说家文章的完整信息（包含句子列表）
 *
 * 参考：
 * - shangwenjie.md 第 6 节（数据库表结构）
 * - AI_DEVELOPMENT_GUIDE.md Step 2.2
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { SupportedLanguage } from '@/types/speaker'

import { getSpeakerArticleById } from '../../../../../lib/speaker-data'

/**
 * GET 处理器：获取文章详情
 *
 * @param id - 文章 ID（URL 参数）
 * @returns { article: SpeakerArticle | null }
 *
 * @example
 * GET /api/speaker/articles/uuid-xxx
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  console.log('[Speaker API] 收到文章详情请求:', { id })

  try {
    // 1. 验证文章 ID
    if (!id) {
      console.warn('[Speaker API] ⚠️ 缺少文章 ID 参数')
      return NextResponse.json(
        { error: 'MISSING_ID', message: '缺少文章 ID' },
        { status: 400 }
      )
    }

    // 2. 创建 Supabase 客户端
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: '请先登录' },
        { status: 401 }
      )
    }

    // 3. 查询文章详情
    const article = await getSpeakerArticleById(supabase, id)

    // 4. 文章不存在
    if (!article) {
      console.log('[Speaker API] ℹ️ 文章不存在:', id)
      return NextResponse.json(
        { error: 'ARTICLE_NOT_FOUND', message: '文章不存在' },
        { status: 404 }
      )
    }

    const { data: purchase, error: purchaseError } = await supabase
      .from('speaker_user_language_purchases')
      .select('expires_at')
      .eq('user_id', user.id)
      .eq('language', article.language as SupportedLanguage)
      .eq('status', 'active')
      .maybeSingle()

    if (purchaseError) {
      throw purchaseError
    }

    const hasActiveLanguage = Boolean(
      purchase && (!purchase.expires_at || new Date(purchase.expires_at) > new Date())
    )

    if (!hasActiveLanguage) {
      return NextResponse.json(
        { error: 'FORBIDDEN_LANGUAGE', message: '当前账号未购买该语言包' },
        { status: 403 }
      )
    }

    // 5. 返回结果
    console.log('[Speaker API] ✅ 成功返回文章详情:', { title: article.title })

    return NextResponse.json({
      article
    })

  } catch (error) {
    // 6. 错误处理
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker API] ❌ 获取文章详情失败:', {
      id,
      error: errorMessage
    })

    // 检查是否为权限错误
    if (errorMessage.includes('PERMISSION_DENIED')) {
      return NextResponse.json(
        { error: 'PERMISSION_DENIED', message: '请先登录' },
        { status: 401 }
      )
    }

    // 其他错误
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: '服务器内部错误，请稍后重试' },
      { status: 500 }
    )
  }
}
