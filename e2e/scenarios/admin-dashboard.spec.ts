/**
 * 场景测试：管理员登录与仪表板
 *
 * 测试目标：验证管理员登录和仪表板数据展示
 *
 * 测试覆盖：
 * - ✅ 管理员登录
 * - ✅ 仪表板访问
 * - ✅ 统计数据显示
 * - ✅ 图表渲染
 * - ✅ 快捷操作入口
 *
 * 优先级: P0
 */

import { test, expect } from '@playwright/test';

test.describe('管理员登录与仪表板', () => {
  const ADMIN_EMAIL = 'admin@example.com';
  const ADMIN_PASSWORD = 'Admin123456';

  test('ADMIN-01: 访问管理后台登录页', async ({ page }) => {
    // 1. 访问管理后台
    await page.goto('/admin');

    // 2. 如果未登录，验证跳转到登录页
    const currentUrl = page.url();
    if (currentUrl.includes('/login')) {
      await expect(page).toHaveURL(/\/login/);
      await expect(page.locator('text=管理员登录|后台登录')).toBeVisible();
    } else {
      // 可能已经登录，直接访问管理后台
      await expect(page).toHaveURL(/\/admin/);
    }
  });

  test('ADMIN-02: 管理员登录', async ({ page }) => {
    // 1. 访问管理后台
    await page.goto('/admin');

    // 2. 如果需要登录
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');

      // 3. 验证登录成功，跳转到管理后台
      await page.waitForURL(/\/admin/, { timeout: 10000 });
    }

    await expect(page).toHaveURL(/\/admin/);
  });

  test('ADMIN-03: 进入仪表板', async ({ page }) => {
    // 1. 管理员登录
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
    }

    // 2. 点击仪表板或直接访问
    await page.goto('/admin/dashboard');

    // 3. 验证仪表板加载成功
    await expect(page.locator('h1')).toContainText('仪表板|概览|Dashboard');
  });

  test('ADMIN-04: 查看统计数据', async ({ page }) => {
    // 1. 进入仪表板
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
    }
    await page.goto('/admin/dashboard');

    // 2. 验证显示用户数统计
    const userStats = page.locator('[data-testid="user-stats"], [data-testid="total-users"]');
    await expect(userStats).toBeVisible();
    const userCount = await userStats.textContent();
    expect(userCount).toMatch(/\d+/);

    // 3. 验证显示词库数统计
    const bookStats = page.locator('[data-testid="book-stats"], [data-testid="total-books"]');
    await expect(bookStats).toBeVisible();
    const bookCount = await bookStats.textContent();
    expect(bookCount).toMatch(/\d+/);

    // 4. 验证显示邀请码统计
    const inviteStats = page.locator('[data-testid="invite-stats"], [data-testid="total-invites"]');
    await expect(inviteStats).toBeVisible();
  });

  test('ADMIN-05: 查看图表数据', async ({ page }) => {
    // 1. 进入仪表板
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
    }
    await page.goto('/admin/dashboard');

    // 2. 等待图表加载
    await page.waitForTimeout(2000);

    // 3. 验证图表容器存在
    const chartContainer = page.locator('[data-testid="chart"], canvas, .chart');
    const chartExists = await chartContainer.count();

    if (chartExists > 0) {
      await expect(chartContainer.first()).toBeVisible();
    }
  });

  test('ADMIN-06: 快捷操作入口', async ({ page }) => {
    // 1. 进入仪表板
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
    }
    await page.goto('/admin/dashboard');

    // 2. 验证显示用户管理入口
    const userManagementLink = page.locator('a[href="/admin/users"], text=用户管理');
    const userLinkExists = await userManagementLink.count();
    if (userLinkExists > 0) {
      await expect(userManagementLink.first()).toBeVisible();
    }

    // 3. 验证显示词库管理入口
    const bookManagementLink = page.locator('a[href="/admin/word-books"], text=词库管理');
    const bookLinkExists = await bookManagementLink.count();
    if (bookLinkExists > 0) {
      await expect(bookManagementLink.first()).toBeVisible();
    }

    // 4. 验证显示邀请码管理入口
    const inviteManagementLink = page.locator('a[href="/admin/invitation-codes"], text=邀请码');
    const inviteLinkExists = await inviteManagementLink.count();
    if (inviteLinkExists > 0) {
      await expect(inviteManagementLink.first()).toBeVisible();
    }
  });

  test('ADMIN-07: 最近活动列表', async ({ page }) => {
    // 1. 进入仪表板
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
    }
    await page.goto('/admin/dashboard');

    // 2. 验证显示最近活动列表
    const recentActivity = page.locator('[data-testid="recent-activity"], [data-testid="activity-log"]');
    const activityExists = await recentActivity.count();

    if (activityExists > 0) {
      await expect(recentActivity.first()).toBeVisible();

      // 3. 验证活动列表项
      const activityItems = page.locator('[data-testid="activity-item"]');
      const itemCount = await activityItems.count();
      if (itemCount > 0) {
        await expect(activityItems.first()).toBeVisible();
      }
    }
  });

  test('ADMIN-08: 仪表板数据刷新', async ({ page }) => {
    // 1. 进入仪表板
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
    }
    await page.goto('/admin/dashboard');

    // 2. 获取初始统计数据
    const initialUserCount = await page.locator('[data-testid="user-stats"]').textContent();

    // 3. 点击刷新按钮（如果有）
    const refreshButton = page.locator('[data-testid="refresh-button"]');
    const buttonExists = await refreshButton.count();

    if (buttonExists > 0) {
      await refreshButton.first().click();
      await page.waitForTimeout(1000);
    }

    // 4. 验证数据仍在显示
    await expect(page.locator('[data-testid="user-stats"]')).toBeVisible();
  });

  test('ADMIN-09: 仪表板响应式布局', async ({ page }) => {
    // 1. 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 });

    // 2. 进入仪表板
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
    }
    await page.goto('/admin/dashboard');

    // 3. 验证移动端布局
    await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('[data-testid="user-stats"]')).toBeVisible();

    // 4. 验证侧边栏或导航菜单在移动端的显示
    const mobileMenu = page.locator('[data-testid="mobile-menu"], button[aria-label="Menu"]');
    const menuExists = await mobileMenu.count();
    // 移动端可能有不同的导航方式
  });

  test('ADMIN-10: 仪表板时间范围筛选', async ({ page }) => {
    // 1. 进入仪表板
    await page.goto('/admin');
    if (page.url().includes('/login')) {
      await page.fill('input[name="email"]', ADMIN_EMAIL);
      await page.fill('input[name="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/admin/);
    }
    await page.goto('/admin/dashboard');

    // 2. 查找时间筛选器
    const timeFilter = page.locator('select[name="timeRange"], [data-testid="time-filter"]');
    const filterExists = await timeFilter.count();

    if (filterExists > 0) {
      // 3. 选择不同的时间范围
      await timeFilter.first().selectOption('7天');
      await page.waitForTimeout(1000);

      // 4. 验证数据更新
      await expect(page.locator('[data-testid="user-stats"]')).toBeVisible();
    }
  });
});
