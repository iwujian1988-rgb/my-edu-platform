import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

async function checkDetail() {
  // 获取最新的听写记录
  const { data: submissions, error } = await supabase
    .from('speaker_dictation_submissions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(1)

  if (error) {
    console.error('查询失败:', error)
    return
  }

  if (!submissions || submissions.length === 0) {
    console.log('没有听写记录')
    return
  }

  const submission = submissions[0]
  console.log('=== 最新的听写记录 ===')
  console.log('ID:', submission.id)
  console.log('创建时间:', submission.created_at)
  console.log('总错题数:', submission.wrong_count + submission.skipped_count)
  console.log('错误数:', submission.wrong_count)
  console.log('放弃数:', submission.skipped_count)
  console.log('\n=== answers 字段内容 ===')
  console.log('类型:', typeof submission.answers)
  console.log('是否为数组:', Array.isArray(submission.answers))
  console.log('Keys:', Object.keys(submission.answers || {}).slice(0, 5))

  // 检查第一条答案
  if (submission.answers) {
    const firstKey = Object.keys(submission.answers)[0]
    console.log('\n第一条答案 (句子', firstKey, '):')
    console.log(JSON.stringify(submission.answers[firstKey], null, 2))
  }

  console.log('\n=== 检查提交API是否能处理 ===')
  // 检查文章是否存在
  const { data: article } = await supabase
    .from('speaker_articles')
    .select('id, json_data')
    .eq('id', submission.article_id)
    .single()

  if (article) {
    console.log('✅ 文章存在')
    console.log('句子数量:', article.json_data?.sentences?.length || 0)

    // 检查第一个句子
    if (article.json_data?.sentences?.[0]) {
      console.log('\n第一个句子:')
      console.log(JSON.stringify(article.json_data.sentences[0], null, 2))
    }
  } else {
    console.log('❌ 文章不存在')
  }
}

checkDetail()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('执行失败:', err)
    process.exit(1)
  })
