/**
 * 单词书管理 API
 * GET    - 获取单词书列表
 * POST   - 创建新单词书
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdminForAPI, UnauthorizedError } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import type {
  WordBookListResponse,
  CreateWordBookRequest,
  WordBook,
  WordBookListQuery
} from '@/types/word-book'

/**
 * GET - 获取单词书列表
 */
export async function GET(request: NextRequest) {
  try {
    // 验证管理员权限
    await requireAdminForAPI()

    const supabase = await createClient()

    // 解析查询参数
    const searchParams = request.nextUrl.searchParams
    const page = parseInt(searchParams.get('page') || '1')
    const pageSize = parseInt(searchParams.get('pageSize') || '20')
    const category = searchParams.get('category') as WordBookListQuery['category'] || null
    const isOfficial = searchParams.get('isOfficial')
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'created_at'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // 构建查询
    let query = supabase
      .from('books')
      .select('*', { count: 'exact' })

    // 添加筛选条件
    if (category) {
      query = query.eq('category', category)
    }

    if (isOfficial !== null) {
      query = query.eq('is_official', isOfficial === 'true')
    }

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`)
    }

    // 计算分页
    const start = (page - 1) * pageSize
    const end = start + pageSize - 1

    // 排序和分页
    const { data: books, error, count } = await query
      .order(sortBy === 'title' ? 'title' : sortBy, { ascending: sortOrder === 'asc' })
      .range(start, end)

    if (error) {
      console.error('Error fetching word books:', error)
      return NextResponse.json(
        { error: '获取单词书列表失败' },
        { status: 500 }
      )
    }

    const totalPages = Math.ceil((count || 0) / pageSize)

    const response: WordBookListResponse = {
      data: books || [],
      total: count || 0,
      page,
      pageSize,
      totalPages
    }

    return NextResponse.json(response)
  } catch (error: any) {
    console.error('Error in word books GET API:', error)

    if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * POST - 创建新单词书
 */
export async function POST(request: NextRequest) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    // 解析请求体
    const body: CreateWordBookRequest = await request.json()

    // 验证必填字段
    if (!body.title || !body.category) {
      return NextResponse.json(
        { error: '缺少必填字段：title 和 category' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // 检查是否已存在同名单词书
    const { data: existingBook } = await supabase
      .from('books')
      .select('id')
      .eq('title', body.title)
      .single()

    if (existingBook) {
      return NextResponse.json(
        { error: '已存在同名的单词书' },
        { status: 400 }
      )
    }

    // 创建新单词书
    const { data: newBook, error: createError } = await supabase
      .from('books')
      .insert({
        title: body.title,
        description: body.description || '',
        category: body.category,
        is_official: body.is_official ?? false,
        cover_url: body.cover_url || null,
        difficulty_level: body.difficulty_level || null,
        total_words: 0,
        total_chapters: 0
      })
      .select()
      .single()

    if (createError) {
      console.error('Error creating word book:', createError)
      return NextResponse.json(
        { error: '创建单词书失败' },
        { status: 500 }
      )
    }

    // 记录操作日志
    await logAdminAction(
      'create_word_book',
      'word_book',
      newBook.id,
      {
        title: newBook.title,
        category: newBook.category,
        is_official: newBook.is_official
      }
    )

    return NextResponse.json({
      success: true,
      data: newBook,
      message: '单词书创建成功'
    }, { status: 201 })
  } catch (error: any) {
    console.error('Error in word books POST API:', error)

    if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
