/**
 * 使用Free Dictionary API补全KET词库
 *
 * 策略：
 * 1. 中文释义：保留ECDICT数据（不动）
 * 2. 英文释义：用Free Dictionary API替换（更完整，包含所有词性）
 * 3. 音标：区分英式和美式（uk_phonetic, us_phonetic）
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
    let ukPhonetic = null
    let usPhonetic = null

    if (entry.phonetics && entry.phonetics.length > 0) {
      for (const phonetic of entry.phonetics) {
        if (phonetic.text) {
          // 简单判断：包含ɑː通常是英式，ɑ通常是美式
          if (phonetic.text.includes('ɑː') && !ukPhonetic) {
            ukPhonetic = phonetic.text
          } else if (phonetic.text.includes('ɑ') && !phonetic.text.includes('ɑː') && !usPhonetic) {
            usPhonetic = phonetic.text
          }

          // 如果还没有，就先用第一个
          if (!ukPhonetic) ukPhonetic = phonetic.text
          if (!usPhonetic) usPhonetic = phonetic.text
        }
      }
    }

    // 如果主音标存在且没有找到区分的，两个都用主音标
    if (entry.phonetic && !ukPhonetic) ukPhonetic = entry.phonetic
    if (entry.phonetic && !usPhonetic) usPhonetic = entry.phonetic

    // 提取所有词性的英文定义
    const meanings = entry.meanings || []
    const definitionsByPos = {}

    for (const meaning of meanings) {
      const pos = meaning.partOfSpeech // "noun", "verb", etc.
      const definitions = meaning.definitions || []

      // 转换词性标记
      const posShort = posToShort(pos)

      if (posShort) {
        // 只取前2个定义（避免太长）
        definitionsByPos[posShort] = definitions.slice(0, 2).map(d => d.definition)
      }
    }

    return {
      ukPhonetic,
      usPhonetic,
      definitions: definitionsByPos
    }
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

// 延迟函数（避免API限流）
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function main() {
  console.log('🔄 使用Free Dictionary API统一补全KET词库\n')
  console.log('⏱️  预计时间: 520个单词 × 1秒 ≈ 9分钟\n')

  try {
    // 1. 先运行数据库迁移
    console.log('📊 运行数据库迁移...')
    console.log('请手动运行: npx supabase db push')
    console.log('或跳过迁移，继续更新现有字段\n')

    // 2. 获取KET词库的所有单词
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

    console.log(`✅ KET词库有 ${ketWords.length} 个单词\n`)

    // 3. 逐个查询并更新
    let successCount = 0
    let failCount = 0
    let skipCount = 0

    for (let i = 0; i < ketWords.length; i++) {
      const word = ketWords[i]

      process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / ketWords.length * 100)}% (${i + 1}/${ketWords.length}) - 成功: ${successCount}, 失败: ${failCount}, 跳过: ${skipCount}`)

      const apiData = await getWordFromDictionary(word.word)

      if (apiData) {
        // 构建英文释义（按词性组织）
        const definitionParts = []

        // 按词性排序：n., v., vt., vi., adj., adv., ...
        const posOrder = ['n.', 'v.', 'vt.', 'vi.', 'adj.', 'adv.', 'prep.', 'pron.', 'conj.', 'int.']

        for (const pos of posOrder) {
          if (apiData.definitions[pos]) {
            for (const def of apiData.definitions[pos]) {
              definitionParts.push(`${pos} ${def}`)
            }
          }
        }

        const definitionEn = definitionParts.join('\\n')

        // 更新数据库
        const updates = {}

        // 如果有uk_phonetic和us_phonetic字段，就更新
        if (apiData.ukPhonetic) updates.uk_phonetic = apiData.ukPhonetic
        if (apiData.usPhonetic) updates.us_phonetic = apiData.usPhonetic

        // 如果有英文释义，就更新
        if (definitionEn) updates.definition_en = definitionEn

        // 如果phonetic为空，用主音标填充
        if (apiData.ukPhonetic) updates.phonetic = apiData.ukPhonetic

        const { error } = await supabase
          .from('words')
          .update(updates)
          .eq('id', word.id)

        if (!error) {
          successCount++
        } else {
          failCount++
          console.error(`  ❌ 更新失败 ${word.word}:`, error.message)
        }
      } else if (apiData === null) {
        // 单词不在字典中，保留现有数据
        skipCount++
      } else {
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

    // 4. 验证几个示例
    console.log('🔍 验证更新结果：\n')

    const { data: samples } = await supabase
      .from('words')
      .select('word, phonetic, uk_phonetic, us_phonetic, definition_en')
      .in('chapter_id', chapterIds)
      .in('word', ['barbecue', 'chips', 'form', 'colleague'])
      .limit(5)

    if (samples) {
      samples.forEach((w) => {
        console.log(`${w.word}:`)
        console.log(`  主音标: ${w.phonetic || '(无)'}`)
        console.log(`  英式音标: ${w.uk_phonetic || '(无)'}`)
        console.log(`  美式音标: ${w.us_phonetic || '(无)'}`)
        if (w.definition_en) {
          const defs = w.definition_en.split('\\n')
          defs.slice(0, 3).forEach(d => console.log(`  ${d}`))
          if (defs.length > 3) console.log(`  ... (共${defs.length}条)`)
        }
        console.log()
      })
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
