const fetch = require('node-fetch');

async function testLocalTTS(word) {
  const startTime = Date.now();
  
  try {
    const url = 'http://localhost:3004/api/tts?text=' + encodeURIComponent(word) + '&type=2';
    
    console.log('\n📡 测试本地API: "' + word + '"');
    console.log('   URL: ' + url);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000); // 35秒超时
    
    const response = await fetch(url, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('   ❌ HTTP ' + response.status + ' (' + duration + 'ms)');
      console.log('   错误: ' + errorText);
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
      console.log('   ❌ 超时 (>35000ms)');
      return { success: false, duration, error: 'Timeout' };
    }
    
    console.log('   ❌ 失败: ' + error.message + ' (' + duration + 'ms)');
    return { success: false, duration, error: error.message };
  }
}

async function runTests() {
  console.log('============================================================');
  console.log('本地TTS API测试 (http://localhost:3004)');
  console.log('============================================================');
  
  const testWords = ['hello', 'world', 'computer'];
  const results = [];
  
  for (const word of testWords) {
    const result = await testLocalTTS(word);
    results.push({ word, ...result });
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n============================================================');
  console.log('测试结果汇总');
  console.log('============================================================');
  
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  
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
