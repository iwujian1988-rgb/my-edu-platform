const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (valueParts.length > 0) {
    let value = valueParts.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (key && value) {
      process.env[key.trim()] = value;
    }
  }
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

(async () => {
  // 获取所有书籍及其ID
  const { data: books } = await supabase
    .from('books')
    .select('id, title, total_words, total_chapters')
    .order('total_words', { ascending: false });

  if (books) {
    console.log('当前所有词库列表:');
    console.log('='.repeat(80));
    books.forEach((book, idx) => {
      console.log(`${idx + 1}. ${book.title.padEnd(20)} - ${book.total_words.toLocaleString()} 词`);
      console.log(`   ID: ${book.id}`);
      console.log(`   章节数: ${book.total_chapters}`);
      console.log(`   URL: /library/${book.id}`);
      console.log('');
    });
  }
})();
