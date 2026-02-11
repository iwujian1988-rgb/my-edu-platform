import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkData() {
  console.log('=== 检查听写提交记录 ===')
  const { data: submissions, error: err1 } = await supabase
    .from('speaker_dictation_submissions')
    .select('*')
    .order('created_at', { ascending: false })

  if (err1) {
    console.error('查询失败:', err1)
  } else {
    console.log(`听写提交记录数: ${submissions?.length || 0}`)
    if (submissions?.length > 0) {
      console.log('最新的3条记录:')
      submissions.slice(0, 3).forEach(s => {
        console.log(`  - ID: ${s.id.slice(0, 8)}, 错误数: ${s.wrong_count}, 放弃数: ${s.skipped_count}`)
      })
    }
  }

  console.log('\n=== 检查生词本记录 ===')
  const { data: ghostWords, error: err2 } = await supabase
    .from('speaker_ghost_words')
    .select('*')
    .order('created_at', { ascending: false })

  if (err2) {
    console.error('查询失败:', err2)
  } else {
    console.log(`生词本记录数: ${ghostWords?.length || 0}`)
    if (ghostWords?.length > 0) {
      console.log('最新的3条记录:')
      ghostWords.slice(0, 3).forEach(g => {
        console.log(`  - 单词: ${g.word}, 已掌握: ${g.is_mastered}`)
      })
    }
  }

  console.log('\n=== 检查是否有未迁移的错题 ===')
  if (submissions && submissions.length > 0) {
    const totalErrors = submissions.reduce((sum, s) => sum + (s.wrong_count || 0) + (s.skipped_count || 0), 0)
    console.log(`听写记录中的总错题数: ${totalErrors}`)
    console.log(`生词本中的记录数: ${ghostWords?.length || 0}`)

    if (totalErrors > 0 && (!ghostWords || ghostWords.length === 0)) {
      console.log('\n⚠️  发现问题：有听写错题但生词本为空！')
      console.log('需要执行数据迁移')
    }
  }
}

checkData()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err)
    process.exit(1)
  })
