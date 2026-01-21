/**
 * 手动登录测试脚本
 * 用于验证登录功能是否正常工作
 */

const { chromium } = require('playwright');

async function testLogin() {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    console.log('1. 导航到登录页面...');
    await page.goto('http://localhost:3000/login');
    await page.waitForLoadState('networkidle');
    console.log('✓ 登录页面加载成功');

    // 等待表单加载
    await page.waitForSelector('input[type="tel"]', { timeout: 5000 });
    console.log('✓ 登录表单加载成功');

    // 填写表单
    console.log('\n2. 填写登录表单...');
    await page.fill('input[type="tel"]', '18710244186');
    await page.fill('input[type="password"]', 'qkUk@ywAAdXp');
    console.log('✓ 表单填写完成');

    // 点击登录按钮
    console.log('\n3. 点击登录按钮...');
    await page.click('button[type="submit"]');

    // 等待跳转（最多15秒）
    console.log('\n4. 等待跳转...');

    // 检查是否有错误信息
    try {
      await page.waitForSelector('[data-testid="error-message"], text=⚠️', { timeout: 3000 });
      const errorText = await page.textContent('text=⚠️');
      console.error('✗ 登录失败，错误信息:', errorText);
    } catch (e) {
      // 没有错误信息，继续等待跳转
    }

    // 等待URL变化
    await page.waitForURL(/\/library|\/$/, { timeout: 15000 });
    console.log('✓ 页面跳转成功');
    console.log('✓ 当前URL:', page.url());

    // 截图
    await page.screenshot({ path: 'test-login-success.png' });
    console.log('\n✓ 登录测试通过！');

  } catch (error) {
    console.error('\n✗ 登录测试失败:', error.message);

    // 截图保存失败状态
    await page.screenshot({ path: 'test-login-failed.png' });
    console.log('当前URL:', page.url());

    // 检查是否有错误消息
    try {
      const errorElement = await page.$('text=⚠️');
      if (errorElement) {
        const errorText = await errorElement.textContent();
        console.log('页面错误信息:', errorText);
      }
    } catch (e) {}

  } finally {
    await browser.close();
  }
}

testLogin();
