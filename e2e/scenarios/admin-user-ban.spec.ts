/**
 * 场景测试：用户封禁/解封功能
 *
 * 测试目标：验证用户封禁和解封功能，包括前后台联动
 *
 * 测试覆盖：
 * - ✅ 封禁按钮和对话框
 * - ✅ 封禁原因输入
 * - ✅ 封禁API调用
 * - ✅ 前台访问限制
 * - ✅ 解封按钮和API
 * - ✅ 状态恢复
 *
 * 优先级: P0
 */

import { test, expect } from '@playwright/test';
import { quickLogin } from '../helpers/auth-helpers';
import { TEST_USERS } from '../helpers/test-data';

test.describe('用户封禁/解封功能', () => {
  let adminPage;
  let userPage;

  test.beforeEach(async ({ browser }) => {
    // 创建两个context：管理员和普通用户
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    adminPage = await adminContext.newPage();
    userPage = await userContext.newPage();

    // 管理员登录
    await adminPage.goto('/login');
    await adminPage.fill('input[name="email"]', 'admin@example.com');
    await adminPage.fill('input[name="password"]', 'Admin123456');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL(/\/admin/, { timeout: 5000 });

    // 普通用户登录
    await quickLogin(userPage);
  });

  test.afterEach(async () => {
    await adminPage.close();
    await userPage.close();
  });

  test('BAN-01: 进入用户管理页面', async ({ page }) => {
    await page.goto('/admin/users');
    await expect(page.locator('h1')).toContainText('用户管理');
    await expect(page.locator('tbody tr')).toHaveCountGreaterThan(0);
  });

  test('BAN-02: 搜索用户', async ({ page }) => {
    await page.goto('/admin/users');
    await page.fill('input[name="search"]', 'test-user1');
    await page.press('input[name="search"]', 'Enter');
    await page.waitForTimeout(500);
    await expect(page.locator(`text=${TEST_USERS.USER1.email}`)).toBeVisible();
  });

  test('BAN-03: 封禁用户', async ({ page }) => {
    await page.goto('/admin/users');

    // 找到test-user2
    const userRow = page.locator(`tr:has-text("${TEST_USERS.USER2.email}")`);
    await expect(userRow).toBeVisible();

    // 记录初始状态
    const initialStatus = await userRow.locator('[data-testid="user-status"]').textContent();

    // 点击封禁按钮
    await userRow.locator('[data-testid="ban-button"]').click();

    // 输入封禁原因
    await page.fill('textarea[name="banReason"]', '测试封禁功能');

    // 提交封禁
    await page.click('button:has-text("确定封禁")');

    // 验证状态更新
    await page.waitForTimeout(1000);
    const newStatus = await userRow.locator('[data-testid="user-status"]').textContent();
    expect(newStatus).not.toBe(initialStatus);
    expect(newStatus).toContain('已封禁');
  });

  test('BAN-04: 封禁后前台限制', async ({ page }) => {
    // 这个测试需要两个页面，使用adminPage
    // 管理员封禁用户
    await adminPage.goto('/admin/users');
    const userRow = adminPage.locator(`tr:has-text("${TEST_USERS.USER2.email}")`);
    await userRow.locator('[data-testid="ban-button"]').click();
    await adminPage.fill('textarea[name="banReason"]', '测试封禁');
    await adminPage.click('button:has-text("确定封禁")');
    await adminPage.waitForTimeout(1000);

    // 用户在前台尝试访问
    await userPage.goto('/library');

    // 验证显示封禁提示或重定向
    const isBannedPage = userPage.url().includes('/banned');
    const hasBanMessage = await userPage.locator('text=账号已被封禁').isVisible();

    expect(isBannedPage || hasBanMessage).toBeTruthy();
  });

  test('BAN-05: 解封用户', async ({ page }) => {
    await page.goto('/admin/users');

    // 找到已封禁的用户
    const userRow = page.locator('tr:has-text("已封禁")').first();

    if (await userRow.isVisible()) {
      // 点击解封按钮
      await userRow.locator('[data-testid="unban-button"]').click();

      // 确认解封
      await page.click('button:has-text("确定解封")');

      // 验证状态恢复
      await page.waitForTimeout(1000);
      const status = await userRow.locator('[data-testid="user-status"]').textContent();
      expect(status).toContain('正常');
    }
  });

  test('BAN-06: 解封后前台恢复', async ({ page }) => {
    // 管理员解封用户
    await adminPage.goto('/admin/users');
    const userRow = adminPage.locator(`tr:has-text("${TEST_USERS.USER2.email}")`);
    await userRow.locator('[data-testid="unban-button"]').click();
    await adminPage.click('button:has-text("确定解封")');
    await adminPage.waitForTimeout(1000);

    // 用户刷新页面
    await userPage.reload();

    // 验证可以正常访问
    await expect(userPage).toHaveURL('/library');
    await expect(userPage.locator('[data-testid="book-card"]')).toHaveCountGreaterThan(0);
  });
});
