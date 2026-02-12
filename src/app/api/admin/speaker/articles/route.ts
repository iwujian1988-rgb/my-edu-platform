/**
 * Speaker 文章管理 API
 *
 * 功能：
 * - GET: 获取文章列表（支持筛选、分页、排序）
 * - POST: 创建新文章（支持 JSON 导入）
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { VALID_LANGUAGES, VALID_CATEGORIES, DEFAULT_STATUS, DEFAULT_LEVEL, FIELD_NAMES } from '@/lib/speaker-constants'

// ========================================
// GET - 获取文章列表
// ========================================
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    // 解析查询参数
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const level = searchParams.get('level')
    const language = searchParams.get('language')
    const category = searchParams.get('category')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 构建查询
    let query = supabase
      .from('speaker_articles')
      .select('*', { count: 'exact' })

    // 应用筛选条件
    if (level) {
      query = query.eq('level', parseInt(level))
    }
    if (language) {
      query = query.eq('language', language)
    }
    if (category) {
      query = query.eq('category', category)
    }
    if (status) {
      query = query.eq('status', status)
    }
    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    // 计算分页
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 应用排序和分页
    const { data: articles, error, count } = await query
      .order(sortBy as any, { ascending: sortOrder === 'asc' })
      .range(start, end)

    if (error) {
      console.error('[API] 获取文章列表失败:', error)
      return NextResponse.json(
        { error: '获取文章列表失败', details: error.message },
        { status: 500 }
      )
    }

    // 返回结果
    return NextResponse.json({
      data: articles || [],
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize)
      }
    })
  } catch (error: any) {
    console.error('[API] 获取文章列表异常:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}

// ========================================
// POST - 创建新文章
// ========================================
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    // 验证必需字段
    const requiredFields = ['level', 'language', 'category', 'title', 'audio_url', 'json_data']
    const missingFields = requiredFields.filter(field => !body[field])

    if (missingFields.length > 0) {
      return NextResponse.json(
        { error: '缺少必需字段', fields: missingFields },
        { status: 400 }
      )
    }

    // ============================================================
    // 验证并修正 level 值（自动修正机制）
    // ============================================================
    let finalLevel: number = DEFAULT_LEVEL  // 默认值，防止 null/undefined 崩溃

    if (body.level !== undefined && body.level !== null) {
      const num = Number(body.level)

      // 只有完全无法解析时才报错
      if (isNaN(num)) {
        console.warn(`[文章创建] level 值无法解析 (${body.level})，使用默认值: ${DEFAULT_LEVEL}`)
        // 使用默认值，不中断流程
      } else {
        // 自动修正：四舍五入 -> 限制在 1-5 范围内
        finalLevel = Math.round(num)
        if (finalLevel < 1) finalLevel = 1
        if (finalLevel > 5) finalLevel = 5

        console.log(`[文章创建] level 自动修正: ${body.level} -> ${finalLevel}`)
      }
    } else {
      console.log(`[文章创建] level 为空，使用默认值: ${DEFAULT_LEVEL}`)
    }

    // ============================================================
    // 对所有可能的数字字段进行类型安全转换
    // ============================================================
    const safeNumber = (value: any, fieldName: string): number => {
      if (value === undefined || value === null || value === '') {
        console.log(`[文章创建] ${fieldName} 为空，使用默认值 0`)
        return 0
      }
      const num = Number(value)
      if (isNaN(num)) {
        console.warn(`[文章创建] ${fieldName} 值无法解析 (${value})，使用默认值 0`)
        return 0
      }
      const rounded = Math.round(num)
      const result = Math.max(0, rounded)  // 确保非负数
      console.log(`[文章创建] ${fieldName} 自动转换: ${value} -> ${result}`)
      return result
    }

    // 对传入的数字字段进行安全转换
    const durationInt = safeNumber(body.duration_seconds, 'duration_seconds')
    const viewCountInt = safeNumber(body.view_count, 'view_count')  // view_count 字段处理
    const wordCountInt = safeNumber(body.word_count, 'word_count')

    // 验证 language 值
    if (!VALID_LANGUAGES.includes(body.language as any)) {
      return NextResponse.json(
        { error: `language 必须是以下值之一: ${VALID_LANGUAGES.join(', ')}` },
        { status: 400 }
      )
    }

    // 验证 category 值
    if (!VALID_CATEGORIES.includes(body.category)) {
      return NextResponse.json(
        { error: `category 必须是以下值之一: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // 提取 sentences 数据
    const sentences = body.json_data?.sentences || []
    const totalSentences = sentences.length

    // 计算时长（从 sentences 的最后一个 end_time）
    let durationSeconds = durationInt  // 使用转换后的整数值

    // 插入文章数据
    const { data: article, error: articleError } = await supabase
      .from('speaker_articles')
      .insert({
        level: finalLevel,  // 使用验证后的 level
        language: body.language,
        category: body.category,
        title: body.title,
        source_url: body.source_url || null,
        audio_url: body.audio_url,
        image_url: body.image_url || null,
        has_preroll_ad: body.has_preroll_ad || false,  // 修复拼写：使用 FIELD_NAMES.HAS_PREROLL_AD
        total_sentences: totalSentences,
        duration_seconds: durationSeconds,  // 使用转换后的整数值
        word_count: wordCountInt,  // ✅ 使用转换后的整数值，防止 "953.07" 类错误
        view_count: viewCountInt,  // ✅ 使用转换后的整数值，防止类似错误
        json_data: body.json_data,
        status: body.status || DEFAULT_STATUS  // 使用统一默认状态
      })
      .select()
      .single()

    if (articleError) {
      console.error('[API] 插入文章失败:', articleError)
      return NextResponse.json(
        { error: '插入文章失败', details: articleError.message },
        { status: 500 }
      )
    }

    // 插入句子数据
    if (sentences.length > 0) {
      const sentencesToInsert = sentences.map((s: any, index: number) => ({
        article_id: article.id,
        sentence_index: index,
        text: s.text,
        text_en: s.text,
        start_time: s.start_time || null,
        end_time: s.end_time || null
      }))

      const { error: sentencesError } = await supabase
        .from('speaker_sentences')
        .insert(sentencesToInsert)

      if (sentencesError) {
        console.error('[API] 插入句子失败:', sentencesError)
        // 不中断流程，继续返回文章数据
      }
    }

    // 重新验证缓存
    revalidatePath('/speaker')
    revalidatePath('/admin/speaker/articles')

    return NextResponse.json({
      success: true,
      data: article,
      message: '文章创建成功'
    }, { status: 201 })
  } catch (error: any) {
    console.error('[API] 创建文章异常:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}
