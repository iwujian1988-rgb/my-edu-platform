// 从备份恢复原始数据并重新合并
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { execSync } = require('child_process')

const envPath = path.join(__dirname, '.env.local')
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8')
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (valueParts.length > 0) {
      let value = valueParts.join('=').trim()
      if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1)
      }
      if (key && value) {
        process.env[key.trim()] = value
      }
    }
  })
}

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

// 需要重新导入的词库
const BOOKS_TO_RESTORE = [
  { name: 'TOEFL', enhanced: 'TOEFL_enhanced.json', normal: null },  // normal需要从其他来源
  { name: 'GRE', enhanced: 'GRE_enhanced.json', normal: null },
  { name: 'IELTS', enhanced: 'IELTS_enhanced.json', normal: null },
  { name: 'SAT', enhanced: 'SAT_enhanced.json', normal: null },
  { name: 'CET-4', enhanced: 'CET-4_enhanced.json', normal: null },
  { name: 'CET-6', enhanced: 'CET-6_enhanced.json', normal: null },
  { name: 'GMAT', enhanced: 'GMAT_enhanced.json', normal: null },
  { name: 'BEC', enhanced: 'BEC_enhanced.json', normal: null },
  { name: '考研', enhanced: '考研_enhanced.json', normal: null },
  { name: '高中', enhanced: '高中_enhanced.json', normal: null },
  { name: '初中', enhanced: '初中_enhanced.json', normal: null },
]

async function extractBackup() {
  console.log('\n📦 解压备份文件...')

  const backupDir = path.join(__dirname, 'wordlists_final')

  if (!fs.existsSync(backupDir)) {
    console.log('   解压中...')
    execSync(`tar -xzf book2026112.tar.gz`, { cwd: __dirname })
    console.log('   ✅ 解压完成')
  } else {
    console.log('   ✅ 备份已解压')
  }

  return backupDir
}

async function deleteCurrentMergedBooks() {
  console.log('\n🗑️  删除当前不完整的合并版本...')

  const booksToDelete = [
    'TOEFL', 'GRE', 'IELTS', 'SAT', 'CET-4', 'CET-6',
    'GMAT', 'BEC', '考研', '高中', '初中'
  ]

  for (const bookName of booksToDelete) {
    const { data: books } = await supabase
      .from('books')
      .select('id, title, total_words')
      .eq('title', bookName)

    if (books && books.length > 0) {
      console.log(`   删除: ${bookName} (${books[0].total_words} 词)`)
      await supabase.from('books').delete().eq('id', books[0].id)
    }
  }

  console.log('   ✅ 删除完成')
}

async function importBookData(bookName, fileName, backupDir) {
  console.log(`\n📚 导入 ${bookName}...`)

  const filePath = path.join(backupDir, fileName)

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  文件不存在: ${fileName}`)
    return null
  }

  const fileContent = fs.readFileSync(filePath, 'utf8')
  const data = JSON.parse(fileContent)

  console.log(`   文件包含 ${data.words.length} 个单词`)

  // 创建书籍
  const { data: newBook, error: bookError } = await supabase
    .from('books')
    .insert({
      title: bookName,
      description: `从备份恢复的 ${bookName} 数据`,
      category: 'restore',
      is_official: true,
      total_words: 0,
      total_chapters: 0
    })
    .select()
    .single()

  if (bookError) {
    console.error(`   ❌ 创建书籍失败: ${bookError.message}`)
    return null
  }

  console.log(`   新书籍ID: ${newBook.id}`)

  // 创建章节
  const { data: newChapter } = await supabase
    .from('chapters')
    .insert({
      book_id: newBook.id,
      title: 'All Words',
      order_index: 1
    })
    .select()
    .single()

  console.log(`   新章节ID: ${newChapter.id}`)

  // 批量插入单词（500个一批）
  const batchSize = 500
  let insertedCount = 0

  for (let i = 0; i < data.words.length; i += batchSize) {
    const batch = data.words.slice(i, i + batchSize)

    // 准备单词数据
    const wordsToInsert = batch.map((w, idx) => ({
      id: w.id,
      chapter_id: newChapter.id,
      word: w.word,
      phonetic: w.phonetic || null,
      uk_phonetic: w.uk_phonetic || null,
      us_phonetic: w.us_phonetic || null,
      definition: w.definition || null,
      definition_en: w.definition_en || null,
      collocation: w.collocation || null,
      collocation_en: w.collocation_en || null,
      example_sentence: w.example_sentence || null,
      example_sentence_en: w.example_sentence_en || null,
      part_of_speech: w.part_of_speech || null,
      audio_url: w.audio_url || null,
      order_index: i + idx,
      difficulty_score: w.difficulty_score || null
    }))

    const { error: insertError } = await supabase
      .from('words')
      .insert(wordsToInsert)

    if (insertError) {
      console.error(`   ❌ 批次 ${i / batchSize + 1} 插入失败: ${insertError.message}`)
    } else {
      insertedCount += batch.length
    }
  }

  // 更新书籍统计
  await supabase
    .from('books')
    .update({
      total_words: insertedCount,
      total_chapters: 1
    })
    .eq('id', newBook.id)

  console.log(`   ✅ 导入完成: ${insertedCount} 个单词`)

  return {
    id: newBook.id,
    title: bookName,
    total_words: insertedCount,
    total_chapters: 1
  }
}

async function restoreAndRemerge() {
  console.log('\n🔄 开始恢复和重新合并流程...\n')

  try {
    // 1. 解压备份
    const backupDir = await extractBackup()

    // 2. 删除当前不完整的合并版本
    await deleteCurrentMergedBooks()

    // 3. 导入原始数据
    console.log('\n📥 导入原始数据...\n')

    for (const book of BOOKS_TO_RESTORE) {
      // 只导入Enhanced版本（包含了所有数据）
      const bookData = await importBookData(
        book.name + ' (Enhanced)',
        book.enhanced,
        backupDir
      )
    }

    console.log('\n✅ 原始数据导入完成！')
    console.log('\n下一步：使用修复后的 merge-duplicate-books-v2.js 重新合并')
    console.log('命令: node merge-duplicate-books-v2.js\n')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
  }
}

restoreAndRemerge().catch(console.error)
