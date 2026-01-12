/**
 * 场景测试：自定义词库创建
 *
 * 测试目标：验证用户创建自定义词库的流程
 *
 * 测试覆盖：
 * - ✅ 创建词库表单
 * - ✅ 智能录入功能
 * - ✅ API调用获取单词信息
 * - ✅ 添加章节
 * - ✅ 添加单词
 * - ✅ 词库列表显示新词库
 *
 * 优先级: P1
 */

import { test, expect } from '@playwright/test';
import { quickLogin } from '../helpers/auth-helpers';

test.describe('自定义词库创建', () => {
  test.beforeEach(async ({ page }) => {
    await quickLogin(page);
  });

  test('CUSTOM-01: 进入创建自定义词库页面', async ({ page }) => {
    await page.goto('/library');
    await page.click('text=创建词库');
    await expect(page).toHaveURL(/\/word-books\/create|\/my-wordbooks\/create/);
  });

  test('CUSTOM-02: 创建词库基本信息', async ({ page }) => {
    await page.goto('/library/my-wordbooks/create');

    const bookTitle = `我的生词本-${Date.now()}`;

    // 填写基本信息
    await page.fill('input[name="title"]', bookTitle);
    await page.fill('textarea[name="description"]', '我的个人生词本');

    // 提交
    await page.click('button[type="submit"]');

    // 验证创建成功
    await page.waitForURL(/\/my-wordbooks\/[a-f0-9-]+/, { timeout: 10000 });
    await expect(page.locator(`text=${bookTitle}`)).toBeVisible();
  });

  test('CUSTOM-03: 添加章节', async ({ page }) => {
    // 先创建词库
    await page.goto('/library/my-wordbooks/create');
    const bookTitle = `测试词库-${Date.now()}`;
    await page.fill('input[name="title"]', bookTitle);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(1000);

    // 添加章节
    await page.click('text=添加章节');
    await page.fill('input[name="chapterTitle"]', '第一章');
    await page.click('button:has-text("确定")');

    // 验证章节添加成功
    await expect(page.locator('text=第一章')).toBeVisible();
  });

  test('CUSTOM-04: 智能录入单词', async ({ page }) => {
    // 进入添加单词页面
    await page.goto('/library/my-wordbooks');
    await page.click('[data-testid="book-card"]:first-child');
    await page.click('text=添加单词');

    // 使用智能录入
    await page.fill('input[name="word"]', 'hello');
    await page.click('text=智能识别|自动填充');

    // 等待API调用
    await page.waitForTimeout(2000);

    // 验证自动填充的信息
    const phonetic = await page.locator('input[name="phonetic"]').inputValue();
    const definition = await page.locator('textarea[name="definition"]').inputValue();

    expect(phonetic || definition).toBeTruthy();
  });

  test('CUSTOM-05: 手动添加单词', async ({ page }) => {
    await page.goto('/library/my-wordbooks');
    await page.click('[data-testid="book-card"]:first-child');
    await page.click('text=添加单词');

    // 手动填写所有字段
    await page.fill('input[name="word"]', 'hello');
    await page.fill('input[name="phonetic"]', '/həˈloʊ/');
    await page.selectOption('select[name="partOfSpeech"]', '感叹词');
    await page.fill('textarea[name="definition"]', '你好；问候');
    await page.fill('textarea[name="exampleSentence"]', 'Hello, how are you?');

    // 提交
    await page.click('button[type="submit"]');

    // 验证添加成功
    await page.waitForTimeout(1000);
    await expect(page.locator('text=hello')).toBeVisible();
  });

  test('CUSTOM-06: 批量添加单词', async ({ page }) => {
    await page.goto('/library/my-wordbooks');
    await page.click('[data-testid="book-card"]:first-child');
    await page.click('text=批量添加');

    // 输入多个单词
    const wordList = 'hello\nworld\ntest\nstudy\nlearn';
    await page.fill('textarea[name="wordList"]', wordList);

    // 提交
    await page.click('button[type="submit"]');

    // 验证添加成功
    await page.waitForTimeout(2000);
    await page.click('text=查看单词列表');
    await expect(page.locator('text=hello')).toBeVisible();
    await expect(page.locator('text=world')).toBeVisible();
  });
});
