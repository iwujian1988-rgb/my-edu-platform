/**
 * 从 20260112v1.tar.gz 导入词库数据（包含额外字段）
 */

const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')

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
  'FCE': 3,
  '14天攻克KET核心词汇': 1,
  '2022年专升本英语核心词汇': 3,
  '2022 PETS第五级教材': 3,
  'FCE核心词 巧记速练': 3,
  '2022PETS第三级教材': 2,
  '2022PETS第四级教材': 2
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 处理definition字段
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

// 处理collocation字段
function processCollocation(phrases) {
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return null
  }
  return phrases.slice(0, 5).join('; ')
}

// 处理example_sentence_en字段
function processExampleSentenceEn(examples) {
  if (!Array.isArray(examples) || examples.length === 0) {
    return null
  }
  return examples.slice(0, 3).join(' | ')
}

// 处理phonetic字段（通用音标）
function processPhonetic(us_phonetic, uk_phonetic) {
  return us_phonetic || uk_phonetic || null
}

// 处理audio_url
function processAudioUrl(word) {
  const encodedWord = encodeURIComponent(word)
  return `https://dict.youdao.com/dictvoice?type=2&audio=${encodedWord}`
}

// 获取难度分数
function getDifficultyScore(bookTitle) {
  if (DIFFICULTY_MAP[bookTitle] !== undefined) {
    return DIFFICULTY_MAP[bookTitle]
  }

  if (bookTitle.includes('小学')) return 1
  if (bookTitle.includes('初中')) return 2
  if (bookTitle.includes('高中')) return 3

  return 3 // 默认中等难度
}

// 获取分类
function getCategory(bookTitle) {
  if (CATEGORY_MAP[bookTitle]) {
    return CATEGORY_MAP[bookTitle]
  }

  if (bookTitle.includes('PEP') || bookTitle.includes('小学') || bookTitle.includes('初中') || bookTitle.includes('高中')) {
    return 'textbook'
  }

  return 'exam'
}

async function importWordlist(filePath) {
  console.log(`\n📚 导入: ${path.basename(filePath)}`)

  try {
    // 读取JSON文件
    const content = fs.readFileSync(filePath, 'utf8')
    const data = JSON.parse(content)

    // 提取书名
    const bookTitle = data.title || path.basename(filePath).replace('.json', '').replace('_merged', '')

    console.log(`   书名: ${bookTitle}`)
    console.log(`   单词数: ${data.words.length}`)

    // 创建书籍
    const { data: book, error: bookError } = await supabase
      .from('books')
      .insert({
        title: bookTitle,
        description: `从 20260112v1.tar.gz 导入`,
        category: getCategory(bookTitle),
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

    console.log(`   书籍ID: ${book.id}`)

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

    console.log(`   章节ID: ${chapter.id}`)

    // 批量插入单词
    const batchSize = 500
    let insertedCount = 0

    for (let i = 0; i < data.words.length; i += batchSize) {
      const batch = data.words.slice(i, i + batchSize)

      const wordsToInsert = batch.map((w, idx) => {
        return {
          id: generateUUID(),
          chapter_id: chapter.id,
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
        console.error(`   ❌ 批次 ${i / batchSize + 1} 插入失败: ${insertError.message}`)
        console.error(`   错误详情: ${JSON.stringify(insertError, null, 2)}`)
        break
      } else {
        insertedCount += batch.length
        if (insertedCount % 1000 === 0) {
          console.log(`   已导入: ${insertedCount} / ${data.words.length}`)
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
      .eq('id', book.id)

    console.log(`   ✅ 导入完成: ${insertedCount} 个单词`)

    return {
      book: bookTitle,
      words: insertedCount
    }

  } catch (error) {
    console.error(`   ❌ 导入失败: ${error.message}`)
    return null
  }
}

async function main() {
  console.log('\n📥 开始从 20260112v1.tar.gz 导入词库数据\n')
  console.log('='.repeat(80))

  const wordlistsDir = path.join(__dirname, 'wordlists_v1/wordlists_final')
  const files = fs.readdirSync(wordlistsDir).filter(f => f.endsWith('.json'))

  console.log(`找到 ${files.length} 个词库文件\n`)

  const results = []

  for (const file of files) {
    const filePath = path.join(wordlistsDir, file)
    const result = await importWordlist(filePath)
    if (result) {
      results.push(result)
    }
  }

  // 统计
  const totalWords = results.reduce((sum, r) => sum + r.words, 0)

  console.log('\n' + '='.repeat(80))
  console.log('📊 导入完成统计')
  console.log('='.repeat(80))
  console.log(`\n成功导入: ${results.length}/${files.length} 个词库`)
  console.log(`总单词数: ${totalWords.toLocaleString()}\n`)

  console.log('导入详情:')
  results.forEach(r => {
    console.log(`  - ${r.book}: ${r.words.toLocaleString()} 词`)
  })

  console.log('\n✅ 导入完成！\n')
}

main().catch(console.error)
