/**
 * Speaker 文章管理 API
 *
 * 功能：
 * - GET: 获取文章列表（支持筛选、分页、排序）
 * - POST: 创建新文章（使用 Zod 强校验）
 */

import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { resolveImageUrl } from '@/lib/speaker-auto-analysis'
import { checkAdminForAPI } from '@/lib/admin-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

// ========================================
// Zod Schema - 强校验
// ========================================

const sentenceSchema = z.object({
  speaker: z.string().optional(),
  text: z.string().min(1, '句子文本不能为空'),
  text_en: z.string().optional(), // 英文翻译（可选）
  start_time: z.number().nullable().optional(),
  end_time: z.number().nullable().optional()
})

const uploadSchema = z.object({
  level: z.union([z.string(), z.number()]).transform(val => {
    const num = Number(val)
    if (isNaN(num) || num < 1 || num > 5) {
      return 3 // 默认 Level 3
    }
    return Math.round(num)
  }).default(3),

  language: z.string().min(1, '语言不能为空').default('en'),
  category: z.string().min(1, '分类不能为空').default('心理'),

  title: z.string().min(1, '标题不能为空'),
  source_url: z.string().nullable().optional(),
  audio_url: z.string().min(1, '音频 URL 不能为空'),
  image_url: z.string().nullable().optional(),
  has_preroll_ad: z.boolean().optional().default(false),

  json_data: z.object({
    sentences: z.array(sentenceSchema).min(1, '至少需要一个句子'),
    meta: z.any().optional()
  }),

  word_count: z.number().optional(), // 可选，后端会计算
  duration_seconds: z.number().optional() // 可选，后端会计算
})

// ========================================
// GET - 获取文章列表
// ========================================
export async function GET(request: NextRequest) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient() as SupabaseClient
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
// POST - 创建新文章（重构版）
// ========================================
export async function POST(request: NextRequest) {
  const supabase = await createAdminClient() as SupabaseClient

  try {
    // ============================================================
    // 1. 权限检查
    // ============================================================
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success || !adminCheck.admin) {
      console.error('[API] 未授权访问')
      return NextResponse.json(
        { error: adminCheck.error || '未授权访问', code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    // ============================================================
    // 2. 解析与校验
    // ============================================================
    const body = await request.json()
    const parseResult = uploadSchema.safeParse(body)

    if (!parseResult.success) {
      console.error('[API] 校验失败:', parseResult.error.format())
      return NextResponse.json(
        {
          error: '数据校验失败',
          details: parseResult.error.format()
        },
        { status: 400 }
      )
    }

    const data = parseResult.data
    const sentences = data.json_data.sentences

    console.log(`[API] 开始创建文章: ${data.title}, 句子数: ${sentences.length}`)

    // ============================================================
    // 3. 计算衍生数据（兜底逻辑）
    // ============================================================

    // 句子总数
    const total_sentences = sentences.length

    // 时长：取最后一个句子的 end_time
    let duration_seconds = data.duration_seconds
    if (duration_seconds === undefined || duration_seconds === null) {
      const lastSentence = sentences[sentences.length - 1]
      duration_seconds = lastSentence?.end_time
        ? Math.ceil(lastSentence.end_time)
        : 0
    }

    // 词数：如果前端没传，后端计算
    let word_count = data.word_count
    if (word_count === undefined || word_count === null) {
      word_count = sentences.reduce((acc, s) => {
        return acc + s.text.split(/\s+/).filter(w => w.length > 0).length
      }, 0)
    }

    console.log(`[API] 计算结果 - 总句子: ${total_sentences}, 时长: ${duration_seconds}s, 词数: ${word_count}`)

    // ============================================================
    // 4. 解析图片 URL（处理 loremflickr 重定向）
    // ============================================================
    const finalImageUrl = await resolveImageUrl(data.image_url)
    if (data.image_url !== finalImageUrl) {
      console.log(`[API] 图片 URL 已解析: ${data.image_url?.substring(0, 50)}... → ${finalImageUrl?.substring(0, 50)}...`)
    }

    // ============================================================
    // 5. 插入文章
    // ============================================================
    const { data: article, error: articleError } = await supabase
      .from('speaker_articles')
      .insert({
        // 基础字段
        title: data.title,
        level: data.level,
        language: data.language,
        category: data.category,

        // URL 字段
        source_url: data.source_url,
        audio_url: data.audio_url,
        image_url: finalImageUrl, // 使用解析后的真实 URL

        // 标记
        has_preroll_ad: data.has_preroll_ad ?? false,

        // JSON 数据
        json_data: data.json_data,

        // 统计字段
        total_sentences,
        duration_seconds,
        word_count,

        // 状态：固定为 'published'（符合新约束）
        status: 'published',

        // 用户 ID（从 auth 获取）
        user_id: adminCheck.admin.user_id
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

    console.log(`[API] ✅ 文章插入成功: ${article.id}`)

    // ============================================================
    // 5. 插入句子
    // ============================================================
    if (sentences.length > 0) {
      const sentencesPayload = sentences.map((s, index) => ({
        article_id: article.id,
        sentence_index: index,
        text: s.text,
        text_en: s.text_en || null, // 包含 text_en，但可为 null
        start_time: s.start_time ?? null,
        end_time: s.end_time ?? null
      }))

      const { error: sentencesError } = await supabase
        .from('speaker_sentences')
        .insert(sentencesPayload)

      if (sentencesError) {
        console.error('[API] 插入句子失败:', sentencesError)

        // ============================================================
        // 回滚：删除文章，避免数据不一致
        // ============================================================
        console.warn('[API] 执行回滚：删除文章以避免脏数据')
        await supabase
          .from('speaker_articles')
          .delete()
          .eq('id', article.id)

        return NextResponse.json(
          { error: '插入句子失败，已回滚文章', details: sentencesError.message },
          { status: 500 }
        )
      }

      console.log(`[API] ✅ 成功插入 ${sentences.length} 个句子`)
    }

    // ============================================================
    // 6. 重新验证缓存
    // ============================================================
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
