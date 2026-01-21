import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

async function check() {
  // 查看words表中有哪些不同的difficulty_level
  const { data: levels } = await supabase
    .from('words')
    .select('difficulty_level')
    .not('difficulty_level', 'is', null)
    .limit(1000)

  if (levels) {
    const uniqueLevels = [...new Set(levels.map(l => l.difficulty_level))]
    console.log('所有难度级别:', uniqueLevels)
  }

  // 查看KET单词书设置
  const { data: ketBook } = await supabase
    .from('books')
    .select('*')
    .ilike('title', '%ket%')

  console.log('')
  console.log('KET书设置:')
  console.log(JSON.stringify(ketBook, null, 2))

  // 查看是否有520个单词的记录
  const { count: total } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })

  console.log('')
  console.log('words表总单词数:', total)
}
check()
