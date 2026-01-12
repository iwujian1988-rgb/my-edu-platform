import { test, expect } from '@playwright/test';

test('调试 - 检查登录页面的表单结构', async ({ page }) => {
  await page.goto('/login');

  // 等待页面加载
  await page.waitForLoadState('networkidle');

  // 截图看看页面长什么样
  await page.screenshot({ path: 'debug-login-page.png', fullPage: true });

  console.log('=== 登录模式（默认） ===');

  // 检查登录表单的输入框
  const loginPhoneInputs = await page.locator('input[type="tel"]').all();
  console.log('找到 tel 类型输入框数量:', loginPhoneInputs.length);

  const loginPasswordInputs = await page.locator('input[type="password"]').all();
  console.log('找到 password 类型输入框数量:', loginPasswordInputs.length);

  // 切换到注册模式
  console.log('\n=== 切换到注册模式 ===');
  await page.click('text=注册');
  await page.waitForTimeout(1000);

  // 截图注册表单
  await page.screenshot({ path: 'debug-signup-page.png', fullPage: true });

  // 再次检查
  const signupPhoneInputs = await page.locator('input[type="tel"]').all();
  console.log('注册模式 - tel 类型输入框数量:', signupPhoneInputs.length);

  const signupPasswordInputs = await page.locator('input[type="password"]').all();
  console.log('注册模式 - password 类型输入框数量:', signupPasswordInputs.length);

  // 检查占位符
  const allInputs = await page.locator('input').all();
  console.log('\n所有输入框的占位符:');
  for (let i = 0; i < allInputs.length; i++) {
    const placeholder = await allInputs[i].getAttribute('placeholder');
    const type = await allInputs[i].getAttribute('type');
    console.log(`  ${i + 1}. type="${type}", placeholder="${placeholder}"`);
  }
});

test('调试 - 尝试注册流程', async ({ page }) => {
  const timestamp = Date.now();
  const testPhone = `138${timestamp.toString().slice(-8)}`;
  const testPassword = 'Test123456';

  await page.goto('/login');

  // 切换到注册
  await page.click('text=注册');
  await page.waitForTimeout(500);

  // 尝试填写表单
  const phoneInput = page.locator('input[type="tel"]').first();
  await phoneInput.fill(testPhone);
  console.log('已填写手机号:', testPhone);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(testPassword);
  console.log('已填写密码');

  const inviteInput = page.locator('input[placeholder*="邀请码"]').first();
  await inviteInput.fill('TEST1234');
  console.log('已填写邀请码');

  // 截图
  await page.screenshot({ path: 'debug-filled-form.png', fullPage: true });

  // 提交
  console.log('尝试提交表单...');
  await page.click('button[type="submit"]');

  // 等待5秒看结果
  await page.waitForTimeout(5000);

  const currentUrl = page.url();
  console.log('当前URL:', currentUrl);

  // 截图最终状态
  await page.screenshot({ path: 'debug-after-submit.png', fullPage: true });
});
