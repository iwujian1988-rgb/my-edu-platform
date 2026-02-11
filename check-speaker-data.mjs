import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// 读取环境变量
const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length > 0) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function checkSpeakerData() {
  const { data, error } = await supabase
    .from('speaker_articles')
    .select('id, title, source_url, level')
    .limit(10);

  if (error) {
    console.error('Error:', error.message);
    return;
  }

  console.log('\n=== Speaker 文章列表 ===\n');
  data.forEach((article, index) => {
    console.log(`${index + 1}. ${article.title} (Level ${article.level})`);
    console.log(`   来源: ${article.source_url || 'N/A'}\n`);
  });
}

checkSpeakerData();
