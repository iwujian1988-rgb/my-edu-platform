// 检查打字练习功能的数据库迁移状态
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://snnrjnpcmdsdlyldvvps.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq22hc"

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMigration() {
  console.log('🔍 检查数据库迁移状态...\n')

  try {
    // 1. 测试查询 word_progress 表的 typing_correct_count 字段
    console.log('1️⃣ 检查 word_progress 表字段...')
    const { data: wpData, error: wpError } = await supabase
      .from('word_progress')
      .select('typing_correct_count')
      .limit(1)

    if (wpError) {
      console.log('   ❌ word_progress 表缺少 typing_correct_count 字段')
      console.log('   📝 错误信息:', wpError.message)
      console.log('   ⚠️  数据库迁移未执行！\n')
    } else {
      console.log('   ✅ word_progress 表已包含 typing_correct_count 字段')
    }

    // 2. 测试查询 mistakes 表的 typing_wrong_count 字段
    console.log('2️⃣ 检查 mistakes 表字段...')
    const { data: mData, error: mError } = await supabase
      .from('mistakes')
      .select('typing_wrong_count')
      .limit(1)

    if (mError) {
      console.log('   ❌ mistakes 表缺少 typing_wrong_count 字段')
      console.log('   📝 错误信息:', mError.message)
      console.log('   ⚠️  数据库迁移未执行！\n')
    } else {
      console.log('   ✅ mistakes 表已包含 typing_wrong_count 字段')
    }

    // 3. 总结
    if (!wpError && !mError) {
      console.log('\n✅ 所有检查通过！数据库迁移已执行')
      console.log('📋 可以启动开发服务器进行测试\n')
      return true
    } else {
      console.log('\n❌ 数据库迁移未执行！')
      console.log('📝 需要先执行数据库迁移才能测试功能\n')
      return false
    }

  } catch (error) {
    console.error('\n💥 检查过程出错:', error)
    return false
  }
}

checkMigration()
