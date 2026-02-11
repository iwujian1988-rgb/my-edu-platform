import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function clearAndMigrate() {
  console.log('=== 1. 清空现有生词本 ===')
  const { error: deleteError } = await supabase
    .from('speaker_ghost_words')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有

  if (deleteError) {
    console.error('删除失败:', deleteError)
    return
  }
  console.log('✅ 清空成功')

  console.log('\n=== 2. 重新迁移（包括放弃的词）===')
  const response = await fetch('http://localhost:3002/api/speaker/migrate-ghost-words', {
    method: 'POST'
  })

  const result = await response.json()
  console.log('迁移结果:', result)
}

clearAndMigrate()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('失败:', err)
    process.exit(1)
  })
