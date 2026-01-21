// 导入生产词库（修复版）
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
const { v4: uuidv4 } = require('crypto')

// 简单的UUID生成函数
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 词库分类映射（修复：只使用数据库允许的分类）
const BOOK_CATEGORIES = {
  'IELTS': 'exam',
  'TOEFL': 'exam',
  'GRE': 'exam',
  'SAT': 'exam',
  'GMAT': 'exam',
  '考研': 'exam',
  'CET-4': 'exam',
  'CET-6': 'exam',
  '专升本': 'exam',
  'KET': 'exam',
  'PET': 'exam',
  'FCE': 'exam',
  'PETS': 'exam',
  'PTE': 'exam',
  'BEC': 'exam', // 修复：改为exam
  '高中': 'textbook',
  '初中': 'textbook',
  'PEP': 'textbook'
}

async function importWordbooks() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const wordlistsDir = path.join(__dirname, 'wordlists_final')
  const files = fs.readdirSync(wordlistsDir).filter(f => f.endsWith('.json') && !f.includes('statistics') && !f.includes('README') && !f.includes('PROJECT'))

  console.log('\n📚 开始导入生产词库（修复版）...\n')
  console.log(`找到 ${files.length} 个词库文件\n`)

  const results = []

  for (const file of files) {
    const filePath = path.join(wordlistsDir, file)
    console.log(`\n${'='.repeat(70)}`)
    console.log(`处理: ${file}`)
    console.log('='.repeat(70))

    try {
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'))
      const bookTitle = data.title || file.replace('.json', '')
      const wordCount = data.words.length

      console.log(`  书名: ${bookTitle}`)
      console.log(`  词汇量: ${wordCount}`)

      // 1. 创建 book 记录
      let category = 'exam' // 默认
      for (const [key, value] of Object.entries(BOOK_CATEGORIES)) {
        if (bookTitle.includes(key)) {
          category = value
          break
        }
      }

      const { data: book, error: bookError } = await supabase
        .from('books')
        .insert({
          title: bookTitle,
          description: `从 ${file} 导入`,
          category: category,
          is_official: true,
          total_words: wordCount,
          total_chapters: 0
        })
        .select()
        .single()

      if (bookError) {
        console.error(`  ❌ 创建书籍失败: ${bookError.message}`)
        continue
      }

      console.log(`  ✅ 创建书籍: ${book.id} (分类: ${category})`)

      // 2. 收集所有唯一章节
      const chapterSet = new Set()
      data.words.forEach(w => {
        if (w.chapter && Array.isArray(w.chapter) && w.chapter.length > 0) {
          w.chapter.forEach(ch => ch && chapterSet.add(ch))
        }
      })

      // 如果没有章节，创建默认章节
      if (chapterSet.size === 0) {
        chapterSet.add('全部词汇')
      }

      console.log(`  发现 ${chapterSet.size} 个章节`)

      // 3. 创建章节
      const chaptersMap = new Map()
      let chapterIndex = 1

      for (const chapterName of chapterSet) {
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .insert({
            book_id: book.id,
            title: chapterName,
            order_index: chapterIndex++
          })
          .select()
          .single()

        if (!chapterError) {
          chaptersMap.set(chapterName, chapter.id)
        }
      }

      console.log(`  ✅ 创建 ${chaptersMap.size} 个章节`)

      // 4. 统计字段完整度（插入前）
      const fieldStats = {
        total: wordCount,
        has_phonetic: 0,
        has_uk_phonetic: 0,
        has_us_phonetic: 0,
        has_definition: 0,
        has_definition_en: 0,
        has_collocation: 0,
        has_collocation_en: 0,
        has_example_sentence: 0,
        has_example_sentence_en: 0,
        has_part_of_speech: 0
      }

      // 5. 准备单词数据
      const wordsToInsert = []
      const batchSize = 500

      for (const word of data.words) {
        // 智能处理释义字段
        let definition = word.definition || ''
        let definition_en = word.definition_en || ''
        let part_of_speech = word.part_of_speech || null

        // 如果 definition_cn 是数组，提取丰富信息
        if (Array.isArray(word.definition_cn) && word.definition_cn.length > 0) {
          const first = word.definition_cn[0]
          if (first.definition_cn && (!definition || definition.includes('【'))) {
            definition = first.definition_cn
          }
          if (first.definition_en && !definition_en) {
            definition_en = first.definition_en
          }
          if (first.part_of_speech && !part_of_speech) {
            part_of_speech = first.part_of_speech
          }
        }
        // 如果 definition_cn 是字符串且更完整
        else if (typeof word.definition_cn === 'string' && word.definition_cn) {
          if (!definition || definition.includes('【') || word.definition_cn.length > definition.length) {
            definition = word.definition_cn
          }
        }

        // 确定章节ID
        let chapterId
        if (word.chapter && Array.isArray(word.chapter) && word.chapter.length > 0 && word.chapter[0]) {
          chapterId = chaptersMap.get(word.chapter[0])
        }
        if (!chapterId) {
          chapterId = chaptersMap.get('全部词汇') || Array.from(chaptersMap.values())[0]
        }

        // 统计字段
        if (word.phonetic) fieldStats.has_phonetic++
        if (word.uk_phonetic) fieldStats.has_uk_phonetic++
        if (word.us_phonetic) fieldStats.has_us_phonetic++
        if (definition) fieldStats.has_definition++
        if (definition_en) fieldStats.has_definition_en++
        if (word.collocation) fieldStats.has_collocation++
        if (word.collocation_en) fieldStats.has_collocation_en++
        if (word.example_sentence) fieldStats.has_example_sentence++
        if (word.example_sentence_en) fieldStats.has_example_sentence_en++
        if (part_of_speech) fieldStats.has_part_of_speech++

        // 生成UUID（如果ID为空）
        const wordId = word.id || generateUUID()

        wordsToInsert.push({
          id: wordId,
          chapter_id: chapterId,
          word: word.word,
          phonetic: word.phonetic || null,
          uk_phonetic: word.uk_phonetic || null,
          us_phonetic: word.us_phonetic || null,
          definition: definition,
          definition_en: definition_en,
          collocation: word.collocation || null,
          collocation_en: word.collocation_en || null,
          example_sentence: word.example_sentence || null,
          example_sentence_en: word.example_sentence_en || null,
          part_of_speech: part_of_speech,
          audio_url: word.audio_url || null,
          order_index: word.order_index || 0,
          difficulty_score: word.difficulty_score || null
        })
      }

      // 6. 批量插入单词
      console.log(`  开始插入 ${wordsToInsert.length} 个单词...`)

      let inserted = 0
      for (let i = 0; i < wordsToInsert.length; i += batchSize) {
        const batch = wordsToInsert.slice(i, i + batchSize)
        const { error: insertError } = await supabase
          .from('words')
          .insert(batch)

        if (insertError) {
          console.error(`  ❌ 插入批次失败: ${insertError.message}`)
        } else {
          inserted += batch.length
          console.log(`  进度: ${inserted}/${wordsToInsert.length}`)
        }
      }

      // 7. 更新书籍的总章节数
      await supabase
        .from('books')
        .update({ total_chapters: chaptersMap.size })
        .eq('id', book.id)

      console.log(`\n  ✅ 成功导入 ${bookTitle}`)
      console.log(`     - 章节: ${chaptersMap.size}`)
      console.log(`     - 单词: ${inserted}`)

      // 保存统计结果
      results.push({
        book: bookTitle,
        file: file,
        category: category,
        totalWords: wordCount,
        insertedWords: inserted,
        chapters: chaptersMap.size,
        fieldStats: fieldStats
      })

    } catch (error) {
      console.error(`  ❌ 处理失败: ${error.message}`)
    }
  }

  // 生成统计报告
  console.log('\n\n' + '='.repeat(70))
  console.log('📊 字段完整度统计报告')
  console.log('='.repeat(70))

  results.forEach(r => {
    console.log(`\n📚 ${r.book} (${r.category})`)
    console.log(`   文件: ${r.file}`)
    console.log(`   单词数: ${r.insertedWords}/${r.totalWords}`)
    console.log(`   章节数: ${r.chapters}`)
    console.log(`   字段完整度:`)
    console.log(`     phonetic:         ${((r.fieldStats.has_phonetic / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     uk_phonetic:      ${((r.fieldStats.has_uk_phonetic / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     us_phonetic:      ${((r.fieldStats.has_us_phonetic / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     definition:       ${((r.fieldStats.has_definition / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     definition_en:    ${((r.fieldStats.has_definition_en / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     collocation:      ${((r.fieldStats.has_collocation / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     collocation_en:   ${((r.fieldStats.has_collocation_en / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     example_sentence: ${((r.fieldStats.has_example_sentence / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     example_sentence_en: ${((r.fieldStats.has_example_sentence_en / r.totalWords) * 100).toFixed(1)}%`)
    console.log(`     part_of_speech:    ${((r.fieldStats.has_part_of_speech / r.totalWords) * 100).toFixed(1)}%`)
  })

  // 汇总统计
  console.log('\n' + '='.repeat(70))
  console.log('📈 汇总统计')
  console.log('='.repeat(70))

  const totalBooks = results.length
  const totalWords = results.reduce((sum, r) => sum + r.insertedWords, 0)
  const totalChapters = results.reduce((sum, r) => sum + r.chapters, 0)

  console.log(`  总词库数: ${totalBooks}`)
  console.log(`  总单词数: ${totalWords}`)
  console.log(`  总章节数: ${totalChapters}`)
  console.log('\n导入完成！\n')
}

importWordbooks().catch(console.error)
