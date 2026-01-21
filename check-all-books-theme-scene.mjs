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

console.log('\n🔍 检查所有书籍的章节 theme_id 和 scene_id...\n')

const { data: books } = await supabase
  .from('books')
  .select('id, title')
  .limit(10)

if (!books || books.length === 0) {
  console.log('❌ 没有找到书籍')
  process.exit(1)
}

console.log(`检查 ${books.length} 本书...\n`)

let totalChapters = 0
let totalWithTheme = 0
let totalWithScene = 0

for (const book of books) {
  console.log(`📖 《${book.title}》`)

  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title, theme_id, scene_id')
    .eq('book_id', book.id)

  if (!chapters || chapters.length === 0) {
    console.log('   ❌ 没有章节\n')
    continue
  }

  totalChapters += chapters.length

  const withTheme = chapters.filter(ch => ch.theme_id).length
  const withScene = chapters.filter(ch => ch.scene_id).length

  totalWithTheme += withTheme
  totalWithScene += withScene

  console.log(`   章节数: ${chapters.length}`)
  console.log(`   有 theme_id: ${withTheme}/${chapters.length}`)
  console.log(`   有 scene_id: ${withScene}/${chapters.length}`)

  // 显示有数据的章节
  const chaptersWithData = chapters.filter(ch => ch.theme_id || ch.scene_id)
  if (chaptersWithData.length > 0) {
    console.log('   有数据的章节:')
    chaptersWithData.forEach(ch => {
      console.log(`     - ${ch.title}: theme=${ch.theme_id}, scene=${ch.scene_id}`)
    })
  }

  console.log('')
}

console.log('📊 总计:')
console.log(`  总章节数: ${totalChapters}`)
console.log(`  有 theme_id 的章节: ${totalWithTheme} (${((totalWithTheme/totalChapters)*100).toFixed(1)}%)`)
console.log(`  有 scene_id 的章节: ${totalWithScene} (${((totalWithScene/totalChapters)*100).toFixed(1)}%)`)

if (totalWithTheme === 0 && totalWithScene === 0) {
  console.log('\n⚠️  结论: 所有书籍的章节都没有设置 theme_id 和 scene_id!')
  console.log('   这需要数据库迁移来补充数据')
}

console.log('\n✅ 检查完成\n')
