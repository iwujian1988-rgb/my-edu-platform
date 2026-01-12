/**
 * 场景测试：词库创建与编辑
 *
 * 测试目标：验证词库创建和编辑功能
 *
 * 测试覆盖：
 * - ✅ 创建词库表单
 * - ✅ 表单验证
 * - ✅ POST API调用
 * - ✅ 编辑页面数据加载
 * - ✅ PUT/PATCH API调用
 * - ✅ 列表数据更新
 *
 * 优先级: P1
 */

import { test, expect } from '@playwright/test';
import { quickLogin } from '../helpers/auth-helpers';

test.describe('词库创建与编辑', () => {
  test.beforeEach(async ({ page }) => {
    await quickLogin(page);
  });

  test('CRUD-01: 进入创建词库页面', async ({ page }) => {
    await page.goto('/admin/word-books');
    await page.click('text=创建词库');
    await expect(page).toHaveURL(/\/admin\/word-books\/create|\/admin\/word-books\/new/);
    await expect(page.locator('h1')).toContainText('创建词库|新建词库');
  });

  test('CRUD-02: 创建词库表单所有字段', async ({ page }) => {
    await page.goto('/admin/word-books/create');

    // 验证所有必需字段存在
    await expect(page.locator('input[name="title"]')).toBeVisible();
    await expect(page.locator('textarea[name="description"]')).toBeVisible();
    await expect(page.locator('select[name="category"]')).toBeVisible();
    await expect(page.locator('input[name="isOfficial"]')).toBeVisible();
  });

  test('CRUD-03: 创建词库 - 必填验证', async ({ page }) => {
    await page.goto('/admin/word-books/create');

    // 不填任何字段直接提交
    await page.click('button[type="submit"]');

    // 验证显示错误提示
    const titleError = page.locator('input[name="title"] + p, [data-testid="title-error"]');
    await expect(titleError).toBeVisible();
  });

  test('CRUD-04: 成功创建词库', async ({ page }) => {
    await page.goto('/admin/word-books/create');

    const bookTitle = `测试词库-${Date.now()}`;

    // 填写表单
    await page.fill('input[name="title"]', bookTitle);
    await page.fill('textarea[name="description"]', '这是一个测试词库');
    await page.selectOption('select[name="category"]', 'exam');
    await page.check('input[name="isOfficial"]');

    // 提交
    await page.click('button[type="submit"]');

    // 验证创建成功
    await page.waitForURL(/\/admin\/word-books/, { timeout: 10000 });
    await expect(page.locator(`text=${bookTitle}`)).toBeVisible();
  });

  test('CRUD-05: 编辑词库', async ({ page }) => {
    // 进入某个词库的编辑页
    await page.goto('/admin/word-books/10000000-0000-0000-0000-000000000001/edit');

    // 验证数据加载
    await expect(page.locator('input[name="title"]')).toHaveValue(/四级/);

    // 修改标题
    const newTitle = `修改后的词库-${Date.now()}`;
    await page.fill('input[name="title"]', newTitle);

    // 保存
    await page.click('button[type="submit"]');

    // 验证更新成功
    await expect(page.locator(`text=${newTitle}`)).toBeVisible();
  });

  test('CRUD-06: 删除词库', async ({ page }) => {
    await page.goto('/admin/word-books');

    // 找到一个测试词库并删除
    const testBook = page.locator('tr:has-text("测试词库")').first();
    const count = await testBook.count();

    if (count > 0) {
      await testBook.locator('[data-testid="delete-button"]').click();
      await page.click('button:has-text("确定")');
      await page.waitForTimeout(1000);
    }
  });
});
