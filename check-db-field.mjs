// 检查 last_accessed_at 字段是否存在
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkLastAccessedField() {
  console.log('🔍 检查 user_book_preferences 表的 last_accessed_at 字段...\n')

  try {
    // 尝试查询一条记录来测试字段是否存在
    const { data, error } = await supabase
      .from('user_book_preferences')
      .select('user_id, book_id, last_accessed_at')
      .limit(1)

    if (error) {
      console.error('❌ 查询失败:')
      console.error('   错误代码:', error.code)
      console.error('   错误信息:', error.message)
      console.error('   错误提示:', error.hint)

      if (error.message.includes('column') || error.message.includes('does not exist')) {
        console.log('\n⚠️  结论: last_accessed_at 字段不存在')
        console.log('📝 需要运行迁移: 20260110_add_last_accessed_at.sql')
      }
      return
    }

    console.log('✅ last_accessed_at 字段存在！')
    console.log('📊 查询结果:', data)

    // 检查是否有 last_accessed_at 数据
    const hasLastAccessedData = data && data.length > 0 && data[0].last_accessed_at !== null
    console.log(`\n${hasLastAccessedData ? '✅' : '⚠️ '} 字段中${hasLastAccessedData ? '有' : '暂无'}数据`)

  } catch (err) {
    console.error('❌ 发生异常:', err.message)
  }
}

checkLastAccessedField()
