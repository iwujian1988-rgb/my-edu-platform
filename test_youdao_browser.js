/**
 * 测试浏览器直接请求有道 API（不伪装 User-Agent）
 */

const fetch = require('node-fetch');

async function testYoudaoAPIWithoutUA(text, type = '2') {
  const startTime = Date.now();

  try {
    const url = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(text)}&type=${type}`;

    console.log(`\n📡 测试单词: "${text}" (type=${type})`);
    console.log(`   URL: ${url}`);
    console.log(`   User-Agent: 默认（node-fetch默认UA）`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    // 🔥 不设置 User-Agent，模拟浏览器行为
    const response = await fetch(url, {
      signal: controller.signal
      // 注意：不设置 headers，使用默认 UA
    });

    clearTimeout(timeoutId);

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      console.log(`   ❌ HTTP ${response.status} (${duration}ms)`);
      return { success: false, duration, error: `HTTP ${response.status}` };
    }

    const buffer = await response.buffer();
    const size = (buffer.length / 1024).toFixed(2);

    console.log(`   ✅ 成功! (${duration}ms, ${size}KB)`);
    console.log(`   Content-Type: ${response.headers.get('content-type')}`);

    return { success: true, duration, size: buffer.length };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (error.name === 'AbortError') {
      console.log(`   ❌ 超时 (>10000ms)`);
      return { success: false, duration, error: 'Timeout' };
    }

    console.log(`   ❌ 失败: ${error.message} (${duration}ms)`);
    return { success: false, duration, error: error.message };
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('有道语音 API 测试（默认 User-Agent）');
  console.log('============================================================');

  const testWords = ['hello', 'world', 'computer', 'learning', 'test'];
  const results = [];

  for (const word of testWords) {
    const result = await testYoudaoAPIWithoutUA(word, '2');
    results.push({ word, ...result });

    // 等待1秒再测试下一个，避免触发限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n============================================================');
  console.log('测试结果汇总');
  console.log('============================================================');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`\n成功: ${successCount}/${testWords.length}`);
  console.log(`失败: ${failCount}/${testWords.length}`);

  const successful = results.filter(r => r.success);
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const maxDuration = Math.max(...successful.map(r => r.duration));
    const minDuration = Math.min(...successful.map(r => r.duration));

    console.log('\n成功请求耗时:');
    console.log(`  平均: ${avgDuration.toFixed(0)}ms`);
    console.log(`  最快: ${minDuration}ms`);
    console.log(`  最慢: ${maxDuration}ms`);
  }

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\n失败的请求:');
    failed.forEach(r => {
      console.log(`  ${r.word}: ${r.error}`);
    });
  }

  console.log('\n============================================================');
  console.log('结论：');
  if (successCount === testWords.length) {
    console.log('✅ 有道 API 允许浏览器直接请求（不需要伪装 User-Agent）');
    console.log('→ 可以使用 307 重定向方案');
  } else {
    console.log('❌ 有道 API 可能会拦截浏览器直接请求');
    console.log('→ 需要使用服务器代理方案');
  }
  console.log('============================================================');
}

runTests().catch(console.error);
