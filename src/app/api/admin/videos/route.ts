/**
 * 管理后台 - 视频管理 API
 *
 * GET /api/admin/videos - 获取视频列表
 * POST /api/admin/videos - 创建视频
 *
 * 重构版本：复用现有 invitation_packages 套餐系统
 */

import { NextRequest, NextResponse } from 'next/server'
import { checkAdminForAPI } from '@/lib/admin-auth'
import { createAdminClient } from '@/lib/supabase/server'
import type { VideoLanguage, VideoDifficulty, VideoStatus, CreateVideoBody } from '@/types/video'

// ============================================
// GET - 获取视频列表
// ============================================

export async function GET(request: NextRequest) {
  try {
    // 1. 检查管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status }
      )
    }

    // 2. 解析查询参数
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') as VideoStatus | null
    const language = searchParams.get('language') as VideoLanguage | null
    const difficulty = searchParams.get('difficulty') as VideoDifficulty | null
    const search = searchParams.get('search')
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('page_size') || '20')

    // 3. 构建查询
    // 🔧 临时直接创建客户端来排查问题
    const { createClient: createDirectClient } = await import('@supabase/supabase-js')
    const supabase = createDirectClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 🔍 深度调试
    console.log('[api/admin/videos] 环境变量检查:', {
      hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      serviceKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0,
      hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
    })

    // 🔧 临时简化查询， 不带关联, 来排查问题
    let query = supabase
      .from('videos')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((page - 1) * pageSize, page * pageSize - 1)

    console.log('[api/admin/videos] 查询条件:', { status, language, difficulty, search, page, pageSize })

    if (status && status !== 'all') {
      query = query.eq('status', status)
    }

    if (language && language !== 'all') {
      query = query.eq('language', language)
    }

    if (difficulty) {
      query = query.eq('difficulty', difficulty)
    }

    if (search) {
      query = query.ilike('title', `%${search}%`)
    }

    const { data: videos, error, count } = await query

    // 🔍 调试日志
    console.log('[api/admin/videos] 查询结果:', {
      videosCount: videos?.length || 0,
      totalCount: count,
      error: error ? { message: error.message, code: error.code } : null,
      queryFilters: { status, language, difficulty, search }
    })

    if (error) {
      console.error('[api/admin/videos] Query error:', error)
      return NextResponse.json(
        { success: false, error: '查询失败', code: 'QUERY_ERROR' },
        { status: 500 }
      )
    }

    // 4. 构建响应（package_ids 直接从 videos 表读取）
    const items = (videos || []).map(video => ({
      ...video,
      tags: video.video_tag_relations
        ?.map((r: { video_tags: { id: string; name: string; color: string } | null }) => r.video_tags)
        .filter(Boolean) || [],
      _counts: {
        subtitles: 0, // 需要单独查询
        cards: 0,     // 需要单独查询
      },
    }))

    // 5. 获取每个视频的字幕和卡片数量
    const videoIds = items.map(v => v.id)
    if (videoIds.length > 0) {
      // 字幕数量
      const { data: subtitleCounts } = await supabase
        .from('video_subtitles')
        .select('video_id')
        .in('video_id', videoIds)

      const subtitleCountMap = new Map<string, number>()
      for (const s of (subtitleCounts || [])) {
        subtitleCountMap.set(s.video_id, (subtitleCountMap.get(s.video_id) || 0) + 1)
      }

      // 卡片数量（单词+短语+表达）
      const [
        { data: wordCounts },
        { data: phraseCounts },
        { data: expressionCounts },
      ] = await Promise.all([
        supabase.from('video_word_cards').select('video_id').in('video_id', videoIds),
        supabase.from('video_phrase_cards').select('video_id').in('video_id', videoIds),
        supabase.from('video_expression_cards').select('video_id').in('video_id', videoIds),
      ])

      const cardCountMap = new Map<string, number>()
      for (const c of [...(wordCounts || []), ...(phraseCounts || []), ...(expressionCounts || [])]) {
        cardCountMap.set(c.video_id, (cardCountMap.get(c.video_id) || 0) + 1)
      }

      // 更新计数
      for (const item of items) {
        item._counts.subtitles = subtitleCountMap.get(item.id) || 0
        item._counts.cards = cardCountMap.get(item.id) || 0
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        items,
        total: count || 0,
        page,
        page_size: pageSize,
        total_pages: Math.ceil((count || 0) / pageSize),
      },
    })
  } catch (error) {
    console.error('[api/admin/videos] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}

// ============================================
// POST - 创建视频
// ============================================

export async function POST(request: NextRequest) {
  try {
    // 1. 检查管理员权限
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { success: false, error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status }
      )
    }

    // 2. 解析请求体
    const body: CreateVideoBody = await request.json()
    const {
      title,
      description,
      video_url,
      thumbnail_url,
      duration,
      language,
      difficulty = 'beginner',
      creator_name,
      source_url,
      tags = [],
      package_ids = [],
    } = body

    // 3. 验证必填字段（video_url 非必填，工作流最后才上传）
    if (!title || !language) {
      return NextResponse.json(
        { success: false, error: '缺少必填字段（标题、语言）', code: 'VALIDATION_ERROR' },
        { status: 400 }
      )
    }

    // 4. 创建视频（package_ids 直接保存到 videos 表）
    const supabase = await createAdminClient()
    const { data: video, error: createError } = await supabase
      .from('videos')
      .insert({
        title,
        description,
        video_url,
        thumbnail_url,
        duration: duration || 0,
        language,
        difficulty,
        creator_name,
        source_url,
        status: 'draft',
        package_ids: package_ids.length > 0 ? package_ids : null,
      })
      .select()
      .single()

    if (createError || !video) {
      // 🔍 增强错误日志，输出完整的 Supabase 错误信息
      console.error('[api/admin/videos] Create error:', {
        message: createError?.message,
        details: createError?.details,
        hint: createError?.hint,
        code: createError?.code,
        requestBody: { title, language, difficulty, duration, video_url },
      })
      return NextResponse.json(
        {
          success: false,
          error: `创建失败: ${createError?.message || '未知错误'}`,
          code: 'CREATE_ERROR',
          details: createError?.details,
          hint: createError?.hint,
        },
        { status: 500 }
      )
    }

    // 5. 关联标签
    if (tags.length > 0) {
      // 先获取或创建标签
      for (const tagName of tags) {
        let tagId: string

        const { data: existingTag } = await supabase
          .from('video_tags')
          .select('id')
          .eq('name', tagName)
          .single()

        if (existingTag) {
          tagId = existingTag.id
        } else {
          const { data: newTag } = await supabase
            .from('video_tags')
            .insert({ name: tagName })
            .select('id')
            .single()

          tagId = newTag?.id
        }

        if (tagId) {
          await supabase
            .from('video_tag_relations')
            .insert({ video_id: video.id, tag_id: tagId })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: video,
    })
  } catch (error) {
    console.error('[api/admin/videos] Unexpected error:', error)
    return NextResponse.json(
      { success: false, error: '服务器错误', code: 'INTERNAL_ERROR' },
      { status: 500 }
    )
  }
}
