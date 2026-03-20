import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://rmxmynnpfrbckzhgmvsh.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJteG15bm5wZnJiY2t6aGdtdnNoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcyMzIwNDUsImV4cCI6MjA0MjgwODA0NX0.DLfj99mP2Am9Kl1u8e0VqQh0Cn0FSm--L0j0xF2MXxc'
)

async function main() {
  // 1. 总单词数
  const { count: totalWords, error: e1 } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
  
  console.log('Total words query:', { totalWords, error: e1 })
  
  // 2. 有例句的单词数
  const { count: withExamples, error: e2 } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .not('examples', 'is', null)
  
  console.log('With examples query:', { withExamples, error: e2 })
  
  // 3. 获取一些样本数据看看 examples 字段的格式
  const { data: sampleWords, error: e3 } = await supabase
    .from('words')
    .select('id, word, examples')
    .limit(10)
  
  console.log('Sample words:', JSON.stringify(sampleWords, null, 2))
  
  // 4. 获取没有例句的单词样本
  const { data: noExamples, error: e4 } = await supabase
    .from('words')
    .select('id, word, examples')
    .is('examples', null)
    .limit(10)
  
  console.log('No examples:', JSON.stringify(noExamples, null, 2))
}

main().catch(console.error)
