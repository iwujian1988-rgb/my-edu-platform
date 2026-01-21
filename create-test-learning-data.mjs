import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://snnrjnpcmdsdlyldvvps.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNubnJqbnBjbWRzZGx5bGR2dnBzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2NzU4ODUzOCwiZXhwIjoyMDgzMTY0NTM4fQ.fZviA_1KwAfuLxSAxgPcF6JQUVlzvyboVxSjlxrq2hc'
);

async function createLearningData() {
  try {
    // 获取用户ID
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', '15652936305')
      .single();

    if (userError || !user) {
      console.log('❌ 用户不存在:', userError?.message);
      return;
    }

    console.log('✅ 用户ID:', user.id);

    // 获取前2个词库
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title')
      .limit(2);

    if (booksError || !books || books.length === 0) {
      console.log('❌ 没有找到词库:', booksError?.message);
      return;
    }

    console.log('✅ 找到词库:', books.length, '个');

    // 更新或创建 user_book_preferences
    for (const book of books) {
      const { error } = await supabase
        .from('user_book_preferences')
        .upsert({
          user_id: user.id,
          book_id: book.id,
          last_accessed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        });

      if (error) {
        console.log('❌ 更新失败:', book.title, error.message);
      } else {
        console.log('✅ 已创建学习记录:', book.title);
      }
    }

    console.log('\n✅ 完成！测试数据已创建');
  } catch (error) {
    console.error('❌ 错误:', error.message);
  }
}

createLearningData();
