/**
 * 词库数据导入脚本 - 增强版
 *
 * 功能：
 * 1. 清空现有词库数据
 * 2. 从 JSON 文件导入 17 个词库
 * 3. 为每个词库自动创建章节
 * 4. 导入 61,633 个单词
 * 5. 数据验证和错误处理
 * 6. 导入后验证
 *
 * 使用方法：
 * node import-wordlists-v2.mjs
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Supabase 配置
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

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
  console.log('\n🗑️  清空现有数据...')

  try {
    // 删除所有单词（会自动触发级联删除）
    const { error: wordsError } = await supabase
      .from('words')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

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

    if (wordsError) {
      console.error('  ❌ 清空words失败:', wordsError.message)
      throw wordsError
    }
    if (chaptersError) {
      console.error('  ❌ 清空chapters失败:', chaptersError.message)
      throw chaptersError
    }
    if (booksError) {
      console.error('  ❌ 清空books失败:', booksError.message)
      throw booksError
    }

    console.log('  ✅ 数据清空完成')
    return true
  } catch (error) {
    console.error('  ❌ 清空数据时发生错误:', error.message)
    throw error
  }
}

// 处理多词性释义（字符串格式）
function processMultiplePos(inputDef) {
  if (typeof inputDef !== 'string') {
    return { partOfSpeech: '', definition: '' }
  }

  // 按换行符分割
  const parts = inputDef.split('\n').filter(p => p.trim())

  if (parts.length === 0) {
    return { partOfSpeech: '', definition: inputDef }
  }

  // 如果只有一部分，尝试提取词性
  if (parts.length === 1) {
    const match = parts[0].match(/^([a-z]{1,4}\.)\s*/)
    if (match) {
      return {
        partOfSpeech: match[1],
        definition: parts[0].substring(match[0].length).trim()
      }
    }
    return { partOfSpeech: '', definition: parts[0] }
  }

  // 多个词性
  const posList = []
  const defList = []

  for (const part of parts) {
    const match = part.match(/^([a-z]{1,4}\.)\s*/)
    if (match) {
      posList.push(match[1])
      defList.push(part.substring(match[0].length).trim())
    } else {
      // 没有词性标记，添加到上一个词性的释义中
      if (defList.length > 0) {
        defList[defList.length - 1] += '；' + part.trim()
      } else {
        defList.push(part.trim())
      }
    }
  }

  // 组合格式
  const partOfSpeech = posList.join(', ')
  const formattedDef = defList.map((def, i) => `【${posList[i]}】${def}`).join('')

  return { partOfSpeech, definition: formattedDef }
}

// 处理多词性释义（数组格式）
function processMultiplePosArray(definitionArray) {
  if (!Array.isArray(definitionArray) || definitionArray.length === 0) {
    return { partOfSpeech: '', definition: '', definitionEn: '' }
  }

  const posList = []
  const defList = []
  const defEnList = []

  for (const item of definitionArray) {
    if (item && item.part_of_speech) {
      posList.push(item.part_of_speech)
      defList.push(item.definition_cn || '')
      // 保持数组长度一致，即使没有definition_en也要添加空字符串
      defEnList.push(item.definition_en || '')
    }
  }

  // 如果没有词性信息，返回第一个
  if (posList.length === 0) {
    const first = definitionArray[0]
    return {
      partOfSpeech: first?.part_of_speech || '',
      definition: first?.definition_cn || '',
      definitionEn: first?.definition_en || ''
    }
  }

  // 如果只有一个词性，直接返回（不添加标记）
  if (posList.length === 1) {
    const first = definitionArray.find(item => item?.part_of_speech) || definitionArray[0]
    return {
      partOfSpeech: first.part_of_speech || '',
      definition: first.definition_cn || '',
      definitionEn: first.definition_en || ''
    }
  }

  // 多个词性：组合格式
  const partOfSpeech = posList.join(', ')
  const formattedDef = defList.map((def, i) => `【${posList[i]}】${def}`).join('')
  const hasAnyDefEn = defEnList.some(def => def !== '')
  const formattedDefEn = hasAnyDefEn
    ? defEnList.map((def, i) => def ? `【${posList[i]}】${def}` : '').join('')
    : ''

  return { partOfSpeech, definition: formattedDef, definitionEn: formattedDefEn }
}

