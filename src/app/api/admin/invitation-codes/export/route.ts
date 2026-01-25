import { createAdminClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { NextRequest, NextResponse } from 'next/server'
import * as XLSX from 'xlsx'

/**
 * POST /api/admin/invitation-codes/export
 * 导出邀请码为 Excel 文件
 *
 * Body: {
 *   codes: string[]  // 要导出的邀请码ID列表
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await requireAdmin()
    const body = await request.json()
    const { codes } = body

    if (!Array.isArray(codes) || codes.length === 0) {
      return NextResponse.json(
        { error: '请提供要导出的邀请码ID列表' },
        { status: 400 }
      )
    }

    const supabase = await createAdminClient()

    // 查询邀请码详情
    const { data: codesData, error } = await supabase
      .from('invitation_codes')
      .select(`
        id,
        code,
        package_id,
        is_exported,
        exported_at,
        created_at,
        invitation_packages (
          id,
          name,
          description
        )
      `)
      .in('id', codes)

    if (error) {
      console.error('Error fetching invitation codes:', error)
      return NextResponse.json(
        { error: '查询邀请码失败' },
        { status: 500 }
      )
    }

    if (!codesData || codesData.length === 0) {
      return NextResponse.json(
        { error: '未找到邀请码' },
        { status: 404 }
      )
    }

    // 获取前台 URL（优先使用环境变量，否则使用线上地址）
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://maxnote.top'

    // 准备 Excel 数据
    const excelData = codesData.map((code: any) => {
      const packageName = code.invitation_packages?.name || '未知套餐'
      const registerUrl = `${siteUrl}/register?code=${code.code}`
      const exportStatus = code.is_exported ? '已导出' : '未导出'

      return {
        '邀请码': code.code,
        '套餐名称': packageName,
        '注册链接': registerUrl,
        '导出状态': exportStatus,
        '创建时间': new Date(code.created_at).toLocaleString('zh-CN')
      }
    })

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(excelData)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '邀请码')

    // 生成 Excel 文件
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' })

    // 标记为已导出
    const now = new Date().toISOString()
    await supabase
      .from('invitation_codes')
      .update({ is_exported: true, exported_at: now })
      .in('id', codes)

    // 返回文件
    const filename = `invitation_codes_${new Date().getTime()}.xlsx`

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`
      }
    })

  } catch (error: any) {
    console.error('Error exporting invitation codes:', error)
    return NextResponse.json(
      { error: '导出失败', details: error.message },
      { status: 500 }
    )
  }
}
