const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
);

const TEST_BOOK_ID = '20000000-0000-0000-0000-000000000001';

(async () => {
  try {
    console.log('🔍 诊断学习进度Bug');
    console.log('=====================================\n');

    // 1. 检查单词去重
    const { data: allWords, error: wordsError } = await supabase
      .from('words')
      .select('id, word, book_id, chapter_id')
      .eq('book_id', TEST_BOOK_ID)
      .order('id');

    if (wordsError) throw wordsError;

    console.log('📊 单词总数:', allWords.length);

    // 检查重复单词
    const wordMap = new Map();
    const duplicates = [];
    allWords.forEach(w => {
      if (wordMap.has(w.word)) {
        duplicates.push({
          word: w.word,
          id1: wordMap.get(w.word),
          id2: w.id
        });
      } else {
        wordMap.set(w.word, w.id);
      }
    });

    if (duplicates.length > 0) {
      console.log('\n⚠️  发现重复单词:');
      duplicates.forEach(d => {
        console.log(`  ${d.word}:`);
        console.log(`    - ${d.id1}`);
        console.log(`    - ${d.id2}`);
      });
    } else {
      console.log('\n✅ 没有重复单词');
    }

    // 2. 检查章节归属
    const chapterSet = new Set();
    allWords.forEach(w => {
      if (w.chapter_id) {
        chapterSet.add(w.chapter_id);
      }
    });

    console.log('\n📚 章节分布:');
    console.log(`  涉及章节数: ${chapterSet.size}`);
    chapterSet.forEach(ch => {
      const count = allWords.filter(w => w.chapter_id === ch).length;
      console.log(`  - 章节 ${ch}: ${count} 个单词`);
    });

    // 3. 模拟学习进度计算
    console.log('\n📈 学习进度计算模拟:');
    console.log('  假设选择了前3个单词学习');
    const totalWords = 3;
    for (let i = 0; i < totalWords; i++) {
      const wrongProgress = Math.round((i / totalWords) * 100);
      const correctProgress = Math.round(((i + 1) / totalWords) * 100);
      console.log(`\n  单词 ${i + 1} (index=${i}):`);
      console.log(`    ❌ 当前算法: ${wrongProgress}%`);
      console.log(`    ✅ 正确算法: ${correctProgress}%`);
    }
    console.log(`\n  完成第3个单词后:`);
    console.log(`    ❌ 当前算法: ${Math.round((2 / 3) * 100)}% (还是67%!)`);
    console.log(`    ✅ 正确算法: 100% (应该是100%)`);

    console.log('\n=====================================');
    console.log('\n💡 结论:');
    console.log('1. 进度计算公式错误：');
    console.log('   - 当前: currentIndex / words.length');
    console.log('   - 正确: (currentIndex + 1) / words.length');
    console.log('2. 或者应该在完成后才增加进度');

  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
})();
