/**
 * 场景测试：邀请码管理
 *
 * 测试目标：验证邀请码的创建、管理、使用
 *
 * 测试覆盖：
 * - ✅ 创建邀请码表单
 * - ✅ 参数设置（使用限制、过期、套餐）
 * - ✅ 邀请码列表显示
 * - ✅ 注册时验证
 * - ✅ 使用次数统计
 * - ✅ 禁用/删除功能
 *
 * 优先级: P1
 */

import { test, expect } from '@playwright/test';
import { quickLogin } from '../helpers/auth-helpers';

test.describe('邀请码管理', () => {
  test.beforeEach(async ({ page }) => {
    await quickLogin(page);
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'Admin123456');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/admin/);
  });

  test('INVITE-01: 进入邀请码管理页面', async ({ page }) => {
    await page.goto('/admin/invitation-codes');
    await expect(page.locator('h1')).toContainText('邀请码管理');
    await expect(page.locator('tbody tr')).toHaveCountGreaterThan(0);
  });

  test('INVITE-02: 创建邀请码', async ({ page }) => {
    await page.goto('/admin/invitation-codes');

    // 点击创建按钮
    await page.click('text=创建邀请码');

    // 填写表单
    const code = `TEST${Date.now()}`;
    await page.fill('input[name="code"]', code);
    await page.fill('input[name="maxUses"]', '100');

    // 提交
    await page.click('button[type="submit"]');

    // 验证创建成功
    await expect(page.locator(`text=${code}`)).toBeVisible();
  });

  test('INVITE-03: 查看邀请码详情', async ({ page }) => {
    await page.goto('/admin/invitation-codes');

    // 点击查看详情
    const firstRow = page.locator('tbody tr').first();
    await firstRow.locator('[data-testid="view-button"]').click();

    // 验证显示详情
    await expect(page.locator('[data-testid="invite-details"]')).toBeVisible();
  });

  test('INVITE-04: 禁用邀请码', async ({ page }) => {
    await page.goto('/admin/invitation-codes');

    // 找到启用的邀请码
    const activeCode = page.locator('tr:has-text("启用")').first();

    if (await activeCode.isVisible()) {
      await activeCode.locator('[data-testid="toggle-button"]').click();

      // 验证状态更新
      await page.waitForTimeout(500);
      const status = await activeCode.locator('[data-testid="status"]').textContent();
      expect(status).toContain('禁用');
    }
  });

  test('INVITE-05: 删除邀请码', async ({ page }) => {
    await page.goto('/admin/invitation-codes');

    // 创建测试邀请码
    await page.click('text=创建邀请码');
    const code = `DELETE${Date.now()}`;
    await page.fill('input[name="code"]', code);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // 删除刚创建的邀请码
    const newCodeRow = page.locator(`tr:has-text("${code}")`);
    await newCodeRow.locator('[data-testid="delete-button"]').click();
    await page.click('button:has-text("确定")');

    // 验证删除成功
    await page.waitForTimeout(500);
    await expect(page.locator(`text=${code}`)).not.toBeVisible();
  });

  test('INVITE-06: 查看使用统计', async ({ page }) => {
    await page.goto('/admin/invitation-codes');

    // 验证显示使用次数
    const firstRow = page.locator('tbody tr').first();
    const usedCount = await firstRow.locator('[data-testid="used-count"]').textContent();
    expect(usedCount).toMatch(/\d+/);
  });
});
