import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const ketBookId = 'd6db96cf-080d-4294-9eea-63813bfc4227'

async function check() {
  // 查看chapters表
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title')
    .eq('book_id', ketBookId)

  console.log(`KET书的章节数: ${chapters?.length || 0}`)

  const chapterIds = chapters.map(c => c.id)

  // 查询chapter_words
  const { data: cw } = await supabase
    .from('chapter_words')
    .select('word_id, chapter_id')
    .in('chapter_id', chapterIds)

  console.log(`KET书的总单词数: ${cw?.length || 0}`)

  const wordIds = [...new Set(cw.map(w => w.word_id))]

  // 查询高质量单词数
  const { count: high } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .in('id', wordIds)
    .not('example_sentence_en', 'is', null)
    .not('definition_en', 'is', null)
    .not('collocation_en', 'is', null)
    .not('definition_en', 'eq', 'related concept or action')
    .not('example_sentence_en', 'eq', 'This is a...')

  console.log('')
  console.log('KET核心词汇质量报告:')
  console.log(`  总数: ${wordIds.length}`)
  console.log(`  高质量: ${high}`)
  console.log(`  进度: ${((high / wordIds.length) * 100).toFixed(1)}%`)
  console.log(`  待处理: ${wordIds.length - high}`)

  // 查询低质量单词
  const { data: low } = await supabase
    .from('words')
    .select('word')
    .in('id', wordIds)
    .or('collocation_en.is.null,example_sentence_en.is.null,definition_en.is.null,definition_en.eq.related concept or action')

  console.log('')
  console.log(`待处理单词: ${low.length}个`)
  console.log(low.map(w => w.word).slice(0, 30).join(', '))
}
check()
