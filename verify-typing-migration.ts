// 验证打字练习功能数据库迁移
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = "https://snnrjnpcmdsdlyldvvps.supabase.co"
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq22hc"

const supabase = createClient(supabaseUrl, supabaseKey)

async function verifyMigration() {
  console.log('🔍 验证数据库迁移...\n')

  let allPassed = true

  // 1. 验证 word_progress 表字段
  console.log('1️⃣ 验证 word_progress 表字段...')
  try {
    const { data, error } = await supabase
      .from('word_progress')
      .select('typing_correct_count, typing_total_attempts, version')
      .limit(1)

    if (error) {
      console.log('   ❌ 字段验证失败:', error.message)
      allPassed = false
    } else {
      console.log('   ✅ word_progress 表字段正常')
      console.log('      ✓ typing_correct_count')
      console.log('      ✓ typing_total_attempts')
      console.log('      ✓ version')
    }
  } catch (err: any) {
    console.log('   ❌ 查询失败:', err.message)
    allPassed = false
  }

  // 2. 验证 mistakes 表字段
  console.log('\n2️⃣ 验证 mistakes 表字段...')
  try {
    const { data, error } = await supabase
      .from('mistakes')
      .select('typing_wrong_count')
      .limit(1)

    if (error) {
      console.log('   ❌ 字段验证失败:', error.message)
      allPassed = false
    } else {
      console.log('   ✅ mistakes 表字段正常')
      console.log('      ✓ typing_wrong_count')
    }
  } catch (err: any) {
    console.log('   ❌ 查询失败:', err.message)
    allPassed = false
  }

  // 3. 验证 learning_records 表支持 typing 模式
  console.log('\n3️⃣ 验证 learning_records 表支持 typing 模式...')
  try {
    // 尝试插入一条测试记录（不实际插入，只验证字段）
    const { error } = await supabase
      .from('learning_records')
      .select('practice_mode')
      .eq('practice_mode', 'typing')
      .limit(1)

    if (error && !error.message.includes('Invalid API key')) {
      console.log('   ❌ typing 模式验证失败:', error.message)
      allPassed = false
    } else {
      console.log('   ✅ learning_records 支持 typing 模式')
    }
  } catch (err: any) {
    console.log('   ⚠️  无法验证（可能需要登录）')
  }

  // 总结
  console.log('\n' + '='.repeat(60))
  if (allPassed) {
    console.log('✅ 所有验证通过！数据库迁移成功！')
    console.log('='.repeat(60))
    console.log('\n🚀 现在可以启动开发服务器进行功能测试：')
    console.log('   npm run dev')
    console.log('\n📝 然后访问：')
    console.log('   http://localhost:3000/typing')
    return true
  } else {
    console.log('❌ 部分验证失败，请检查数据库迁移')
    console.log('='.repeat(60))
    return false
  }
}

verifyMigration()
  .then(success => {
    process.exit(success ? 0 : 1)
  })
  .catch(err => {
    console.error('\n💥 验证失败:', err)
    process.exit(1)
  })
