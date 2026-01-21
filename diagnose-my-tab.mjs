/**
 * 诊断"我的"Tab问题
 * 检查自定义词库的数据状态
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// 读取环境变量
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

async function diagnose() {
  console.log('═════════════════════════════════════════════════════');
  console.log('🔍 诊断"我的"Tab问题');
  console.log('═════════════════════════════════════════════════════\n');

  // 1. 获取所有用户
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .limit(10);

  if (usersError) {
    console.error('❌ 获取用户失败:', usersError);
    return;
  }

  console.log(`📋 找到 ${users?.length || 0} 个用户:\n`);
  users?.forEach(user => {
    console.log(`   📧 ${user.email}`);
    console.log(`      ID: ${user.id}\n`);
  });

  if (!users || users.length === 0) {
    console.log('⚠️  没有用户，无法继续诊断\n');
    return;
  }

  // 使用第一个用户进行测试
  const testUser = users[0];
  console.log(`═════════════════════════════════════════════════════`);
  console.log(`🔍 使用测试用户: ${testUser.email}`);
  console.log(`═════════════════════════════════════════════════════\n`);

  // 2. 获取所有词库
  const { data: allBooks, error: booksError } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (booksError) {
    console.error('❌ 获取词库失败:', booksError);
    return;
  }

  console.log(`📚 找到 ${allBooks?.length || 0} 个词库\n`);

  if (!allBooks || allBooks.length === 0) {
    console.log('⚠️  没有词库，无法继续诊断\n');
    return;
  }

  // 3. 分类词库
  const customBooks = allBooks.filter(b => b.is_official === false);
  const officialBooks = allBooks.filter(b => b.is_official === true);
  const unknownBooks = allBooks.filter(b => b.is_official === null || b.is_official === undefined);

  console.log(`📊 词库分类:`);
  console.log(`   🔵 官方词库: ${officialBooks.length}`);
  console.log(`   🟢 自定义词库: ${customBooks.length}`);
  console.log(`   ⚪ 未标记词库: ${unknownBooks.length}\n`);

  // 4. 显示自定义词库详情
  if (customBooks.length > 0) {
    console.log(`═════════════════════════════════════════════════════`);
    console.log(`🟢 自定义词库详情`);
    console.log(`═════════════════════════════════════════════════════\n`);

    customBooks.forEach(book => {
      console.log(`📖 ${book.title}`);
      console.log(`   ID: ${book.id}`);
      console.log(`   created_by: ${book.created_by || '❌ NULL'}`);
      console.log(`   is_official: ${book.is_official}`);
      console.log(`   is_published: ${book.is_published}`);
      console.log(`   total_words: ${book.total_words}`);

      // 检查是否属于测试用户
      const isMine = book.created_by === testUser.id;
      const isPublished = book.is_published === true;

      console.log(`   📌 属于测试用户: ${isMine ? '✅ 是' : '❌ 否'}`);
      console.log(`   📌 已发布: ${isPublished ? '✅ 是' : '❌ 否'}`);
      console.log(`   📌 会在"我的"Tab显示: ${isMine && isPublished ? '✅ 是' : '❌ 否'}`);
      console.log('');
    });
  } else {
    console.log('⚠️  没有找到自定义词库\n');
  }

  // 5. 模拟page.tsx的过滤逻辑
  console.log(`═════════════════════════════════════════════════════`);
  console.log(`🔬 模拟page.tsx过滤逻辑`);
  console.log(`═════════════════════════════════════════════════════\n`);

  // 假设用户权限（简化版）
  const userPermissions = { bookPermissions: [] };
  const hasAllBooks = false;
  const userBookIds = userPermissions.bookPermissions;

  const filteredBooks = allBooks.filter(book => {
    // 自定义词库（is_official=false）- 只显示创建者自己的
    if (book.is_official === false) {
      return book.created_by === testUser.id;
    }

    // 官方词库（is_official=true）- 根据用户权限过滤
    if (book.is_official === true) {
      return hasAllBooks || userBookIds.includes(book.id);
    }

    // 未标记词库 - 默认不可见
    return false;
  });

  console.log(`✅ 过滤后词库数量: ${filteredBooks.length}\n`);

  filteredBooks.forEach(book => {
    console.log(`   📖 ${book.title}`);
    console.log(`      类型: ${book.is_official === false ? '自定义' : '官方'}`);
    console.log(`      created_by: ${book.created_by}`);
    console.log('');
  });

  // 6. 模拟BookLibrary的"我的"Tab过滤
  console.log(`═════════════════════════════════════════════════════`);
  console.log(`🔬 模拟BookLibrary"我的"Tab过滤`);
  console.log(`═════════════════════════════════════════════════════\n`);

  const myBooks = filteredBooks.filter(book => {
    return book.created_by === testUser.id;
  });

  console.log(`✅ "我的"Tab词库数量: ${myBooks.length}\n`);

  if (myBooks.length === 0) {
    console.log(`⚠️  "我的"Tab为空！\n`);
    console.log(`可能原因：`);
    console.log(`   1. 没有创建自定义词库`);
    console.log(`   2. 自定义词库的 is_published 不为 true`);
    console.log(`   3. 自定义词库的 created_by 不匹配用户ID\n`);
  } else {
    myBooks.forEach(book => {
      console.log(`   📖 ${book.title}`);
      console.log(`      ID: ${book.id}`);
      console.log(`      is_published: ${book.is_published}\n`);
    });
  }

  // 7. 诊断总结
  console.log(`═════════════════════════════════════════════════════`);
  console.log(`📋 诊断总结`);
  console.log(`═════════════════════════════════════════════════════\n`);

  const unpublishedCustomBooks = customBooks.filter(b => b.is_published !== true);
  const myCustomBooks = customBooks.filter(b => b.created_by === testUser.id);
  const myPublishedBooks = myCustomBooks.filter(b => b.is_published === true);

  console.log(`问题分析：`);
  console.log(`   1. 自定义词库总数: ${customBooks.length}`);
  console.log(`   2. 测试用户的自定义词库: ${myCustomBooks.length}`);
  console.log(`   3. 已发布的自定义词库: ${myPublishedBooks.length}`);
  console.log(`   4. 未发布的自定义词库: ${unpublishedCustomBooks.length}\n`);

  if (unpublishedCustomBooks.length > 0) {
    console.log(`⚠️  发现 ${unpublishedCustomBooks.length} 个未发布的自定义词库！`);
    console.log(`   这些词库不会在任何地方显示。\n`);
    console.log(`🔧 解决方法：`);
    console.log(`   方法1: 访问 http://localhost:3000/fix-unpublished-books.html`);
    console.log(`   方法2: 运行 node fix-published-books.mjs\n`);
  }

  if (myPublishedBooks.length > 0) {
    console.log(`✅ 测试用户有 ${myPublishedBooks.length} 个已发布的自定义词库`);
    console.log(`   这些词库应该在"我的"Tab中显示。\n`);
  } else if (myCustomBooks.length > 0) {
    console.log(`❌ 测试用户有 ${myCustomBooks.length} 个自定义词库，但都未发布`);
    console.log(`   需要运行修复工具来发布它们。\n`);
  } else {
    console.log(`ℹ️  测试用户没有创建任何自定义词库`);
    console.log(`   需要先创建一个自定义词库。\n`);
  }

  console.log(`═════════════════════════════════════════════════════\n`);
}

diagnose().catch(console.error);
