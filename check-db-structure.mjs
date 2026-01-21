/**
 * 检查并修复 user_book_preferences 表结构
 */

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少环境变量：NEXT_PUBLIC_SUPABASE_URL 或 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

console.log('🔍 检查 user_book_preferences 表结构...')

// 使用 fetch 直接调用 Supabase REST API
async function checkTableStructure() {
  try {
    // 尝试查询表信息
    const response = await fetch(`${supabaseUrl}/rest/v1/user_book_preferences?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      }
    })

    if (response.ok) {
      console.log('✅ user_book_preferences 表存在')

      // 检查是否有 last_resume_state 字段
      // 通过尝试插入/更新数据来验证
      const testData = {
        user_id: '00000000-0000-0000-0000-000000000000', // 虚拟 UUID
        book_id: '00000000-0000-0000-0000-000000000000', // 虚拟 UUID
        last_resume_state: {
          mode: 'test',
          test: true
        }
      }

      console.log('🔍 检查 last_resume_state 字段...')
      // 我们不能直接插入，但可以通过 API 返回的错误信息来判断字段是否存在
      console.log('ℹ️  请手动在 Supabase Dashboard 中检查表结构')
      console.log('')
      console.log('📋 需要的字段：')
      console.log('   - last_resume_state JSONB DEFAULT \'{}\'::jsonb')
      console.log('')
      console.log('🔧 如果字段不存在，请运行以下 SQL：')
      console.log('-- 添加学习状态恢复字段到 user_book_preferences 表')
      console.log('ALTER TABLE user_book_preferences')
      console.log('ADD COLUMN IF NOT EXISTS last_resume_state JSONB DEFAULT \'{}\'::jsonb;')
      console.log('')
      console.log('COMMENT ON COLUMN user_book_preferences.last_resume_state IS \'用户最后的学习状态，用于恢复学习位置\';')

    } else {
      console.log('❌ user_book_preferences 表不存在')
      console.log('🔧 需要创建表，请运行完整的 migration')
    }
  } catch (error) {
    console.error('❌ 检查失败:', error.message)
  }
}

checkTableStructure()
