/**
 * 清空所有词库数据并重新导入
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// Load .env file
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

// 词库文件列表 - 使用enhanced版本（更完整）
const WORDLIST_FILES = [
  { file: 'IELTS_enhanced.json', category: 'exam' },
  { file: 'TOEFL_enhanced.json', category: 'exam' },
  { file: '考研_enhanced.json', category: 'exam' },
  { file: 'CET-4_enhanced.json', category: 'exam' },
  { file: 'CET-6_enhanced.json', category: 'exam' },
  { file: 'GRE_enhanced.json', category: 'exam' },
  { file: 'SAT_enhanced.json', category: 'exam' },
  { file: 'GMAT_enhanced.json', category: 'exam' },
  { file: 'BEC_enhanced.json', category: 'exam' },
  { file: '高中_enhanced.json', category: 'textbook' },
  { file: '初中_enhanced.json', category: 'textbook' },
  { file: '2022年专升本英语核心词汇.json', category: 'exam' },
  { file: '14天攻克KET核心词汇.json', category: 'exam' },
  { file: '2022 PETS第五级教材.json', category: 'exam' },
  { file: 'FCE核心词 巧记速练.json', category: 'exam' },
  { file: '2022PETS第三级教材.json', category: 'exam' },
  { file: '2022PETS第四级教材.json', category: 'exam' }
]

async function cleanAllData() {
  console.log('\n🗑️  清空所有词库数据...\n')

  // 删除所有书籍（CASCADE会自动删除章节、单词等）
  const { error } = await supabase
    .from('books')
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有

  if (error) {
    console.error('❌ 删除失败:', error.message)
    return false
  }

  console.log('✅ 所有词库数据已清空')
  return true
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function importWordlists() {
  console.log('\n📥 开始重新导入词库...\n')
  console.log('='.repeat(80))

  const wordlistsDir = path.join(__dirname, 'wordlists_final')

  let totalBooks = 0
  let totalWords = 0
  let successCount = 0

  for (const wordlist of WORDLIST_FILES) {
    const filePath = path.join(wordlistsDir, wordlist.file)

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  跳过（文件不存在）: ${wordlist.file}`)
      continue
    }

    console.log(`\n📚 导入: ${wordlist.file}`)

    try {
      // 读取JSON文件
      const content = fs.readFileSync(filePath, 'utf8')
      const data = JSON.parse(content)

      // 提取书名
      let bookTitle = data.title || wordlist.file.replace('.json', '').replace('_enhanced', '')

      // 创建书籍
      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          title: bookTitle,
          description: `从 ${wordlist.file} 导入`,
          category: wordlist.category,
          is_official: true,
          total_words: 0,
          total_chapters: 0
        })
        .select()
        .single()

      if (bookError) {
        console.error(`  ❌ 创建书籍失败: ${bookError.message}`)
        continue
      }

      console.log(`  书籍ID: ${book.id}`)

      // 创建章节
      const { data: chapter } = await supabase
        .from('chapters')
        .insert({
          book_id: book.id,
          title: 'All Words',
          order_index: 1
        })
        .select()
        .single()

      console.log(`  章节ID: ${chapter.id}`)

      // 批量插入单词
      const batchSize = 500
      let insertedCount = 0

      for (let i = 0; i < data.words.length; i += batchSize) {
        const batch = data.words.slice(i, i + batchSize)

        const wordsToInsert = batch.map((w, idx) => {
          // 处理definition字段
          let definition = null
          if (w.definition) {
            definition = w.definition
          } else if (w.definition_cn && Array.isArray(w.definition_cn) && w.definition_cn.length > 0) {
            definition = w.definition_cn.map(d => `${d.part_of_speech}. ${d.definition_cn}`).join('; ')
          } else if (w.translation) {
            definition = w.translation
          } else {
            definition = w.word
          }

          return {
            id: w.id || generateUUID(),
            chapter_id: chapter.id,
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
          console.error(`  ❌ 批次 ${i / batchSize + 1} 插入失败: ${insertError.message}`)
          break
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
        .eq('id', book.id)

      console.log(`  ✅ 导入完成: ${insertedCount} 个单词`)

      totalBooks++
      totalWords += insertedCount
      successCount++

    } catch (error) {
      console.error(`  ❌ 导入失败: ${error.message}`)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('📊 导入完成统计')
  console.log('='.repeat(80))
  console.log(`\n成功导入: ${successCount}/${WORDLIST_FILES.length} 个词库`)
  console.log(`总单词数: ${totalWords.toLocaleString()}\n`)
}

async function main() {
  console.log('\n🔄 清空并重新导入词库数据\n')
  console.log('⚠️  警告：此操作将删除所有现有词库数据！')

  // 清空数据
  const cleaned = await cleanAllData()
  if (!cleaned) {
    console.log('\n❌ 清空失败，操作中止')
    return
  }

  // 等待2秒，确保删除操作完成
  await new Promise(resolve => setTimeout(resolve, 2000))

  // 重新导入
  await importWordlists()

  console.log('✅ 全部完成！\n')
}

main().catch(console.error)
