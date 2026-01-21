/**
 * 词库数据导入脚本
 *
 * 功能：
 * 1. 清空现有词库数据
 * 2. 从 JSON 文件导入 17 个词库
 * 3. 为每个词库自动创建章节
 * 4. 导入 61,633 个单词
 *
 * 使用方法：
 * node import-wordlists.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Supabase 配置
const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 词库文件列表
const WORDLIST_FILES = [
  { file: 'IELTS_enhanced.json', category: 'exam', difficulty: 'advanced' },
  { file: 'TOEFL_enhanced.json', category: 'exam', difficulty: 'advanced' },
  { file: '考研_enhanced.json', category: 'exam', difficulty: 'intermediate' },
  { file: 'CET-4_enhanced.json', category: 'exam', difficulty: 'intermediate' },
  { file: 'CET-6_enhanced.json', category: 'exam', difficulty: 'upper-intermediate' },
  { file: 'GRE_enhanced.json', category: 'exam', difficulty: 'advanced' },
  { file: 'SAT_enhanced.json', category: 'exam', difficulty: 'intermediate' },
  { file: 'GMAT_enhanced.json', category: 'exam', difficulty: 'advanced' },
  { file: 'BEC_enhanced.json', category: 'exam', difficulty: 'upper-intermediate' },
  { file: '高中_enhanced.json', category: 'education', difficulty: 'intermediate' },
  { file: '初中_enhanced.json', category: 'education', difficulty: 'beginner' },
  { file: '2022年专升本英语核心词汇.json', category: 'exam', difficulty: 'intermediate' },
  { file: '14天攻克KET核心词汇.json', category: 'exam', difficulty: 'beginner' },
  { file: '2022 PETS第五级教材.json', category: 'exam', difficulty: 'intermediate' },
  { file: 'FCE核心词 巧记速练.json', category: 'exam', difficulty: 'upper-intermediate' },
  { file: '2022PETS第三级教材.json', category: 'exam', difficulty: 'beginner' },
  { file: '2022PETS第四级教材.json', category: 'exam', difficulty: 'intermediate' }
]

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

// 清空现有数据
async function clearExistingData() {
  console.log('🗑️  清空现有数据...')

  try {
    // 删除所有单词（会自动触发级联删除）
    const { error: wordsError } = await supabase
      .from('words')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // 删除所有

    // 删除所有章节
    const { error: chaptersError } = await supabase
      .from('chapters')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    // 删除所有词库
    const { error: booksError } = await supabase
      .from('books')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (wordsError) console.error('  ❌ 清空words失败:', wordsError.message)
    if (chaptersError) console.error('  ❌ 清空chapters失败:', chaptersError.message)
    if (booksError) console.error('  ❌ 清空books失败:', booksError.message)

    if (!wordsError && !chaptersError && !booksError) {
      console.log('  ✅ 数据清空完成')
    }
  } catch (error) {
    console.error('  ❌ 清空数据时发生错误:', error.message)
    throw error
  }
}

// 导入单个词库
async function importWordlist(wordlistPath, config) {
  console.log(`\n📚 开始导入: ${config.file}`)

  try {
    // 读取JSON文件
    const jsonContent = readFileSync(wordlistPath, 'utf-8')
    const data = JSON.parse(jsonContent)

    const { title, description, total_words, words } = data
    console.log(`  📖 词库: ${title}`)
    console.log(`  📊 单词数: ${total_words}`)

    // 1. 创建词库记录
    const bookId = generateUUID()
    const { error: bookError } = await supabase
      .from('books')
      .insert({
        id: bookId,
        title: title,
        description: description || `${title} - AI增强版词库`,
        cover_url: null,
        category: config.category,
        is_official: true,
        total_words: 0, // 稍后更新
        total_chapters: 0, // 稍后更新
        is_published: true,
        difficulty_level: config.difficulty,
        language: 'en',
        cover_color: null
      })

    if (bookError) {
      console.error('  ❌ 创建词库失败:', bookError.message)
      return false
    }
    console.log(`  ✅ 词库创建成功: ${bookId}`)

    // 2. 自动创建章节（如果JSON中有chapter信息）
    const chapterMap = new Map() // 章节名称 -> chapterId
    const chaptersSet = new Set()

    // 收集所有章节
    for (const word of words) {
      if (word.chapter && Array.isArray(word.chapter) && word.chapter.length > 0) {
        word.chapter.forEach(ch => chaptersSet.add(ch))
      }
    }

    // 按排序创建章节
    const sortedChapters = Array.from(chaptersSet).sort()
    let orderIndex = 1

    for (const chapterName of sortedChapters) {
      const chapterId = generateUUID()
      const { error: chapterError } = await supabase
        .from('chapters')
        .insert({
          id: chapterId,
          book_id: bookId,
          title: chapterName,
          order_index: orderIndex++,
          theme_id: null,
          scene_id: null
        })

      if (!chapterError) {
        chapterMap.set(chapterName, chapterId)
      }
    }

    console.log(`  ✅ 创建了 ${chapterMap.size} 个章节`)

    // 3. 导入单词
    let successCount = 0
    let errorCount = 0
    const batchSize = 100

    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize)
      const wordRecords = batch.map(word => {
        // 处理中文释义
        let definition = ''
        let definitionEn = ''
        let partOfSpeech = ''

        if (word.definition_cn && Array.isArray(word.definition_cn) && word.definition_cn.length > 0) {
          const def = word.definition_cn[0]
          definition = def.definition_cn || ''
          definitionEn = def.definition_en || ''
          partOfSpeech = def.part_of_speech || word.part_of_speech || ''
        } else if (typeof word.definition_cn === 'string') {
          definition = word.definition_cn
        }

        // 处理音标（优先英音）
        const phonetic = word.uk_phonetic || word.us_phonetic || null

        // 处理例句
        let exampleEn = ''
        let exampleCn = ''
        if (word.examples && Array.isArray(word.examples) && word.examples.length > 0) {
          exampleEn = word.examples[0].english || ''
          exampleCn = word.examples[0].chinese || ''
        }

        // 处理搭配
        let collocationEn = ''
        let collocation = ''
        if (word.phrases && Array.isArray(word.phrases) && word.phrases.length > 0) {
          collocationEn = word.phrases[0].phrase || ''
          collocation = word.phrases[0].translation || ''
        }

        // 确定章节ID
        let chapterId = null
        if (word.chapter && Array.isArray(word.chapter) && word.chapter.length > 0) {
          const firstChapter = word.chapter[0]
          chapterId = chapterMap.get(firstChapter) || null
        }

        return {
          id: generateUUID(),
          chapter_id: chapterId,
          word: word.word,
          phonetic: phonetic,
          definition: definition,
          definition_en: definitionEn,
          collocation: collocation,
          collocation_en: collocationEn,
          example_sentence: exampleCn,
          example_sentence_en: exampleEn,
          part_of_speech: partOfSpeech,
          audio_url: null,
          order_index: i + 1,
          difficulty_score: null
        }
      })

      // 批量插入
      const { error: wordsError } = await supabase
        .from('words')
        .insert(wordRecords)

      if (wordsError) {
        console.error(`  ❌ 批次 ${i}-${i+batchSize} 插入失败:`, wordsError.message)
        errorCount += batch.length
      } else {
        successCount += batch.length
      }

      // 显示进度
      const progress = Math.min(100, Math.round((i + batchSize) / words.length * 100))
      process.stdout.write(`\r  📊 进度: ${progress}% (${successCount}/${words.length})`)
    }

    console.log(`\n  ✅ 导入完成: ${successCount} 成功, ${errorCount} 失败`)

    // 4. 更新词库统计（触发器会自动处理）
    console.log(`  🔄 更新词库统计...`)

    return true
  } catch (error) {
    console.error(`  ❌ 导入失败:`, error.message)
    return false
  }
}

// 主函数
async function main() {
  console.log('🚀 开始词库导入流程\n')
  console.log('=' .repeat(60))

  const startTime = Date.now()

  try {
    // 步骤1: 清空现有数据
    await clearExistingData()

    // 步骤2: 导入所有词库
    console.log('\n📚 开始导入词库...\n')

    let successCount = 0
    let failCount = 0

    for (const wordlist of WORDLIST_FILES) {
      const wordlistPath = resolve('./wordlists_final', wordlist.file)

      const success = await importWordlist(wordlistPath, wordlist)

      if (success) {
        successCount++
      } else {
        failCount++
      }
    }

    // 步骤3: 总结
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(60))
    console.log('📊 导入完成统计')
    console.log('='.repeat(60))
    console.log(`✅ 成功导入: ${successCount} 个词库`)
    console.log(`❌ 导入失败: ${failCount} 个词库`)
    console.log(`⏱️  总耗时: ${duration} 秒`)
    console.log('='.repeat(60))

  } catch (error) {
    console.error('\n❌ 导入过程发生错误:', error)
    process.exit(1)
  }
}

// 运行主函数
main()
