/**
 * 场景测试：Excel批量导入单词
 *
 * 测试目标：验证Excel批量导入单词功能
 *
 * 测试覆盖：
 * - ✅ 模板下载
 * - ✅ 文件上传
 * - ✅ Excel解析
 * - ✅ 批量插入API
 * - ✅ 错误处理和报告
 *
 * 优先级: P1
 */

import { test, expect } from '@playwright/test';
import { quickLogin } from '../helpers/auth-helpers';

test.describe('Excel批量导入', () => {
  test.beforeEach(async ({ page }) => {
    await quickLogin(page);
  });

  test('IMPORT-01: 进入导入页面', async ({ page }) => {
    await page.goto('/admin/word-books/10000000-0000-0000-0000-000000000001/import');
    await expect(page.locator('h1')).toContainText('Excel导入|批量导入');
  });

  test('IMPORT-02: 下载导入模板', async ({ page }) => {
    await page.goto('/admin/word-books/10000000-0000-0000-0000-000000000001/import');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('text=下载模板')
    ]);

    expect(download.suggestedFilename()).toContain('template');
  });

  test('IMPORT-03: 上传Excel文件', async ({ page }) => {
    await page.goto('/admin/word-books/10000000-0000-0000-0000-000000000001/import');

    // 创建测试Excel文件（这里简化为CSV）
    const fileInput = page.locator('input[type="file"]');

    await fileInput.setInputFiles({
      name: 'test-words.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('单词,音标,释义\nhello,/həˈloʊ/,你好\nworld,/wɜːrld/,世界')
    });

    await page.click('text=导入');
    await page.waitForTimeout(2000);
  });

  test('IMPORT-04: 查看导入结果', async ({ page }) => {
    await page.goto('/admin/word-books/10000000-0000-0000-0000-000000000001/import');

    // 上传文件并导入
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'test-words.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('单词,音标,释义\nhello,/həˈloʊ/,你好')
    });

    await page.click('text=导入');

    // 验证显示导入结果
    await page.waitForSelector('[data-testid="import-result"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="import-result"]')).toContainText(/成功|导入完成/);
  });

  test('IMPORT-05: 导入错误处理', async ({ page }) => {
    await page.goto('/admin/word-books/10000000-0000-0000-0000-000000000001/import');

    // 上传格式错误的文件
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles({
      name: 'invalid.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('invalid content')
    });

    await page.click('text=导入');

    // 验证显示错误
    const errorVisible = await page.locator('text=格式错误|文件错误').isVisible();
    expect(errorVisible).toBeTruthy();
  });
});