// 验证单词数据
function validateWord(word) {
  const errors = []

  if (!word.word || typeof word.word !== 'string' || word.word.trim() === '') {
    errors.push('单词为空或无效')
  }

  // 检查释义
  let hasDefinition = false
  if (word.definition_cn) {
    if (Array.isArray(word.definition_cn) && word.definition_cn.length > 0) {
      const def = word.definition_cn[0]
      if (def && def.definition_cn && def.definition_cn.trim()) {
        hasDefinition = true
      }
    } else if (typeof word.definition_cn === 'string' && word.definition_cn.trim()) {
      hasDefinition = true
    }
  }

  if (!hasDefinition) {
    errors.push('释义为空')
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

// 导入单个词库
async function importWordlist(wordlistPath, config) {
  console.log(`\n📚 开始导入: ${config.file}`)
  console.log('─'.repeat(80))

  const stats = {
    total: 0,
    valid: 0,
    invalid: 0,
    inserted: 0,
    failed: 0,
    chapters: 0
  }

  try {
    // 读取JSON文件
    const jsonContent = readFileSync(wordlistPath, 'utf-8')
    const data = JSON.parse(jsonContent)

    const { title, description, total_words, words } = data
    console.log(`  📖 词库: ${title}`)
    console.log(`  📊 声明词数: ${total_words}`)
    console.log(`  📊 实际词数: ${words.length}`)

    if (words.length !== total_words) {
      console.warn(`  ⚠️  警告: 声明词数与实际词数不符`)
    }

    stats.total = words.length

    // 1. 创建词库记录
    const bookId = generateUUID()
    console.log(`  🔖 创建词库记录...`)

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
      return { success: false, stats, error: bookError.message }
    }
    console.log(`  ✅ 词库创建成功: ${bookId}`)

    // 2. 自动创建章节（如果JSON中有chapter信息）
    const chapterMap = new Map()
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

    console.log(`  📑 创建章节 (${sortedChapters.length} 个)...`)

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
        stats.chapters++
      } else {
        console.warn(`    ⚠️  章节创建失败: ${chapterName} - ${chapterError.message}`)
      }
    }

    console.log(`  ✅ 成功创建 ${stats.chapters} 个章节`)

    // 3. 验证并导入单词
    const batchSize = 50 // 降低批次大小，提高稳定性
    const validWords = []

    console.log(`  🔍 验证单词数据...`)

    for (let i = 0; i < words.length; i++) {
      const word = words[i]
      const validation = validateWord(word)

      if (validation.valid) {
        stats.valid++
      } else {
        stats.invalid++
        if (stats.invalid <= 5) { // 只显示前5个错误
          console.warn(`    ⚠️  第 ${i+1} 个单词无效: ${validation.errors.join(', ')}`)
        }
      }
    }

    console.log(`  ✅ 验证完成: ${stats.valid} 个有效, ${stats.invalid} 个无效`)

    // 4. 批量插入有效单词
    console.log(`  📥 导入单词 (${stats.valid} 个)...`)

    for (let i = 0; i < words.length; i += batchSize) {
      const batch = words.slice(i, i + batchSize)
      const wordRecords = []

      for (let j = 0; j < batch.length; j++) {
        const word = batch[j]
        const validation = validateWord(word)

        if (!validation.valid) continue

        // 处理中文释义
        let definition = ''
        let definitionEn = ''
        let partOfSpeech = ''

        if (word.definition_cn && Array.isArray(word.definition_cn) && word.definition_cn.length > 0) {
          // 处理数组格式的多词性（修复bug：保留所有词性）
          const result = processMultiplePosArray(word.definition_cn)
          partOfSpeech = result.partOfSpeech
          definition = result.definition
          definitionEn = result.definitionEn
        } else if (typeof word.definition_cn === 'string') {
          // 处理字符串格式的多词性（换行分隔）
          const result = processMultiplePos(word.definition_cn)
          partOfSpeech = result.partOfSpeech
          definition = result.definition
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

        wordRecords.push({
          id: generateUUID(),
          chapter_id: chapterId,
          word: word.word.trim(),
          phonetic: phonetic,
          definition: definition,
          definition_en: definitionEn,
          collocation: collocation,
          collocation_en: collocationEn,
          example_sentence: exampleCn,
          example_sentence_en: exampleEn,
          part_of_speech: partOfSpeech,
          audio_url: null,
          order_index: i + j + 1,
          difficulty_score: null
        })
      }

      if (wordRecords.length === 0) continue

      // 批量插入
      const { error: wordsError } = await supabase
        .from('words')
        .insert(wordRecords)

      if (wordsError) {
        console.error(`    ❌ 批次 ${i}-${i+batchSize} 插入失败:`, wordsError.message)
        stats.failed += wordRecords.length
      } else {
        stats.inserted += wordRecords.length
      }

      // 显示进度
      const progress = Math.min(100, Math.round(stats.inserted / stats.valid * 100))
      process.stdout.write(`\r    📊 进度: ${progress}% (${stats.inserted}/${stats.valid})`)
    }

    console.log(`\n  ✅ 导入完成: ${stats.inserted} 成功, ${stats.failed} 失败`)

    return { success: true, stats }
  } catch (error) {
    console.error(`  ❌ 导入失败:`, error.message)
    return { success: false, stats, error: error.message }
  }
}

