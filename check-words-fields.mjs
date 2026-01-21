/**
 * 检查 words 表是否真的有 theme 和 scene 字段
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Read .env.local file
const envContent = readFileSync(join(__dirname, '.env.local'), 'utf-8')
const envVars = Object.fromEntries(
  envContent
    .split('\n')
    .filter(line => line.trim() && !line.startsWith('#'))
    .map(line => line.split('='))
    .map(([key, ...valueParts]) => [key, valueParts.join('=').replace(/"/g, '')])
)

const supabase = createClient(
  envVars.NEXT_PUBLIC_SUPABASE_URL,
  envVars.SUPABASE_SERVICE_ROLE_KEY
)

console.log('\n🔍 检查 words 表的字段...\n')

try {
  // 方法1: 查询一个单词，看返回了什么字段
  const { data: sampleWord, error } = await supabase
    .from('words')
    .select('*')
    .limit(1)
    .single()

  if (error) {
    console.error('❌ 查询失败:', error)
    process.exit(1)
  }

  if (sampleWord) {
    console.log('✅ words 表的字段列表:')
    console.log(Object.keys(sampleWord).sort().join('\n'))

    console.log('\n🎯 关键字段检查:')
    console.log(`  - theme: ${sampleWord.theme !== undefined ? '✅ 存在' : '❌ 不存在'}`)
    console.log(`  - scene: ${sampleWord.scene !== undefined ? '✅ 存在' : '❌ 不存在'}`)
    console.log(`  - chapter: ${sampleWord.chapter !== undefined ? '✅ 存在' : '❌ 不存在'}`)
    console.log(`  - chapter_id: ${sampleWord.chapter_id !== undefined ? '✅ 存在' : '❌ 不存在'}`)

    // 如果字段存在，显示一个示例值
    if (sampleWord.theme !== undefined) {
      console.log(`\n📝 theme 示例值: "${sampleWord.theme}"`)
    }
    if (sampleWord.scene !== undefined) {
      console.log(`📝 scene 示例值: "${sampleWord.scene}"`)
    }
    if (sampleWord.chapter !== undefined) {
      console.log(`📝 chapter 示例值: "${sampleWord.chapter}"`)
    }
  }

  // 方法2: 统计有多少单词有 theme/scene 数据
  const { count: themeCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .not('theme', 'is', null)

  const { count: sceneCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .not('scene', 'is', null)

  console.log('\n📊 数据统计:')
  console.log(`  - 有 theme 数据的单词: ${themeCount || 0} 个`)
  console.log(`  - 有 scene 数据的单词: ${sceneCount || 0} 个`)

} catch (error) {
  console.error('❌ 异常:', error.message)
  process.exit(1)
}

console.log('\n✅ 检查完成\n')
