const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');

const getEnvVar = (name) => {
  const match = envContent.match(new RegExp(`^${name}=(.+)$`, 'm'));
  if (!match) return null;
  let value = match[1].trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  return value;
};

const supabase = createClient(
  getEnvVar('NEXT_PUBLIC_SUPABASE_URL'),
  getEnvVar('SUPABASE_SERVICE_ROLE_KEY')
);

async function findWordBooksTable() {
  console.log('尝试查找单词书相关的表...\n');

  const possibleNames = [
    'word_books',
    'words',
    'vocabulary_books',
    'books',
    'dictionaries',
    'wordbook'
  ];

  for (const tableName of possibleNames) {
    try {
      const { data, error } = await supabase
        .from(tableName)
        .select('*')
        .limit(1);

      if (!error) {
        console.log('✅ 找到表:', tableName);
        if (data && data.length > 0) {
          console.log('   字段:', Object.keys(data[0]).join(', '));
        } else {
          console.log('   (表为空)');
        }
      }
    } catch (e) {
      // 表不存在，继续尝试下一个
    }
  }
}

findWordBooksTable().catch(console.error);
