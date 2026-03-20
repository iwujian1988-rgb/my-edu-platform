/**
 * 法语词库导入脚本
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

const DATA_DIR = './wordupdate/20260309/french_translated_v2_fixed'

const FRENCH_BOOKS = [
  { file: 'french_A1.json', title: '法语A1', category: 'textbook' },
  { file: 'french_A2.json', title: '法语A2', category: 'textbook' },
  { file: 'french_B1.json', title: '法语B1', category: 'textbook' },
  { file: 'french_B2.json', title: '法语B2', category: 'textbook' },
  { file: 'french_C1.json', title: '法语C1', category: 'textbook' },
  { file: 'french_scene_daily_life.json', title: '法语-日常生活', category: 'scenario' },
  { file: 'french_scene_education.json', title: '法语-教育学习', category: 'scenario' },
  { file: 'french_scene_food.json', title: '法语-餐饮美食', category: 'scenario' },
  { file: 'french_scene_travel.json', title: '法语-旅游出行', category: 'scenario' },
  { file: 'french_scene_business.json', title: '法语-商务职场', category: 'scenario' },
  { file: 'french_scene_culture.json', title: '法语-文化艺术', category: 'scenario' },
  { file: 'french_scene_health.json', title: '法语-健康医疗', category: 'scenario' },
  { file: 'french_scene_technology.json', title: '法语-科技网络', category: 'scenario' },
]

function normalizeGender(gender) {
  if (!gender) return null
  const g = gender.toLowerCase().trim()
  if (g === 'feminine' || g === 'f') return 'f'
  if (g === 'masculine' || g === 'm') return 'm'
  return null
}

function buildFrenchLanguageData(wordData) {
  const frData = {}
  const gender = normalizeGender(wordData.gender)
  if (gender) frData.gender = gender
  if (wordData.plural?.trim()) frData.plural = wordData.plural.trim()
  if (Object.keys(frData).length === 0) return null
  return { fr: frData }
}

async function importBook(bookConfig) {
  const { file, title, category } = bookConfig
  const filePath = resolve(DATA_DIR, file)

  console.log(`\n📚 ${title}`)

  let words
  try {
    words = JSON.parse(readFileSync(filePath, 'utf-8'))
    console.log(`  读取 ${words.length} 个单词`)
  } catch (error) {
    console.error(`  ❌ 读取失败: ${error.message}`)
    return { success: false }
  }

  if (words.length === 0) return { success: true, imported: 0 }

  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert({
      title,
      category,
      is_official: true,
      is_published: true,
      language: 'fr',
    })
    .select('id')
    .single()

  if (bookError) {
    console.error(`  ❌ 创建单词本失败: ${bookError.message}`)
    return { success: false }
  }

  const bookId = book.id
  const wordsToInsert = words.map((w, i) => ({
    book_id: bookId,
    chapter_id: null,
    word: w.word,
    phonetic: w.phonetic || null,
    definition: w.definition_zh || w.definition_en || '',
    definition_en: w.definition_en || null,
    part_of_speech: w.part_of_speech || null,
    example_sentence: w.example_sentence || null,
    frequency_rank: w.frequency_rank || null,
    order_index: i,
    language_data: buildFrenchLanguageData(w),
  }))

  const BATCH_SIZE = 500
  let inserted = 0

  for (let i = 0; i < wordsToInsert.length; i += BATCH_SIZE) {
    const batch = wordsToInsert.slice(i, i + BATCH_SIZE)
    const { error } = await supabase.from('words').insert(batch)
    if (error) {
      console.error(`  ❌ 插入失败: ${error.message}`)
      console.error(`  第一个单词: ${JSON.stringify(batch[0])}`)
    } else {
      inserted += batch.length
    }
  }

  await supabase.from('books').update({ total_words: inserted, total_chapters: 0 }).eq('id', bookId)
  console.log(`  ✅ 导入 ${inserted} 个单词`)
  return { success: true, imported: inserted }
}

async function main() {
  console.log('🇫🇷 法语词库导入\n====================')

  const { data: existing } = await supabase.from('books').select('id').eq('language', 'fr')
  if (existing?.length > 0) {
    console.log('⚠️ 已有法语单词本，跳过导入')
    process.exit(0)
  }

  let total = 0
  for (const config of FRENCH_BOOKS) {
    const result = await importBook(config)
    if (result.imported) total += result.imported
  }

  console.log(`\n====================\n🎉 完成! 总计 ${total} 个法语单词`)
}

main().catch(console.error)
