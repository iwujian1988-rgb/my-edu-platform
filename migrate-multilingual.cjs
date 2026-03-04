/**
 * 执行多语言支持字段迁移
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function migrate() {
  console.log('开始多语言字段迁移...\n');

  // 1. 检查现有字段
  const { data: sample } = await supabase.from('words').select('*').limit(1);
  const existingFields = Object.keys(sample[0] || {});

  const newFields = [
    'source_language',
    'target_language',
    'kana',
    'romaji',
    'pronunciation',
    'definition_alt',
    'example_sentence_alt',
    'part_of_speech_native'
  ];

  console.log('现有字段:', existingFields.length);
  console.log('需要添加:', newFields.filter(f => !existingFields.includes(f)).join(', ') || '无');

  // 2. 使用 RPC 执行 SQL（需要先在 Supabase 控制台执行 SQL）
  console.log('\n请在 Supabase 控制台执行以下 SQL:');
  console.log('='.repeat(60));

  const sql = `
-- 添加多语言支持字段
ALTER TABLE words ADD COLUMN IF NOT EXISTS source_language VARCHAR(10) DEFAULT 'en';
ALTER TABLE words ADD COLUMN IF NOT EXISTS target_language VARCHAR(10) DEFAULT 'zh';
ALTER TABLE words ADD COLUMN IF NOT EXISTS kana TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS romaji TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS pronunciation TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS definition_alt TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS example_sentence_alt TEXT;
ALTER TABLE words ADD COLUMN IF NOT EXISTS part_of_speech_native TEXT;

-- 更新现有数据
UPDATE words SET source_language = 'en', target_language = 'zh' WHERE source_language IS NULL;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_words_source_language ON words(source_language);
CREATE INDEX IF NOT EXISTS idx_words_target_language ON words(target_language);
`;

  console.log(sql);
  console.log('='.repeat(60));

  // 3. 等待用户确认执行
  console.log('\n执行步骤:');
  console.log('1. 打开 Supabase 控制台 -> SQL Editor');
  console.log('2. 粘贴上面的 SQL 并执行');
  console.log('3. 执行完成后，在此按 Enter 继续...');

  // 等待用户输入（Node.js 环境下）
  const readline = require('readline');
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  await new Promise(resolve => rl.question('', resolve));
  rl.close();

  // 4. 验证迁移结果
  console.log('\n验证迁移结果...');
  const { data: verify } = await supabase.from('words').select('*').limit(1);
  const newFieldsExist = newFields.every(f => verify[0]?.hasOwnProperty(f) || verify[0]?.[f] !== undefined);

  if (newFieldsExist || Object.keys(verify[0] || {}).length > existingFields.length) {
    console.log('✅ 迁移成功！');

    // 统计现有数据
    const { count } = await supabase.from('words').select('*', { count: 'exact', head: true });
    console.log('当前单词数:', count);
    console.log('新增字段:', newFields.join(', '));
  } else {
    console.log('❌ 迁移可能未完成，请检查 SQL 是否执行成功');
  }
}

migrate().catch(console.error);
