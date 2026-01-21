const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
);

const TEST_BOOK_ID = '20000000-0000-0000-0000-000000000001';
const TEST_CHAPTER_ID = '25000000-0000-0000-0000-000000000001';

(async () => {
  try {
    console.log('深度诊断：单词归属问题');
    console.log('=====================================\n');

    // 1. 查询这个章节下的所有单词
    const { data: allWordsInChapter, error: error1 } = await supabase
      .from('words')
      .select('id, word, book_id')
      .eq('chapter_id', TEST_CHAPTER_ID)
      .order('id')
      .limit(20);

    if (error1) throw error1;

    console.log('章节下的前20个单词:\n');
    allWordsInChapter.forEach(w => {
      console.log(w.word + ' -> book_id: ' + w.book_id);
    });

    // 2. 统计每个 book_id
    const { data: allWords } = await supabase
      .from('words')
      .select('book_id')
      .eq('chapter_id', TEST_CHAPTER_ID);

    const counts = {};
    allWords.forEach(w => {
      counts[w.book_id] = (counts[w.book_id] || 0) + 1;
    });

    console.log('\n按book_id统计:');
    for (const [bookId, count] of Object.entries(counts)) {
      const isTest = bookId === TEST_BOOK_ID ? ' <- 测试词书' : '';
      console.log('  ' + bookId + ': ' + count + '个' + isTest);
    }

  } catch (error) {
    console.error('错误:', error.message);
  }
})();
