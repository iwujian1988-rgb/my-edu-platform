import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rmxmynnpfrbckzhgmvsh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteG15bm5wZnJiY2t6aGdtdnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMzIwNDUsImV4cCI6MjA0MjgwODA0NX0.DLfj99mP2Am9Kl1u8e0VqQh0Cn0FSm--L0j0xF2MXxc'
)

async function main() {
  // 1. 总单词数
  const { count: totalWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
  
  // 2. 有例句的单词数 (examples 不为空)
  const { count: withExamples } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .not('examples', 'is', null)
    .neq('examples', '[]')
    .neq('examples', '')
  
  // 3. 没有例句的单词数
  const needExamples = totalWords - withExamples
  
  // 4. 获取需要补充的单词样本
  const { data: needExamplesWords } = await supabase
    .from('words')
    .select('id, word, book_id, examples, pos')
    .or('examples.is.null,examples.eq.[]', { referencedTable: 'words' })
    .limit(20)
  
  // 5. 按词书统计需要补充的数量
  const { data: bookStats } = await supabase
    .rpc('execute_sql', {
      query: `
        SELECT 
          wb.title as book_title,
          COUNT(w.id) as total,
          COUNT(w.examples) FILTER (WHERE w.examples IS NOT NULL AND w.examples != '[]' AND w.examples != '') as has_examples
        FROM words w
        JOIN word_books wb ON w.book_id = wb.id
        GROUP BY wb.title
        ORDER BY total DESC
        LIMIT 20
      `
    })
  
  console.log('=== 例句补充统计 ===')
  console.log(`总单词数: ${totalWords}`)
  console.log(`已有例句: ${withExamples}`)
  console.log(`需要补充: ${needExamples}`)
  console.log(`完成率: ${((withExamples/totalWords)*100).toFixed(2)}%`)
  console.log('\n=== 需要补充的单词样本 ===')
  console.log(JSON.stringify(needExamplesWords, null, 2))
}

main().catch(console.error)
