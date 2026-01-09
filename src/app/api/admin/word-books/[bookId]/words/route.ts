/**
 * 单词列表 API
 * GET - 获取某单词书的单词列表（支持分页、筛选、搜索）
 * POST - 创建新单词
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdminForAPI, UnauthorizedError } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import type {
  Word,
  WordListResponse,
  WordListQuery,
  CreateWordRequest
} from '@/types/word'

type Params = Promise<{ bookId: string }>

/**
 * GET - 获取单词列表
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

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '50')
    const chapterId = searchParams.get('chapterId') || null
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'order_index'
    const sortOrder = searchParams.get('sortOrder') || 'asc'

    // 构建查询（JOIN章节信息）
    let query = supabase
      .from('words')
      .select('*, chapters(id, title, order_index)', { count: 'exact' })
      .eq('book_id', bookId)

    // 按章节筛选
    if (chapterId) {
      query = query.eq('chapter_id', chapterId)
    }

    // 搜索（支持单词和中文释义搜索）
    if (search) {
      query = query.or(`word.ilike.%${search}%,definition.ilike.%${search}%`)
    }

    // 计算分页
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 排序和分页
    const { data: words, error, count } = await query
      .order(sortBy, { ascending: sortOrder === 'asc' })
      .range(start, end)

    if (error) {
      console.error('Error fetching words:', error)
      return NextResponse.json(
        { error: '获取单词列表失败' },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / pageSize)

    const response: WordListResponse = {
      data: words || [],
      total: count || 0,
      page,
      pageSize,
      totalPages
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in words GET API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * POST - 创建新单词
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
    const body: CreateWordRequest = await request.json()

    // 验证必填字段
    if (!body.word || !body.definition) {
      return NextResponse.json(
        { error: '缺少必填字段：word 和 definition' },
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

    // 如果指定了章节，检查章节是否存在
    if (body.chapter_id) {
      const { data: chapter, error: chapterError } = await supabase
        .from('chapters')
        .select('id')
        .eq('id', body.chapter_id)
        .eq('book_id', bookId)
        .single()

      if (chapterError || !chapter) {
        return NextResponse.json(
          { error: '指定的章节不存在' },
          { status: 404 }
        )
      }
    }

    // 如果没有指定order_index，自动设置为最后
    let orderIndex = body.order_index
    if (orderIndex === undefined) {
      const { data: lastWord } = await supabase
        .from('words')
        .select('order_index')
        .eq('book_id', bookId)
        .order('order_index', { ascending: false })
        .limit(1)
        .single()

      orderIndex = (lastWord?.order_index || 0) + 1
    }

    // 创建新单词
    const { data: newWord, error: createError } = await supabase
      .from('words')
      .insert({
        book_id: bookId,
        chapter_id: body.chapter_id || null,
        word: body.word,
        phonetic: body.phonetic || null,
        part_of_speech: body.part_of_speech || null,
        definition: body.definition,
        definition_en: body.definition_en || null,
        collocation: body.collocation || null,
        collocation_en: body.collocation_en || null,
        example_sentence: body.example_sentence || null,
        example_sentence_en: body.example_sentence_en || null,
        order_index: orderIndex
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating word:', createError)
      return NextResponse.json(
        { error: '创建单词失败' },
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
    if (newWord.chapter_id) {
      const { data: chapterWords } = await supabase
        .from('words')
        .select('id')
        .eq('chapter_id', newWord.chapter_id)

      await supabase
        .from('chapters')
        .update({ word_count: chapterWords?.length || 0 })
        .eq('id', newWord.chapter_id)
    }

    // 记录操作日志
    await logAdminAction(
      'create_word',
      'word',
      newWord.id,
      {
        book_id: bookId,
        chapter_id: newWord.chapter_id,
        word: newWord.word
      }
    )

    return NextResponse.json({
      success: true,
      data: newWord,
      message: '单词创建成功'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in words POST API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
