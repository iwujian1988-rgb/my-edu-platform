/**
 * 检查所有用户的自定义词库
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

let envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

try {
  const envContent = readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    if (!line.trim() || line.startsWith('#')) return;
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim().replace(/^"|"$/g, '');
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') envUrl = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') envKey = value;
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !envKey) envKey = value;
  });
} catch (e) {
  console.log('⚠️  无法读取.env.local');
}

const supabase = createClient(envUrl, envKey);

async function checkAllUsers() {
  console.log('═════════════════════════════════════════════════════');
  console.log('🔍 检查所有用户的自定义词库');
  console.log('═════════════════════════════════════════════════════\n');

  // 获取所有用户
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .order('created_at', { ascending: false });

  if (usersError) {
    console.error('❌ 获取用户失败:', usersError);
    return;
  }

  // 获取所有自定义词库
  const { data: customBooks, error: booksError } = await supabase
    .from('books')
    .select('*')
    .eq('is_official', false)
    .order('created_at', { ascending: false });

  if (booksError) {
    console.error('❌ 获取词库失败:', booksError);
    return;
  }

  console.log(`📊 总用户数: ${users?.length || 0}`);
  console.log(`📊 自定义词库总数: ${customBooks?.length || 0}\n`);

  if (!users || users.length === 0 || !customBooks || customBooks.length === 0) {
    console.log('⚠️  没有数据\n');
    return;
  }

  // 为每个用户查找他们的自定义词库
  let hasBooksCount = 0;

  users.forEach(user => {
    const userBooks = customBooks.filter(b => b.created_by === user.id);
    const publishedBooks = userBooks.filter(b => b.is_published === true);
    const unpublishedBooks = userBooks.filter(b => b.is_published !== true);

    if (userBooks.length > 0) {
      hasBooksCount++;
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`👤 用户: ${user.email}`);
      console.log(`   ID: ${user.id}`);
      console.log(`   📚 自定义词库数量: ${userBooks.length}`);
      console.log(`   ✅ 已发布: ${publishedBooks.length}`);
      console.log(`   ❌ 未发布: ${unpublishedBooks.length}\n`);

      userBooks.forEach(book => {
        console.log(`      📖 ${book.title}`);
        console.log(`         ID: ${book.id}`);
        console.log(`         is_published: ${book.is_published}`);
        console.log(`         total_words: ${book.total_words}`);
        console.log(`         创建时间: ${book.created_at}\n`);
      });
    }
  });

  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`\n📋 统计总结:`);
  console.log(`   有自定义词库的用户数: ${hasBooksCount}`);
  console.log(`   没有自定义词库的用户数: ${users.length - hasBooksCount}\n`);

  // 找出未发布的词库
  const unpublishedBooks = customBooks.filter(b => b.is_published !== true);
  if (unpublishedBooks.length > 0) {
    console.log(`⚠️  发现 ${unpublishedBooks.length} 个未发布的自定义词库！`);
    console.log(`   🔧 运行修复工具: node fix-published-books.mjs\n`);
  }

  console.log(`═════════════════════════════════════════════════════\n`);
}

checkAllUsers().catch(console.error);
