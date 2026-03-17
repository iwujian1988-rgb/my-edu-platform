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

const { data, error } = await supabase
  .from('users')
  .select('id, email, book_permissions')
  .contains('book_permissions', ['*']);

if (error) {
  console.error('查询失败:', error);
} else {
  console.log(`共 ${data.length} 个用户有 '*' 权限\n`);
  
  // 分类：只有 '*' 的 vs 有其他权限的
  const onlyStar = data.filter(u => u.book_permissions.length === 1 && u.book_permissions[0] === '*');
  const hasOther = data.filter(u => u.book_permissions.length > 1 || (u.book_permissions[0] !== '*' && u.book_permissions.length === 1));
  
  console.log(`只有 '*' 的用户: ${onlyStar.length} 人`);
  console.log(`有其他权限的用户: ${hasOther.length} 人`);
  
  if (hasOther.length > 0) {
    console.log('\n有其他权限的用户详情:');
    hasOther.forEach(u => {
      console.log(`  ${u.email}: ${JSON.stringify(u.book_permissions)}`);
    });
  }
}
