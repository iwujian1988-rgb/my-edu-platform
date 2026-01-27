/**
 * 单个章节管理 API
 * GET    - 获取单个章节详情
 * PATCH  - 更新章节
 * DELETE - 删除章节
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdminForAPI, UnauthorizedError } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import type { UpdateChapterRequest } from '@/types/chapter'

type Params = Promise<{
  bookId: string
  chapterId: string
}>

/**
 * GET - 获取单个章节详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    await requireAdminForAPI()

    const { chapterId } = await params

    const supabase = await createClient()

    // 获取章节详情
    const { data: chapter, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()

    if (error || !chapter) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: chapter
    })
  } catch (error: any) {
    console.error('Error in chapter GET API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * PATCH - 更新章节
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { bookId, chapterId } = await params

    // 解析请求体
    const body: UpdateChapterRequest = await request.json()

    const supabase = await createClient()

    // 检查章节是否存在
    const { data: existingChapter, error: fetchError } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single()

    if (fetchError || !existingChapter) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      )
    }

    // 构建更新数据
    const updateData: any = {}
    if (body.title !== undefined) updateData.title = body.title
    if (body.order_index !== undefined) updateData.order_index = body.order_index
    if (body.theme_id !== undefined) updateData.theme_id = body.theme_id
    if (body.scene_id !== undefined) updateData.scene_id = body.scene_id

    // 更新章节
    const { data: updatedChapter, error: updateError } = await (supabase
      .from('chapters') as any)
      .update(updateData)
      .eq('id', chapterId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating chapter:', updateError)
      return NextResponse.json(
        { error: '更新章节失败' },
        { status: 500 }
      )
    }

    // 记录操作日志
    await logAdminAction(
      'update_chapter',
      'chapter',
      chapterId,
      {
        book_id: bookId,
        old_data: existingChapter,
        new_data: updatedChapter,
        changes: body
      }
    )

    return NextResponse.json({
      success: true,
      data: updatedChapter,
      message: '章节更新成功'
    })
  } catch (error: any) {
    console.error('Error in chapter PATCH API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * DELETE - 删除章节
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { bookId, chapterId } = await params

    const supabase = await createClient()

    // 检查章节是否存在
    const { data: existingChapter, error: fetchError } = await supabase
      .from('chapters')
      .select('title, word_count')
      .eq('id', chapterId)
      .single()

    if (fetchError || !existingChapter) {
      return NextResponse.json(
        { error: '章节不存在' },
        { status: 404 }
      )
    }

    // 检查章节下是否有单词（直接查询words表确保准确性）
    const { count: wordCount, error: countError } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterId)

    if (countError) {
      console.error('Error counting words in chapter:', countError)
      return NextResponse.json(
        { error: '检查章节单词失败' },
        { status: 500 }
      )
    }

    if (wordCount && wordCount > 0) {
      return NextResponse.json(
        {
          error: `该章节下还有 ${wordCount} 个单词，无法删除。请先将这些单词移动到其他章节，或删除这些单词。`,
          wordCount: wordCount
        },
        { status: 400 }
      )
    }

    // 删除章节
    const { error: deleteError } = await supabase
      .from('chapters')
      .delete()
      .eq('id', chapterId)

    if (deleteError) {
      console.error('Error deleting chapter:', deleteError)
      return NextResponse.json(
        { error: '删除章节失败' },
        { status: 500 }
      )
    }

    // 更新单词书的章节数量
    const { data: allChapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', bookId)

    await (supabase
      .from('books') as any)
      .update({ total_chapters: allChapters?.length || 0 })
      .eq('id', bookId)

    // 记录操作日志
    await logAdminAction(
      'delete_chapter',
      'chapter',
      chapterId,
      {
        book_id: bookId,
        title: (existingChapter as any).title,
        word_count: (existingChapter as any).word_count
      }
    )

    return NextResponse.json({
      success: true,
      message: '章节删除成功'
    })
  } catch (error: any) {
    console.error('Error in chapter DELETE API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
