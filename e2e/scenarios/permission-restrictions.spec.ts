/**
 * 场景测试：用户权限限制
 *
 * 测试目标：验证权限系统对用户访问的限制
 *
 * 测试覆盖：
 * - ✅ 封禁用户访问限制
 * - ✅ 封禁提示显示
 * - ✅ 普通用户后台访问限制
 * - ✅ 403错误页面
 * - ✅ 中间件权限验证
 *
 * 优先级: P1
 */

import { test, expect } from '@playwright/test';
import { TEST_USERS } from '../helpers/test-data';

test.describe('用户权限限制', () => {
  test('PERM-01: 封禁用户访问学习页面', async ({ page }) => {
    // 使用封禁用户登录
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_USERS.BANNED.email);
    await page.fill('input[name="password"]', TEST_USERS.BANNED.password);
    await page.click('button[type="submit"]');

    // 验证显示封禁提示或跳转
    const isBannedPage = page.url().includes('/banned');
    const hasBanMessage = await page.locator('text=账号已被封禁').isVisible();

    expect(isBannedPage || hasBanMessage).toBeTruthy();
  });

  test('PERM-02: 封禁用户访问词库列表', async ({ page }) => {
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_USERS.BANNED.email);
    await page.fill('input[name="password"]', TEST_USERS.BANNED.password);
    await page.click('button[type="submit"]');

    // 尝试访问词库列表
    await page.goto('/library');

    // 验证无法访问
    const isBannedPage = page.url().includes('/banned');
    const hasBanMessage = await page.locator('text=账号已被封禁|已被禁用').isVisible();

    expect(isBannedPage || hasBanMessage).toBeTruthy();
  });

  test('PERM-03: 普通用户访问管理后台', async ({ page }) => {
    // 普通用户登录
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_USERS.USER1.email);
    await page.fill('input[name="password"]', TEST_USERS.USER1.password);
    await page.click('button[type="submit"]');

    // 尝试访问管理后台
    await page.goto('/admin/dashboard');

    // 验证403或重定向
    const is403 = page.url().includes('/403') || page.url().includes('/forbidden');
    const isRedirected = page.url().includes('/login');
    const hasError = await page.locator('text=无权访问|权限不足|403').isVisible();

    expect(is403 || isRedirected || hasError).toBeTruthy();
  });

  test('PERM-04: 未登录用户访问学习页面', async ({ page }) => {
    // 不登录直接访问学习页面
    await page.goto('/study/10000000-0000-0000-0000-000000000001/flashcards');

    // 验证重定向到登录页
    await expect(page).toHaveURL(/\/login/);
  });

  test('PERM-05: API权限验证 - 管理员API', async ({ page }) => {
    // 普通用户登录
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_USERS.USER1.email);
    await page.fill('input[name="password"]', TEST_USERS.USER1.password);
    await page.click('button[type="submit"]');

    // 尝试调用管理员API
    const response = await page.request.get('/api/admin/word-books');

    // 验证返回401或403
    expect([401, 403]).toContain(response.status());
  });

  test('PERM-06: 权限提示信息友好性', async ({ page }) => {
    // 普通用户尝试访问管理后台
    await page.goto('/login');
    await page.fill('input[name="email"]', TEST_USERS.USER1.email);
    await page.fill('input[name="password"]', TEST_USERS.USER1.password);
    await page.click('button[type="submit"]');

    await page.goto('/admin/dashboard');

    // 验证显示友好的错误提示
    const errorMessage = await page.locator('text=权限|需要管理员身份').isVisible();
    const hasHelpLink = await page.locator('a[href="/"]').isVisible();

    expect(errorMessage || hasHelpLink).toBeTruthy();
  });
});
