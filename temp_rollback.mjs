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

// 回滚所有套餐
const ids = [
  '1da77997-da89-4acd-81bb-ce4d2018baa2',  // 英语全功能月卡
  '739a52c7-657d-4813-8cea-1d17e22972dc',  // 英语全功能-年卡
  '476aee3a-c01b-480a-9bc8-45fb2593c469'   // 英语永久版
];

const { data, error } = await supabase
  .from('invitation_packages')
  .update({ book_permissions: ['*'] })
  .in('id', ids)
  .select('id, name, book_permissions');

if (error) {
  console.error('回滚失败:', error);
} else {
  console.log('套餐回滚成功:');
  data.forEach(p => {
    console.log(`  ✅ ${p.name}: ${JSON.stringify(p.book_permissions)}`);
  });
}
