import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * 临时迁移端点：添加 flashcard preferences 字段
 *
 * 使用方法：GET /api/migrate-flashcard
 * 迁移完成后请删除此文件
 */
export async function GET() {
  try {
    const supabase = await createClient()

    console.log('🔄 开始执行数据库迁移...')

    // 执行迁移 SQL
    const sql = `
      -- 添加 preferences 字段
      ALTER TABLE user_book_preferences
      ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

      -- 添加注释
      COMMENT ON COLUMN user_book_preferences.preferences IS '用户偏好设置，JSON格式。包括flashcard学习进度等';

      -- 创建 GIN 索引
      CREATE INDEX IF NOT EXISTS idx_user_book_preferences_preferences_gin
      ON user_book_preferences USING GIN (preferences);
    `

    // 注意：Supabase 不支持直接执行多条 SQL
    // 需要在控制台手动执行或使用 Supabase CLI

    return NextResponse.json({
      success: true,
      message: '请手动在 Supabase 控制台执行以下 SQL',
      sql: sql
    })
  } catch (error) {
    console.error('Migration error:', error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
