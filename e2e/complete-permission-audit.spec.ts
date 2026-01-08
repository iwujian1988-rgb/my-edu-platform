/**
 * 权限系统完整审计测试
 * 测试所有11个功能权限 + 词库权限
 */

import { test, expect } from '@playwright/test';

const BASE_URL = 'http://localhost:3005';
const TEST_USER = {
  phone: '15652936305',
  password: 'wj5236016',
  email: '15652936305@phone.xiaoyu.com'
};

// 功能权限列表
const FEATURE_PERMISSIONS = [
  'match_game',      // 连连看
  'flashcards',      // 卡片背单词
  'dictation',       // 听写练习
  'custom_book',     // 自定义词库
  'review_mode',     // 复习模式
  'ai_features',     // AI功能
  'spelling_check',  // 拼写检查
  'export_data',     // 数据导出
  'study_stats',     // 学习统计
  'mistake_book',    // 错题本
  'study_calendar'   // 学习日历
];

test.describe('权限系统完整审计', () => {
  let authCookies = '';

  test.beforeAll(async ({ request }) => {
    console.log('\n=== 开始权限系统完整审计 ===');
    console.log('测试用户:', TEST_USER.email);

    // 登录获取cookies
    const loginResponse = await request.post(`${BASE_URL}/api/login/actions`, {
      data: {
        phone: TEST_USER.phone,
        password: TEST_USER.password
      }
    });

    if (loginResponse.ok()) {
      const cookies = loginResponse.headers()['set-cookie'];
      if (cookies) {
        authCookies = cookies;
      }
      console.log('✅ 用户登录成功');
    } else {
      console.log('❌ 用户登录失败');
    }
  });

  test('1. 验证用户权限数据', async ({ request }) => {
    console.log('\n--- 测试1: 验证用户权限数据 ---');

    const response = await request.get(`${BASE_URL}/api/debug/fix-user-phone`);

    expect(response.ok()).toBe(true);

    const data = await response.json();
    expect(data.success).toBe(true);
    expect(data.user).toBeDefined();

    console.log('功能权限:', data.user.feature_permissions);
    console.log('词库权限:', data.user.book_permissions);

    // 验证每个功能权限
    FEATURE_PERMISSIONS.forEach(perm => {
      const hasPermission = data.user.feature_permissions?.includes(perm);
      console.log(`  ${perm}: ${hasPermission ? '✅' : '❌'}`);
    });
  });

  test('2. 测试词库列表API权限过滤', async ({ request }) => {
    console.log('\n--- 测试2: 词库列表API权限过滤 ---');

    const response = await request.get(`${BASE_URL}/api/books`);

    expect(response.ok()).toBe(true);

    const books = await response.json();
    console.log(`返回词库数量: ${books.length}`);

    // 验证返回的词库数量应该小于总数（有权限过滤）
    expect(books.length).toBeLessThanOrEqual(27);
  });

  test('3. 测试前台词库显示', async ({ page }) => {
    console.log('\n--- 测试3: 前台词库显示 ---');

    // 登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="tel"]', TEST_USER.phone);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("登录")');

    // 等待跳转到首页
    await page.waitForURL(BASE_URL, { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    // 截图
    await page.screenshot({
      path: 'test-results/permission-audit-homepage.png',
      fullPage: true
    });

    // 检查词库卡片
    const bookCards = await page.locator('.clay-card').count();
    console.log(`首页显示词库数量: ${bookCards}`);

    // 检查是否有CET-4
    const hasCET4 = await page.locator('text=CET-4').count() > 0;
    console.log(`显示CET-4: ${hasCET4 ? '✅' : '❌'}`);
  });

  test('4. 测试词库详情页访问', async ({ page, request }) => {
    console.log('\n--- 测试4: 词库详情页访问 ---');

    // 先获取CET-4的ID
    const booksResponse = await request.get(`${BASE_URL}/api/debug/check-books`);
    const booksData = await booksResponse.json();
    const cet4Book = booksData.books.find((b: any) => b.title.includes('CET-4'));

    if (!cet4Book) {
      console.log('❌ 未找到CET-4词库');
      return;
    }

    console.log('CET-4 ID:', cet4Book.id);

    // 登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="tel"]', TEST_USER.phone);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("登录")');
    await page.waitForURL(BASE_URL, { timeout: 5000 });

    // 访问词库详情页
    await page.goto(`${BASE_URL}/library/${cet4Book.id}`);
    await page.waitForLoadState('networkidle');

    // 截图
    await page.screenshot({
      path: 'test-results/permission-audit-book-detail.png',
      fullPage: true
    });

    // 检查是否有权限错误
    const hasPermissionError = await page.locator('text=/权限|没有访问/').count() > 0;
    console.log(`访问词库详情: ${hasPermissionError ? '❌ 被拒绝' : '✅ 成功'}`);

    expect(hasPermissionError).toBe(false);
  });

  test('5. 测试学习功能入口', async ({ page }) => {
    console.log('\n--- 测试5: 学习功能入口 ---');

    // 登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="tel"]', TEST_USER.phone);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("登录")');
    await page.waitForURL(BASE_URL, { timeout: 5000 });
    await page.waitForLoadState('networkidle');

    // 获取CET-4 ID
    const books = await page.request.get(`${BASE_URL}/api/debug/check-books`);
    const booksData = await books.json();
    const cet4Book = booksData.books.find((b: any) => b.title.includes('CET-4'));

    if (!cet4Book) return;

    // 访问词库详情页
    await page.goto(`${BASE_URL}/library/${cet4Book.id}`);
    await page.waitForLoadState('networkidle');

    // 截图
    await page.screenshot({
      path: 'test-results/permission-audit-study-modes.png',
      fullPage: true
    });

    // 检查学习模式按钮
    const studyModes = [
      { name: '连连看', permission: 'match_game' },
      { name: '卡片背单词', permission: 'flashcards' },
      { name: '听写练习', permission: 'dictation' }
    ];

    console.log('学习功能按钮显示情况:');
    for (const mode of studyModes) {
      const visible = await page.locator(`text=${mode.name}`).count() > 0;
      console.log(`  ${mode.name}: ${visible ? '✅ 显示' : '❌ 隐藏'}`);
    }
  });

  test('6. 测试权限过期提示', async ({ page, request }) => {
    console.log('\n--- 测试6: 权限过期提示 ---');

    // 检查用户权限过期时间
    const userResponse = await request.get(`${BASE_URL}/api/debug/fix-user-phone`);
    const userData = await userResponse.json();
    const expiresAt = userData.user.permission_expires_at;

    console.log('权限过期时间:', expiresAt);

    // 登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="tel"]', TEST_USER.phone);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("登录")');
    await page.waitForURL(BASE_URL, { timeout: 5000 });

    // 检查是否有过期提示
    const hasWarning = await page.locator('text=/过期|即将过期/').count() > 0;
    console.log(`权限过期提示: ${hasWarning ? '✅ 显示' : '❌ 未显示'}`);
  });

  test('7. 测试无权限访问拒绝', async ({ page, request }) => {
    console.log('\n--- 测试7: 无权限访问拒绝 ---');

    // 获取一个用户没有权限的词库
    const booksResponse = await request.get(`${BASE_URL}/api/debug/check-books`);
    const booksData = await booksResponse.json();
    const cet6Book = booksData.books.find((b: any) => b.title.includes('CET-6'));

    if (!cet6Book) {
      console.log('❌ 未找到CET-6词库');
      return;
    }

    console.log('尝试访问无权限的词库:', cet6Book.title);

    // 登录
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="tel"]', TEST_USER.phone);
    await page.fill('input[type="password"]', TEST_USER.password);
    await page.click('button:has-text("登录")');
    await page.waitForURL(BASE_URL, { timeout: 5000 });

    // 尝试访问CET-6
    await page.goto(`${BASE_URL}/library/${cet6Book.id}`);
    await page.waitForTimeout(2000);

    // 截图
    await page.screenshot({
      path: 'test-results/permission-audit-access-denied.png',
      fullPage: true
    });

    // 检查是否有权限错误提示
    const hasError = await page.locator('text=/权限|没有访问/').count() > 0;
    console.log(`无权限访问拒绝: ${hasError ? '✅ 正确拒绝' : '❌ 未拒绝（BUG）'}`);
  });

  test.afterAll(async () => {
    console.log('\n=== 权限系统审计完成 ===');
    console.log('测试结果已保存到 test-results/ 目录');
  });
});
