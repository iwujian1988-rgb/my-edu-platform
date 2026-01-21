import { createClient } from '@supabase/supabase-js'
const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const ketBookId = 'd6db96cf-080d-4294-9eea-63813bfc4227'

async function check() {
  // 获取KET书的所有章节
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, title')
    .eq('book_id', ketBookId)

  console.log('KET书章节数:', chapters?.length || 0)

  if (chapters && chapters.length > 0) {
    const chapterIds = chapters.map(c => c.id)

    // 通过words表的chapter_id字段查询单词
    const { data: words } = await supabase
      .from('words')
      .select('id, word, chapter_id, definition_en, collocation_en, example_sentence_en')
      .in('chapter_id', chapterIds)

    console.log('KET书单词总数:', words?.length || 0)

    if (words && words.length > 0) {
      // 检查质量
      const high = words.filter(w =>
        w.definition_en &&
        w.definition_en !== 'related concept or action' &&
        w.collocation_en &&
        w.example_sentence_en
      )

      console.log('高质量单词数:', high.length)
      console.log('进度: ' + ((high.length / words.length) * 100).toFixed(1) + '%')
      console.log('待处理:', words.length - high.length)

      // 列出低质量单词
      const low = words.filter(w =>
        !w.definition_en ||
        w.definition_en === 'related concept or action' ||
        !w.collocation_en ||
        !w.example_sentence_en
      )

      if (low.length > 0) {
        console.log('\n待处理单词:')
        low.slice(0, 20).forEach(w => {
          console.log('  -', w.word)
        })
      }
    }
  }
}
check()
