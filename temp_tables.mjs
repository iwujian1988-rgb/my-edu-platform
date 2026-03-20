import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 尝试不同的表名
  const tables = ['books', 'word_books', 'vocab_books', 'packages']
  
  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('id, title, name')
      .limit(1)
    
    if (!error) {
      console.log(`表 ${table} 存在:`, data)
    }
  }
  
  // 查看代码中使用的表名
  console.log('\n检查代码中的表名...')
}

main().catch(console.error)
