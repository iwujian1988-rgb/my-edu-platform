const fetch = require('node-fetch');

// 测试单词列表
const testWords = [
  'hello',
  'world',
  'computer',
  'learning',
  'progress'
];

const BROWSER_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function testYoudaoAPI(text, type = '2') {
  const startTime = Date.now();

  try {
    const url = 'https://dict.youdao.com/dictvoice?audio=' + encodeURIComponent(text) + '&type=' + type;

    console.log('\n📡 测试单词: "' + text + '" (type=' + type + ')');
    console.log('   URL: ' + url);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30秒超时

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
      },
    });

    clearTimeout(timeoutId);

    const endTime = Date.now();
    const duration = endTime - startTime;

    if (!response.ok) {
      console.log('   ❌ HTTP ' + response.status + ' (' + duration + 'ms)');
      return { success: false, duration, error: 'HTTP ' + response.status };
    }

    const buffer = await response.buffer();
    const size = (buffer.length / 1024).toFixed(2);

    console.log('   ✅ 成功! (' + duration + 'ms, ' + size + 'KB)');
    return { success: true, duration, size: buffer.length };

  } catch (error) {
    const endTime = Date.now();
    const duration = endTime - startTime;

    if (error.name === 'AbortError') {
      console.log('   ❌ 超时 (>30000ms)');
      return { success: false, duration, error: 'Timeout' };
    }

    console.log('   ❌ 失败: ' + error.message + ' (' + duration + 'ms)');
    return { success: false, duration, error: error.message };
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('有道语音API测试');
  console.log('============================================================');

  const results = [];

  for (const word of testWords) {
    const result = await testYoudaoAPI(word, '2');
    results.push({ word, ...result });

    // 等待1秒再测试下一个，避免触发限流
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log('\n============================================================');
  console.log('测试结果汇总');
  console.log('============================================================');

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => r.error).length;

  console.log('\n成功: ' + successCount + '/' + testWords.length);
  console.log('失败: ' + failCount + '/' + testWords.length);

  const successful = results.filter(r => r.success);
  if (successful.length > 0) {
    const avgDuration = successful.reduce((sum, r) => sum + r.duration, 0) / successful.length;
    const maxDuration = Math.max(...successful.map(r => r.duration));
    const minDuration = Math.min(...successful.map(r => r.duration));

    console.log('\n成功请求耗时:');
    console.log('  平均: ' + avgDuration.toFixed(0) + 'ms');
    console.log('  最快: ' + minDuration + 'ms');
    console.log('  最慢: ' + maxDuration + 'ms');
  }

  const failed = results.filter(r => !r.success);
  if (failed.length > 0) {
    console.log('\n失败的请求:');
    failed.forEach(r => {
      console.log('  ' + r.word + ': ' + r.error);
    });
  }
}

runTests().catch(console.error);
