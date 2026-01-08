/**
 * 套餐-单词书关联管理 API
 * GET    - 获取套餐关联的单词书列表
 * POST   - 关联单词书到套餐
 */

import { createClient } from '@/lib/supabase/server'
import { requireAdminForAPI, UnauthorizedError } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

type Params = Promise<{ id: string }>

/**
 * GET - 获取套餐关联的单词书列表
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    await requireAdminForAPI()

    const { id } = await params

    const supabase = await createClient()

    // 获取套餐信息
    const { data: packageData, error: packageError } = await supabase
      .from('invitation_packages')
      .select('book_permissions')
      .eq('id', id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: '套餐不存在' },
        { status: 404 }
      )
    }

    const bookIds = packageData.book_permissions || []

    // 如果是通配符"*"，返回所有单词书
    if (bookIds.length === 1 && bookIds[0] === '*') {
      const { data: allBooks, error: booksError } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: false })

      if (booksError) {
        console.error('Error fetching all books:', booksError)
        return NextResponse.json(
          { error: '获取单词书列表失败' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        success: true,
        data: allBooks || [],
        isAll: true
      })
    }

    // 否则返回关联的单词书
    if (bookIds.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        isAll: false
      })
    }

    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('*')
      .in('id', bookIds)
      .order('created_at', { ascending: false })

    if (booksError) {
      console.error('Error fetching books:', booksError)
      return NextResponse.json(
        { error: '获取单词书列表失败' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      data: books || [],
      isAll: false
    })
  } catch (error: any) {
    console.error('Error in package books GET API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

/**
 * POST - 关联单词书到套餐
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Params }
) {
  try {
    // 验证管理员权限
    const admin = await requireAdminForAPI()

    const { id } = await params

    // 解析请求体
    const { bookIds, isAll } = await request.json()

    const supabase = await createClient()

    // 检查套餐是否存在
    const { data: packageData, error: packageError } = await supabase
      .from('invitation_packages')
      .select('*')
      .eq('id', id)
      .single()

    if (packageError || !packageData) {
      return NextResponse.json(
        { error: '套餐不存在' },
        { status: 404 }
      )
    }

    // 准备新的book_permissions
    let newBookPermissions: string[]

    if (isAll) {
      // 设置为通配符，表示所有单词书
      newBookPermissions = ['*']
    } else if (Array.isArray(bookIds)) {
      // 验证bookId是否存在
      const { data: books } = await supabase
        .from('books')
        .select('id')
        .in('id', bookIds)

      if (!books || books.length !== bookIds.length) {
        return NextResponse.json(
          { error: '部分单词书不存在' },
          { status: 400 }
        )
      }

      newBookPermissions = bookIds
    } else {
      return NextResponse.json(
        { error: '无效的参数，需要提供bookIds数组或isAll=true' },
        { status: 400 }
      )
    }

    // 更新套餐的book_permissions
    const { error: updateError } = await supabase
      .from('invitation_packages')
      .update({ book_permissions: newBookPermissions })
      .eq('id', id)

    if (updateError) {
      console.error('Error updating package:', updateError)
      return NextResponse.json(
        { error: '更新套餐失败' },
        { status: 500 }
      )
    }

    // 记录操作日志
    await logAdminAction(
      'update_package_books',
      'invitation_package',
      id,
      {
        package_name: packageData.name,
        old_book_permissions: packageData.book_permissions,
        new_book_permissions: newBookPermissions,
        is_all: isAll
      }
    )

    return NextResponse.json({
      success: true,
      message: isAll
        ? '已设置为所有单词书可用'
        : `已关联${newBookPermissions.length}本单词书`
    })
  } catch (error: any) {
    console.error('Error in package books POST API:', error)
if (error instanceof UnauthorizedError || error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
