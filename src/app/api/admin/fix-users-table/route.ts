import { createAdminClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/fix-users-table
 * 修复 public.users 表缺少 updated_at 字段的问题
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminClient()

    // 执行 SQL 修复
    const sql = `
      -- 添加 updated_at 字段
      ALTER TABLE public.users
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

      -- 创建自动更新触发器
      CREATE OR REPLACE FUNCTION public.handle_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      -- 创建触发器
      DROP TRIGGER IF EXISTS set_updated_at ON public.users;
      CREATE TRIGGER set_updated_at
        BEFORE UPDATE ON public.users
        FOR EACH ROW
        EXECUTE FUNCTION public.handle_updated_at();
    `

    // 使用 rpc 执行原始 SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // 如果 rpc 不存在，直接返回 SQL 让用户手动执行
      return NextResponse.json({
        success: false,
        message: '请手动执行以下 SQL',
        sql,
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      message: '修复成功！users 表已添加 updated_at 字段'
    })

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      hint: '请在 Supabase Dashboard 的 SQL Editor 中执行上述 SQL'
    }, { status: 500 })
  }
}
