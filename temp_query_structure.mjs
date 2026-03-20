import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://snnrjnpcmdsdlyldvvps.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
  // 获取一条记录看看所有字段
  const { data, error } = await supabase
    .from('words')
    .select('*')
    .limit(1)
  
  console.log('=== words 表字段结构 ===')
  if (data && data[0]) {
    console.log('字段列表:', Object.keys(data[0]))
    console.log('\n样本数据:')
    console.log(JSON.stringify(data[0], null, 2))
  } else {
    console.log('error:', error)
  }
}

main().catch(console.error)
