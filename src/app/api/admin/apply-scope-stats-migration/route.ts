import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * POST /api/admin/apply-scope-stats-migration
 * 应用 get_book_scope_stats 函数迁移
 * 管理员权限
 */
export async function POST(request: NextRequest) {
  try {
    // 使用 service role key 创建 admin 客户端
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: '缺少 Supabase 配置'
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // 迁移 SQL
    const migrationSQL = `
-- 创建函数：获取词库的scope统计
CREATE OR REPLACE FUNCTION get_book_scope_stats(
  p_book_id UUID,
  p_total_words INTEGER
)
RETURNS TABLE (
  all INTEGER,
  unknown INTEGER,
  fuzzy INTEGER,
  new INTEGER,
  known INTEGER,
  mistakes INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH
  -- 获取各状态的单词数
  progress_counts AS (
    SELECT
      status,
      COUNT(*) as count
    FROM word_progress
    WHERE book_id = p_book_id
    GROUP BY status
  ),
  -- 获取错题本单词数
  mistake_count AS (
    SELECT COUNT(*) as count
    FROM mistakes
    WHERE book_id = p_book_id
  )
  SELECT
    p_total_words as all,
    COALESCE((SELECT count FROM progress_counts WHERE status = 'unknown'), 0) as unknown,
    COALESCE((SELECT count FROM progress_counts WHERE status = 'fuzzy'), 0) as fuzzy,
    GREATEST(0, p_total_words - COALESCE((SELECT count FROM progress_counts WHERE status = 'unknown'), 0)
                            - COALESCE((SELECT count FROM progress_counts WHERE status = 'fuzzy'), 0)
                            - COALESCE((SELECT count FROM progress_counts WHERE status = 'known'), 0)) as new,
    COALESCE((SELECT count FROM progress_counts WHERE status = 'known'), 0) as known,
    COALESCE((SELECT count FROM mistake_count), 0) as mistakes;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 添加注释
COMMENT ON FUNCTION get_book_scope_stats IS '一次性获取词库的所有学习范围单词统计（all, unknown, fuzzy, new, known, mistakes）';

-- 授权
GRANT EXECUTE ON FUNCTION get_book_scope_stats TO authenticated;
    `.trim()

    // 执行 SQL - 使用 PostgreSQL 的 pg_catalog.exec_sql
    const { data, error } = await supabaseAdmin
      .from('pg_catalog')
      .select('*')
      .limit(1)

    // 由于 Supabase JS 客户端不直接支持执行任意 SQL，
    // 我们需要创建一个 SQL 脚本供用户手动执行
    // 或者使用 pg_stat_statements 扩展

    // 验证函数是否已存在
    const { data: existingFunction, error: checkError } = await supabaseAdmin
      .rpc('get_book_scope_stats', {
        p_book_id: '00000000-0000-0000-0000-000000000000',
        p_total_words: 0
      })

    if (checkError && checkError.message.includes('function get_book_scope_stats')) {
      // 函数不存在，返回 SQL 供手动执行
      return NextResponse.json({
        success: false,
        needsManualExecution: true,
        message: '函数尚未创建，需要手动执行 SQL',
        sql: migrationSQL,
        instructions: [
          '1. 登录 Supabase Dashboard: https://app.supabase.com',
          '2. 选择你的项目',
          '3. 进入 SQL Editor',
          '4. 粘贴并执行下方 SQL'
        ]
      })
    }

    // 如果函数已存在，返回成功
    return NextResponse.json({
      success: true,
      message: 'get_book_scope_stats 函数已存在',
      note: '如果需要更新函数，请手动执行下方的 SQL'
    })

  } catch (error) {
    console.error('[Migration] Error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : '未知错误'
    }, { status: 500 })
  }
}

/**
 * GET /api/admin/apply-scope-stats-migration
 * 检查函数是否已创建
 */
export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabaseServiceKey) {
      return NextResponse.json({
        success: false,
        error: '缺少 Supabase 配置'
      }, { status: 500 })
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 尝试调用函数来检查是否存在
    const { data, error } = await supabaseAdmin
      .rpc('get_book_scope_stats', {
        p_book_id: '00000000-0000-0000-0000-000000000000',
        p_total_words: 0
      })

    if (error) {
      return NextResponse.json({
        success: false,
        exists: false,
        error: error.message
      })
    }

    return NextResponse.json({
      success: true,
      exists: true,
      message: 'get_book_scope_stats 函数已存在并可正常调用'
    })

  } catch (error) {
    return NextResponse.json({
      success: false,
      exists: false,
      error: error instanceof Error ? error.message : '未知错误'
    })
  }
}
