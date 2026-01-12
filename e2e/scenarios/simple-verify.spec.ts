import { test, expect } from '@playwright/test';

test('简单验证测试 - 首页加载', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/./);

  const title = await page.title();
  console.log('页面标题:', title);

  expect(title).toBeTruthy();
});

test('简单验证测试 - 登录页访问', async ({ page }) => {
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login/);

  const hasEmailInput = await page.locator('input[name="email"]').count();
  console.log('邮箱输入框数量:', hasEmailInput);

  expect(hasEmailInput).toBeGreaterThan(0);
});
