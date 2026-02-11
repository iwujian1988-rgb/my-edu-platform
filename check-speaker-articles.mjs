/**
 * 检查 speaker_articles 表数据
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkArticles() {
  console.log('🔍 检查 speaker_articles 表...')

  const { data, error } = await supabase
    .from('speaker_articles')
    .select('id, level, title, audio_url, image_url')
    .limit(5)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log('✅ 查询成功！')
  console.log(`📊 文章数量: ${data?.length || 0}`)

  if (data && data.length > 0) {
    console.log('\n文章列表:')
    data.forEach((article, index) => {
      console.log(`${index + 1}. ID: ${article.id}`)
      console.log(`   标题: ${article.title}`)
      console.log(`   级别: ${article.level}`)
      console.log(`   音频: ${article.audio_url}`)
      console.log(`   图片: ${article.image_url}`)
      console.log('')
    })
  } else {
    console.log('⚠️  表为空，没有文章数据')
  }
}

checkArticles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('错误:', err)
    process.exit(1)
  })
