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

console.log('\n🔍 检查 theme 和 scene 数据来源...\n')

// 1. 检查 chapters 表
console.log('📚 检查 chapters 表字段:')
try {
  const { data: sampleChapter } = await supabase
    .from('chapters')
    .select('*')
    .limit(1)
    .single()

  if (sampleChapter) {
    console.log('  字段列表:', Object.keys(sampleChapter).join(', '))
    console.log(`  - theme: ${sampleChapter.theme !== undefined ? '✅ 存在' : '❌ 不存在'}`)
    console.log(`  - scene: ${sampleChapter.scene !== undefined ? '✅ 存在' : '❌ 不存在'}`)

    if (sampleChapter.theme !== undefined) {
      console.log(`  示例 theme: "${sampleChapter.theme}"`)
    }
    if (sampleChapter.scene !== undefined) {
      console.log(`  示例 scene: "${sampleChapter.scene}"`)
    }
  }
} catch (error) {
  console.log('  ❌ 无法查询 chapters:', error.message)
}

// 2. 检查 word_books 表（如果存在）
console.log('\n📖 检查 word_books 表字段:')
try {
  const { data: sampleWordBook } = await supabase
    .from('word_books')
    .select('*')
    .limit(1)
    .single()

  if (sampleWordBook) {
    console.log('  字段列表:', Object.keys(sampleWordBook).join(', '))
  }
} catch (error) {
  console.log('  ⚠️ word_books 表可能不存在或无法访问')
}

// 3. 检查是否有 theme_scenes 或类似的关联表
console.log('\n🔗 检查是否有 theme/scene 关联表:')
const tables = ['word_themes', 'word_scenes', 'themes', 'scenes', 'word_tags']

for (const table of tables) {
  try {
    const { data } = await supabase
      .from(table)
      .select('*')
      .limit(1)

    if (data !== null) {
      console.log(`  ✅ ${table} 表存在`)
      console.log(`     字段: ${Object.keys(data[0] || {}).join(', ')}`)
    }
  } catch (error) {
    // 表不存在，忽略
  }
}

// 4. 检查一个具体的单词示例，看如何获取 theme/scene
console.log('\n📝 检查单词+章节关联示例:')
try {
  const { data: wordWithChapter } = await supabase
    .from('words')
    .select(`
      id,
      word,
      chapter_id,
      chapters (
        id,
        title,
        theme,
        scene
      )
    `)
    .limit(1)
    .single()

  if (wordWithChapter) {
    console.log(`  单词: ${wordWithChapter.word}`)
    console.log(`  章节 ID: ${wordWithChapter.chapter_id}`)

    if (wordWithChapter.chapters) {
      const chapter = wordWithChapter.chapters
      console.log(`  章节 title: ${chapter.title}`)
      console.log(`  章节 theme: ${chapter.theme || '❌ 无'}`)
      console.log(`  章节 scene: ${chapter.scene || '❌ 无'}`)
    }
  }
} catch (error) {
  console.log('  ❌ 查询失败:', error.message)
}

console.log('\n✅ 检查完成\n')
