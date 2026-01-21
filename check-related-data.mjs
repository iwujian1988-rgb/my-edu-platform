import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

async function check() {
  console.log('【检查用户表的recent_books字段】\n')

  const { data: users } = await supabase
    .from('users')
    .select('id, email, recent_books')
    .limit(10)

  if (users && users.length > 0) {
    for (const user of users) {
      const recent = user.recent_books || []
      const email = user.email || user.id.slice(0, 8)
      console.log(`用户 ${email}:`)
      console.log(`  recent_books: ${recent.length}个`)
      if (recent.length > 0) {
        console.log(`  书籍IDs: ${recent.join(', ')}`)
      }
    }
  } else {
    console.log('没有用户数据')
  }

  console.log('\n【检查错题本数据】')

  const { data: mistakes } = await supabase
    .from('mistakes')
    .select('id, user_id')
    .limit(5)

  console.log(`错题本记录: ${mistakes?.length || 0}条`)

  if (mistakes && mistakes.length > 0) {
    console.log('示例记录:')
    mistakes.forEach(m => {
      console.log(`  - ${m.id.slice(0, 8)}... (用户: ${m.user_id.slice(0, 8)}...)`)
    })
  }

  console.log('\n【检查学习进度数据】')

  const { data: progress } = await supabase
    .from('word_progress')
    .select('id, user_id, book_id')
    .limit(5)

  console.log(`学习进度记录: ${progress?.length || 0}条`)

  if (progress && progress.length > 0) {
    console.log('示例记录:')
    progress.forEach(p => {
      console.log(`  - ${p.id.slice(0, 8)}... (用户: ${p.user_id.slice(0, 8)}..., 书: ${p.book_id.slice(0, 8)}...)`)
    })
  }

  console.log('\n【检查books表的完整性】')

  const { data: books } = await supabase
    .from('books')
    .select('id, title')

  console.log(`剩余单词书: ${books?.length || 0}本`)
  books.forEach(b => {
    console.log(`  - ${b.title} (ID: ${b.id})`)
  })
}

check().catch(err => {
  console.error('检查失败:', err)
})
