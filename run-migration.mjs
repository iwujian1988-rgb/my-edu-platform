// 执行数据库迁移：添加 last_accessed_at 字段
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  console.log('🚀 开始执行迁移：添加 last_accessed_at 字段\n')

  try {
    // 注意：Supabase JS 客户端不支持直接执行 DDL 语句
    // 我们需要通过 rpc 调用或者在控制台执行
    // 这里我们尝试一个测试查询来验证

    console.log('⚠️  Supabase JS 客户端无法直接执行 ALTER TABLE 语句')
    console.log('📝 请在 Supabase 控制台执行以下 SQL：\n')

    const sql = `-- 添加 last_accessed_at 字段到 user_book_preferences 表
-- 用于追踪用户最近访问的词库

ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ DEFAULT NOW();

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_user_book_preferences_last_accessed
ON user_book_preferences(user_id, last_accessed_at DESC);

-- 添加注释
COMMENT ON COLUMN user_book_preferences.last_accessed_at IS '用户最近访问该词库的时间';`

    console.log(sql)

    // 验证字段是否添加成功（假设已手动执行）
    console.log('\n🔍 验证字段是否已添加...')
    const { data, error } = await supabase
      .from('user_book_preferences')
      .select('user_id, book_id, last_accessed_at')
      .limit(1)

    if (error) {
      console.log('❌ 字段尚未添加，请先在控制台执行上述 SQL')
    } else {
      console.log('✅ 字段已成功添加！')
      console.log('📊 查询结果:', data)
    }

  } catch (err) {
    console.error('❌ 发生异常:', err.message)
  }
}

runMigration()
