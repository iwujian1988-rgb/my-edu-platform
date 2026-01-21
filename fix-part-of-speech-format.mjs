/**
 * 批量修复 part_of_speech 字段格式
 * 将 "n., vt., vi." 转换为 "n, vt, vi"
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function fixPartOfSpeechFormat() {
  console.log('🔧 开始修复 part_of_speech 字段格式\n')

  // 获取所有带点的记录
  const { data: words, error } = await supabase
    .from('words')
    .select('id, word, part_of_speech')
    .not('part_of_speech', 'is', null)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  // 筛选出需要更新的记录（带点的）
  const toUpdate = words.filter(w => w.part_of_speech && w.part_of_speech.includes('.'))

  console.log(`📊 找到 ${toUpdate.length} 条需要更新的记录\n`)

  // 去除点号的函数
  const removeDots = (pos) => {
    if (!pos) return pos

    // 处理逗号分隔的词性，去除每个词性后面的点
    return pos
      .split(',')
      .map(p => {
        const trimmed = p.trim()
        // 去除结尾的点号
        return trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed
      })
      .join(', ')
  }

  let successCount = 0
  let errorCount = 0
  let skippedCount = 0

  for (let i = 0; i < toUpdate.length; i++) {
    const word = toUpdate[i]
    const oldPos = word.part_of_speech
    const newPos = removeDots(oldPos)

    // 如果没有变化，跳过
    if (oldPos === newPos) {
      skippedCount++
      continue
    }

    process.stdout.write(`\r📊 进度: ${Math.round((i + 1) / toUpdate.length * 100)}% (${i + 1}/${toUpdate.length}) - 成功: ${successCount}, 错误: ${errorCount}, 跳过: ${skippedCount}`)

    try {
      const { error } = await supabase
        .from('words')
        .update({ part_of_speech: newPos })
        .eq('id', word.id)

      if (error) {
        console.error(`\n❌ 更新失败 [${word.word}]:`, error)
        errorCount++
      } else {
        successCount++
      }
    } catch (e) {
      console.error(`\n❌ 更新异常 [${word.word}]:`, e)
      errorCount++
    }
  }

  console.log('\n\n✅ 更新完成！\n')
  console.log('📊 统计：')
  console.log(`  成功: ${successCount} 条`)
  console.log(`  错误: ${errorCount} 条`)
  console.log(`  跳过: ${skippedCount} 条`)

  // 验证几个示例
  console.log('\n🔍 验证示例：\n')
  const samples = ['fork', 'knife', 'cook', 'game', 'ice cream']

  for (const w of samples) {
    const { data } = await supabase
      .from('words')
      .select('word, part_of_speech')
      .eq('word', w)
      .single()

    if (data) {
      console.log(`${data.word}: "${data.part_of_speech}"`)
    }
  }
}

fixPartOfSpeechFormat()
