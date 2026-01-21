/**
 * 使用Free Dictionary API补全KET词库音标（英式和美式）
 *
 * 功能：
 * 1. 补全phonetic（主音标）
 * 2. 补全uk_phonetic（英式音标）
 * 3. 补全us_phonetic（美式音标）
 * 4. 保留中文释义不变
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 从Free Dictionary API获取单词音标
async function getWordPhonetics(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)

    if (!response.ok) {
      if (response.status === 404) {
        return null
      }
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !Array.isArray(data) || data.length === 0) {
      return null
    }

    const entry = data[0]

    // 提取音标（区分英式和美式）
    let mainPhonetic = entry.phonetic || null
    let ukPhonetic = null
    let usPhonetic = null

    if (entry.phonetics && entry.phonetics.length > 0) {
      for (const phonetic of entry.phonetics) {
        if (!phonetic.text) continue

        // 简单判断：包含ɑː通常是英式，ɑ通常是美式
        if (phonetic.text.includes('ɑː')) {
          ukPhonetic = phonetic.text
        } else if (phonetic.text.includes('ɑ') && !phonetic.text.includes('ɑː')) {
          usPhonetic = phonetic.text
        }

        // 如果还没有，就先用第一个
        if (!ukPhonetic) ukPhonetic = phonetic.text
        if (!usPhonetic) usPhonetic = phonetic.text
      }
    }

    // 如果主音标存在且没有找到区分的，两个都用主音标
    if (mainPhonetic && !ukPhonetic) ukPhonetic = mainPhonetic
    if (mainPhonetic && !usPhonetic) usPhonetic = mainPhonetic

    // 如果都没有，用ukPhonetic
    if (!mainPhonetic && ukPhonetic) mainPhonetic = ukPhonetic

    return {
      main: mainPhonetic,
      uk: ukPhonetic,
      us: usPhonetic
    }
  } catch (error) {
    console.error(`  ❌ 查询 ${word} 失败:`, error.message)
    return null
  }
}

// 延迟函数（避免API限流）
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🔄 使用Free Dictionary API补全KET词库音标\n')
  console.log('⏱️  预计时间: 520个单词 × 1秒 ≈ 9分钟\n')

  try {
    // 1. 获取KET词库的所有单词
    console.log('📚 查询KET词库...')

    const { data: ketBook } = await supabase
      .from('books')
      .select('id')
      .ilike('title', '%KET%')
      .single()

    if (!ketBook) {
      console.log('❌ 未找到KET词库')
      process.exit(1)
    }

    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')
      .eq('book_id', ketBook.id)

    if (!chapters || chapters.length === 0) {
      console.log('❌ 未找到KET章节')
      process.exit(1)
    }

    const chapterIds = chapters.map(c => c.id)

    const { data: ketWords } = await supabase
      .from('words')
      .select('id, word, phonetic')
      .in('chapter_id', chapterIds)

    console.log(`✅ KET词库有 ${ketWords.length} 个单词\n`)

    // 2. 过滤出需要补全的单词（phonetic为空）
    const wordsToUpdate = ketWords.filter(w => !w.phonetic)

    console.log(`📊 需要补全音标的单词: ${wordsToUpdate.length} 个\n`)

    if (wordsToUpdate.length === 0) {
      console.log('✅ 所有单词都已有音标！')
      process.exit(0)
    }

    // 3. 逐个查询并更新
    let successCount = 0
    let failCount = 0
    let skipCount = 0

    for (let i = 0; i < wordsToUpdate.length; i++) {
      const word = wordsToUpdate[i]

      process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / wordsToUpdate.length * 100)}% (${i + 1}/${wordsToUpdate.length}) - 成功: ${successCount}, 失败: ${failCount}, 跳过: ${skipCount}`)

      const phonetics = await getWordPhonetics(word.word)

      if (phonetics && phonetics.main) {
        // 构建更新对象
        const updates = {}

        // 更新主音标
        if (phonetics.main) updates.phonetic = phonetics.main

        // 如果uk_phonetic和us_phonetic字段存在，也更新
        // 注意：如果字段不存在，Supabase会忽略这些字段
        if (phonetics.uk) updates.uk_phonetic = phonetics.uk
        if (phonetics.us) updates.us_phonetic = phonetics.us

        const { error } = await supabase
          .from('words')
          .update(updates)
          .eq('id', word.id)

        if (!error) {
          successCount++
        } else {
          // 如果是因为字段不存在，只更新主音标
          if (error.message.includes('uk_phonetic') || error.message.includes('us_phonetic')) {
            const { error: error2 } = await supabase
              .from('words')
              .update({ phonetic: phonetics.main })
              .eq('id', word.id)

            if (!error2) {
              successCount++
            } else {
              failCount++
            }
          } else {
            failCount++
          }
        }
      } else if (phonetics === null) {
        // 单词不在字典中
        skipCount++
      } else {
        // 没有音标数据
        skipCount++
      }

      // 延迟，避免API限流（每秒1个请求）
      await delay(1000)
    }

    console.log(`\n\n✅ 更新完成！\n`)
    console.log('📊 统计：')
    console.log(`  成功: ${successCount} 个`)
    console.log(`  失败: ${failCount} 个`)
    console.log(`  跳过: ${skipCount} 个（字典中没有）\n`)

    // 4. 验证几个示例
    console.log('🔍 验证更新结果：\n')

    const { data: samples } = await supabase
      .from('words')
      .select('word, phonetic, uk_phonetic, us_phonetic')
      .in('chapter_id', chapterIds)
      .in('word', ['barbecue', 'chips', 'form', 'chocolate'])
      .limit(5)

    if (samples) {
      samples.forEach((w) => {
        console.log(`${w.word}:`)
        console.log(`  主音标: ${w.phonetic || '(无)'}`)
        console.log(`  英式: ${w.uk_phonetic || '(无)'}`)
        console.log(`  美式: ${w.us_phonetic || '(无)'}`)
        console.log()
      })
    }

    // 统计音标覆盖率
    const { data: allWords } = await supabase
      .from('words')
      .select('phonetic')
      .in('chapter_id', chapterIds)

    const withPhonetic = allWords.filter(w => w.phonetic).length
    console.log(`📊 音标覆盖率: ${withPhonetic}/${allWords.length} (${Math.round(withPhonetic/allWords.length*100)}%)`)

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
