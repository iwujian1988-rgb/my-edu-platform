import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

const envContent = readFileSync('.env.local', 'utf-8');

// 解析环境变量（移除引号）
const getEnvValue = (key) => {
  const match = envContent.match(new RegExp(`^${key}="?(.*?)"?$`, 'm'));
  return match ? match[1].replace(/^"|"$/g, '') : '';
};

const SUPABASE_URL = getEnvValue('NEXT_PUBLIC_SUPABASE_URL');
const SUPABASE_KEY = getEnvValue('SUPABASE_SERVICE_ROLE_KEY');

console.log('URL:', SUPABASE_URL);
console.log('Key:', SUPABASE_KEY.substring(0, 20) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkUserData() {
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('phone_number', '15652936305')
    .single();

  if (!users) {
    console.log('用户不存在');
    return;
  }

  console.log('用户ID:', users.id);

  const { data: prefs } = await supabase
    .from('user_book_preferences')
    .select('*')
    .eq('user_id', users.id);

  console.log('user_book_preferences 记录数:', prefs?.length || 0);

  if (prefs && prefs.length > 0) {
    prefs.forEach((p, i) => {
      console.log('\n' + (i + 1) + '. book_id:', p.book_id);
      console.log('   last_resume_state:', JSON.stringify(p.last_resume_state, null, 2));
    });
  }

  console.log('\n调用 RPC: get_user_progress_cards');
  const { data: cards } = await supabase
    .rpc('get_user_progress_cards', { p_user_id: users.id });

  console.log('RPC 返回记录数:', cards?.length || 0);
  if (cards && cards.length > 0) {
    console.log(JSON.stringify(cards, null, 2));
  }
}

checkUserData().catch(console.error);
