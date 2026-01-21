/**
 * 使用Free Dictionary API补全KET词库英文释义
 *
 * 功能：
 * 1. 查找中文释义有多个词性，但英文释义词性不全的单词
 * 2. 使用Free Dictionary API获取完整英文释义
 * 3. 合并ECDICT和API的结果
 * 4. 更新数据库
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
    const meanings = entry.meanings || []

    // 提取所有词性的定义
    const definitionsByPos = {}

    for (const meaning of meanings) {
      const pos = meaning.partOfSpeech // e.g., "noun", "verb"
      const definitions = meaning.definitions || []

      // 转换词性标记：noun -> n., verb -> v., etc.
      const posShort = posToShort(pos)

      if (posShort) {
        definitionsByPos[posShort] = definitions.slice(0, 2).map(d => d.definition)
      }
    }

    return definitionsByPos
  } catch (error) {
    console.error(`  ❌ 查询 ${word} 失败:`, error.message)
    return null
  }
}

// 词性转换：noun -> n., verb -> v., etc.
function posToShort(pos) {
  const posMap = {
    'noun': 'n.',
    'verb': 'v.',
    'transitive verb': 'vt.',
    'intransitive verb': 'vi.',
    'adjective': 'adj.',
    'adverb': 'adv.',
    'pronoun': 'pron.',
    'preposition': 'prep.',
    'conjunction': 'conj.',
    'interjection': 'int.',
    'article': 'art.',
    'numeral': 'num.'
  }

  return posMap[pos.toLowerCase()] || null
}

// 解析中文释义中的词性列表
function extractPosFromCn(definitionCn) {
  if (!definitionCn) return []

  const lines = definitionCn.split('\\n').filter(line => line.trim())
  const posList = []

  for (const line of lines) {
    const match = line.match(/^([a-z]{1,4}\.)\s*/i)
    if (match) {
      const pos = match[1].toLowerCase()
      if (!posList.includes(pos)) {
        posList.push(pos)
      }
    }
  }

  return posList
}

// 解析英文释义中的词性列表
function extractPosFromEn(definitionEn) {
  if (!definitionEn) return []

  const lines = definitionEn.split('\\n').filter(line => line.trim())
  const posList = []

  for (const line of lines) {
    const match = line.match(/^([a-z]{1,4}\.)\s*/i)
    if (match) {
      const pos = match[1].toLowerCase()
      if (!posList.includes(pos)) {
        posList.push(pos)
      }
    }
  }

  return posList
}

// 延迟函数（避免API限流）
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🔄 使用Free Dictionary API补全KET词库英文释义\\n')

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

    const chapterIds = chapters.map(c => c.id)

    const { data: ketWords } = await supabase
      .from('words')
      .select('id, word, definition, definition_en')
      .in('chapter_id', chapterIds)

    console.log(`✅ KET词库有 ${ketWords.length} 个单词\\n`)

    // 2. 找出需要补全的单词（中文有多个词性，但英文词性不全）
    console.log('🔍 查找需要补全的单词...\\n')

    const wordsToUpdate = []

    for (const word of ketWords) {
      const cnPosList = extractPosFromCn(word.definition)
      const enPosList = extractPosFromEn(word.definition_en)

      // 检查中文词性是否多于英文词性
      if (cnPosList.length > enPosList.length) {
        const missingPos = cnPosList.filter(pos => !enPosList.includes(pos))
        if (missingPos.length > 0) {
          wordsToUpdate.push({
            id: word.id,
            word: word.word,
            currentDefinitionEn: word.definition_en,
            cnPosList,
            enPosList,
            missingPos
          })
        }
      }
    }

    console.log(`✅ 找到 ${wordsToUpdate.length} 个需要补全的单词\\n`)

    if (wordsToUpdate.length === 0) {
      console.log('✅ 所有单词的英文释义都已完整！')
      process.exit(0)
    }

    // 3. 逐个查询并更新
    let successCount = 0
    let failCount = 0
    let skipCount = 0

    for (let i = 0; i < wordsToUpdate.length; i++) {
      const wordInfo = wordsToUpdate[i]

      process.stdout.write(`\\r📊 进度: ${Math.round((i + 1) / wordsToUpdate.length * 100)}% (${i + 1}/${wordsToUpdate.length}) - 成功: ${successCount}, 失败: ${failCount}, 跳过: ${skipCount}`)

      const apiData = await getWordFromDictionary(wordInfo.word)

      if (apiData && Object.keys(apiData).length > 0) {
        // 合并现有英文释义和API数据
        const existingDefs = wordInfo.currentDefinitionEn.split('\\n').filter(d => d.trim())
        const newDefs = []

        // 保留现有的英文释义
        for (const def of existingDefs) {
          newDefs.push(def)
        }

        // 添加API获取的新释义（只添加缺失的词性）
        for (const pos of wordInfo.missingPos) {
          if (apiData[pos]) {
            for (const def of apiData[pos]) {
              newDefs.push(`${pos} ${def}`)
            }
          }
        }

        // 更新数据库
        const { error } = await supabase
          .from('words')
          .update({
            definition_en: newDefs.join('\\n')
          })
          .eq('id', wordInfo.id)

        if (!error) {
          successCount++
        } else {
          failCount++
        }
      } else if (apiData === null) {
        // 单词不在字典中
        skipCount++
      } else {
        // API没有返回新数据
        skipCount++
      }

      // 延迟，避免API限流（每秒1个请求）
      await delay(1000)
    }

    console.log(`\\n\\n✅ 更新完成！\\n`)
    console.log('📊 统计：')
    console.log(`  成功: ${successCount} 个`)
    console.log(`  失败: ${failCount} 个`)
    console.log(`  跳过: ${skipCount} 个（字典中没有或无新数据）\\n`)

    // 4. 验证几个示例
    console.log('🔍 验证更新结果：\\n')

    const { data: samples } = await supabase
      .from('words')
      .select('word, definition_en')
      .in('chapter_id', chapterIds)
      .in('word', ['barbecue', 'chips', 'form'])
      .limit(5)

    if (samples) {
      samples.forEach((w) => {
        console.log(`${w.word}:`)
        const defs = w.definition_en.split('\\n')
        defs.forEach((d) => console.log(`  ${d}`))
        console.log()
      })
    }

  } catch (error) {
    console.error('\\n❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
