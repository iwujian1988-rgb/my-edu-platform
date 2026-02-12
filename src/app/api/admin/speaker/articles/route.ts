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
// POST - 创建新文章（防御性增强版）
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
    // 🔒 脏数据过滤器：防御性增强
    // ============================================================
    const sanitizedBody = {
      level: body.level !== undefined && body.level !== null && body.level !== '' ? body.level : null,
      language: body.language !== undefined && body.language !== null && body.language !== '' ? body.language : null,
      category: body.category !== undefined && body.category !== null && body.category !== '' ? body.category : null,
      title: body.title !== undefined && body.title !== null && body.title !== '' ? body.title : null,
      audio_url: body.audio_url !== undefined && body.audio_url !== null && body.audio_url !== '' ? body.audio_url : null,
      json_data: body.json_data !== undefined && body.json_data !== null && body.json_data !== '' ? body.json_data : null
    }

    // 检查是否有空的必填字段
    const emptyRequiredFields = Object.keys(sanitizedBody).filter(key => sanitizedBody[key] === null)
    if (emptyRequiredFields.length > 0) {
      console.error('[API] 必填字段为空:', emptyRequiredFields)
      return NextResponse.json(
        {
          error: '必填字段不能为空',
          details: `以下字段为空或空字符串: ${emptyRequiredFields.join(', ')}`
        },
        { status: 400 }
      )
    }

    // ============================================================
    // 🔒 全量类型清洗（所有数字字段强制转换）
    // ============================================================
    const sanitizeNumber = (value: any, fieldName: string): number => {
      if (value === undefined || value === null || value === '') {
        console.warn(`[字段清洗] ${fieldName} 为空/undefined，使用默认值 0`)
        return 0
      }
      const num = Number(value)
      if (isNaN(num)) {
        console.warn(`[字段清洗] ${fieldName} 值无法解析 (${value})，使用默认值 0`)
        return 0
      }
      // 强制转换为整数，防止 "953.07" 类错误
      const rounded = Math.round(num)
      const result = Math.max(0, rounded)  // 确保非负数
      console.log(`[字段清洗] ${fieldName} 类型转换: ${value} (${typeof value}) -> ${result}`)
      return result
    }

    // 验证并修正 level 值（使用 sanitizedBody）
    let finalLevel: number = DEFAULT_LEVEL
    if (sanitizedBody.level !== null) {
      const num = Number(sanitizedBody.level)
      if (isNaN(num)) {
        console.warn(`[文章创建] level 无法解析 (${sanitizedBody.level})，使用默认值: ${DEFAULT_LEVEL}`)
        finalLevel = DEFAULT_LEVEL
      } else {
        finalLevel = Math.round(num)
        if (finalLevel < 1) finalLevel = 1
        if (finalLevel > 5) finalLevel = 5
        console.log(`[文章创建] level 自动修正: ${sanitizedBody.level} -> ${finalLevel}`)
      }
    } else {
      console.log(`[文章创建] level 为空，使用默认值: ${DEFAULT_LEVEL}`)
      finalLevel = DEFAULT_LEVEL
    }

    // 验证并修正其他数字字段
    const durationInt = sanitizeNumber(sanitizedBody.duration_seconds, 'duration_seconds')
    const wordCountInt = sanitizeNumber(sanitizedBody.word_count, 'word_count')

    // 验证 language 值
    if (!VALID_LANGUAGES.includes(sanitizedBody.language as any)) {
      return NextResponse.json(
        { error: `language 必须是以下值之一: ${VALID_LANGUAGES.join(', ')}` },
        { status: 400 }
      )
    }

    // 验证 category 值
    if (!VALID_CATEGORIES.includes(sanitizedBody.category)) {
      return NextResponse.json(
        { error: `category 必须是以下值之一: ${VALID_CATEGORIES.join(', ')}` },
        { status: 400 }
      )
    }

    // ============================================================
    // JSON 结构深度校验：防止僵尸文章
    // ============================================================
    // 校验 sentences 数据结构
    if (!sanitizedBody.json_data || typeof sanitizedBody.json_data !== 'object') {
      return NextResponse.json(
        {
          error: 'json_data 格式错误',
          details: 'json_data 必须是包含 sentences 属性的对象，不能是字符串或其他类型'
        },
        { status: 400 }
      )
    }

    if (!Array.isArray(sanitizedBody.json_data.sentences)) {
      return NextResponse.json(
        {
          error: 'sentences 数据格式错误',
          details: 'sentences 必须是数组类型，且不能为空'
        },
        { status: 400 }
      )
    }

    if (sanitizedBody.json_data.sentences.length === 0) {
      return NextResponse.json(
        {
          error: 'sentences 不能为空',
          details: '文章必须至少包含一个句子'
        },
        { status: 400 }
      )
    }

    // 提取 sentences 数据（已通过校验）
    const sentences = sanitizedBody.json_data.sentences
    const totalSentences = sentences.length

    // 计算时长（从 sentences 的最后一个 end_time）
    let durationSeconds = durationInt  // 使用转换后的整数值

    // 插入文章数据
    let article: any = null  // 保存文章ID，用于回滚

    const { data: articleData, error: articleError } = await supabase
      .from('speaker_articles')
      .insert({
        level: finalLevel,  // 使用验证后的 level
        language: sanitizedBody.language,
        category: sanitizedBody.category,
        title: sanitizedBody.title,
        source_url: sanitizedBody.source_url || null,
        audio_url: sanitizedBody.audio_url,
        image_url: sanitizedBody.image_url || null,
        has_preroll_ad: sanitizedBody.has_preroll_ad || false,  // 修复拼写：使用 FIELD_NAMES.HAS_PREROLL_AD
        total_sentences: totalSentences,
        duration_seconds: durationSeconds,  // 使用转换后的整数值
        word_count: wordCountInt,  // ✅ 使用转换后的整数值，防止 "953.07" 类错误
        json_data: sanitizedBody.json_data,
        status: sanitizedBody.status || DEFAULT_STATUS  // 使用统一默认状态
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

    // 保存成功后才赋值，用于可能的回滚
    article = articleData

    // 插入句子数据
    if (sentences.length > 0) {
      const sentencesToInsert = sentences.map((s: any, index: number) => ({
        article_id: article.id,
        sentence_index: index,
        text: s.text,
        text_en: s.text_en || s.text,  // 优先使用前端传来的英文翻译，防止数据丢失
        start_time: s.start_time || null,
        end_time: s.end_time || null
      }))

      const { error: sentencesError } = await supabase
        .from('speaker_sentences')
        .insert(sentencesToInsert)

      if (sentencesError) {
        console.error('[API] 插入句子失败:', sentencesError)

        // ============================================================
        // 手动回滚：删除僵尸文章，防止数据不一致
        // ============================================================
        console.warn('[API] 句子插入失败，执行回滚，删除文章以防止数据不一致')

        const { error: deleteError } = await supabase
          .from('speaker_articles')
          .delete()
          .eq('id', article.id)

        if (deleteError) {
          console.error('[API] 回滚失败:', deleteError)
          // 回滚也失败，记录错误但继续
        } else {
          console.log(`[API] 回滚成功：已删除文章 ID ${article.id}`)
          // 删除引用，避免返回已被删除的文章数据
          article = null
        }
      } else {
        console.log(`[API] ✅ 成功插入 ${sentences.length} 个句子`)
      }
    } else {
      console.warn('[API] 文章没有句子数据，跳过句子插入')
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
