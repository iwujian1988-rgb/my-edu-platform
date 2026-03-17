import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// 查询所有英语书 ID（language 为 null 或 'en'）
const { data, error } = await supabase
  .from('books')
  .select('id, title, language')
  .eq('is_official', true)
  .eq('is_published', true);

if (error) {
  console.error('查询失败:', error);
} else {
  const englishBooks = data.filter(b => !b.language || b.language === 'en');
  console.log(`英语书共 ${englishBooks.length} 本:\n`);
  const ids = englishBooks.map(b => b.id);
  console.log('ID列表:');
  console.log(JSON.stringify(ids, null, 2));
}
