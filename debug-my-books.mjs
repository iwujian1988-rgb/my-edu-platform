/**
 * 调试"我的"Tab词库显示问题
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// 手动读取.env.local文件
let envUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
let envKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

try {
  const envContent = readFileSync('.env.local', 'utf-8');
  envContent.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=').trim();
    if (key === 'NEXT_PUBLIC_SUPABASE_URL') envUrl = value;
    if (key === 'SUPABASE_SERVICE_ROLE_KEY') envKey = value;
    if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY' && !envKey) envKey = value;
  });
} catch (e) {
  console.log('⚠️  无法读取.env.local，使用环境变量');
}

if (!envUrl || !envKey) {
  console.error('❌ 缺少Supabase配置');
  process.exit(1);
}

const supabase = createClient(envUrl, envKey);

async function debug() {
  console.log('═════════════════════════════════════════════════════');
  console.log('🔍 调试"我的"Tab词库显示问题');
  console.log('═════════════════════════════════════════════════════\n');

  // 1. 获取测试用户
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    // 查找测试用户
    const { data: users } = await supabase
      .from('users')
      .select('*')
      .limit(1);

    if (!users || users.length === 0) {
      console.error('❌ 没有找到用户');
      return;
    }

    console.log('📋 测试用户:', users[0]);
    var userId = users[0].id;
  } else {
    console.log('📋 当前用户:', user);
    var userId = user.id;
  }

  console.log(`\n🔍 用户ID: ${userId}\n`);

  // 2. 检查所有词库
  console.log('📚 检查所有词库...\n');
  const { data: allBooks, error: booksError } = await supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: false });

  if (booksError) {
    console.error('❌ 查询词库失败:', booksError);
    return;
  }

  console.log(`✅ 找到 ${allBooks.length} 个词库\n`);

  // 3. 分类词库
  const myBooks = allBooks.filter(b => b.created_by === userId);
  const officialBooks = allBooks.filter(b => b.is_official === true);
  const publishedBooks = allBooks.filter(b => b.is_published === true);
  const unpublishedBooks = allBooks.filter(b => b.is_published === false || b.is_published === null);

  console.log('📊 词库分类:');
  console.log(`   - 我的词库（created_by=userId）: ${myBooks.length}`);
  console.log(`   - 官方词库（is_official=true）: ${officialBooks.length}`);
  console.log(`   - 已上架（is_published=true）: ${publishedBooks.length}`);
  console.log(`   - 未上架（is_published=false/null）: ${unpublishedBooks.length}\n`);

  // 4. 显示我的词库详情
  if (myBooks.length > 0) {
    console.log('✅ 我的词库详情:');
    myBooks.forEach((book, i) => {
      console.log(`   ${i + 1}. ${book.title}`);
      console.log(`      ID: ${book.id}`);
      console.log(`      created_by: ${book.created_by}`);
      console.log(`      is_official: ${book.is_official}`);
      console.log(`      is_published: ${book.is_published}`);
      console.log(`      total_words: ${book.total_words}\n`);
    });
  } else {
    console.log('❌ 没有找到我的词库\n');
  }

  // 5. 模拟API过滤逻辑
  console.log('🔬 模拟 /api/books 过滤逻辑:\n');

  const filteredByAPI = allBooks.filter(book => {
    // 规则1：自定义词库（is_official=false）- 只显示创建者自己的
    if (book.is_official === false) {
      return book.created_by === userId;
    }

    // 规则2：官方词库（is_official=true）- 根据用户权限过滤
    if (book.is_official === true) {
      // 假设用户有全部权限
      return true;
    }

    // 规则3：未标记词库 - 默认不可见
    return false;
  });

  console.log(`✅ API过滤后剩余: ${filteredByAPI.length} 个词库\n`);

  // 6. 检查哪些词库被过滤掉了
  const filteredOut = allBooks.filter(book => {
    if (book.is_official === false) {
      return book.created_by !== userId;
    }
    if (book.is_official === true) {
      return false;
    }
    return true;
  });

  if (filteredOut.length > 0) {
    console.log('⚠️  被过滤掉的词库:');
    filteredOut.forEach((book, i) => {
      console.log(`   ${i + 1}. ${book.title}`);
      console.log(`      created_by: ${book.created_by} (你的ID: ${userId})`);
      console.log(`      is_official: ${book.is_official}\n`);
    });
  }

  // 7. 问题诊断
  console.log('═════════════════════════════════════════════════════');
  console.log('🔬 问题诊断:\n');

  if (myBooks.length === 0) {
    console.log('❌ 问题1: 你没有创建任何自定义词库');
    console.log('   解决方案: 先创建一个自定义词库\n');
  }

  const myUnpublishedBooks = myBooks.filter(b => !b.is_published);
  if (myUnpublishedBooks.length > 0) {
    console.log('⚠️  问题2: 你有未上架的自定义词库');
    console.log(`   数量: ${myUnpublishedBooks.length}`);
    console.log('   API查询条件: .eq(\'is_published\', true)');
    console.log('   解决方案: 将is_published设置为true\n');
  }

  if (myBooks.length > 0 && filteredByAPI.filter(b => b.created_by === userId).length === 0) {
    console.log('❌ 问题3: 我的词库被API过滤逻辑错误过滤');
    console.log('   需要检查过滤逻辑\n');
  }

  console.log('═════════════════════════════════════════════════════\n');
}

debug().catch(console.error);
