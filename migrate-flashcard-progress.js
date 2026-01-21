/**
 * 临时迁移脚本：添加 flashcard preferences 字段
 *
 * 使用方法：
 * 1. 确保 .env.local 配置了 Supabase URL 和 Key
 * 2. 运行：node migrate-flashcard-progress.js
 */

const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量：NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function runMigration() {
  try {
    console.log('🔄 开始执行数据库迁移...')

    // 1. 添加 preferences 字段
    console.log('📝 添加 preferences 字段...')
    const { error: alterError } = await supabase.rpc('exec_sql', {
      sql: `
        ALTER TABLE user_book_preferences
        ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;
      `
    })

    if (alterError) {
      // 如果 rpc 不可用，尝试直接使用 SQL
      console.log('⚠️  RPC 不可用，使用直接 SQL...')
      console.error('请手动在 Supabase 控制台执行以下 SQL:')
      console.log('\n```sql')
      console.log('ALTER TABLE user_book_preferences')
      console.log('ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT \'{}\'::jsonb;')
      console.log('\nCREATE INDEX IF NOT EXISTS idx_user_book_preferences_preferences_gin')
      console.log('ON user_book_preferences USING GIN (preferences);')
      console.log('``\n')
      return
    }

    // 2. 添加注释
    console.log('💬 添加字段注释...')
    await supabase.rpc('exec_sql', {
      sql: `
        COMMENT ON COLUMN user_book_preferences.preferences IS '用户偏好设置，JSON格式。包括flashcard学习进度等。结构：{ flashcard_progress_{bookId}_{scopeType}: { currentIndex, totalWords, lastStudyTime, scopeType } }';
      `
    })

    // 3. 创建索引
    console.log('🔍 创建 GIN 索引...')
    await supabase.rpc('exec_sql', {
      sql: `
        CREATE INDEX IF NOT EXISTS idx_user_book_preferences_preferences_gin
        ON user_book_preferences USING GIN (preferences);
      `
    })

    console.log('✅ 迁移完成！')
  } catch (error) {
    console.error('❌ 迁移失败:', error.message)
    console.error('\n请手动在 Supabase 控制台执行以下 SQL:')
    console.log('\n```sql')
    console.log('ALTER TABLE user_book_preferences')
    console.log('ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT \'{}\'::jsonb;')
    console.log('\nCREATE INDEX IF NOT EXISTS idx_user_book_preferences_preferences_gin')
    console.log('ON user_book_preferences USING GIN (preferences);')
    console.log('``\n')
  }
}

runMigration()
