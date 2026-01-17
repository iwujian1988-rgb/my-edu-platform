import { createClient, getCurrentUser } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * PUT /api/words/{wordId}
 * 更新单个单词的字段（表格视图的 inline 编辑）
 * 权限要求：必须是单词所属词库的创建者
 * 特性：乐观更新（不调用第三方API）
 */
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ wordId: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { wordId } = await params
    const body = await request.json()

    const supabase = await createClient()

    // ===== 查询单词信息（用于权限检查） =====
    const { data: word, error: wordError } = await supabase
      .from('words')
      .select('id, book_id, chapter_id')
      .eq('id', wordId)
      .single()

    if (wordError || !word) {
      return NextResponse.json({ error: '单词不存在' }, { status: 404 })
    }

    // ===== 权限检查 =====
    const { data: book } = await supabase
      .from('books')
      .select('id, created_by')
      .eq('id', word.book_id)
      .single()

    if (!book || (book as any).created_by !== user.id) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    // ===== 构建更新数据 =====
    const updateData: any = {}
    const allowedFields = [
      'word',
      'chapter_id',
      'phonetic',
      'uk_phonetic',
      'us_phonetic',
      'part_of_speech',
      'definition',
      'definition_en',
      'collocation',
      'collocation_en',
      'example_sentence',
      'example_sentence_en',
      'order_index'
    ]

    // 只更新允许的字段
    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field]
      }
    }

    // ===== 字段验证 =====
    if (updateData.word !== undefined) {
      if (!updateData.word || updateData.word.trim().length === 0) {
        return NextResponse.json({ error: '单词不能为空' }, { status: 400 })
      }
      if (updateData.word.length > 255) {
        return NextResponse.json({ error: '单词长度不能超过255个字符' }, { status: 400 })
      }
      updateData.word = updateData.word.trim()
    }

    if (updateData.definition !== undefined) {
      if (!updateData.definition || updateData.definition.trim().length === 0) {
        return NextResponse.json({ error: '中文释义不能为空' }, { status: 400 })
      }
      if (updateData.definition.length > 1000) {
        return NextResponse.json({ error: '中文释义长度不能超过1000个字符' }, { status: 400 })
      }
      updateData.definition = updateData.definition.trim()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: '没有提供要更新的字段' }, { status: 400 })
    }

    updateData.updated_at = new Date().toISOString()

    // ===== 更新单词 =====
    const { data: updatedWord, error: updateError } = await supabase
      .from('words')
      .update(updateData)
      .eq('id', wordId)
      .select()
      .single()

    if (updateError || !updatedWord) {
      console.error('Error updating word:', updateError)
      return NextResponse.json({ error: '更新单词失败' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: updatedWord
    })
  } catch (error) {
    console.error('Error in PUT /api/words/[wordId]:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * DELETE /api/words/{wordId}
 * 删除单个单词
 * 权限要求：词库创建者
 * 行为：级联删除 word_progress 记录
 */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ wordId: string }> }
) {
  const user = await getCurrentUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { wordId } = await params
    const supabase = await createClient()

    // ===== 查询单词信息 =====
    const { data: word, error: wordError } = await supabase
      .from('words')
      .select('id, book_id, chapter_id')
      .eq('id', wordId)
      .single()

    if (wordError || !word) {
      return NextResponse.json({ error: '单词不存在' }, { status: 404 })
    }

    // ===== 权限检查 =====
    const { data: book } = await supabase
      .from('books')
      .select('id, created_by, total_words')
      .eq('id', word.book_id)
      .single()

    if (!book || (book as any).created_by !== user.id) {
      return NextResponse.json({ error: '权限不足' }, { status: 403 })
    }

    const bookData = book as any

    // ===== 删除单词（会级联删除 word_progress） =====
    const { error: deleteError } = await supabase
      .from('words')
      .delete()
      .eq('id', wordId)

    if (deleteError) {
      console.error('Error deleting word:', deleteError)
      return NextResponse.json({ error: '删除单词失败' }, { status: 500 })
    }

    // ===== 更新词库统计 =====
    await supabase
      .from('books')
      .update({
        total_words: Math.max(0, bookData.total_words - 1),
        updated_at: new Date().toISOString()
      })
      .eq('id', word.book_id)

    // ===== 更新章节统计 =====
    if (word.chapter_id) {
      const { count: newWordCount } = await supabase
        .from('words')
        .select('*', { count: 'exact', head: true })
        .eq('chapter_id', word.chapter_id)

      await supabase
        .from('chapters')
        .update({ word_count: count || 0 })
        .eq('id', word.chapter_id)
    }

    return NextResponse.json({
      success: true,
      message: '单词已删除'
    })
  } catch (error) {
    console.error('Error in DELETE /api/words/[wordId]:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
