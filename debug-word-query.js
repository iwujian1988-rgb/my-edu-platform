/**
 * 调试单词查询问题
 */

const fs = require('fs');
const path = require('path');

// 读取.env.local
const envLocalPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envLocalPath, 'utf-8');
envContent.split('\n').forEach(line => {
  const firstEquals = line.indexOf('=');
  if (firstEquals === -1) return;
  const key = line.substring(0, firstEquals).trim();
  let value = line.substring(firstEquals + 1).trim();
  if ((value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))) {
    value = value.slice(1, -1);
  }
  process.env[key] = value;
});

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY  // 使用service_role绕过RLS
);

console.log('🔍 调试单词查询问题\n');
console.log('='.repeat(70));

async function debugQuery() {
  try {
    // 1. 获取第一本词库
    console.log('\n📍 步骤1: 获取词库信息');
    const { data: books, error: booksError } = await supabase
      .from('books')
      .select('id, title, total_words')
      .order('created_at', { ascending: false })
      .limit(1);

    if (booksError) throw booksError;

    if (!books || books.length === 0) {
      console.log('❌ 没有找到词库');
      return;
    }

    const book = books[0];
    console.log(`✅ 词库: ${book.title} (ID: ${book.id})`);
    console.log(`   统计显示: ${book.total_words} 词`);

    // 2. 使用最简单的查询（不带JOIN）
    console.log('\n📍 步骤2: 简单查询（不带JOIN）');
    const { data: words1, error: error1 } = await supabase
      .from('words')
      .select('*')
      .eq('book_id', book.id)
      .limit(5);

    console.log(`   查询: select('*').eq('book_id', '${book.id}')`);
    console.log(`   结果: ${words1?.length || 0} 个单词`);
    if (error1) console.log(`   ❌ 错误: ${error1.message}`);

    if (words1 && words1.length > 0) {
      console.log(`   示例: ${words1.map(w => w.word).join(', ')}`);
    }

    // 3. 使用带JOIN的查询（API使用的方式）
    console.log('\n📍 步骤3: JOIN查询（API使用的方式）');
    const { data: words2, error: error2 } = await supabase
      .from('words')
      .select('*, chapters(id, title, order_index)')
      .eq('book_id', book.id)
      .limit(5);

    console.log(`   查询: select('*, chapters(...)').eq('book_id', '${book.id}')`);
    console.log(`   结果: ${words2?.length || 0} 个单词`);
    if (error2) {
      console.log(`   ❌ 错误: ${error2.message}`);
      console.log(`   错误代码: ${error2.code}`);
      console.log(`   错误详情: ${error2.hint}`);
    }

    if (words2 && words2.length > 0) {
      console.log(`   示例: ${words2.map(w => w.word).join(', ')}`);
    }

    // 4. 检查表之间的关系
    console.log('\n📍 步骤4: 检查外键关系');

    // 4.1 检查words表的chapter_id
    const { data: sampleWord } = await supabase
      .from('words')
      .select('id, word, chapter_id')
      .eq('book_id', book.id)
      .limit(1)
      .single();

    if (sampleWord) {
      console.log(`   ✅ 找到示例单词: ${sampleWord.word}`);
      console.log(`   chapter_id: ${sampleWord.chapter_id || 'NULL'}`);

      if (sampleWord.chapter_id) {
        // 4.2 检查该章节是否存在
        const { data: chapter, error: chapterError } = await supabase
          .from('chapters')
          .select('id, title')
          .eq('id', sampleWord.chapter_id)
          .single();

        if (chapterError) {
          console.log(`   ❌ 章节查询失败: ${chapterError.message}`);
        } else if (chapter) {
          console.log(`   ✅ 章节存在: ${chapter.title}`);
        }
      }
    } else {
      console.log(`   ⚠️  没有找到示例单词`);
    }

    // 5. 检查不同查询方式
    console.log('\n📍 步骤5: 对比不同查询方式');

    const queries = [
      {
        name: '只查询words',
        query: supabase.from('words').select('*').eq('book_id', book.id)
      },
      {
        name: '查询words + chapters (使用chapters)',
        query: supabase.from('words').select('*, chapters(*)').eq('book_id', book.id)
      },
      {
        name: '查询words + chapters (指定字段)',
        query: supabase.from('words').select('*, chapters(id, title)').eq('book_id', book.id)
      },
      {
        name: '查询words + chapter (单数)',
        query: supabase.from('words').select('*, chapter(*)').eq('book_id', book.id)
      }
    ];

    for (const { name, query } of queries) {
      try {
        const { data, error, count } = await query;
        console.log(`\n   ${name}:`);
        console.log(`   - 结果: ${data?.length || 0} 个单词`);
        console.log(`   - 总数: ${count || '未知'}`);
        if (error) {
          console.log(`   - 错误: ${error.message}`);
          if (error.hint) console.log(`   - 提示: ${error.hint}`);
        }
      } catch (e) {
        console.log(`\n   ${name}:`);
        console.log(`   - 异常: ${e.message}`);
      }
    }

    // 6. 检查total_words是否准确
    console.log('\n📍 步骤6: 验证total_words');
    const { count: actualCount } = await supabase
      .from('words')
      .select('*', { count: 'exact', head: true })
      .eq('book_id', book.id);

    console.log(`   统计显示: ${book.total_words} 词`);
    console.log(`   实际查询: ${actualCount || 0} 词`);

    if (book.total_words !== actualCount) {
      console.log(`   ⚠️  统计不准确！相差 ${Math.abs(book.total_words - (actualCount || 0))} 词`);
      console.log(`   💡 建议: 运行数据修复脚本更新total_words`);
    }

    // 总结
    console.log('\n' + '='.repeat(70));
    console.log('📊 调试总结');
    console.log('='.repeat(70));

    if (!words1 || words1.length === 0) {
      console.log('❌ 问题确认: 单词表确实没有数据');
      console.log('💡 解决方案:');
      console.log('   1. 检查是否导入了数据');
      console.log('   2. 检查book_id是否正确');
      console.log('   3. 查看导入日志');
    } else if (words2 && words2.length === 0) {
      console.log('❌ 问题确认: JOIN查询失败');
      console.log('💡 可能原因:');
      console.log('   1. 外键关系配置错误');
      console.log('   2. 表名拼写错误');
      console.log('   3. 权限问题');
      console.log('\n💡 解决方案:');
      console.log('   1. 修改API使用不JOIN的查询');
      console.log('   2. 在前端单独查询章节信息');
      console.log('   3. 检查数据库schema配置');
    } else {
      console.log('✅ 查询正常');
      console.log(`   - 简单查询: ${words1.length} 个单词`);
      console.log(`   - JOIN查询: ${words2.length} 个单词`);
    }

    console.log('\n' + '='.repeat(70));

  } catch (error) {
    console.error('\n❌ 调试失败:', error.message);
    console.error(error);
  }
}

debugQuery();
