/**
 * 更新演说家音频JSON数据
 *
 * 从 vioce 文件夹读取优化后的 JSON 文件并更新到数据库
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'
import { config } from 'dotenv'

// 加载 .env.local 文件
config({ path: '.env.local' })

// Supabase 配置（从环境变量读取）
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 缺少 Supabase 配置')
  console.error('请确保 .env.local 文件包含 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// JSON 文件列表
const jsonFiles = [
  'Dont get caught in the boiling frog scenario.json',
  'How to maintain a long-lasting friendship.json',
  'Success depends not on IQ, but on perseverance.json',
  'Where will you be twenty years from now.json'
]

async function updateArticles() {
  console.log('🔄 开始更新文章数据...\n')

  for (const filename of jsonFiles) {
    try {
      // 读取 JSON 文件
      const filePath = join('D:\\claude_work\\yingyu\\my-edu-platform\\vioce', filename)
      const fileContent = readFileSync(filePath, 'utf-8')
      const jsonData = JSON.parse(fileContent)

      const title = jsonData.meta.title
      console.log(`📄 处理: ${title}`)

      // 查询数据库中对应的文章
      const { data: existingArticle, error: queryError } = await supabase
        .from('speaker_articles')
        .select('id, title, json_data')
        .filter('title', 'ilike', `%${title}%`)
        .single()

      if (queryError) {
        console.error(`  ❌ 查询失败:`, queryError.message)
        continue
      }

      if (!existingArticle) {
        console.error(`  ⚠️  未找到文章: ${title}`)
        continue
      }

      // 更新 json_data 字段
      const { error: updateError } = await supabase
        .from('speaker_articles')
        .update({
          json_data: jsonData,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingArticle.id)

      if (updateError) {
        console.error(`  ❌ 更新失败:`, updateError.message)
        continue
      }

      console.log(`  ✅ 更新成功`)
      console.log(`     - 句子数量: ${jsonData.sentences.length}`)
      console.log(`     - 总时长: ${jsonData.sentences.length > 0 ? jsonData.sentences[jsonData.sentences.length - 1].end_time : 0}秒\n`)

    } catch (error) {
      console.error(`❌ 处理文件 ${filename} 失败:`, error.message)
    }
  }

  console.log('✅ 所有更新完成！')
}

updateArticles().catch(console.error)
