/**
 * 重新导入包含章节信息的词库
 * 这些词库的单词中有chapter字段，需要为每个章节创建实际的章节记录
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

// 加载环境变量
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

// 包含章节信息的词库列表
const CHAPTERED_BOOKS = [
  'FCE.json',
  'GRE_merged.json',
  'PEP初中7年级.json',
  'PEP初中8年级.json',
  'PEP初中9年级.json',
  'PEP小学3年级.json',
  'PEP小学4年级.json',
  'PEP小学5年级.json',
  'PEP小学6年级.json',
  'PEP高中英语.json',
  'PETS3.json',
  '初中_merged.json',
  '北京高中英语.json',
  '外研社初中英语.json',
  '高中_merged.json'
]

// 词库分类映射
const CATEGORY_MAP = {
  'IELTS': 'exam',
  'TOEFL': 'exam',
  '考研': 'exam',
  'CET-4': 'exam',
  'CET-6': 'exam',
  'GRE': 'exam',
  'SAT': 'exam',
  'GMAT': 'exam',
  'BEC': 'exam',
  'FCE': 'exam',
  'PETS3': 'exam',
  'PET': 'exam',
  'PTE': 'exam',
  'KET': 'exam',
  '高中': 'textbook',
  '初中': 'textbook',
  'PEP高中英语': 'textbook',
  'PEP初中': 'textbook',
  'PEP小学': 'textbook',
  '北京高中英语': 'textbook',
  '外研社初中英语': 'textbook',
  '专业英语八级': 'exam',
  '专业英语四级': 'exam'
}

// 难度分数映射
const DIFFICULTY_MAP = {
  'GRE': 5,
  'IELTS': 4,
  'TOEFL': 4,
  'SAT': 4,
  'GMAT': 4,
  'CET-6': 3,
  'CET-4': 3,
  '考研': 3,
  'BEC': 3,
  'PETS3': 3,
  'PET': 2,
  'PTE': 2,
  'KET': 2,
  '高中': 3,
  '初中': 2,
  'PEP高中英语': 3,
  'PEP初中': 2,
  'PEP小学': 1,
  '北京高中英语': 3,
  '外研社初中英语': 2,
  '专业英语八级': 4,
  '专业英语四级': 4,
  'FCE': 3
}

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

function getCategory(bookTitle) {
  if (CATEGORY_MAP[bookTitle]) {
    return CATEGORY_MAP[bookTitle]
  }

  if (bookTitle.includes('PEP') || bookTitle.includes('小学') || bookTitle.includes('初中') || bookTitle.includes('高中')) {
    return 'textbook'
  }

  return 'exam'
}

function getDifficultyScore(bookTitle) {
  if (DIFFICULTY_MAP[bookTitle] !== undefined) {
    return DIFFICULTY_MAP[bookTitle]
  }

  if (bookTitle.includes('小学')) return 1
  if (bookTitle.includes('初中')) return 2
  if (bookTitle.includes('高中')) return 3

  return 3
}

function processDefinition(definition_cn, word) {
  if (typeof definition_cn === 'string') {
    return definition_cn
  }

  if (Array.isArray(definition_cn) && definition_cn.length > 0) {
    return definition_cn
      .map(item => `${item.part_of_speech}. ${item.definition_cn}`)
      .join('; ')
  }

  return word
}

function processCollocation(phrases) {
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return null
  }
  return phrases.slice(0, 5).join('; ')
}

function processExampleSentenceEn(examples) {
  if (!Array.isArray(examples) || examples.length === 0) {
    return null
  }
  return examples.slice(0, 3).join(' | ')
}

function processPhonetic(us_phonetic, uk_phonetic) {
  return us_phonetic || uk_phonetic || null
}

function processAudioUrl(word) {
  const encodedWord = encodeURIComponent(word)
  return `https://dict.youdao.com/dictvoice?type=2&audio=${encodedWord}`
}

async function deleteExistingBook(bookTitle) {
  console.log(`\n🗑️  删除旧词库: ${bookTitle}`)

  const { data: existingBook } = await supabase
    .from('books')
    .select('id')
    .eq('title', bookTitle)
    .single()

  if (existingBook) {
    const { error } = await supabase
      .from('books')
      .delete()
      .eq('id', existingBook.id)

    if (error) {
      console.error(`   ❌ 删除失败: ${error.message}`)
      return false
    }
    console.log(`   ✅ 删除成功`)
  }

  return true
}

async function importWordlistWithChapters(filePath) {
  console.log(`\n📚 导入: ${path.basename(filePath)}`)

  try {
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    const bookTitle = data.title || path.basename(filePath).replace('.json', '').replace('_merged', '')

    console.log(`   书名: ${bookTitle}`)
    console.log(`   单词数: ${data.words.length}`)

    // 检查是否有chapter字段
    const hasChapters = data.words.some(w => w.chapter)
    if (!hasChapters) {
      console.log(`   ⚠️  警告: 此词库没有chapter字段，使用单章节模式`)
    }

    // 按章节分组单词
    const chapterGroups = new Map()
    data.words.forEach(w => {
      let chapterNames = []

      if (Array.isArray(w.chapter)) {
        // 如果是数组，取第一个章节（单词通常只属于一个章节）
        chapterNames = [w.chapter[0]]
      } else if (w.chapter && typeof w.chapter === 'string') {
        // 如果是字符串，检查是否有逗号分隔的多个章节
        if (w.chapter.includes(',')) {
          chapterNames = w.chapter.split(',').map(c => c.trim()).slice(0, 1)
        } else {
          chapterNames = [w.chapter]
        }
      } else {
        // 没有章节信息
        chapterNames = ['All Words']
      }

      // 将单词分配到第一个章节（避免一个单词出现在多个章节）
      const chapterName = chapterNames[0]
      if (!chapterGroups.has(chapterName)) {
        chapterGroups.set(chapterName, [])
      }
      chapterGroups.get(chapterName).push(w)
    })

    console.log(`   章节数: ${chapterGroups.size}`)

    // 创建书籍
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: bookTitle,
        description: `从 20260112v1.tar.gz 导入（包含章节信息）`,
        category: getCategory(bookTitle),
        is_official: true,
        total_words: 0,
        total_chapters: chapterGroups.size
      })
      .select()
      .single()

    if (bookError) {
      console.error(`   ❌ 创建书籍失败: ${bookError.message}`)
      return null
    }

    console.log(`   书籍ID: ${book.id}`)

    // 按顺序创建章节
    const chapterNames = Array.from(chapterGroups.keys())
    const chapterMap = new Map()

    for (let i = 0; i < chapterNames.length; i++) {
      const chapterName = chapterNames[i]

      const { data: chapter } = await supabase
        .from('chapters')
        .insert({
          book_id: book.id,
          title: chapterName,
          order_index: i + 1
        })
        .select()
        .single()

      chapterMap.set(chapterName, chapter.id)
      console.log(`   章节${i + 1}: ${chapterName} (ID: ${chapter.id})`)
    }

    // 批量插入单词
    const batchSize = 500
    let insertedCount = 0

    for (const [chapterName, words] of chapterGroups.entries()) {
      const chapterId = chapterMap.get(chapterName)

      for (let i = 0; i < words.length; i += batchSize) {
        const batch = words.slice(i, i + batchSize)

        const wordsToInsert = batch.map((w, idx) => {
          return {
            id: generateUUID(),
            chapter_id: chapterId,
            word: w.word,
            phonetic: processPhonetic(w.us_phonetic, w.uk_phonetic),
            uk_phonetic: w.uk_phonetic || null,
            us_phonetic: w.us_phonetic || null,
            definition: processDefinition(w.definition_cn, w.word),
            definition_en: w.definition_en || null,
            collocation: processCollocation(w.phrases),
            collocation_en: null,
            example_sentence: null,
            example_sentence_en: processExampleSentenceEn(w.examples),
            part_of_speech: w.part_of_speech || null,
            audio_url: processAudioUrl(w.word),
            synonyms: w.synonyms || null,
            related_words: w.related_words || null,
            derived_words: w.derived_words || null,
            memory_method: w.memory_method || null,
            order_index: i + idx,
            difficulty_score: getDifficultyScore(bookTitle)
          }
        })

        const { error: insertError } = await supabase
          .from('words')
          .insert(wordsToInsert)

        if (insertError) {
          console.error(`   ❌ 批次插入失败 (${chapterName}): ${insertError.message}`)
          console.error(`   错误详情: ${JSON.stringify(insertError, null, 2)}`)
          return null
        } else {
          insertedCount += batch.length
          if (insertedCount % 1000 === 0) {
            console.log(`   已导入: ${insertedCount} / ${data.words.length}`)
          }
        }
      }
    }

    // 更新书籍统计
    await supabase
      .from('books')
      .update({
        total_words: insertedCount,
        total_chapters: chapterGroups.size
      })
      .eq('id', book.id)

    console.log(`   ✅ 导入完成: ${insertedCount} 个单词，${chapterGroups.size} 个章节`)

    return {
      book: bookTitle,
      words: insertedCount,
      chapters: chapterGroups.size
    }

  } catch (error) {
    console.error(`   ❌ 导入失败: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('\n🔄 开始重新导入包含章节信息的词库\n')
  console.log('='.repeat(80))

  const wordlistsDir = path.join(__dirname, 'wordlists_v1/wordlists_final')
  const results = []

  for (const file of CHAPTERED_BOOKS) {
    const filePath = path.join(wordlistsDir, file)

    if (!fs.existsSync(filePath)) {
      console.log(`\n⚠️  文件不存在: ${file}`)
      continue
    }

    // 删除旧词库
    const bookTitle = file.replace('.json', '').replace('_merged', '')
    const deleted = await deleteExistingBook(bookTitle)

    if (!deleted) {
      console.log(`\n⚠️  跳过: ${file}`)
      continue
    }

    // 重新导入
    const result = await importWordlistWithChapters(filePath)
    if (result) {
      results.push(result)
    }
  }

  // 统计
  const totalWords = results.reduce((sum, r) => sum + r.words, 0)
  const totalChapters = results.reduce((sum, r) => sum + r.chapters, 0)

  console.log('\n' + '='.repeat(80))
  console.log('📊 导入完成统计')
  console.log('='.repeat(80))
  console.log(`\n成功导入: ${results.length}/${CHAPTERED_BOOKS.length} 个词库`)
  console.log(`总单词数: ${totalWords.toLocaleString()}`)
  console.log(`总章节数: ${totalChapters}\n`)

  console.log('导入详情:')
  results.forEach(r => {
    console.log(`  - ${r.book}: ${r.words.toLocaleString()} 词, ${r.chapters} 章节`)
  })

  console.log('\n✅ 导入完成！\n')
}

main().catch(console.error)
