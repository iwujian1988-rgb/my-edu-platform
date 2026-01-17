import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createClient()

  try {
    // 执行 SQL 添加字段
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_book_preferences
        ADD COLUMN IF NOT EXISTS last_reading_progress JSONB;

        COMMENT ON COLUMN user_book_preferences.last_reading_progress IS '保存用户最后的阅读进度，包含页码和筛选条件';

        CREATE INDEX IF NOT EXISTS idx_user_book_preferences_reading_progress_book_id
        ON user_book_preferences ((last_reading_progress->>'bookId'))
        WHERE last_reading_progress IS NOT NULL;
      `
    })

    if (error) {
      // 如果 exec_sql 不存在，尝试直接使用 SQL
      const { error: directError } = await supabase
        .from('user_book_preferences')
        .select('last_reading_progress')
        .limit(1)

      if (directError && directError.message.includes('column')) {
        return NextResponse.json({
          success: false,
          error: '字段不存在，需要在 Supabase 控制台手动执行迁移',
          sql: `
-- 在 Supabase SQL Editor 中执行：

ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS last_reading_progress JSONB;

COMMENT ON COLUMN user_book_preferences.last_reading_progress IS '保存用户最后的阅读进度，包含页码和筛选条件';

CREATE INDEX IF NOT EXISTS idx_user_book_preferences_reading_progress_book_id
ON user_book_preferences ((last_reading_progress->>'bookId'))
WHERE last_reading_progress IS NOT NULL;
          `
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        message: '字段已存在或迁移已执行',
        existingError: error.message
      })
    }

    return NextResponse.json({
      success: true,
      message: '迁移执行成功'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      sql: `
-- 在 Supabase SQL Editor 中执行：

ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS last_reading_progress JSONB;

COMMENT ON COLUMN user_book_preferences.last_reading_progress IS '保存用户最后的阅读进度，包含页码和筛选条件';

CREATE INDEX IF NOT EXISTS idx_user_book_preferences_reading_progress_book_id
ON user_book_preferences ((last_reading_progress->>'bookId'))
WHERE last_reading_progress IS NOT NULL;
      `
    }, { status: 500 })
  }
}
