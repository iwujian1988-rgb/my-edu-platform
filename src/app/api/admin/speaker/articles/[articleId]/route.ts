/**
 * Speaker 单篇文章管理 API
 *
 * 功能：
 * - GET: 获取文章详情
 * - PATCH: 更新文章
 * - DELETE: 删除文章
 */

import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { checkAdminForAPI } from '@/lib/admin-auth'
import type { SupabaseClient } from '@supabase/supabase-js'

interface SpeakerArticleSentenceInput {
  text: string
  text_en?: string | null
  start_time?: number | null
  end_time?: number | null
}

interface SpeakerArticlePatchBody {
  level?: number
  language?: string
  category?: string
  title?: string
  source_url?: string | null
  audio_url?: string
  image_url?: string | null
  has_preroll_ad?: boolean
  status?: string
  json_data?: {
    sentences?: SpeakerArticleSentenceInput[]
    [key: string]: unknown
  }
}

type SpeakerArticleUpdate = Partial<SpeakerArticlePatchBody> & {
  total_sentences?: number
  duration_seconds?: number | null
}

// ========================================
// GET - 获取文章详情
// ========================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient() as SupabaseClient
    const { articleId } = await params

    // 获取文章数据
    const { data: article, error } = await supabase
      .from('speaker_articles')
      .select(`
        *,
        speaker_sentences (
          id,
          sentence_index,
          text,
          start_time,
          end_time
        )
      `)
      .eq('id', articleId)
      .single()

    if (error) {
      console.error('[API] 获取文章详情失败:', error)
      return NextResponse.json(
        { error: '获取文章详情失败', details: error.message },
        { status: 500 }
      )
    }

    if (!article) {
      return NextResponse.json(
        { error: '文章不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({ data: article })
  } catch (error: any) {
    console.error('[API] 获取文章详情异常:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}

// ========================================
// PATCH - 更新文章
// ========================================
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient() as SupabaseClient
    const { articleId } = await params
    const body = await request.json() as SpeakerArticlePatchBody

    // 构建更新数据（只包含提供的字段）
    const updateData: SpeakerArticleUpdate = {}

    // 允许更新的字段
    const allowedFields: Array<keyof SpeakerArticlePatchBody> = [
      'level', 'language', 'category', 'title',
      'source_url', 'audio_url', 'image_url',
      'has_preroll_ad', 'status', 'json_data'
    ]

    allowedFields.forEach(field => {
      const value = body[field]
      if (value === undefined) return

      switch (field) {
        case 'level':
          updateData.level = value as number
          break
        case 'language':
          updateData.language = value as string
          break
        case 'category':
          updateData.category = value as string
          break
        case 'title':
          updateData.title = value as string
          break
        case 'source_url':
          updateData.source_url = value as string | null
          break
        case 'audio_url':
          updateData.audio_url = value as string
          break
        case 'image_url':
          updateData.image_url = value as string | null
          break
        case 'has_preroll_ad':
          updateData.has_preroll_ad = value as boolean
          break
        case 'status':
          updateData.status = value as string
          break
        case 'json_data':
          updateData.json_data = value as SpeakerArticlePatchBody['json_data']
          break
      }
    })

    // 如果更新了 json_data，需要重新计算统计信息
    if (body.json_data) {
      const sentences = body.json_data.sentences || []
      updateData.total_sentences = sentences.length

      if (sentences.length > 0) {
        const lastSentence = sentences[sentences.length - 1]
        updateData.duration_seconds = lastSentence.end_time || null
      } else {
        updateData.duration_seconds = null
      }
    }

    // 更新文章
    const { data: article, error } = await supabase
      .from('speaker_articles')
      .update(updateData)
      .eq('id', articleId)
      .select()
      .single()

    if (error) {
      console.error('[API] 更新文章失败:', error)
      return NextResponse.json(
        { error: '更新文章失败', details: error.message },
        { status: 500 }
      )
    }

    // 如果更新了 json_data，需要重新同步句子表
    if (body.json_data && body.json_data.sentences) {
      // 删除旧句子
      const { error: deleteError } = await supabase
        .from('speaker_sentences')
        .delete()
        .eq('article_id', articleId)

      if (deleteError) {
        console.error('[API] 删除旧句子失败:', deleteError)
      }

      // 插入新句子
      const sentencesToInsert = body.json_data.sentences.map((s, index) => ({
        article_id: articleId,
        sentence_index: index,
        text: s.text,
        text_en: s.text_en || null,
        start_time: s.start_time || null,
        end_time: s.end_time || null
      }))

      const { error: insertError } = await supabase
        .from('speaker_sentences')
        .insert(sentencesToInsert)

      if (insertError) {
        console.error('[API] 插入新句子失败:', insertError)
      }
    }

    // 重新验证缓存
    revalidatePath('/speaker')
    revalidatePath('/admin/speaker/articles')
    revalidatePath(`/admin/speaker/articles/${articleId}`)

    return NextResponse.json({
      success: true,
      data: article,
      message: '文章更新成功'
    })
  } catch (error: any) {
    console.error('[API] 更新文章异常:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}

// ========================================
// DELETE - 删除文章
// ========================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const adminCheck = await checkAdminForAPI()
    if (!adminCheck.success) {
      return NextResponse.json(
        { error: adminCheck.error, code: adminCheck.code },
        { status: adminCheck.status || 401 }
      )
    }

    const supabase = await createAdminClient() as SupabaseClient
    const { articleId } = await params

    // 先删除关联的句子
    const { error: sentencesError } = await supabase
      .from('speaker_sentences')
      .delete()
      .eq('article_id', articleId)

    if (sentencesError) {
      console.error('[API] 删除句子失败:', sentencesError)
    }

    // 删除文章
    const { error } = await supabase
      .from('speaker_articles')
      .delete()
      .eq('id', articleId)

    if (error) {
      console.error('[API] 删除文章失败:', error)
      return NextResponse.json(
        { error: '删除文章失败', details: error.message },
        { status: 500 }
      )
    }

    // 重新验证缓存
    revalidatePath('/speaker')
    revalidatePath('/admin/speaker/articles')

    return NextResponse.json({
      success: true,
      message: '文章删除成功'
    })
  } catch (error: any) {
    console.error('[API] 删除文章异常:', error)
    return NextResponse.json(
      { error: '服务器错误', details: error.message },
      { status: 500 }
    )
  }
}
