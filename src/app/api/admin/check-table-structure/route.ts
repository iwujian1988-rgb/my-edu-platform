import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/admin/check-table-structure
 * 检查 public.users 表结构
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    // 查询 users 表的列信息
    const { data: columns, error } = await (supabase as any)
      .rpc('query', {
        query: `
          SELECT
            column_name,
            data_type,
            is_nullable,
            column_default
          FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = 'users'
          ORDER BY ordinal_position;
        `
      })

    if (error) {
      // 如果 rpc 失败，直接查询
      const { data: users, error: selectError } = await supabase
        .from('users')
        .select('*')
        .limit(1)

      return NextResponse.json({
        method: 'select *',
        hasData: !!users,
        error: selectError?.message,
        columns: users && users.length > 0 ? Object.keys(users[0]) : [],
        sample: users?.[0]
      })
    }

    return NextResponse.json({
      method: 'information_schema',
      columns
    })

  } catch (error: any) {
    return NextResponse.json({
      error: error.message
    }, { status: 500 })
  }
}
