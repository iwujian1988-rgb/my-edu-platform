/**
 * 单个套餐管理 API
 * GET /api/admin/packages/[id] - 获取套餐详情
 * PUT /api/admin/packages/[id] - 更新套餐
 * DELETE /api/admin/packages/[id] - 删除套餐
 */

import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const supabase = await createAdminClient()

    const { data, error } = await supabase
      .from('invitation_packages')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !data) {
      return NextResponse.json({ error: '套餐不存在' }, { status: 404 })
    }

    return NextResponse.json({ package: data })
  } catch (error: any) {
    console.error('Error fetching package:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const body = await request.json()
    const {
      name,
      description,
      validity_days,
      feature_permissions,
      book_permissions,
      is_active,
      sort_order
    } = body

    const supabase = await createAdminClient()

    // 获取原套餐数据
    const { data: oldPackage } = await supabase
      .from('invitation_packages')
      .select('*')
      .eq('id', id)
      .single()

    if (!oldPackage) {
      return NextResponse.json({ error: '套餐不存在' }, { status: 404 })
    }

    // 更新套餐
    const { data, error } = await (supabase as any)
      .from('invitation_packages')
      .update({
        name: name ?? (oldPackage as any).name,
        description: description ?? (oldPackage as any).description,
        validity_days: validity_days !== undefined ? validity_days : (oldPackage as any).validity_days,
        feature_permissions: feature_permissions ?? (oldPackage as any).feature_permissions,
        book_permissions: book_permissions ?? (oldPackage as any).book_permissions,
        is_active: is_active !== undefined ? is_active : (oldPackage as any).is_active,
        sort_order: sort_order !== undefined ? sort_order : (oldPackage as any).sort_order
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating package:', error)
      return NextResponse.json({ error: '更新套餐失败' }, { status: 500 })
    }

    // 记录操作日志
    await logAdminAction(
      'update_package',
      'invitation_package',
      data.id,
      {
        name: data.name,
        changes: {
          validity_days: { old: (oldPackage as any).validity_days, new: (data as any).validity_days },
          is_active: { old: (oldPackage as any).is_active, new: (data as any).is_active }
        }
      }
    )

    return NextResponse.json({
      success: true,
      package: data,
      message: '套餐更新成功'
    })
  } catch (error: any) {
    console.error('Error in update package API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin()

    const { id } = await params
    const supabase = await createAdminClient()

    // 获取套餐信息
    const { data: packageData } = await supabase
      .from('invitation_packages')
      .select('name')
      .eq('id', id)
      .single()

    if (!packageData) {
      return NextResponse.json({ error: '套餐不存在' }, { status: 404 })
    }

    // 删除套餐
    const { error } = await supabase
      .from('invitation_packages')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting package:', error)
      return NextResponse.json({ error: '删除套餐失败' }, { status: 500 })
    }

    // 记录操作日志
    await logAdminAction(
      'delete_package',
      'invitation_package',
      id,
      { name: (packageData as any).name }
    )

    return NextResponse.json({
      success: true,
      message: '套餐已删除'
    })
  } catch (error: any) {
    console.error('Error in delete package API:', error)

    if (error.message === 'UNAUTHORIZED') {
      return NextResponse.json({ error: '未授权访问' }, { status: 401 })
    }

    return NextResponse.json({ error: '服务器错误' }, { status: 500 })
  }
}
