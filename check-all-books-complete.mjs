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

// 获取所有书籍
const { data: books, count: totalBooks } = await supabase
  .from('books')
  .select('id, title', { count: 'exact' })

if (!books || books.length === 0) {
  console.log('❌ 没有找到书籍')
  process.exit(1)
}

console.log(`总共 ${totalBooks} 本书，检查所有书籍...\n`)

let totalChapters = 0
let totalWithTheme = 0
let totalWithScene = 0
const booksWithData = []
const booksWithoutData = []

for (const book of books) {
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title, theme_id, scene_id')
    .eq('book_id', book.id)

  if (!chapters || chapters.length === 0) {
    booksWithoutData.push({ book, chapters: 0, hasData: false })
    continue
  }

  totalChapters += chapters.length

  const withTheme = chapters.filter(ch => ch.theme_id).length
  const withScene = chapters.filter(ch => ch.scene_id).length

  totalWithTheme += withTheme
  totalWithScene += withScene

  if (withTheme > 0 || withScene > 0) {
    booksWithData.push({
      book,
      chapters: chapters.length,
      withTheme,
      withScene,
      hasData: true
    })
  } else {
    booksWithoutData.push({
      book,
      chapters: chapters.length,
      hasData: false
    })
  }
}

console.log('📊 总计统计:')
console.log(`  总书数: ${totalBooks}`)
console.log(`  总章节数: ${totalChapters}`)
console.log(`  有 theme_id 的章节: ${totalWithTheme} (${totalChapters > 0 ? ((totalWithTheme/totalChapters)*100).toFixed(1) : 0}%)`)
console.log(`  有 scene_id 的章节: ${totalWithScene} (${totalChapters > 0 ? ((totalWithScene/totalChapters)*100).toFixed(1) : 0}%)`)
console.log(`  有 theme/scene 数据的书: ${booksWithData.length} 本`)
console.log(`  无 theme/scene 数据的书: ${booksWithoutData.length} 本`)

if (booksWithData.length > 0) {
  console.log('\n✅ 有数据的书籍:')
  booksWithData.forEach(({ book, chapters, withTheme, withScene }) => {
    console.log(`  📖 《${book.title}》`)
    console.log(`     章节数: ${chapters}, 有theme: ${withTheme}, 有scene: ${withScene}`)
  })
}

if (booksWithoutData.length > 0) {
  console.log('\n❌ 无数据的书籍:')
  booksWithoutData.slice(0, 10).forEach(({ book, chapters }) => {
    console.log(`  📖 《${book.title}》 (${chapters}个章节)`)
  })
  if (booksWithoutData.length > 10) {
    console.log(`  ... 还有 ${booksWithoutData.length - 10} 本`)
  }
}

// 输出JSON格式供前端使用
console.log('\n📋 前端可用的书籍数据（JSON）:')
const bookDataMap = {}
books.forEach(book => {
  const bookInfo = booksWithData.find(b => b.book.id === book.id) ||
                   booksWithoutData.find(b => b.book.id === book.id)
  bookDataMap[book.id] = {
    hasThemeData: bookInfo?.hasData && booksWithData.find(b => b.book.id === book.id)?.withTheme > 0,
    hasSceneData: bookInfo?.hasData && booksWithData.find(b => b.book.id === book.id)?.withScene > 0
  }
})
console.log(JSON.stringify(bookDataMap, null, 2))

console.log('\n✅ 检查完成\n')
