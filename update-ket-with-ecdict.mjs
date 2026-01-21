/**
 * 用ECDICT数据更新KET词库
 *
 * 功能：
 * 1. 从ECDICT中查找KET词库的单词
 * 2. 补全缺失的字段：phonetic, definition, definition_en等
 * 3. 更新数据库
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, existsSync } from 'fs'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  console.log('🔄 开始用ECDICT更新KET词库\n')

  try {
    // 1. 读取ECDICT数据
    if (!existsSync('./stardict.csv')) {
      console.log('❌ 未找到 stardict.csv 文件')
      console.log('请先运行: node parse-ecdict.mjs')
      process.exit(1)
    }

    console.log('📖 读取ECDICT数据...')
    const content = readFileSync('./stardict.csv', 'utf-8')
    const lines = content.split('\n').filter(line => line.trim())

    // 构建单词->ECDICT数据映射
    const ecdictMap = new Map()

    for (const line of lines) {
      // Handle CSV quotes properly
      const fields = []
      let current = ''
      let inQuotes = false

      for (let j = 0; j < line.length; j++) {
        const char = line[j]
        if (char === '"') {
          inQuotes = !inQuotes
        } else if (char === ',' && !inQuotes) {
          fields.push(current)
          current = ''
        } else {
          current += char
        }
      }
      fields.push(current)

      // ECDICT format: word,phonetic,definition,translation,pos,...
      if (fields.length >= 4) {
        const word = fields[0]
        const phonetic = fields[1]
        const definitionEn = fields[2]
        const translationCn = fields[3]

        if (word && word !== 'word') {
          ecdictMap.set(word, {
            phonetic: phonetic || null,
            definition_en: definitionEn || null,
            definition_cn: translationCn || null
          })
        }
      }
    }

    console.log(`✅ 加载了 ${ecdictMap.size} 个ECDICT单词\n`)

    // 2. 查询KET词库的所有单词
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

    console.log(`✅ 找到KET词库: ${ketBook.id}\n`)

    const { data: ketWords, error: wordsError } = await supabase
      .from('words')
      .select('id, word, phonetic, definition, definition_en')
      .eq('book_id', ketBook.id) // 注意：这里需要通过chapter_id关联

    // 由于words表没有直接的book_id，需要通过chapters关联
    const { data: chapters } = await supabase
      .from('chapters')
      .select('id')

    if (chapters && chapters.length > 0) {
      const chapterIds = chapters.map(c => c.id)

      const { data: ketWords2 } = await supabase
        .from('words')
        .select('id, word, phonetic, definition, definition_en')
        .in('chapter_id', chapterIds)

      console.log(`✅ KET词库有 ${ketWords2?.length || 0} 个单词\n`)

      // 3. 匹配并更新
      let updateCount = 0
      let phoneticAddCount = 0
      let definitionAddCount = 0
      let definitionEnAddCount = 0
      const batchSize = 100

      console.log('🔄 开始更新KET词库字段...\n')

      const wordsToUpdate = []

      for (const word of ketWords2 || []) {
        const ecdictData = ecdictMap.get(word.word)

        if (ecdictData) {
          const updates = {}
          let needUpdate = false

          // 检查并补全音标
          if (!word.phonetic && ecdictData.phonetic) {
            updates.phonetic = ecdictData.phonetic
            needUpdate = true
            phoneticAddCount++
          }

          // 检查并补全英文释义
          if (!word.definition_en && ecdictData.definition_en) {
            updates.definition_en = ecdictData.definition_en
            needUpdate = true
            definitionEnAddCount++
          }

          // 检查并补全中文释义（如果为空或很短）
          if ((!word.definition || word.definition.length < 10) && ecdictData.definition_cn) {
            updates.definition = ecdictData.definition_cn
            needUpdate = true
            definitionAddCount++
          }

          if (needUpdate) {
            wordsToUpdate.push({
              id: word.id,
              ...updates
            })
          }
        }
      }

      // 批量更新
      console.log(`📝 准备更新 ${wordsToUpdate.length} 个单词...`)

      for (let i = 0; i < wordsToUpdate.length; i += batchSize) {
        const batch = wordsToUpdate.slice(i, i + batchSize)

        for (const record of batch) {
          const { error } = await supabase
            .from('words')
            .update({
              phonetic: record.phonetic,
              definition_en: record.definition_en,
              definition: record.definition
            })
            .eq('id', record.id)

          if (!error) {
            updateCount++
          } else {
            console.error(`  ❌ 更新失败 ${record.id}:`, error.message)
          }
        }

        const progress = Math.min(100, Math.round((i + batchSize) / wordsToUpdate.length * 100))
        process.stdout.write(`\r📊 进度: ${progress}% (${Math.min(i + batchSize, wordsToUpdate.length)}/${wordsToUpdate.length})`)
      }

      console.log(`\n\n✅ 更新完成！\n`)
      console.log('📊 统计：')
      console.log(`  总更新: ${updateCount} 个单词`)
      console.log(`  新增音标: ${phoneticAddCount} 个`)
      console.log(`  新增英文释义: ${definitionEnAddCount} 个`)
      console.log(`  补全中文释义: ${definitionAddCount} 个\n`)

      // 4. 验证几个示例
      console.log('🔍 验证更新结果：\n')

      const { data: samples } = await supabase
        .from('words')
        .select('word, phonetic, definition, definition_en')
        .in('chapter_id', chapterIds)
        .limit(5)

      if (samples) {
        samples.forEach((w, i) => {
          console.log(`${i + 1}. ${w.word}`)
          console.log(`   音标: ${w.phonetic || '(空)'}`)
          console.log(`   中文: ${w.definition?.substring(0, 50) || '(空)'}...`)
          console.log(`   英文: ${w.definition_en?.substring(0, 50) || '(空)'}...`)
          console.log()
        })
      }
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
