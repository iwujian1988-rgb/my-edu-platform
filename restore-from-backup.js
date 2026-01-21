// 从备份直接恢复完整的merged数据
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

// 需要恢复的词库（从merged文件）
const BOOKS_TO_RESTORE = [
  { file: 'TOEFL_merged.json', category: 'exam' },
  { file: 'GRE_merged.json', category: 'exam' },
  { file: 'IELTS_merged.json', category: 'exam' },
  { file: 'SAT_merged.json', category: 'exam' },
  { file: 'CET-4_merged.json', category: 'exam' },
  { file: 'CET-6_merged.json', category: 'exam' },
  { file: 'GMAT_merged.json', category: 'exam' },
  { file: 'BEC_merged.json', category: 'exam' },
  { file: '考研_merged.json', category: 'exam' },
  { file: '高中_merged.json', category: 'textbook' },
  { file: '初中_merged.json', category: 'textbook' },
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

async function deleteCurrentIncompleteBooks() {
  console.log('\n🗑️  删除当前不完整的书籍...')

  const booksToDelete = [
    'TOEFL', 'GRE', 'IELTS', 'SAT', 'CET-4', 'CET-6',
    'GMAT', 'BEC', '考研', '高中', '初中'
  ]

  let deletedCount = 0

  for (const bookName of booksToDelete) {
    const { data: books } = await supabase
      .from('books')
      .select('id, title, total_words')
      .eq('title', bookName)

    if (books && books.length > 0) {
      console.log(`   删除: ${bookName} (当前: ${books[0].total_words} 词)`)
      await supabase.from('books').delete().eq('id', books[0].id)
      deletedCount++
    }
  }

  console.log(`   ✅ 删除了 ${deletedCount} 个书籍`)
}

async function restoreMergedBook(fileName, category, backupDir) {
  const filePath = path.join(backupDir, fileName)

  if (!fs.existsSync(filePath)) {
    console.log(`   ⚠️  文件不存在: ${fileName}`)
    return
  }

  // 提取书籍名称
  const bookName = fileName.replace('_merged.json', '')

  console.log(`\n📚 恢复 ${bookName}...`)
  console.log(`   文件: ${fileName}`)

  // 读取merged文件
  const mergedContent = fs.readFileSync(filePath, 'utf8')
  const mergedData = JSON.parse(mergedContent)

  const wordCount = mergedData.words ? mergedData.words.length : 0
  console.log(`   单词数: ${wordCount}`)

  // 创建书籍
  const { data: newBook, error: bookError } = await supabase
    .from('books')
    .insert({
      title: bookName,
      description: `完整的 ${bookName} 词库（从备份恢复）`,
      category: category,
      is_official: true,
      total_words: 0,
      total_chapters: 0
    })
    .select()
    .single()

  if (bookError) {
    console.error(`   ❌ 创建书籍失败: ${bookError.message}`)
    return
  }

  console.log(`   书籍ID: ${newBook.id}`)

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

  console.log(`   章节ID: ${newChapter.id}`)

  // 批量插入单词
  const batchSize = 500
  let insertedCount = 0

  for (let i = 0; i < mergedData.words.length; i += batchSize) {
    const batch = mergedData.words.slice(i, i + batchSize)

    const wordsToInsert = batch.map((w, idx) => {
      // 确保definition不为null
      let definition = w.definition || null
      if (!definition || definition.trim() === '') {
        // 尝试使用英文释义
        definition = w.definition_en || null
        if (!definition || definition.trim() === '') {
          // 最后使用单词本身
          definition = w.word
        }
      }

      return {
        id: w.id,
        chapter_id: newChapter.id,
        word: w.word,
        phonetic: w.phonetic || null,
        uk_phonetic: w.uk_phonetic || null,
        us_phonetic: w.us_phonetic || null,
        definition: definition,
        definition_en: w.definition_en || null,
        collocation: w.collocation || null,
        collocation_en: w.collocation_en || null,
        example_sentence: w.example_sentence || null,
        example_sentence_en: w.example_sentence_en || null,
        part_of_speech: w.part_of_speech || null,
        audio_url: w.audio_url || null,
        order_index: i + idx,
        difficulty_score: w.difficulty_score || null
      }
    })

    const { error: insertError } = await supabase
      .from('words')
      .insert(wordsToInsert)

    if (insertError) {
      console.error(`   ❌ 批次 ${i / batchSize + 1} 插入失败: ${insertError.message}`)
    } else {
      insertedCount += batch.length
      if (insertedCount % 1000 === 0) {
        console.log(`   已插入: ${insertedCount} / ${mergedData.words.length}`)
      }
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

  console.log(`   ✅ 恢复完成: ${insertedCount} 个单词`)

  return { bookName, insertedCount }
}

async function restoreFromBackup() {
  console.log('\n🔄 从备份恢复完整数据...\n')
  console.log('='.repeat(80))

  try {
    const startTime = Date.now()

    // 1. 解压备份
    const backupDir = await extractBackup()

    // 2. 删除当前不完整的数据
    await deleteCurrentIncompleteBooks()

    // 3. 恢复merged数据
    console.log('\n📥 开始恢复书籍数据...\n')

    const results = []

    for (const bookInfo of BOOKS_TO_RESTORE) {
      const result = await restoreMergedBook(bookInfo.file, bookInfo.category, backupDir)
      if (result) {
        results.push(result)
      }
    }

    // 4. 统计结果
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(1)

    console.log('\n' + '='.repeat(80))
    console.log('📊 恢复完成统计')
    console.log('='.repeat(80))

    console.log(`\n恢复书籍数: ${results.length}`)
    console.log(`总用时: ${duration} 秒`)

    let totalWords = 0
    console.log('\n恢复详情:')
    results.forEach(r => {
      console.log(`  - ${r.bookName}: ${r.insertedCount.toLocaleString()} 词`)
      totalWords += r.insertedCount
    })

    console.log(`\n总单词数: ${totalWords.toLocaleString()}`)
    console.log('\n✅ 恢复完成!\n')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    console.error(error.stack)
  }
}

restoreFromBackup().catch(console.error)
