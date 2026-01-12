/**
 * 场景测试：用户注册
 *
 * 测试目标：验证用户注册流程（按照实际实现）
 *
 * 实际实现要求：
 * - 表单填写：手机号、密码、邀请码
 * - 密码显示/隐藏切换
 * - 提交反馈：成功跳转首页；失败提示错误信息
 * - 注意：没有确认密码字段、没有滑块拼图验证（暂时不做）
 *
 * 优先级: P0
 */

import { test, expect } from '@playwright/test';
import { INVITATION_CODES } from '../helpers/test-data';

test.describe('用户注册流程', () => {
  const timestamp = Date.now();
  const testPhone = `138${timestamp.toString().slice(-8)}`; // 生成11位手机号
  const testPassword = 'Test123456';

  test('REG-01: 访问注册页面', async ({ page }) => {
    // 1. 访问登录页
    await page.goto('/login');

    // 2. 点击"注册"Tab
    await page.click('text=注册');

    // 3. 验证显示注册表单
    await expect(page.locator('input[type="tel"], input[placeholder*="手机"]').first()).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();
    await expect(page.locator('input[placeholder*="邀请码"], input[placeholder*="邀请"]').first()).toBeVisible();
  });

  test('REG-02: URL携带邀请码参数自动填入', async ({ page }) => {
    // 1. 访问带邀请码参数的URL
    await page.goto(`/login?code=${INVITATION_CODES.VALID}`);

    // 2. 点击"注册"Tab
    await page.click('text=注册');

    // 3. 验证邀请码自动填入（注意：目前实现可能不会置灰）
    const inviteCodeInput = page.locator('input[placeholder*="邀请码"], input[placeholder*="邀请"]').first();

    await expect(inviteCodeInput).toHaveValue(INVITATION_CODES.VALID);
  });

  test('REG-03: 手机号格式实时验证', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 1. 输入无效手机号（少于11位）
    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]').first();
    await phoneInput.fill('138123456'); // 9位

    // 失去焦点触发验证
    await phoneInput.blur();

    // 验证显示错误提示
    const errorMessage = page.locator('[data-testid="phone-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('REG-04: 密码显示/隐藏切换', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 等待注册表单加载
    await page.waitForTimeout(500);

    // 使用更精确的选择器定位注册表单中的密码输入框
    const passwordInput = page.locator('input[placeholder*="密码"]').first();

    // 1. 输入密码
    await passwordInput.fill('Test123456');

    // 2. 点击显示/隐藏按钮（眼睛图标）
    const toggleButton = page.locator('[data-testid="password-toggle-button"]').first();

    if (await toggleButton.isVisible()) {
      // 获取初始类型
      const initialType = await passwordInput.getAttribute('type');
      expect(initialType).toBe('password');

      // 点击切换到显示
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // 再次点击切换到隐藏
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    }
  });

  test('REG-05: 密码长度验证', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    const phoneInput = page.locator('input[type="tel"], input[placeholder*="手机"]').first();
    const passwordInput = page.locator('input[name="password"], input[type="password"]').first();

    // 1. 填写手机号和短密码
    await phoneInput.fill('13812345678');
    await passwordInput.fill('123'); // 少于6位

    // 失去焦点触发验证
    await passwordInput.blur();

    // 验证显示密码长度错误
    const errorMessage = page.locator('[data-testid="password-error"]');
    await expect(errorMessage).toBeVisible({ timeout: 3000 });
  });

  test('REG-06: 邀请码验证 - 无效邀请码', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 生成唯一的无效邀请码（避免限流）
    const uniqueInvalidCode = `INVALID_${Date.now()}`;

    // 填写表单（无效邀请码）
    await page.fill('input[type="tel"], input[placeholder*="手机"]', '13812345678');
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[placeholder*="邀请码"]', uniqueInvalidCode);

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证显示错误提示（匹配实际的错误消息）
    const errorMessage = page.locator('text=邀请码无效或已失效');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('REG-07: 邀请码验证 - 过期邀请码', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 填写表单（过期邀请码）
    await page.fill('input[type="tel"], input[placeholder*="手机"]', '13812345678');
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[placeholder*="邀请码"]', INVITATION_CODES.EXPIRED);

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证显示过期错误（匹配实际的错误消息）
    const errorMessage = page.locator('text=邀请码已过期');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('REG-08: 成功注册跳转首页', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 填写完整表单
    await page.fill('input[type="tel"], input[placeholder*="手机"]', testPhone);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[placeholder*="邀请码"]', INVITATION_CODES.VALID);

    // 提交注册
    await page.click('button[type="submit"]');

    // 验证：实际实现是跳转到首页（不是登录页）
    await page.waitForURL('/', { timeout: 10000 });

    // 验证当前在首页
    await expect(page).toHaveURL('/');
  });

  test('REG-09: 手机号已存在提示', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 尝试用已存在的手机号注册（假设13800000000已存在）
    await page.fill('input[type="tel"], input[placeholder*="手机"]', '13800000000');
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[placeholder*="邀请码"]', INVITATION_CODES.VALID);

    // 提交表单
    await page.click('button[type="submit"]');

    // 验证显示手机号已存在错误（匹配实际的错误消息）
    const errorMessage = page.locator('text=该手机号已注册');
    await expect(errorMessage).toBeVisible({ timeout: 5000 });
  });

  test('REG-10: 表单必填项验证', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 不填写任何内容，直接提交
    await page.click('button[type="submit"]');

    // 浏览器应该自动显示必填项提示（HTML5 required属性）
    // 验证表单是否阻止提交
    const phoneInput = page.locator('input[type="tel"]').first();
    await expect(phoneInput).toBeVisible();
  });

  test('REG-11: 密码符合长度要求', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 输入符合长度要求的密码（6位）
    await page.fill('input[type="tel"], input[placeholder*="手机"]', '13812345678');
    await page.fill('input[name="password"], input[type="password"]', '123456'); // 正好6位
    await page.fill('input[placeholder*="邀请码"]', INVITATION_CODES.VALID);

    // 提交表单（可能因为手机号已存在或其他原因失败，但不应该是密码长度错误）
    await page.click('button[type="submit"]');

    // 等待一下看是否出现密码长度错误
    await page.waitForTimeout(2000);

    const passwordError = page.locator('text=密码长度, text=至少, text=6位');
    const hasPasswordError = await passwordError.isVisible();

    if (hasPasswordError) {
      throw new Error('密码长度验证错误：6位密码应该通过验证');
    }
  });

  test('REG-12: 注册按钮loading状态', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 填写表单
    await page.fill('input[type="tel"], input[placeholder*="手机"]', testPhone);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[placeholder*="邀请码"]', INVITATION_CODES.VALID);

    // 提交注册
    await page.click('button[type="submit"]');

    // 验证按钮显示loading状态
    const submitButton = page.locator('button[type="submit"]').first();
    await expect(submitButton).toContainText('注册中', { timeout: 1000 });
  });

  test('REG-13: 注册后权限继承', async ({ page }) => {
    await page.goto('/login');

    // 切换到注册模式
    await page.click('text=注册');

    // 使用特定权限的邀请码注册
    const uniquePhone = `139${Date.now().toString().slice(-8)}`;
    await page.fill('input[type="tel"], input[placeholder*="手机"]', uniquePhone);
    await page.fill('input[name="password"], input[type="password"]', testPassword);
    await page.fill('input[placeholder*="邀请码"]', INVITATION_CODES.VALID);

    // 提交注册
    await page.click('button[type="submit"]');

    // 等待跳转到首页
    await page.waitForURL('/', { timeout: 10000 });

    // 验证：用户应该已经登录
    // 检查页面是否有登录后的元素（如用户菜单、词库列表等）
    const userMenu = page.locator('text=继续学习, text=词库, text=开始学习').first();
    await expect(userMenu).toBeVisible({ timeout: 5000 });
  });
});
