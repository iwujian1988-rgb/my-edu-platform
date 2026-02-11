import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkGhostWords() {
  console.log('=== 检查生词本数据 ===\n')

  const { data, error } = await supabase
    .from('speaker_ghost_words')
    .select('*')
    .eq('is_mastered', false)

  if (error) {
    console.error('查询失败:', error)
    return
  }

  console.log(`总数: ${data.length}`)
  console.log(`用户分布:`)

  const userCounts = {}
  data.forEach(w => {
    userCounts[w.user_id] = (userCounts[w.user_id] || 0) + 1
  })

  Object.entries(userCounts).forEach(([userId, count]) => {
    console.log(`  ${userId.slice(0, 8)}...: ${count} 条`)
  })

  console.log('\n=== 检查 API 请求参数 ===')
  const testUserId = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'
  const userSpecificWords = data.filter(w => w.user_id === testUserId)
  console.log(`测试用户 ${testUserId.slice(0, 8)}... 的生词数: ${userSpecificWords.length}`)

  if (userSpecificWords.length > 0) {
    console.log('\n前5条:')
    userSpecificWords.slice(0, 5).forEach(w => {
      console.log(`  - ${w.word} (${w.error_type})`)
    })
  }
}

checkGhostWords()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('失败:', err)
    process.exit(1)
  })
