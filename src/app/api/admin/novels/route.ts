/**
 * 小说管理 API（套餐绑定）
 * GET /api/admin/novels - 小说列表 + 全部邀请套餐
 * PUT /api/admin/novels - 更新小说绑定的套餐（books.package_ids）
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdminForAPI, logAdminAction } from '@/lib/admin-auth'
import { listNovelBooks, updateNovelPackages } from '@/lib/novel-permissions'
import { NextRequest, NextResponse } from 'next/server'

export async function GET() {
  try {
    await requireAdminForAPI()

    const [novels, supabase] = await Promise.all([
      listNovelBooks(),
      createAdminClient()
    ])

    const { data: packages, error } = await supabase
      .from('invitation_packages')
      .select('id, name, is_active, sort_order')
      .order('sort_order', { ascending: true })

    if (error) {
      console.error('Error fetching packages:', error)
      return NextResponse.json({ error: '获取套餐列表失败' }, { status: 500 })
    }

    return NextResponse.json({ novels, packages: packages || [] })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    console.error('Error in admin novels API:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const admin = await requireAdminForAPI()
    const { bookId, packageIds } = await request.json()

    if (!bookId || !Array.isArray(packageIds)) {
      return NextResponse.json({ error: '参数不合法' }, { status: 400 })
    }

    const supabase = await createAdminClient()
    const { data: book } = await supabase
      .from('books')
      .select('id, title, is_novel')
      .eq('id', bookId)
      .maybeSingle()

    if (!book || !book.is_novel) {
      return NextResponse.json({ error: '小说不存在' }, { status: 404 })
    }

    // 校验 packageIds 都是真实存在的套餐
    if (packageIds.length > 0) {
      const { count } = await supabase
        .from('invitation_packages')
        .select('id', { count: 'exact', head: true })
        .in('id', packageIds)
      if (count !== packageIds.length) {
        return NextResponse.json({ error: '包含无效套餐' }, { status: 400 })
      }
    }

    const ok = await updateNovelPackages(bookId, packageIds)
    if (!ok) {
      return NextResponse.json({ error: '更新失败' }, { status: 500 })
    }

    await logAdminAction('update_novel_packages', 'book', bookId, {
      title: book.title,
      package_count: packageIds.length
    })

    return NextResponse.json({ success: true, packageIds })
  } catch (error: any) {
    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }
    console.error('Error updating novel packages:', error)
    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
