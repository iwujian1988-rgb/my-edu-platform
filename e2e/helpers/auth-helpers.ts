/**
 * 认证辅助函数
 * 提供登录、注册、登出等常用操作
 */

import { Page, expect } from '@playwright/test';
import { TEST_USERS, INVITATION_CODES, PAGES, WAIT_TIMES } from './test-data';

/**
 * 用户登录
 * @param page Playwright Page对象
 * @param phone 用户手机号
 * @param password 用户密码
 * @param expectedRedirectURL 期望重定向的URL（默认为首页）
 */
export async function loginUser(
  page: Page,
  phone: string,
  password: string,
  expectedRedirectURL: string = PAGES.LIBRARY
) {
  await page.goto(PAGES.LOGIN);

  // 等待登录表单加载
  await page.waitForSelector('input[type="tel"]', { timeout: 5000 });

  // 填写登录表单（使用手机号）
  await page.fill('input[type="tel"]', phone);
  await page.fill('input[type="password"]', password);

  // 点击登录按钮
  await page.click('button[type="submit"]');

  // 等待跳转到期望的页面
  await page.waitForURL(expectedRedirectURL, { timeout: 10000 });

  // 验证登录成功
  await expect(page).toHaveURL(expectedRedirectURL);
}

/**
 * 使用预设测试用户登录
 * @param page Playwright Page对象
 * @param userKey 测试用户key (USER1 | USER2 | BANNED)
 */
export async function loginTestUser(page: Page, userKey: 'USER1' | 'USER2' | 'BANNED' = 'USER1') {
  const user = TEST_USERS[userKey];
  return loginUser(page, user.phone || user.email, user.password);
}

/**
 * 用户注册
 * @param page Playwright Page对象
 * @param phone 用户手机号
 * @param password 用户密码
 * @param inviteCode 邀请码
 */
export async function registerUser(
  page: Page,
  phone: string,
  password: string,
  inviteCode: string = INVITATION_CODES.VALID
) {
  await page.goto(PAGES.SIGNUP);

  // 等待注册表单加载
  await page.waitForSelector('input[type="tel"]', { timeout: 5000 });

  // 填写注册表单（使用手机号）
  await page.fill('input[type="tel"]', phone);
  await page.fill('input[type="password"]', password);
  await page.fill('input[name="inviteCode"]', inviteCode);

  // 点击注册按钮
  await page.click('button[type="submit"]');

  // 等待跳转到词库列表页
  await page.waitForURL(PAGES.LIBRARY, { timeout: 10000 });

  // 验证注册成功
  await expect(page).toHaveURL(PAGES.LIBRARY);
}

/**
 * 用户登出
 * @param page Playwright Page对象
 */
export async function logoutUser(page: Page) {
  // 点击用户菜单
  await page.click('[data-testid="user-menu"]');

  // 等待菜单展开
  await page.waitForTimeout(500);

  // 点击退出登录
  await page.click('text=退出登录');

  // 等待跳转到登录页
  await page.waitForURL(PAGES.LOGIN, { timeout: 5000 });

  // 验证登出成功
  await expect(page).toHaveURL(PAGES.LOGIN);
}

/**
 * 验证用户已登录
 * @param page Playwright Page对象
 * @param expectedUsername 期望的用户名
 */
export async function verifyLoggedIn(page: Page, expectedUsername?: string) {
  // 检查是否存在用户菜单
  const userMenu = page.locator('[data-testid="user-menu"]');
  await expect(userMenu).toBeVisible();

  // 如果提供了用户名，验证用户名显示
  if (expectedUsername) {
    await expect(userMenu).toContainText(expectedUsername);
  }
}

/**
 * 验证用户未登录（在登录页）
 * @param page Playwright Page对象
 */
export async function verifyNotLoggedIn(page: Page) {
  await expect(page).toHaveURL(PAGES.LOGIN);
}

/**
 * 快速登录测试用户1（最常用）
 * @param page Playwright Page对象
 */
export async function quickLogin(page: Page) {
  return loginTestUser(page, 'USER1');
}

/**
 * 管理员登录
 * 注意：需要在TEST_USERS中配置管理员账号
 * @param page Playwright Page对象
 */
export async function loginAdmin(page: Page) {
  // 这里应该使用实际的管理员账号
  // 如果有专门的管理员测试账号，请在TEST_USERS中添加
  await page.goto(PAGES.ADMIN_DASHBOARD);

  // 如果未登录，会自动跳转到登录页
  if (page.url().includes('/login')) {
    // 使用管理员账号登录
    // TODO: 替换为实际的管理员账号
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123456');
    await page.click('button[type="submit"]');

    // 等待跳转到管理后台
    await page.waitForURL(PAGES.ADMIN_DASHBOARD, { timeout: 10000 });
  }

  // 验证在管理后台
  await expect(page).toHaveURL(/\/admin/);
}

/**
 * 捕获登录过程中的错误信息
 * @param page Playwright Page对象
 * @returns 错误信息文本，如果没有错误则返回null
 */
export async function getLoginError(page: Page): Promise<string | null> {
  const errorElement = page.locator('[data-testid="error-message"]');
  if (await errorElement.isVisible()) {
    return await errorElement.textContent();
  }
  return null;
}

/**
 * 等待登录完成后等待页面稳定
 * @param page Playwright Page对象
 */
export async function waitForLoginComplete(page: Page) {
  // 等待页面网络请求完成
  await page.waitForLoadState('networkidle');

  // 等待主要元素加载
  await page.waitForSelector('[data-testid="user-menu"], input[type="tel"]', {
    timeout: 5000
  });
}

/**
 * 检查登录表单验证
 * @param page Playwright Page对象
 * @param field 字段名
 * @param expectedError 期望的错误信息
 */
export async function expectValidationError(
  page: Page,
  field: 'phone' | 'password' | 'inviteCode',
  expectedError: string
) {
  let selector: string;
  if (field === 'phone') {
    selector = 'input[type="tel"]';
  } else {
    selector = `input[name="${field}"]`;
  }

  const fieldInput = page.locator(selector);
  const errorElement = fieldInput.locator('..').locator('text=' + expectedError);

  await expect(errorElement).toBeVisible();
}
