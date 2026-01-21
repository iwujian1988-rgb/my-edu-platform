import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

async function check() {
  const { data: books, error } = await supabase
    .from('books')
    .select('id, name')

  console.log('Error:', error)
  console.log('Books:', books?.length || 0)

  if (books) {
    console.log('')
    console.log('所有单词书:')
    for (const book of books) {
      const { count } = await supabase
        .from('book_words')
        .select('*', { count: 'exact', head: true })
        .eq('book_id', book.id)
      console.log(`  ${book.name}: ${count}个`)
    }
  }
}
check()
