/**
 * 重新导入KET词库（验证词性提取修复）
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

// 处理多词性释义
function processMultiplePos(inputDef) {
  if (typeof inputDef !== 'string') {
    return { partOfSpeech: '', definition: '' }
  }

  const parts = inputDef.split('\n').filter(p => p.trim())

  if (parts.length === 0) {
    return { partOfSpeech: '', definition: inputDef }
  }

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

  const posList = []
  const defList = []

  for (const part of parts) {
    const match = part.match(/^([a-z]{1,4}\.)\s*/)
    if (match) {
      posList.push(match[1])
      defList.push(part.substring(match[0].length).trim())
    } else {
      if (defList.length > 0) {
        defList[defList.length - 1] += '；' + part.trim()
      } else {
        defList.push(part.trim())
      }
    }
  }

  const partOfSpeech = posList.join(', ')
  const formattedDef = defList.map((def, i) => `【${posList[i]}】${def}`).join('')

  return { partOfSpeech, definition: formattedDef }
}

async function reimportKET() {
  console.log('🔄 重新导入KET词库（验证词性提取修复）\n')

  try {
    // 1. 查找现有的KET词库
    console.log('1️⃣ 查找现有KET词库...')
    const { data: existingBooks, error: findError } = await supabase
      .from('books')
      .select('id, title')
      .ilike('title', '%KET%')

    if (findError) {
      console.error('❌ 查找词库失败:', findError.message)
      return
    }

    if (existingBooks && existingBooks.length > 0) {
      console.log(`找到 ${existingBooks.length} 个KET词库，准备删除...`)

      for (const book of existingBooks) {
        console.log(`  删除: ${book.title} (${book.id})`)

        // 先查询章节ID
        const { data: chapters } = await supabase
          .from('chapters')
          .select('id')
          .eq('book_id', book.id)

        if (chapters && chapters.length > 0) {
          const chapterIds = chapters.map(c => c.id)

          // 删除单词
          const { error: wordsError } = await supabase
            .from('words')
            .delete()
            .in('chapter_id', chapterIds)

          if (wordsError) console.error('    ❌ 删除单词失败:', wordsError.message)
        }

        // 删除章节
        const { error: chaptersError } = await supabase
          .from('chapters')
          .delete()
          .eq('book_id', book.id)

        // 删除词库
        const { error: bookError } = await supabase
          .from('books')
          .delete()
          .eq('id', book.id)

        if (chaptersError) console.error('    ❌ 删除章节失败:', chaptersError.message)
        if (bookError) console.error('    ❌ 删除词库失败:', bookError.message)
      }
      console.log('✅ 旧数据已删除\n')
    } else {
      console.log('未找到现有KET词库\n')
    }

    // 2. 读取KET文件
    console.log('2️⃣ 读取KET词库文件...')
    const filePath = resolve('./wordlists_final', '14天攻克KET核心词汇.json')
    const jsonContent = readFileSync(filePath, 'utf-8')
    const data = JSON.parse(jsonContent)

    console.log(`📚 词库: ${data.title}`)
    console.log(`📊 单词数: ${data.words.length}\n`)

    // 3. 创建词库
    console.log('3️⃣ 创建词库记录...')
    const bookId = generateUUID()
    const { error: bookError } = await supabase
      .from('books')
      .insert({
        id: bookId,
        title: data.title,
        description: '14天攻克KET核心词汇',
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
    console.log(`✅ 词库创建成功: ${bookId}\n`)

    // 4. 创建章节
    console.log('4️⃣ 创建章节...')
    const chaptersSet = new Set()
    data.words.forEach(w => {
      if (w.chapter && Array.isArray(w.chapter)) {
        w.chapter.forEach(ch => chaptersSet.add(ch))
      }
    })

    const sortedChapters = Array.from(chaptersSet).sort()
    const chapterMap = new Map()

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
    console.log(`✅ 创建了 ${chapterMap.size} 个章节\n`)

    // 5. 导入单词（带词性提取）
    console.log('5️⃣ 导入单词...')
    let successCount = 0
    let errorCount = 0
    const samples = [] // 保存前5个样本

    for (let i = 0; i < data.words.length; i++) {
      const word = data.words[i]

      // 处理中文释义（带多词性提取）
      let definition = ''
      let partOfSpeech = ''

      if (typeof word.definition_cn === 'string') {
        const result = processMultiplePos(word.definition_cn)
        partOfSpeech = result.partOfSpeech
        definition = result.definition
      }

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
        definition: definition,
        definition_en: '',
        collocation: '',
        collocation_en: '',
        example_sentence: '',
        example_sentence_en: '',
        part_of_speech: partOfSpeech,
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
        // 保存前5个作为样本
        if (samples.length < 5) {
          samples.push({
            word: word.word,
            part_of_speech: partOfSpeech,
            definition: definition
          })
        }
      }

      if ((i + 1) % 50 === 0) {
        process.stdout.write(`\r📊 进度: ${Math.round(successCount/data.words.length*100)}% (${successCount}/${data.words.length})`)
      }
    }

    console.log(`\n\n✅ 导入完成: ${successCount} 成功, ${errorCount} 失败`)

    // 6. 显示样本验证
    console.log('\n6️⃣ 验证词性提取（前5个单词）:')
    console.log('─'.repeat(80))
    samples.forEach((s, i) => {
      console.log(`${i+1}. ${s.word}`)
      console.log(`   词性: ${s.part_of_speech || '(无)'}`)
      console.log(`   释义: ${s.definition}`)
      console.log()
    })

    // 7. 特别验证 chips
    console.log('7️⃣ 特别验证 "chips":')
    const chipsSample = samples.find(s => s.word.toLowerCase() === 'chips')
    if (chipsSample) {
      console.log(`✅ 找到 chips`)
      console.log(`   词性: ${chipsSample.part_of_speech || '(无)'}`)
      console.log(`   释义: ${chipsSample.definition}`)
      if (chipsSample.part_of_speech === 'n.' && !chipsSample.definition.includes('n.')) {
        console.log(`\n🎉 词性提取成功！`)
      } else {
        console.log(`\n⚠️  词性提取可能有问题`)
      }
    } else {
      // 从数据库查询chips
      const { data: chipsData } = await supabase
        .from('words')
        .select('word, part_of_speech, definition')
        .eq('word', 'chips')
        .eq('chapter_id', chapterMap.values().next().value)
        .single()

      if (chipsData) {
        console.log(`✅ 从数据库找到 chips`)
        console.log(`   词性: ${chipsData.part_of_speech || '(无)'}`)
        console.log(`   释义: ${chipsData.definition}`)
        if (chipsData.part_of_speech === 'n.' && !chipsData.definition.includes('n.')) {
          console.log(`\n🎉 词性提取成功！`)
        } else {
          console.log(`\n⚠️  词性提取可能有问题`)
        }
      } else {
        console.log(`❌ 未找到 chips 单词`)
      }
    }

  } catch (error) {
    console.error('\n❌ 重新导入失败:', error.message)
  }
}

reimportKET()
