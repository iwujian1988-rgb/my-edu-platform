/**
 * Speaker 单篇文章管理 API
 *
 * 功能：
 * - GET: 获取文章详情
 * - PATCH: 更新文章
 * - DELETE: 删除文章
 */

import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'

// ========================================
// GET - 获取文章详情
// ========================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ articleId: string }> }
) {
  try {
    const supabase = await createClient()
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
    const supabase = await createClient()
    const { articleId } = await params
    const body = await request.json()

    // 构建更新数据（只包含提供的字段）
    const updateData: any = {}

    // 允许更新的字段
    const allowedFields = [
      'level', 'language', 'category', 'title',
      'source_url', 'audio_url', 'image_url',
      'has_preroll_ad', 'status', 'json_data'
    ]

    allowedFields.forEach(field => {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
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
      const sentencesToInsert = body.json_data.sentences.map((s: any, index: number) => ({
        article_id: articleId,
        sentence_index: index,
        text: s.text,
        text_en: s.text,
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
    const supabase = await createClient()
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
