/**
 * 单个单词书管理 API
 * GET    - 获取单词书详情
 * PUT    - 更新单词书
 * DELETE - 删除单词书
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdminForAPI, UnauthorizedError } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

type Params = Promise<{ bookId: string }>

/**
 * GET - 获取单词书详情
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    await requireAdminForAPI()

    const { bookId } = await params
    const supabase = await createClient()

    const { data: book, error } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (error || !book) {
      return NextResponse.json(
        { error: '单词书不存在' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      success: true,
      data: book
    })
  } catch (error: any) {
    console.error('Error in word book GET API:', error)

    if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * PUT - 更新单词书
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { bookId } = await params
    const body = await request.json()

    const supabase = await createClient()

    // 检查单词书是否存在
    const { data: existingBook } = await supabase
      .from('books')
      .select('*')
      .eq('id', bookId)
      .single()

    if (!existingBook) {
      return NextResponse.json(
        { error: '单词书不存在' },
        { status: 404 }
      )
    }

    // 更新单词书
    const { data: updatedBook, error: updateError } = await supabase
      .from('books')
      .update({
        title: body.title,
        description: body.description || null,
        category: body.category,
        is_official: body.is_official ?? false,
        cover_url: body.cover_url || null,
        difficulty_level: body.difficulty_level || null,
        is_published: body.is_published ?? false,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookId)
      .select()
      .single()

    if (updateError) {
      console.error('Error updating word book:', updateError)
      return NextResponse.json(
        { error: '更新单词书失败' },
        { status: 500 }
      )
    }

    // 记录操作日志
    await logAdminAction(
      'update_word_book',
      'word_book',
      bookId,
      {
        title: updatedBook.title,
        changes: body
      }
    )

    return NextResponse.json({
      success: true,
      data: updatedBook,
      message: '单词书更新成功'
    })
  } catch (error: any) {
    console.error('Error in word book PUT API:', error)

    if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * DELETE - 删除单词书
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { bookId } = await params
    const supabase = await createClient()

    // 检查单词书是否存在
    const { data: existingBook } = await supabase
      .from('books')
      .select('title, total_words, total_chapters')
      .eq('id', bookId)
      .single()

    if (!existingBook) {
      return NextResponse.json(
        { error: '单词书不存在' },
        { status: 404 }
      )
    }

    // 删除单词书（级联删除章节和单词）
    const { error: deleteError } = await supabase
      .from('books')
      .delete()
      .eq('id', bookId)

    if (deleteError) {
      console.error('Error deleting word book:', deleteError)
      return NextResponse.json(
        { error: '删除单词书失败' },
        { status: 500 }
      )
    }

    // 记录操作日志
    await logAdminAction(
      'delete_word_book',
      'word_book',
      bookId,
      {
        title: existingBook.title,
        total_words: existingBook.total_words,
        total_chapters: existingBook.total_chapters
      }
    )

    return NextResponse.json({
      success: true,
      message: '单词书删除成功'
    })
  } catch (error: any) {
    console.error('Error in word book DELETE API:', error)

    if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
