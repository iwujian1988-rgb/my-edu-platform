/**
 * 获取完整的单词数据结构示例
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function getWordExamples() {
  console.log('📋 获取完整单词数据结构示例\n')
  console.log('='.repeat(100))

  // 查询单词性单词
  const { data: singlePosWords, error: error1 } = await supabase
    .from('words')
    .select('*')
    .eq('word', 'accident')
    .limit(1)

  if (error1) {
    console.error('❌ 查询单词性单词失败:', error1.message)
    return
  }

  // 查询多词性单词
  const { data: multiPosWords, error: error2 } = await supabase
    .from('words')
    .select('*')
    .eq('word', 'book')
    .limit(1)

  if (error2) {
    console.error('❌ 查询多词性单词失败:', error2.message)
    return
  }

  // 如果没有找到book，查询其他多词性单词
  let multiPosWord = multiPosWords?.[0]
  if (!multiPosWord) {
    const { data } = await supabase
      .from('words')
      .select('*')
      .ilike('definition', '【n】%【v】%')
      .limit(1)

    multiPosWord = data?.[0]
  }

  console.log('\n\n📖 示例1: 单词性单词 (accident)')
  console.log('='.repeat(100))
  console.log(JSON.stringify(singlePosWords?.[0], null, 2))

  console.log('\n\n📖 示例2: 多词性单词 (' + (multiPosWord?.word || 'cork') + ')')
  console.log('='.repeat(100))
  console.log(JSON.stringify(multiPosWord, null, 2))

  console.log('\n\n' + '='.repeat(100))
  console.log('\n✅ 数据结构说明:')
  console.log('-'.repeat(100))
  console.log('id:              单词唯一标识 (UUID)')
  console.log('chapter_id:      所属章节ID (UUID，可为null)')
  console.log('word:            单词拼写')
  console.log('phonetic:        音标（可为null）')
  console.log('definition:      中文释义（多词性格式：【词性】释义）')
  console.log('definition_en:   英文释义（多词性格式：【词性】释义）')
  console.log('collocation:     搭配（中文）')
  console.log('collocation_en:  搭配（英文）')
  console.log('example_sentence:    例句（中文）')
  console.log('example_sentence_en: 例句（英文）')
  console.log('part_of_speech:  词性（多词性用逗号分隔：n, v, adj）')
  console.log('audio_url:       音频URL（可为null）')
  console.log('order_index:     排序索引')
  console.log('difficulty_score:   难度分数（可为null）')
  console.log('created_at:      创建时间')
  console.log('\n')
}

getWordExamples()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ 错误:', err)
    process.exit(1)
  })
