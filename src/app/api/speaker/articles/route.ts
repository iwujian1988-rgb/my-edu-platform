/**
 * 演说家模块 - 文章列表 API
 *
 * 路由：GET /api/speaker/articles
 * 功能：返回演说家文章列表（支持按难度等级过滤）
 *
 * 参考：
 * - shangwenjie.md 第 2.1 节（演说家首页）
 * - AI_DEVELOPMENT_GUIDE.md Step 2.1
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

import type { SpeakerLevel, SupportedLanguage, ArticleCategory } from '../../../../types/speaker'
import { getSpeakerArticles } from '../../../../lib/speaker-data'

/**
 * GET 处理器：获取文章列表
 *
 * @queryParam level - 可选，难度等级（1、2 或 3）
 * @queryParam language - 可选，语种（en, pl, es, fr, de, ja）
 * @queryParam category - 可选，分类（健康、心理、成长、学习、社交、生活）
 * @queryParam limit - 可选，返回数量限制
 * @queryParam status - 可选，文章状态（active 或 archived，默认 active）
 *
 * @returns { articles: SpeakerArticle[], total: number }
 *
 * @example
 * GET /api/speaker/articles
 * GET /api/speaker/articles?level=2
 * GET /api/speaker/articles?language=en&category=健康
 * GET /api/speaker/articles?level=3&limit=5
 */
export async function GET(request: Request) {
  console.log('[Speaker API] 收到文章列表请求')

  try {
    // 1. 解析查询参数
    const { searchParams } = new URL(request.url)
    const levelParam = searchParams.get('level')
    const languageParam = searchParams.get('language')
    const categoryParam = searchParams.get('category')
    const limitParam = searchParams.get('limit')
    const statusParam = searchParams.get('status') // 移除默认值，让 data 层处理

    console.log('[Speaker API] 查询参数:', {
      level: levelParam,
      language: languageParam,
      category: categoryParam,
      limit: limitParam,
      status: statusParam
    })

    // 2. 验证参数
    let level: SpeakerLevel | undefined
    if (levelParam) {
      const levelNum = parseInt(levelParam, 10)
      // 支持 Level 1, 2, 3
      if (levelNum !== 1 && levelNum !== 2 && levelNum !== 3) {
        console.warn('[Speaker API] ⚠️ 无效的难度等级:', levelParam)
        return NextResponse.json(
          { error: 'INVALID_LEVEL', message: '难度等级必须是 1、2 或 3' },
          { status: 400 }
        )
      }
      level = levelNum as SpeakerLevel
    }

    // 验证语种参数
    const validLanguages: SupportedLanguage[] = ['en', 'pl', 'es', 'fr', 'de', 'ja']
    let language: SupportedLanguage | undefined
    if (languageParam && validLanguages.includes(languageParam as SupportedLanguage)) {
      language = languageParam as SupportedLanguage
    } else if (languageParam) {
      console.warn('[Speaker API] ⚠️ 无效的语种:', languageParam)
      return NextResponse.json(
        { error: 'INVALID_LANGUAGE', message: '语种必须是 en, pl, es, fr, de 或 ja' },
        { status: 400 }
      )
    }

    // 验证分类参数
    const validCategories: ArticleCategory[] = ['健康', '心理', '成长', '学习', '社交', '生活']
    let category: ArticleCategory | undefined
    if (categoryParam && validCategories.includes(categoryParam as ArticleCategory)) {
      category = categoryParam as ArticleCategory
    } else if (categoryParam) {
      console.warn('[Speaker API] ⚠️ 无效的分类:', categoryParam)
      return NextResponse.json(
        { error: 'INVALID_CATEGORY', message: '分类必须是 健康、心理、成长、学习、社交 或 生活' },
        { status: 400 }
      )
    }

    const limit = limitParam ? parseInt(limitParam, 10) : undefined
    if (limitParam && isNaN(limit!)) {
      console.warn('[Speaker API] ⚠️ 无效的 limit 参数:', limitParam)
      return NextResponse.json(
        { error: 'INVALID_LIMIT', message: 'limit 必须是有效的数字' },
        { status: 400 }
      )
    }

    // 3. 创建 Supabase 客户端
    const supabase = await createClient()

    // 4. 查询文章列表（RLS 会自动过滤未购语言）
    const articles = await getSpeakerArticles(supabase, {
      level,
      language,
      category,
      limit,
      status: statusParam as 'active' | 'archived'
    })

    // 5. 获取当前用户信息（如果有）
    const { data: { user } } = await supabase.auth.getUser()

    // 6. 如果用户已登录，获取每篇文章的学习进度
    let articlesWithProgress: any[] = articles
    if (user) {
      // 批量查询用户的所有进度
      const { data: progressData } = await supabase
        .from('speaker_progress')
        .select('article_id, status, step4_completed')
        .eq('user_id', user.id)

      // 创建进度映射表
      const progressMap = new Map()
      if (progressData) {
        progressData.forEach(progress => {
          progressMap.set(progress.article_id, {
            status: progress.status,
            isCompleted: progress.step4_completed
          })
        })
      }

      // 将进度信息附加到每篇文章
      articlesWithProgress = articles.map(article => ({
        ...article,
        progress: progressMap.get(article.id) || null
      }))
    }

    // 7. 返回结果
    console.log('[Speaker API] ✅ 成功返回文章列表:', { count: articlesWithProgress.length })

    return NextResponse.json({
      articles: articlesWithProgress,
      total: articlesWithProgress.length
    })

  } catch (error) {
    // 6. 错误处理
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Speaker API] ❌ 获取文章列表失败:', { error: errorMessage })

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
