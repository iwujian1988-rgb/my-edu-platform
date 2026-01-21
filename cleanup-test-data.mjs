import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const KET_BOOK_ID = 'd6db96cf-080d-4294-9eea-63813bfc4227'

async function cleanup() {
  console.log('========================================')
  console.log('   开始清理测试数据')
  console.log('========================================\n')

  // 1. 获取除了KET之外的所有书
  const { data: books } = await supabase
    .from('books')
    .select('id, title')
    .neq('id', KET_BOOK_ID)

  console.log(`【步骤1】找到 ${books.length} 本需要删除的单词书`)

  const otherBookIds = books.map(b => b.id)

  // 2. 获取这些书的章节
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title, book_id')
    .in('book_id', otherBookIds)

  console.log(`【步骤2】找到 ${chapters.length} 个需要删除的章节`)

  const chapterIds = chapters.map(c => c.id)

  // 3. 获取这些章节的单词
  const { data: words } = await supabase
    .from('words')
    .select('id, word')
    .in('chapter_id', chapterIds)

  console.log(`【步骤3】找到 ${words.length} 个需要删除的单词`)

  const wordIds = words.map(w => w.id)

  // 4. 删除关联数据
  console.log('\n【步骤4】删除关联数据...')

  // 删除word_progress
  if (wordIds.length > 0) {
    const { error: progressError } = await supabase
      .from('word_progress')
      .delete()
      .in('word_id', wordIds)

    console.log(`  word_progress: ${progressError ? '失败' : '✓'}`)
  }

  // 删除mistakes
  if (wordIds.length > 0) {
    const { error: mistakeError } = await supabase
      .from('mistakes')
      .delete()
      .in('word_id', wordIds)

    console.log(`  mistakes: ${mistakeError ? '失败' : '✓'}`)
  }

  // 删除user_stats
  const { error: statsError } = await supabase
    .from('user_stats')
    .delete()
    .in('book_id', otherBookIds)

  console.log(`  user_stats: ${statsError ? '失败' : '✓'}`)

  // 5. 删除单词
  console.log('\n【步骤5】删除单词...')
  if (wordIds.length > 0) {
    // 分批删除，每批100个
    const batchSize = 100
    for (let i = 0; i < wordIds.length; i += batchSize) {
      const batch = wordIds.slice(i, i + batchSize)
      const { error } = await supabase
        .from('words')
        .delete()
        .in('id', batch)

      if (error) {
        console.error(`  批次 ${i / batchSize + 1} 删除失败:`, error)
      } else {
        console.log(`  批次 ${i / batchSize + 1}/${Math.ceil(wordIds.length / batchSize)}: ${batch.length} 个单词 ✓`)
      }
    }
  }

  // 6. 删除章节
  console.log('\n【步骤6】删除章节...')
  if (chapterIds.length > 0) {
    const { error } = await supabase
      .from('chapters')
      .delete()
      .in('id', chapterIds)

    console.log(`  删除 ${chapterIds.length} 个章节: ${error ? '失败' : '✓'}`)
  }

  // 7. 删除单词书
  console.log('\n【步骤7】删除单词书...')
  const { error } = await supabase
    .from('books')
    .delete()
    .in('id', otherBookIds)

  console.log(`  删除 ${otherBookIds.length} 本单词书: ${error ? '失败' : '✓'}`)

  // 8. 验证结果
  console.log('\n========================================')
  console.log('   验证结果')
  console.log('========================================\n')

  const { count: remainingBooks } = await supabase
    .from('books')
    .select('*', { count: 'exact', head: true })

  const { count: remainingChapters } = await supabase
    .from('chapters')
    .select('*', { count: 'exact', head: true })

  const { count: remainingWords } = await supabase
    .from('words')
    .select('*', { count: 'exact', head: true })

  console.log(`剩余单词书: ${remainingBooks} 本`)
  console.log(`剩余章节: ${remainingChapters} 个`)
  console.log(`剩余单词: ${remainingWords} 个`)

  console.log('\n✅ 清理完成！')
}

cleanup().catch(err => {
  console.error('清理失败:', err)
  process.exit(1)
})
