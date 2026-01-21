// 测试最近访问API
async function testAPI() {
  console.log('=== 测试最近访问API ===\n');

  // 测试1: 获取当前最近访问的词库
  console.log('1. GET /api/recent-books - 获取最近访问的词库');
  try {
    const response = await fetch('http://localhost:3001/api/recent-books', {
      credentials: 'include',
      headers: {
        'Cookie': process.env.TEST_COOKIE || ''
      }
    });
    console.log('   Status:', response.status);
    const data = await response.json();
    console.log('   Response:', JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('   Error:', error.message);
  }

  console.log('\n=== 提示 ===');
  console.log('请在浏览器中：');
  console.log('1. 访问 http://localhost:3001');
  console.log('2. 点击任意词库卡片');
  console.log('3. 查看浏览器控制台是否有错误');
  console.log('4. 点击浏览器返回按钮');
  console.log('5. 查看控制台是否有 "页面重新可见" 或 "页面获得焦点" 的日志');
  console.log('6. 检查"最近"标签页是否显示了刚才访问的词库');
}

testAPI();
