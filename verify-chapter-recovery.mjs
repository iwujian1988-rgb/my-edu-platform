import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'

function loadEnv() {
  try {
    const envContent = readFileSync('.env.local', 'utf-8')
    const lines = envContent.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key, ...valueParts] = trimmedLine.split('=')
        let value = valueParts.join('=').trim()
        if ((value.startsWith('"') && value.endsWith('"')) ||
            (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1)
        }
        if (key && value) {
          process.env[key] = value
        }
      }
    }
  } catch (error) {
    console.error('Failed to load .env.local:', error.message)
  }
}

loadEnv()

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function verifyChapterRecovery() {
  console.log('🔍 验证通过 chapter_id 恢复 book_id 的方案\n')

  // 1. 获取一批 NULL book_id 但有 chapter_id 的单词
  console.log('1️⃣ 获取 NULL book_id 的单词样本（前100个）...')
  const { data: nullWords, error: nullError } = await supabase
    .from('words')
    .select('id, word, chapter_id')
    .is('book_id', null)
    .not('chapter_id', 'is', null)
    .limit(100)

  if (nullError) {
    console.log('❌ 查询失败:', nullError)
    return
  }

  console.log(`✅ 找到 ${nullWords.length} 个有 chapter_id 的单词\n`)

  // 2. 检查这些 chapter_id 在 chapters 表中是否存在
  console.log('2️⃣ 检查 chapters 表中是否存在对应的章节...')
  const chapterIds = nullWords.map(w => w.chapter_id)

  const { data: chapters, error: chaptersError } = await supabase
    .from('chapters')
    .select('id, book_id, title')
    .in('id', chapterIds)

  if (chaptersError) {
    console.log('❌ 查询 chapters 失败:', chaptersError)
    return
  }

  console.log(`✅ 在 chapters 表中找到 ${chapters.length} 个对应章节\n`)

  // 3. 统计可以恢复的单词数
  const foundChapterIds = new Set(chapters.map(c => c.id))
  const recoverableWords = nullWords.filter(w => foundChapterIds.has(w.chapter_id))

  console.log('📊 恢复可行性分析:')
  console.log(`   - 样本单词数: ${nullWords.length}`)
  console.log(`   - 找到对应章节: ${chapters.length}`)
  console.log(`   - 可恢复单词: ${recoverableWords.length}`)
  console.log(`   - 恢复成功率: ${(recoverableWords.length / nullWords.length * 100).toFixed(1)}%`)
  console.log('')

  // 4. 显示一些恢复样例
  console.log('3️⃣ 恢复样例（前10个）:')
  for (let i = 0; i < Math.min(10, recoverableWords.length); i++) {
    const word = recoverableWords[i]
    const chapter = chapters.find(c => c.id === word.chapter_id)

    console.log(`   ${i + 1}. ${word.word}`)
    console.log(`      chapter_id: ${word.chapter_id.substring(0, 8)}...`)
    console.log(`      可恢复到 book_id: ${chapter.book_id.substring(0, 8)}...`)
  }
  console.log('')

  // 5. 估算总体恢复数量
  console.log('4️⃣ 估算总体恢复情况...')

  // 获取所有有 chapter_id 的 NULL book_id 单词数量
  const { count: totalWithChapter } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)
    .not('chapter_id', 'is', null)

  console.log(`   - NULL book_id 且有 chapter_id 的单词: ${totalWithChapter}`)

  // 获取所有 NULL book_id 的单词数量
  const { count: totalNull } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .is('book_id', null)

  console.log(`   - NULL book_id 总数: ${totalNull}`)
  console.log(`   - 恢复成功率预计: ${(totalWithChapter / totalNull * 100).toFixed(1)}%`)
  console.log('')

  // 6. 按词书分组统计可恢复数量
  console.log('5️⃣ 按词书统计可恢复的单词数...')

  // 获取所有 NULL book_id 且有 chapter_id 的单词
  const { data: allNullWords } = await supabase
    .from('words')
    .select('chapter_id')
    .is('book_id', null)
    .not('chapter_id', 'is', null)

  // 获取所有相关章节
  const allChapterIds = [...new Set(allNullWords.map(w => w.chapter_id))]
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, book_id')
    .in('id', allChapterIds)

  // 统计每个 book_id 的单词数
  const bookWordCounts = {}
  allNullWords.forEach(w => {
    const chapter = allChapters.find(c => c.id === w.chapter_id)
    if (chapter) {
      bookWordCounts[chapter.book_id] = (bookWordCounts[chapter.book_id] || 0) + 1
    }
  })

  // 获取书名
  const bookIds = Object.keys(bookWordCounts)
  const { data: bookNames } = await supabase
    .from('books')
    .select('id, title')
    .in('id', bookIds)

  console.log('   各词书可恢复的单词数:')
  const bookNameMap = {}
  bookNames.forEach(b => {
    bookNameMap[b.id] = b.title
  })

  Object.entries(bookWordCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([bookId, count]) => {
      const title = bookNameMap[bookId] || 'UNKNOWN'
      console.log(`     ${title}: ${count} 个单词`)
    })
  console.log('')

  // 总结
  console.log('📋 验证总结:')
  console.log(`   ✅ 方案可行！可以通过 chapter_id 恢复 book_id`)
  console.log(`   📊 预计恢复: ${totalWithChapter} / ${totalNull} 个单词`)
  console.log(`   📈 恢复率: ${(totalWithChapter / totalNull * 100).toFixed(1)}%`)

  if (totalWithChapter < totalNull) {
    const orphaned = totalNull - totalWithChapter
    console.log(`   ⚠️  无法恢复: ${orphaned} 个单词（无 chapter_id）`)
  }

  console.log('')
  console.log('🚀 下一步: 执行恢复脚本')
  console.log('   SQL 逻辑: UPDATE words SET book_id = chapters.book_id FROM chapters WHERE words.chapter_id = chapters.id')
}

verifyChapterRecovery().catch(console.error)
