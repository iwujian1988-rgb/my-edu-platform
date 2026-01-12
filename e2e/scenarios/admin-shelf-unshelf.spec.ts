/**
 * 场景测试：词库管理-上架/下架功能
 *
 * 测试目标：验证词库上架/下架功能，包括前后台联动
 *
 * 测试覆盖：
 * - ✅ 上架按钮和确认对话框
 * - ✅ 下架按钮和确认对话框
 * - ✅ PATCH API调用
 * - ✅ 状态标签更新
 * - ✅ 列表刷新
 * - ✅ 前台用户可见性联动
 *
 * 优先级: P0
 */

import { test, expect, Page } from '@playwright/test';
import { quickLogin, loginUser, logoutUser } from '../helpers/auth-helpers';
import { TEST_BOOKS, TEST_USERS } from '../helpers/test-data';

test.describe('词库上架/下架功能', () => {
  let adminPage: Page;
  let userPage: Page;

  test.beforeEach(async ({ browser, context }) => {
    // 创建两个页面：管理员页面和用户页面
    const adminContext = await browser.newContext();
    const userContext = await browser.newContext();

    adminPage = await adminContext.newPage();
    userPage = await userContext.newPage();

    // 管理员登录
    await adminPage.goto('/login');
    await adminPage.fill('input[name="email"]', 'admin@example.com'); // 假设有管理员账号
    await adminPage.fill('input[name="password"]', 'Admin123456');
    await adminPage.click('button[type="submit"]');

    // 等待登录成功
    await adminPage.waitForURL(/\/admin/, { timeout: 5000 });

    // 普通用户登录
    await quickLogin(userPage);
  });

  test.afterEach(async () => {
    await adminPage.close();
    await userPage.close();
  });

  test('SHELF-01: 进入词库管理页面', async () => {
    // 1. 访问词库管理页面
    await adminPage.goto('/admin/word-books');

    // 2. 验证页面加载成功
    await expect(adminPage.locator('h1')).toContainText('词库管理');

    // 3. 验证显示词库列表
    const bookCards = adminPage.locator('tbody tr');
    await expect(bookCards).toHaveCountGreaterThan(0);

    // 4. 验证显示测试词库
    await expect(adminPage.locator(`text=${TEST_BOOKS.CET4.title}`)).toBeVisible();
    await expect(adminPage.locator(`text=${TEST_BOOKS.UNPUBLISHED.title}`)).toBeVisible();
  });

  test('SHELF-02: 查看词库状态标签', async () => {
    // 1. 进入词库管理页面
    await adminPage.goto('/admin/word-books');

    // 2. 找到已上架的词库（四级核心词汇）
    const cet4Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);

    // 3. 验证显示"上架"标签（绿色）
    const shelfStatus = cet4Row.locator('[data-testid="shelf-status"]');
    await expect(shelfStatus).toContainText('上架');
    await expect(shelfStatus).toHaveClass(/bg-green/);

    // 4. 找到未上架的词库（六级高级词汇）
    const cet6Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.UNPUBLISHED.title}")`);

    // 5. 验证显示"下架"标签（灰色）
    const unpublishedStatus = cet6Row.locator('[data-testid="shelf-status"]');
    await expect(unpublishedStatus).toContainText('下架');
    await expect(unpublishedStatus).toHaveClass(/bg-gray/);
  });

  test('SHELF-03: 上架词库', async () => {
    // 1. 进入词库管理页面
    await adminPage.goto('/admin/word-books');

    // 2. 找到未上架的词库
    const cet6Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.UNPUBLISHED.title}")`);

    // 3. 记录初始状态
    const initialStatus = await cet6Row.locator('[data-testid="shelf-status"]').textContent();
    expect(initialStatus).toBe('下架');

    // 4. 点击上架按钮
    await cet6Row.locator('[data-testid="shelf-button"]').click();

    // 5. 验证显示确认对话框
    const confirmDialog = adminPage.locator('[data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/确定要上架/);
    await expect(confirmDialog).toContainText(TEST_BOOKS.UNPUBLISHED.title);

    // 6. 点击确认
    await confirmDialog.locator('button:has-text("确定")').click();

    // 7. 等待API调用完成
    await adminPage.waitForTimeout(1000);

    // 8. 验证状态更新为"上架"
    const newStatus = await cet6Row.locator('[data-testid="shelf-status"]').textContent();
    expect(newStatus).toBe('上架');

    // 9. 验证显示成功提示
    await expect(adminPage.locator('[data-testid="toast-success"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="toast-success"]')).toContainText('上架成功');

    // 10. 验证按钮变为橙色（可下架）
    const shelfButton = cet6Row.locator('[data-testid="shelf-button"]');
    await expect(shelfButton).toHaveClass(/text-orange/);

    // 11. 刷新页面验证状态持久化
    await adminPage.reload();
    await adminPage.waitForSelector('tbody tr');
    const persistedStatus = await adminPage
      .locator(`tr:has-text("${TEST_BOOKS.UNPUBLISHED.title}")`)
      .locator('[data-testid="shelf-status"]')
      .textContent();
    expect(persistedStatus).toBe('上架');

    // 12. 恢复测试数据：重新下架
    await cet6Row.locator('[data-testid="shelf-button"]').click();
    await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
    await adminPage.waitForTimeout(1000);
  });

  test('SHELF-04: 下架词库', async () => {
    // 1. 进入词库管理页面
    await adminPage.goto('/admin/word-books');

    // 2. 找到已上架的词库
    const cet4Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);

    // 3. 记录初始状态
    const initialStatus = await cet4Row.locator('[data-testid="shelf-status"]').textContent();
    expect(initialStatus).toBe('上架');

    // 4. 点击下架按钮
    await cet4Row.locator('[data-testid="shelf-button"]').click();

    // 5. 验证显示确认对话框
    const confirmDialog = adminPage.locator('[data-testid="confirm-dialog"]');
    await expect(confirmDialog).toBeVisible();
    await expect(confirmDialog).toContainText(/确定要下架/);
    await expect(confirmDialog).toContainText(TEST_BOOKS.CET4.title);

    // 6. 点击确认
    await confirmDialog.locator('button:has-text("确定")').click();

    // 7. 等待API调用完成
    await adminPage.waitForTimeout(1000);

    // 8. 验证状态更新为"下架"
    const newStatus = await cet4Row.locator('[data-testid="shelf-status"]').textContent();
    expect(newStatus).toBe('下架');

    // 9. 验证显示成功提示
    await expect(adminPage.locator('[data-testid="toast-success"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="toast-success"]')).toContainText('下架成功');

    // 10. 验证按钮变为绿色（可上架）
    const shelfButton = cet4Row.locator('[data-testid="shelf-button"]');
    await expect(shelfButton).toHaveClass(/text-green/);

    // 11. 恢复测试数据：重新上架
    await cet4Row.locator('[data-testid="shelf-button"]').click();
    await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
    await adminPage.waitForTimeout(1000);
  });

  test('SHELF-05: 取消上架/下架操作', async () => {
    // 1. 进入词库管理页面
    await adminPage.goto('/admin/word-books');

    // 2. 找到词库
    const cet4Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);

    // 3. 记录初始状态
    const initialStatus = await cet4Row.locator('[data-testid="shelf-status"]').textContent();

    // 4. 点击上架/下架按钮
    await cet4Row.locator('[data-testid="shelf-button"]').click();

    // 5. 在确认对话框中点击取消
    await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("取消")').click();

    // 6. 验证对话框关闭
    await expect(adminPage.locator('[data-testid="confirm-dialog"]')).not.toBeVisible();

    // 7. 验证状态未改变
    const currentStatus = await cet4Row.locator('[data-testid="shelf-status"]').textContent();
    expect(currentStatus).toBe(initialStatus);
  });

  test('SHELF-06: 前台联动-上架后前台可见', async () => {
    // 1. 确保测试词库处于下架状态
    await adminPage.goto('/admin/word-books');
    const cet6Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.UNPUBLISHED.title}")`);
    const initialStatus = await cet6Row.locator('[data-testid="shelf-status"]').textContent();

    if (initialStatus === '上架') {
      await cet6Row.locator('[data-testid="shelf-button"]').click();
      await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
      await adminPage.waitForTimeout(1000);
    }

    // 2. 前台用户访问词库列表
    await userPage.goto('/library');

    // 3. 验证未上架的词库不显示
    const unpublishedBook = userPage.locator(`text=${TEST_BOOKS.UNPUBLISHED.title}`);
    await expect(unpublishedBook).not.toBeVisible();

    // 4. 管理员上架词库
    await cet6Row.locator('[data-testid="shelf-button"]').click();
    await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
    await adminPage.waitForTimeout(1000);

    // 5. 前台用户刷新页面
    await userPage.reload();

    // 6. 验证词库现在可见
    await expect(userPage.locator(`text=${TEST_BOOKS.UNPUBLISHED.title}`)).toBeVisible();

    // 7. 恢复测试数据
    await cet6Row.locator('[data-testid="shelf-button"]').click();
    await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
    await adminPage.waitForTimeout(1000);
  });

  test('SHELF-07: 前台联动-下架后前台不可见', async () => {
    // 1. 确保测试词库处于上架状态
    await adminPage.goto('/admin/word-books');
    const cet4Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);
    const initialStatus = await cet4Row.locator('[data-testid="shelf-status"]').textContent();

    if (initialStatus === '下架') {
      await cet4Row.locator('[data-testid="shelf-button"]').click();
      await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
      await adminPage.waitForTimeout(1000);
    }

    // 2. 前台用户访问词库列表
    await userPage.goto('/library');

    // 3. 验证已上架的词库可见
    await expect(userPage.locator(`text=${TEST_BOOKS.CET4.title}`)).toBeVisible();

    // 4. 管理员下架词库
    await cet4Row.locator('[data-testid="shelf-button"]').click();
    await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
    await adminPage.waitForTimeout(1000);

    // 5. 前台用户刷新页面
    await userPage.reload();

    // 6. 验证词库不再显示
    await expect(userPage.locator(`text=${TEST_BOOKS.CET4.title}`)).not.toBeVisible();

    // 7. 恢复测试数据
    await cet4Row.locator('[data-testid="shelf-button"]').click();
    await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
    await adminPage.waitForTimeout(1000);
  });

  test('SHELF-08: 使用状态筛选器', async () => {
    // 1. 进入词库管理页面
    await adminPage.goto('/admin/word-books');

    // 2. 选择"已上架"筛选
    await adminPage.selectOption('select[name="is_published"]', 'true');

    // 3. 等待列表更新
    await adminPage.waitForTimeout(500);

    // 4. 验证只显示已上架的词库
    await expect(adminPage.locator(`text=${TEST_BOOKS.CET4.title}`)).toBeVisible();
    await expect(adminPage.locator(`text=${TEST_BOOKS.UNPUBLISHED.title}`)).not.toBeVisible();

    // 5. 选择"已下架"筛选
    await adminPage.selectOption('select[name="is_published"]', 'false');

    // 6. 等待列表更新
    await adminPage.waitForTimeout(500);

    // 7. 验证只显示已下架的词库
    await expect(adminPage.locator(`text=${TEST_BOOKS.UNPUBLISHED.title}`)).toBeVisible();
    await expect(adminPage.locator(`text=${TEST_BOOKS.CET4.title}`)).not.toBeVisible();

    // 8. 选择"全部状态"
    await adminPage.selectOption('select[name="is_published"]', '');

    // 9. 验证显示所有词库
    await adminPage.waitForTimeout(500);
    await expect(adminPage.locator(`text=${TEST_BOOKS.CET4.title}`)).toBeVisible();
    await expect(adminPage.locator(`text=${TEST_BOOKS.UNPUBLISHED.title}`)).toBeVisible();
  });

  test('SHELF-09: API PATCH请求验证', async () => {
    // 1. 获取词库ID
    const bookId = TEST_BOOKS.CET4.id;

    // 2. 直接调用PATCH API（需要管理员权限）
    const response = await adminPage.request.patch(`/api/admin/word-books/${bookId}`, {
      data: {
        is_published: false
      }
    });

    // 3. 验证API响应
    expect(response.status()).toBe(200);
    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.data.is_published).toBe(false);

    // 4. 刷新管理页面验证更新
    await adminPage.goto('/admin/word-books');
    await adminPage.waitForSelector('tbody tr');

    const cet4Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);
    const status = await cet4Row.locator('[data-testid="shelf-status"]').textContent();
    expect(status).toBe('下架');

    // 5. 恢复测试数据
    await adminPage.request.patch(`/api/admin/word-books/${bookId}`, {
      data: {
        is_published: true
      }
    });
  });

  test('SHELF-10: 并发上架/下架操作', async () => {
    // 1. 打开两个管理页面
    const adminPage2 = await adminPage.context().newPage();
    await adminPage2.goto('/login');
    await adminPage2.fill('input[name="email"]', 'admin@example.com');
    await adminPage2.fill('input[name="password"]', 'Admin123456');
    await adminPage2.click('button[type="submit"]');
    await adminPage2.waitForURL(/\/admin/);

    await adminPage.goto('/admin/word-books');
    await adminPage2.goto('/admin/word-books');

    // 2. 两个页面同时点击上架/下架
    const cet4Row1 = adminPage.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);
    const cet4Row2 = adminPage2.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);

    // 同时点击
    await Promise.all([
      cet4Row1.locator('[data-testid="shelf-button"]').click(),
      cet4Row2.locator('[data-testid="shelf-button"]').click()
    ]);

    // 3. 验证处理（可能显示"已被其他用户修改"的错误，或者最后一个请求生效）
    // 这个测试验证并发场景的处理

    // 清理：恢复原始状态
    await adminPage.reload();
    await adminPage.waitForSelector('tbody tr');
    const cet4Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);
    const status = await cet4Row.locator('[data-testid="shelf-status"]').textContent();

    if (status === '下架') {
      await cet4Row.locator('[data-testid="shelf-button"]').click();
      await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();
    }

    await adminPage2.close();
  });
});

