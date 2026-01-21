/**
 * 修复已创建但未发布的自定义词库
 * 将created_by不为null且is_published不为true的词库设置为已发布
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
  console.log('⚠️  无法读取.env.local');
}

const supabase = createClient(envUrl, envKey);

async function fix() {
  console.log('═════════════════════════════════════════════════════');
  console.log('🔧 修复未发布的自定义词库');
  console.log('═════════════════════════════════════════════════════\n');

  // 1. 查找未发布的自定义词库
  const { data: unpublishedBooks, error } = await supabase
    .from('books')
    .select('*')
    .not('created_by', 'is', null)
    .or('is_published.is.null,is_published.eq.false');

  if (error) {
    console.error('❌ 查询失败:', error);
    return;
  }

  if (!unpublishedBooks || unpublishedBooks.length === 0) {
    console.log('✅ 没有找到未发布的自定义词库\n');
    return;
  }

  console.log(`📚 找到 ${unpublishedBooks.length} 个未发布的自定义词库:\n`);

  // 2. 显示并修复每个词库
  for (const book of unpublishedBooks) {
    console.log(`   📖 ${book.title}`);
    console.log(`      ID: ${book.id}`);
    console.log(`      created_by: ${book.created_by}`);
    console.log(`      is_published: ${book.is_published}\n`);

    // 更新为已发布
    const { error: updateError } = await supabase
      .from('books')
      .update({ is_published: true })
      .eq('id', book.id);

    if (updateError) {
      console.error(`      ❌ 更新失败: ${updateError.message}\n`);
    } else {
      console.log(`      ✅ 已设置为发布\n`);
    }
  }

  console.log('═════════════════════════════════════════════════════');
  console.log('✅ 修复完成！');
  console.log('═════════════════════════════════════════════════════\n');
}

fix().catch(console.error);
