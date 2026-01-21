import { createClient } from '@supabase/supabase-js'

const supabase = createClient('https://snnrjnpcmdsdlyldvvps.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc')

const bookId = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5';

// 获取所有单词的进度
const { data: progress, error } = await supabase
  .from('word_progress')
  .select('word_id, status')
  .eq('book_id', bookId);

if (error) {
  console.error('Error:', error);
  process.exit(1);
}

// 统计各status的数量
const stats = {
  known: 0,
  fuzzy: 0,
  unknown: 0,
  new: 0,
  total: progress?.length || 0
};

progress?.forEach(p => {
  if (stats[p.status] !== undefined) {
    stats[p.status]++;
  }
});

console.log('Book ID:', bookId);
console.log('单词统计:');
console.log('- 已认识 (known):', stats.known);
console.log('- 模糊 (fuzzy):', stats.fuzzy);
console.log('- 不认识 (unknown):', stats.unknown);
console.log('- 新词 (new):', stats.new);
console.log('- 总计:', stats.total);
