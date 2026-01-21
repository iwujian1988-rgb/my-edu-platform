/**
 * 检查章节是否有 theme_id 和 scene_id
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

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

console.log('\n🔍 检查章节的 theme_id 和 scene_id...\n')

// 获取一本书的章节
const { data: books } = await supabase
  .from('books')
  .select('id')
  .limit(1)

if (!books || books.length === 0) {
  console.log('❌ 没有找到书籍')
  process.exit(1)
}

const bookId = books[0].id
console.log(`📚 检查书籍 ${bookId} 的章节...\n`)

const { data: chapters } = await supabase
  .from('chapters')
  .select('id, title, theme_id, scene_id')
  .eq('book_id', bookId)
  .limit(10)

if (!chapters || chapters.length === 0) {
  console.log('❌ 该书没有章节')
  process.exit(1)
}

console.log(`找到 ${chapters.length} 个章节:\n`)

chapters.forEach((ch, idx) => {
  console.log(`${idx + 1}. ${ch.title}`)
  console.log(`   ID: ${ch.id}`)
  console.log(`   theme_id: ${ch.theme_id || '❌ null'}`)
  console.log(`   scene_id: ${ch.scene_id || '❌ null'}`)
  console.log('')
})

// 统计
const withTheme = chapters.filter(ch => ch.theme_id).length
const withScene = chapters.filter(ch => ch.scene_id).length

console.log('📊 统计:')
console.log(`  有 theme_id 的章节: ${withTheme}/${chapters.length}`)
console.log(`  有 scene_id 的章节: ${withScene}/${chapters.length}`)

if (withTheme === 0 && withScene === 0) {
  console.log('\n⚠️  警告: 该书的所有章节都没有设置 theme_id 和 scene_id!')
  console.log('   这意味着即使 API 修复了，筛选仍然不会有结果')
}

console.log('\n✅ 检查完成\n')
