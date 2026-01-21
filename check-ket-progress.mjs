import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

async function check() {
  const { data: books } = await supabase
    .from('wordbooks')
    .select('id, name')

  console.log('单词书列表:')
  for (const book of books) {
    const { count } = await supabase
      .from('wordbook_words')
      .select('*', { count: 'exact', head: true })
      .eq('wordbook_id', book.id)
    console.log(`  ${book.name}: ${count}个单词`)
  }

  // 找到520个单词的书
  const { data: ketBook } = await supabase
    .from('wordbooks')
    .select('id, name')
    .eq('name', 'KET核心词汇')

  if (ketBook && ketBook.length > 0) {
    const bookId = ketBook[0].id

    const { count: total } = await supabase
      .from('wordbook_words')
      .select('*', { count: 'exact', head: true })
      .eq('wordbook_id', bookId)

    const { data: wbWords } = await supabase
      .from('wordbook_words')
      .select('word_id')
      .eq('wordbook_id', bookId)

    const wordIds = wbWords.map(w => w.word_id)

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
    console.log('KET核心词汇:')
    console.log('  总数:', total)
    console.log('  高质量:', high)
    console.log('  进度: ' + ((high / total) * 100).toFixed(1) + '%')
    console.log('  待处理:', total - high)
  }
}
check()
