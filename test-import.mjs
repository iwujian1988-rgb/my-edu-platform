/**
 * 测试导入脚本 - 只导入KET词库（520个单词）
 * 用于验证导入流程是否正常
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0
    const v = c === 'x' ? r : (r & 0x3 | 0x8)
    return v.toString(16)
  })
}

async function testImport() {
  console.log('🧪 测试导入KET词库（520个单词）\n')

  try {
    // 读取KET文件
    const filePath = resolve('./wordlists_final', '14天攻克KET核心词汇.json')
    const jsonContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(jsonContent)

    console.log(`📚 词库: ${data.title}`)
    console.log(`📊 单词数: ${data.words.length}`)

    // 创建词库
    const bookId = generateUUID()
    console.log(`\n1️⃣ 创建词库记录...`)

    const { error: bookError } = await supabase
      .from('books')
      .insert({
        id: bookId,
        title: data.title,
        description: '测试导入 - KET核心词汇',
        category: 'exam',
        is_official: true,
        total_words: 0,
        total_chapters: 0,
        is_published: true,
        difficulty_level: 'beginner',
        language: 'en'
      })

    if (bookError) {
      console.error('❌ 创建词库失败:', bookError.message)
      return
    }
    console.log(`✅ 词库创建成功: ${bookId}`)

    // 创建章节
    const chaptersSet = new Set()
    data.words.forEach(w => {
      if (w.chapter && Array.isArray(w.chapter)) {
        w.chapter.forEach(ch => chaptersSet.add(ch))
      }
    })

    const sortedChapters = Array.from(chaptersSet).sort()
    const chapterMap = new Map()

    console.log(`\n2️⃣ 创建章节 (${sortedChapters.length} 个)...`)

    for (let i = 0; i < sortedChapters.length; i++) {
      const chapterId = generateUUID()
      const { error } = await supabase
        .from('chapters')
        .insert({
          id: chapterId,
          book_id: bookId,
          title: sortedChapters[i],
          order_index: i + 1
        })

      if (!error) {
        chapterMap.set(sortedChapters[i], chapterId)
      }
    }
    console.log(`✅ 创建了 ${chapterMap.size} 个章节`)

    // 导入单词
    console.log(`\n3️⃣ 导入单词...`)

    let successCount = 0
    let errorCount = 0

    for (let i = 0; i < data.words.length; i++) {
      const word = data.words[i]

      // 确定章节ID
      let chapterId = null
      if (word.chapter && Array.isArray(word.chapter) && word.chapter.length > 0) {
        chapterId = chapterMap.get(word.chapter[0]) || null
      }

      const wordRecord = {
        id: generateUUID(),
        chapter_id: chapterId,
        word: word.word,
        phonetic: null,
        definition: typeof word.definition_cn === 'string' ? word.definition_cn : '',
        definition_en: '',
        collocation: '',
        collocation_en: '',
        example_sentence: '',
        example_sentence_en: '',
        part_of_speech: '',
        audio_url: null,
        order_index: i + 1,
        difficulty_score: null
      }

      const { error } = await supabase
        .from('words')
        .insert(wordRecord)

      if (error) {
        errorCount++
      } else {
        successCount++
      }

      if ((i + 1) % 50 === 0) {
        process.stdout.write(`\r📊 进度: ${Math.round(successCount/data.words.length*100)}% (${successCount}/${data.words.length})`)
      }
    }

    console.log(`\n\n✅ 导入完成: ${successCount} 成功, ${errorCount} 失败`)

    // 验证
    console.log(`\n4️⃣ 验证导入结果...`)
    const { count, error: countError } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('chapter_id', chapterMap.values().next().value)

    if (!countError) {
      console.log(`📊 实际导入: ${count} 个单词`)

      if (count === successCount) {
        console.log(`\n🎉 测试成功！可以开始完整导入。`)
      } else {
        console.log(`\n⚠️  实际数量与预期不符，请检查。`)
      }
    }

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
  }
}

testImport()