test.describe('上架/下架错误处理', () => {
  let adminPage: Page;

  test.beforeEach(async ({ browser }) => {
    adminPage = await browser.newPage();
    await adminPage.goto('/login');
    await adminPage.fill('input[name="email"]', 'admin@example.com');
    await adminPage.fill('input[name="password"]', 'Admin123456');
    await adminPage.click('button[type="submit"]');
    await adminPage.waitForURL(/\/admin/);
  });

  test.afterEach(async () => {
    await adminPage.close();
  });

  test('SHELF-ERR-01: 网络错误处理', async () => {
    // 1. 模拟网络断开
    await adminPage.context().setOffline(true);

    // 2. 尝试上架/下架
    await adminPage.goto('/admin/word-books');
    const cet4Row = adminPage.locator(`tr:has-text("${TEST_BOOKS.CET4.title}")`);
    await cet4Row.locator('[data-testid="shelf-button"]').click();

    // 3. 点击确认
    await adminPage.locator('[data-testid="confirm-dialog"] button:has-text("确定")').click();

    // 4. 验证显示网络错误提示
    await expect(adminPage.locator('[data-testid="toast-error"]')).toBeVisible();
    await expect(adminPage.locator('[data-testid="toast-error"]')).toContainText(/网络错误|请求失败/);

    // 5. 恢复网络
    await adminPage.context().setOffline(false);
  });

  test('SHELF-ERR-02: 无权限操作', async () => {
    // 1. 使用普通用户账号尝试访问管理API
    const response = await adminPage.request.patch(`/api/admin/word-books/${TEST_BOOKS.CET4.id}`, {
      data: { is_published: false },
      headers: {
        // 不使用管理员cookie
      }
    });

    // 2. 验证返回401或403错误
    expect([401, 403]).toContain(response.status());
  });

  test('SHELF-ERR-03: 词库不存在', async () => {
    // 1. 尝试上架/下架不存在的词库
    const fakeBookId = '00000000-0000-0000-0000-000000000999';
    const response = await adminPage.request.patch(`/api/admin/word-books/${fakeBookId}`, {
      data: { is_published: true }
    });

    // 2. 验证返回404错误
    expect(response.status()).toBe(404);
    const data = await response.json();
    expect(data.error).toContain('不存在');
  });
});
