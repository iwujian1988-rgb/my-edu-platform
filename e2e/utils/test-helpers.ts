import { Page, expect } from '@playwright/test'

/**
 * 测试辅助工具函数
 */

/**
 * 测试用户数据
 */
export const testUsers = {
  valid: {
    phone: '13800138001',
    password: 'test123456',
    confirmPassword: 'test123456',
    invitationCode: 'TEST1234',
  },
  existing: {
    phone: '13800138000',
    password: 'test123456',
  },
  invalid: {
    phone: '13800138002',
    password: 'wrongpass',
  },
}

/**
 * 导航到登录页
 */
export async function gotoLoginPage(page: Page) {
  await page.goto('/login')
  await expect(page).toHaveTitle(/小语笔记/)
  await expect(page.locator('h1')).toContainText('小语笔记')
}

/**
 * 切换到注册标签
 */
export async function switchToSignupTab(page: Page) {
  // 修复：使用更精确的选择器，避免点击到提交按钮
  await page.click('button:has-text("注册"):not([type="submit"])')
  await expect(page.locator('text=注册').first()).toHaveAttribute('class', /text-indigo-600/)
}

/**
 * 切换到登录标签
 */
export async function switchToLoginTab(page: Page) {
  await page.click('text=登录')
  await expect(page.locator('text=登录').first()).toHaveAttribute('class', /text-indigo-600/)
}

/**
 * 填写登录表单
 */
export async function fillLoginForm(page: Page, phone: string, password: string) {
  await page.fill('input[type="tel"]', phone)
  await page.fill('input[type="password"]', password)
}

/**
 * 填写注册表单
 */
export async function fillSignupForm(
  page: Page,
  phone: string,
  password: string,
  confirmPassword: string,
  invitationCode: string
) {
  await page.fill('input[type="tel"]', phone)
  await page.fill('input[type="password"]:not([placeholder*="再次"])', password)
  await page.fill('input[placeholder*="再次"]', confirmPassword)
  await page.fill('input[placeholder*="邀请码"]', invitationCode)
}

/**
 * 提交登录表单
 */
export async function submitLoginForm(page: Page) {
  await page.click('button:has-text("登录")')
}

/**
 * 提交注册表单
 */
export async function submitSignupForm(page: Page) {
  await page.click('button:has-text("注册")')
}

/**
 * 等待成功提示
 */
export async function expectSuccessMessage(page: Page, message: string) {
  const successBox = page.locator('.bg-green-50, [class*="bg-green"]')
  await expect(successBox).toBeVisible()
  await expect(successBox).toContainText(message)
}

/**
 * 等待错误提示
 */
export async function expectErrorMessage(page: Page, message: string) {
  const errorBox = page.locator('.bg-red-50, [class*="bg-red"]')
  await expect(errorBox).toBeVisible()
  await expect(errorBox).toContainText(message)
}

/**
 * 等待跳转到指定页面
 */
export async function expectNavigation(page: Page, path: string) {
  // 修复：支持查询参数（例如 /login?redirect=%2Fstudy）
  const urlPattern = new RegExp(`${path.replace('/', '/')}.*$`)
  await page.waitForURL(urlPattern, { timeout: 5000 })
  expect(page.url()).toMatch(new RegExp(`${path.replace('/', '/')}.*`))
}

/**
 * 确保已登录
 * 如果未登录则执行登录
 */
export async function ensureLoggedIn(page: Page) {
  const currentUrl = page.url()

  // 如果已经在登录页，直接登录
  if (currentUrl.includes('/login')) {
    await fillLoginForm(page, testUsers.existing.phone, testUsers.existing.password)
    await submitLoginForm(page)
    await expectNavigation(page, '/study')
    return
  }

  // 如果在其他页面，尝试访问 study 页面
  await page.goto('/study')

  // 如果被重定向到登录页，说明未登录
  if (page.url().includes('/login')) {
    await fillLoginForm(page, testUsers.existing.phone, testUsers.existing.password)
    await submitLoginForm(page)
    await expectNavigation(page, '/study')
  }
}

/**
 * 登出
 */
export async function logout(page: Page) {
  await page.goto('/study')
  await page.click('button:has-text("退出登录")')
  // 修复：支持查询参数
  await page.waitForURL(/\/login(\?.*)?$/, { timeout: 5000 })
}

/**
 * 清空所有输入框
 */
export async function clearAllInputs(page: Page) {
  await page.fill('input[type="tel"]', '')
  await page.fill('input[type="password"]', '')
}

/**
 * 生成随机手机号
 */
export function generateRandomPhone(): string {
  const prefix = '138'
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0')
  return prefix + suffix
}

/**
 * 点击显示密码按钮
 */
export async function togglePasswordVisibility(page: Page) {
  // 修复：使用更精确的选择器，查找密码输入框旁边的按钮
  const passwordInput = page.locator('input[type="password"]').first()
  const wrapper = passwordInput.locator('..')
  await wrapper.locator('button').click()
}

/**
 * 等待加载状态消失
 */
export async function waitForLoadingToFinish(page: Page) {
  // 等待按钮文字不再是"登录中..."或"注册中..."
  await page.waitForFunction(
    () => {
      const buttons = document.querySelectorAll('button')
      return !Array.from(buttons).some(btn =>
        btn.textContent?.includes('中...')
      )
    },
    { timeout: 5000 }
  )
}

/**
 * 截图并保存（用于调试）
 */
export async function takeScreenshot(page: Page, name: string) {
  await page.screenshot({ path: `screenshots/${name}.png`, fullPage: true })
}

/**
 * 获取当前用户信息（从 study 页面）
 */
export async function getCurrentUserInfo(page: Page) {
  await page.goto('/study')
  const phoneText = await page.locator('text=欢迎回来').textContent()
  return phoneText || ''
}

/**
 * 邀请码测试数据
 */
export const invitationCodes = {
  valid: 'TEST1234',
  invalid: 'INVALID',
  expired: 'EXPIRED',
  full: 'FULLCODE',
  limited: 'LIMITED5',
}
