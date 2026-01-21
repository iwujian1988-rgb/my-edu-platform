/**
 * 用ECDICT的中文释义替换KET词库
 *
 * 功能：
 * 1. 下载ECDICT数据
 * 2. 用ECDICT的translation字段替换KET词库的definition字段
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { execSync } from 'child_process'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function downloadECDICT() {
  console.log('📥 检查ECDICT数据...')

  if (existsSync('./ecdict.csv')) {
    console.log('✅ ecdict.csv 已存在')
    return
  }

  throw new Error('ecdict.csv 文件未找到，请先下载')
}

async function main() {
  console.log('🔄 用ECDICT中文释义替换KET词库\n')

  try {
    // 1. 下载ECDICT
    await downloadECDICT()

    // 2. 读取ECDICT数据
    console.log('📖 读取ECDICT数据...')
    const content = readFileSync('./ecdict.csv', 'utf-8')
    const lines = content.split('\n').filter(l => l.trim())

    // 构建单词 -> 中文释义映射
    const ecdictMap = new Map()

    for (const line of lines) {
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

      if (fields.length >= 4) {
        const word = fields[0]
        const translation = fields[3] // 中文释义

        if (word && word !== 'word') {
          ecdictMap.set(word, translation || null)
        }
      }
    }

    console.log(`✅ 加载了 ${ecdictMap.size} 个ECDICT单词\n`)

    // 3. 查询KET词库
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
      .select('id, word, definition')
      .in('chapter_id', chapterIds)

    console.log(`✅ KET词库有 ${ketWords.length} 个单词\n`)

    // 4. 替换中文释义
    let replaceCount = 0
    const batchSize = 100

    console.log('🔄 开始替换中文释义...\n')

    const wordsToUpdate = []

    for (const word of ketWords) {
      const ecdictCn = ecdictMap.get(word.word)

      if (ecdictCn && ecdictCn !== word.definition) {
        wordsToUpdate.push({
          id: word.id,
          definition: ecdictCn
        })
      }
    }

    console.log(`📝 准备替换 ${wordsToUpdate.length} 个单词的中文释义...`)

    // 批量更新
    for (let i = 0; i < wordsToUpdate.length; i += batchSize) {
      const batch = wordsToUpdate.slice(i, i + batchSize)

      for (const record of batch) {
        const { error } = await supabase
          .from('words')
          .update({ definition: record.definition })
          .eq('id', record.id)

        if (!error) {
          replaceCount++
        } else {
          console.error(`  ❌ 更新失败 ${record.id}:`, error.message)
        }
      }

      const progress = Math.min(100, Math.round((i + batchSize) / wordsToUpdate.length * 100))
      process.stdout.write(`\r📊 进度: ${progress}% (${Math.min(i + batchSize, wordsToUpdate.length)}/${wordsToUpdate.length})`)
    }

    console.log(`\n\n✅ 替换完成！`)
    console.log(`📊 统计：替换了 ${replaceCount} 个单词的中文释义\n`)

    // 5. 验证几个示例
    console.log('🔍 验证替换结果：\n')

    const { data: samples } = await supabase
      .from('words')
      .select('word, definition')
      .in('chapter_id', chapterIds)
      .limit(5)

    if (samples) {
      samples.forEach((w, i) => {
        console.log(`${i + 1}. ${w.word}`)
        console.log(`   中文: ${w.definition?.substring(0, 60) || '(无)'}...`)
        console.log()
      })
    }

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
    process.exit(1)
  }
}

main()
