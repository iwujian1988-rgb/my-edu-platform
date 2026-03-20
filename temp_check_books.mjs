import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
);

const { data, error } = await supabase
  .from('books')
  .select('title, category, language')
  .order('language')
  .order('title');

if (error) {
  console.error(error);
} else {
  console.log('📚 现有单词书列表:\n');
  data.forEach(b => {
    console.log(`  [${b.language || 'en'}] [${b.category}] ${b.title}`);
  });
}
