/**
 * 章节管理 API
 * GET    - 获取某单词书的所有章节
 * POST   - 创建新章节
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdminForAPI, UnauthorizedError } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import type {
  Chapter,
  CreateChapterRequest,
  ChapterListResponse
} from '@/types/chapter'

type Params = Promise<{ bookId: string }>

/**
 * GET - 获取某单词书的所有章节
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

    // 获取该单词书的所有章节
    const { data: chapters, error } = await supabase
      .from('chapters')
      .select('*')
      .eq('book_id', bookId)
      .order('order_index', { ascending: true })

    if (error) {
      console.error('Error fetching chapters:', error)
      return NextResponse.json(
        { error: '获取章节列表失败' },
        { status: 500 }
      )
    }

    const response: ChapterListResponse = {
      data: chapters || [],
      total: chapters?.length || 0
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in chapters GET API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * POST - 创建新章节
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { bookId } = await params

    // 解析请求体
    const body: CreateChapterRequest = await request.json()

    // 验证必填字段
    if (!body.title) {
      return NextResponse.json(
        { error: '缺少必填字段：title' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 检查单词书是否存在
    const { data: book, error: bookError } = await supabase
      .from('books')
      .select('id')
      .eq('id', bookId)
      .single()

    if (bookError || !book) {
      return NextResponse.json(
        { error: '单词书不存在' },
        { status: 404 }
      )
    }

    // 如果没有指定order_index，自动设置为最后
    let orderIndex = body.order_index
    if (orderIndex === undefined) {
      const { data: lastChapter } = await supabase
        .from('chapters')
        .select('order_index')
        .eq('book_id', bookId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()

      orderIndex = (lastChapter?.order_index || 0) + 1
    }

    // 创建新章节
    const { data: newChapter, error: createError } = await supabase
      .from('chapters')
      .insert({
        book_id: bookId,
        title: body.title,
        order_index: orderIndex,
        theme_id: body.theme_id || null,
        scene_id: body.scene_id || null,
        word_count: 0
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating chapter:', createError)
      return NextResponse.json(
        { error: '创建章节失败' },
        { status: 500 }
      )
    }

    // 更新单词书的章节数量
    const { data: allChapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', bookId)

    await supabase
      .from('books')
      .update({ total_chapters: allChapters?.length || 0 })
      .eq('id', bookId)

    // 记录操作日志
    await logAdminAction(
      'create_chapter',
      'chapter',
      newChapter.id,
      {
        book_id: bookId,
        title: newChapter.title,
        order_index: newChapter.order_index
      }
    )

    return NextResponse.json({
      success: true,
      data: newChapter,
      message: '章节创建成功'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in chapters POST API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
