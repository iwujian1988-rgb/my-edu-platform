/**
 * 使用Free Dictionary API补全KET词库音标
 *
 * API: https://api.dictionaryapi.dev/api/v2/entries/en/<word>
 * 完全免费，无需API Key，无限制
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

// 从Free Dictionary API获取单词数据
async function getWordFromDictionary(word) {
  try {
    const response = await fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${word}`)

    if (!response.ok) {
      if (response.status === 404) {
        return null // 单词不存在
      }
      throw new Error(`API error: ${response.status}`)
    }

    const data = await response.json()

    if (!data || !Array.isArray(data) || data.length === 0) {
      return null
    }

    const entry = data[0]
    const phonetic = entry.phonetic || entry.phonetics?.find(p => p.text)?.text || null
    const meanings = entry.meanings || []

    // 提取第一个释义作为英文释义
    const definitionEn = meanings.length > 0
      ? meanings[0].definitions?.[0]?.definition || null
      : null

    return {
      phonetic,
      definition_en: definitionEn
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
  console.log('⏱️  预计时间: 520个单词 × 2秒 ≈ 17分钟\n')

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
      .is('phonetic', null) // 只查询没有音标的单词

    if (!ketWords || ketWords.length === 0) {
      console.log('✅ KET词库所有单词都已有音标！')
      process.exit(0)
    }

    console.log(`✅ 找到 ${ketWords.length} 个没有音标的单词\n`)

    // 2. 逐个查询并更新
    let successCount = 0
    let failCount = 0
    let skipCount = 0

    for (let i = 0; i < ketWords.length; i++) {
      const word = ketWords[i]

      process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / ketWords.length * 100)}% (${i + 1}/${ketWords.length}) - 成功: ${successCount}, 失败: ${failCount}`)

      const dictData = await getWordFromDictionary(word.word)

      if (dictData && dictData.phonetic) {
        // 更新数据库
        const { error } = await supabase
          .from('words')
          .update({
            phonetic: dictData.phonetic,
            ...(dictData.definition_en && { definition_en: dictData.definition_en })
          })
          .eq('id', word.id)

        if (!error) {
          successCount++
        } else {
          failCount++
        }
      } else if (dictData === null) {
        // 单词不在字典中
        skipCount++
      } else {
        // 查询失败
        failCount++
      }

      // 延迟，避免API限流（每秒1个请求）
      await delay(1000)
    }

    console.log(`\n\n✅ 更新完成！\n`)
    console.log('📊 统计：')
    console.log(`  成功: ${successCount} 个`)
    console.log(`  失败: ${failCount} 个`)
    console.log(`  跳过: ${skipCount} 个（字典中没有）\n`)

    // 3. 验证几个示例
    console.log('🔍 验证更新结果：\n')

    const { data: samples } = await supabase
      .from('words')
      .select('word, phonetic')
      .in('chapter_id', chapterIds)
      .not('phonetic', 'is', null)
      .limit(5)

    if (samples) {
      samples.forEach((w, i) => {
        console.log(`${i + 1}. ${w.word} - ${w.phonetic}`)
      })
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
