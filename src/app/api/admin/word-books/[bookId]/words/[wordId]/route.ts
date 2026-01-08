/**
 * 单个单词管理 API
 * GET    - 获取单个单词详情
 * PATCH  - 更新单词（10个字段）
 * DELETE - 删除单词
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdminForAPI, UnauthorizedError } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateWordRequest } from '@/types/word'

type Params = Promise<{
  bookId: string
  wordId: string
}>

/**
 * GET - 获取单个单词详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    await requireAdminForAPI()

    const { wordId } = await params

    const supabase = await createClient()

    // 获取单词详情
    const { data: word, error } = await supabase
      .from('words')
      .select('*')
      .eq('id', wordId)
      .single()

    if (error || !word) {
      return NextResponse.json(
        { error: '单词不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: word
    })
  } catch (error: any) {
    console.error('Error in word GET API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * PATCH - 更新单词（10个字段）
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { bookId, wordId } = await params

    // 解析请求体
    const body: UpdateWordRequest = await request.json()

    const supabase = await createClient()

    // 检查单词是否存在
    const { data: existingWord, error: fetchError } = await supabase
      .from('words')
      .select('*')
      .eq('id', wordId)
      .single()

    if (fetchError || !existingWord) {
      return NextResponse.json(
        { error: '单词不存在' },
        { status: 404 }
      )
    }

    // 如果修改了章节，检查新章节是否存在
    if (body.chapter_id !== undefined && body.chapter_id !== existingWord.chapter_id) {
      if (body.chapter_id !== null) {
        const { data: chapter } = await supabase
          .from('chapters')
          .select('id')
          .eq('id', body.chapter_id)
          .eq('book_id', bookId)
          .single()

        if (!chapter) {
          return NextResponse.json(
            { error: '指定的章节不存在' },
            { status: 404 }
          )
        }
      }
    }

    // 构建更新数据（10个字段）
    const updateData: any = {}
    if (body.word !== undefined) updateData.word = body.word
    if (body.phonetic !== undefined) updateData.phonetic = body.phonetic
    if (body.part_of_speech !== undefined) updateData.part_of_speech = body.part_of_speech
    if (body.definition !== undefined) updateData.definition = body.definition
    if (body.definition_en !== undefined) updateData.definition_en = body.definition_en
    if (body.collocation !== undefined) updateData.collocation = body.collocation
    if (body.collocation_en !== undefined) updateData.collocation_en = body.collocation_en
    if (body.example_sentence !== undefined) updateData.example_sentence = body.example_sentence
    if (body.example_sentence_en !== undefined) updateData.example_sentence_en = body.example_sentence_en
    if (body.order_index !== undefined) updateData.order_index = body.order_index
    if (body.chapter_id !== undefined) updateData.chapter_id = body.chapter_id

    // 更新单词
    const { data: updatedWord, error: updateError } = await supabase
      .from('words')
      .update(updateData)
      .eq('id', wordId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating word:', updateError)
      return NextResponse.json(
        { error: '更新单词失败' },
        { status: 500 }
      )
    }

    // 更新章节的单词数（如果章节发生了变化）
    if (body.chapter_id !== undefined && body.chapter_id !== existingWord.chapter_id) {
      // 更新旧章节的单词数
      if (existingWord.chapter_id) {
        const { data: oldChapterWords } = await supabase
          .from('words')
          .select('id')
          .eq('chapter_id', existingWord.chapter_id)

        await supabase
          .from('chapters')
          .update({ word_count: oldChapterWords?.length || 0 })
          .eq('id', existingWord.chapter_id)
      }

      // 更新新章节的单词数
      if (updatedWord.chapter_id) {
        const { data: newChapterWords } = await supabase
          .from('words')
          .select('id')
          .eq('chapter_id', updatedWord.chapter_id)

        await supabase
          .from('chapters')
          .update({ word_count: newChapterWords?.length || 0 })
          .eq('id', updatedWord.chapter_id)
      }
    }

    // 记录操作日志
    await logAdminAction(
      'update_word',
      'word',
      wordId,
      {
        book_id: bookId,
        old_data: existingWord,
        new_data: updatedWord,
        changes: body
      }
    )

    return NextResponse.json({
      success: true,
      data: updatedWord,
      message: '单词更新成功'
    })
  } catch (error: any) {
    console.error('Error in word PATCH API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * DELETE - 删除单词
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { bookId, wordId } = await params

    const supabase = await createClient()

    // 检查单词是否存在
    const { data: existingWord, error: fetchError } = await supabase
      .from('words')
      .select('word, chapter_id')
      .eq('id', wordId)
      .single()

    if (fetchError || !existingWord) {
      return NextResponse.json(
        { error: '单词不存在' },
        { status: 404 }
      )
    }

    // 记录所属章节ID（用于后续更新章节单词数）
    const chapterId = existingWord.chapter_id

    // 删除单词
    const { error: deleteError } = await supabase
      .from('words')
      .delete()
      .eq('id', wordId)

    if (deleteError) {
      console.error('Error deleting word:', deleteError)
      return NextResponse.json(
        { error: '删除单词失败' },
        { status: 500 }
      )
    }

    // 更新单词书的单词总数
    const { data: allWords } = await supabase
      .from('words')
      .select('id')
      .eq('book_id', bookId)

    await supabase
      .from('books')
      .update({ total_words: allWords?.length || 0 })
      .eq('id', bookId)

    // 更新章节的单词数
    if (chapterId) {
      const { data: chapterWords } = await supabase
        .from('words')
        .select('id')
        .eq('chapter_id', chapterId)

      await supabase
        .from('chapters')
        .update({ word_count: chapterWords?.length || 0 })
        .eq('id', chapterId)
    }

    // 记录操作日志
    await logAdminAction(
      'delete_word',
      'word',
      wordId,
      {
        book_id: bookId,
        chapter_id: chapterId,
        word: existingWord.word
      }
    )

    return NextResponse.json({
      success: true,
      message: '单词删除成功'
    })
  } catch (error: any) {
    console.error('Error in word DELETE API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
