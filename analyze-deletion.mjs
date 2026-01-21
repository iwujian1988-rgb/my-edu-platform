import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

async function analyze() {
  console.log('========================================')
  console.log('   数据清理分析报告')
  console.log('========================================\n')

  // 1. 查询所有单词书
  const { data: books } = await supabase
    .from('books')
    .select('id, title, total_words')
    .order('created_at', { ascending: false })

  console.log('【所有单词书】')
  for (const book of books) {
    console.log(`  - ${book.title} (ID: ${book.id}, 单词数: ${book.total_words})`)
  }

  // 找到KET书
  const ketBook = books.find(b => b.title === '14天攻克KET核心词汇')
  const ketBookId = ketBook?.id
  const otherBookIds = books.filter(b => b.id !== ketBookId).map(b => b.id)

  console.log(`\nKET书ID: ${ketBookId}`)
  console.log(`其他书ID: ${otherBookIds.length}本`)

  // 2. 查询chapters
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, book_id, title')
    .in('book_id', otherBookIds)

  console.log(`\n【其他书的章节数】 ${chapters.length}个`)

  // 3. 查询words（通过chapter_id）
  const chapterIds = chapters.map(c => c.id)
  const { data: words } = await supabase
    .from('words')
    .select('id')
    .in('chapter_id', chapterIds)

  console.log(`【其他书的单词数】 ${words?.length || 0}个`)

  const wordIds = words?.map(w => w.id) || []

  // 4. 检查关联表
  console.log('\n【关联数据检查】')

  // word_progress
  const { count: progressCount } = await supabase
    .from('word_progress')
    .select('*', { count: 'exact', head: true })
    .in('word_id', wordIds)
  console.log(`  word_progress: ${progressCount}条`)

  // mistakes
  const { count: mistakeCount } = await supabase
    .from('mistakes')
    .select('*', { count: 'exact', head: true })
    .in('word_id', wordIds)
  console.log(`  mistakes: ${mistakeCount}条`)

  // user_stats
  const { count: statsCount } = await supabase
    .from('user_stats')
    .select('*', { count: 'exact', head: true })
    .in('book_id', otherBookIds)
  console.log(`  user_stats: ${statsCount}条`)

  // 5. 检查KET书的数据
  console.log('\n【KET书数据】')
  const { data: ketChapters } = await supabase
    .from('chapters')
    .select('id')
    .eq('book_id', ketBookId)

  const ketChapterIds = ketChapters.map(c => c.id)

  const { count: ketWordsCount } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })
    .in('chapter_id', ketChapterIds)

  const { count: ketProgressCount } = await supabase
    .from('word_progress')
    .select('*', { count: 'exact', head: true })
    .eq('book_id', ketBookId)

  console.log(`  KET章节数: ${ketChapters.length}`)
  console.log(`  KET单词数: ${ketWordsCount}`)
  console.log(`  KET学习进度: ${ketProgressCount}条`)

  // 6. 首页最近学习检查
  console.log('\n【首页最近学习检查】')
  const { data: users } = await supabase
    .from('users')
    .select('id, recent_books, last_accessed_at')
    .limit(10)

  console.log(`  用户数: ${users?.length || 0}`)

  for (const user of users) {
    const recentBooks = user.recent_books || []
    const affected = recentBooks.filter(id => otherBookIds.includes(id))
    if (affected.length > 0) {
      console.log(`  用户 ${user.id.slice(0, 8)}... 有 ${affected.length} 本最近学习的书将被删除`)
    }
  }

  // 总结
  console.log('\n========================================')
  console.log('   删除计划总结')
  console.log('========================================')
  console.log(`\n需要删除的数据：`)
  console.log(`  - 单词书: ${otherBookIds.length}本`)
  console.log(`  - 章节: ${chapters.length}个`)
  console.log(`  - 单词: ${words?.length || 0}个`)
  console.log(`  - 学习进度: ${progressCount}条`)
  console.log(`  - 错题记录: ${mistakeCount}条`)
  console.log(`  - 用户统计: ${statsCount}条`)

  console.log(`\n保留的数据：`)
  console.log(`  - KET单词书: 1本`)
  console.log(`  - KET章节: ${ketChapters.length}个`)
  console.log(`  - KET单词: ${ketWordsCount}个`)
  console.log(`  - KET学习进度: ${ketProgressCount}条`)

  return {
    ketBookId,
    otherBookIds,
    chapterIds,
    wordIds,
    toDelete: {
      books: otherBookIds.length,
      chapters: chapters.length,
      words: words?.length || 0,
      progress: progressCount,
      mistakes: mistakeCount,
      stats: statsCount
    }
  }
}

analyze().then(result => {
  console.log('\n分析完成，数据已准备好')
}).catch(err => {
  console.error('分析失败:', err)
})
