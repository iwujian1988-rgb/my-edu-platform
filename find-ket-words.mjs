import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const ketBookId = 'd6db96cf-080d-4294-9eea-63813bfc4227'

async function check() {
  // 尝试不同的表名
  const tables = ['book_words', 'books_words', 'word_books', 'vocabulary_book_words']

  for (const table of tables) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true })
      .eq('book_id', ketBookId)

    console.log(`${table}: ${count} (error: ${error?.message || 'none'})`)
  }

  // 查看words表中有多少KET单词
  const { data: ketWords } = await supabase
    .from('words')
    .select('id, word')
    .ilike('source', '%ket%')

  console.log(`\nwords表中KET单词: ${ketWords?.length || 0}`)

  // 查询book_words表的所有数据看看结构
  const { data: bwSample } = await supabase
    .from('book_words')
    .select('*')
    .limit(2)

  console.log('\nbook_words表结构示例:')
  console.log(JSON.stringify(bwSample, null, 2))
}
check()
