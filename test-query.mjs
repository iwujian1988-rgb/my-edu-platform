import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testQuery() {
  const testUserId = '7078b0aa-d06a-4209-b669-1a0d4985c8ea'

  console.log('=== 测试查询 ===')
  console.log('用户ID:', testUserId)

  // 查询该用户的所有数据
  console.log('\n查询所有数据:')
  const { data, error } = await supabase
    .from('speaker_ghost_words')
    .select('*')
    .eq('user_id', testUserId)

  console.log(`总数: ${data?.length || 0}`)

  if (data && data.length > 0) {
    console.log('\n前3条的 is_mastered 字段:')
    data.slice(0, 3).forEach((w, i) => {
      console.log(`  ${i + 1}. ${w.word}: is_mastered=${w.is_mastered} (类型: ${typeof w.is_mastered})`)
    })

    console.log('\n检查有多少 is_mastered=false:')
    const falseCount = data.filter(w => w.is_mastered === false).length
    console.log(`  is_mastered=false: ${falseCount} 条`)
    console.log(`  is_mastered=true: ${data.filter(w => w.is_mastered === true).length} 条`)
  }

  if (error) console.error('错误:', error)
}

testQuery()
  .then(() => process.exit(0))