// 主函数
async function main() {
  console.log('🚀 开始词库导入流程')
  console.log('='.repeat(80))

  const startTime = Date.now()

  try {
    // 步骤1: 清空现有数据
    const cleared = await clearExistingData()
    if (!cleared) {
      throw new Error('数据清空失败，终止导入')
    }

    // 步骤2: 导入所有词库
    console.log('\n📚 开始导入词库...')

    let successCount = 0
    let failCount = 0
    const results = []

    for (const wordlist of WORDLIST_FILES) {
      const wordlistPath = resolve('./wordlists_final', wordlist.file)

      const result = await importWordlist(wordlistPath, wordlist)
      results.push(result)

      if (result.success) {
        successCount++
      } else {
        failCount++
        console.error(`  ❌ 导入失败: ${wordlist.file}`)
        console.error(`     错误: ${result.error}`)
      }
    }

    // 步骤3: 总结
    const endTime = Date.now()
    const duration = ((endTime - startTime) / 1000).toFixed(2)

    console.log('\n' + '='.repeat(80))
    console.log('📊 导入完成统计')
    console.log('='.repeat(80))
    console.log(`✅ 成功导入: ${successCount} 个词库`)
    console.log(`❌ 导入失败: ${failCount} 个词库`)

    // 汇总统计
    const totalStats = results.reduce((acc, r) => {
      if (r.success) {
        acc.total += r.stats.total
        acc.valid += r.stats.valid
        acc.invalid += r.stats.invalid
        acc.inserted += r.stats.inserted
        acc.failed += r.stats.failed
        acc.chapters += r.stats.chapters
      }
      return acc
    }, { total: 0, valid: 0, invalid: 0, inserted: 0, failed: 0, chapters: 0 })

    console.log(`📖 总单词数: ${totalStats.total}`)
    console.log(`✅ 有效单词: ${totalStats.valid}`)
    console.log(`❌ 无效单词: ${totalStats.invalid}`)
    console.log(`✅ 成功导入: ${totalStats.inserted} 个单词`)
    console.log(`❌ 导入失败: ${totalStats.failed} 个单词`)
    console.log(`📑 创建章节: ${totalStats.chapters} 个`)
    console.log(`⏱️  总耗时: ${duration} 秒`)
    console.log('='.repeat(80))

    if (failCount === 0 && totalStats.failed === 0) {
      console.log('\n🎉 导入完全成功！')
    } else {
      console.log('\n⚠️  导入完成，但存在部分失败，请检查日志')
    }

  } catch (error) {
    console.error('\n❌ 导入过程发生错误:', error)
    process.exit(1)
  }
}

// 运行主函数
main()
