/**
 * 登录Helper函数
 * 用于E2E测试中的用户登录
 */

import { Page } from '@playwright/test'

// 测试账号配置
export const TEST_CREDENTIALS = {
  phone: '15652936305',
  password: 'wj5236016'
}

/**
 * 用户登录函数
 * @param page Playwright Page对象
 */
export async function login(page: Page) {
  console.log('🔐 开始登录测试账号...')

  // 访问登录页
  await page.goto('/login', { waitUntil: 'domcontentloaded' })

  // 等待React组件加载完成 - 等待tabs出现
  await page.waitForSelector('button:has-text("登录")', { timeout: 10000 })

  // 点击登录tab（确保在登录tab）
  const loginTab = page.locator('button:has-text("登录")').first()
  await loginTab.click()
  console.log('✅ 已点击登录tab')

  // 等待登录表单出现
  await page.waitForSelector('[data-testid="phone-input"]', { timeout: 5000 })
  await page.waitForTimeout(500) // 等待稳定

  // 填写手机号
  const phoneInput = page.locator('[data-testid="phone-input"]')
  await phoneInput.fill(TEST_CREDENTIALS.phone)
  console.log(`📱 已填写手机号: ${TEST_CREDENTIALS.phone}`)

  // 填写密码
  const passwordInput = page.locator('[data-testid="password-input"]')
  await passwordInput.fill(TEST_CREDENTIALS.password)
  console.log('🔒 已填写密码')

  // 点击登录按钮
  const submitButton = page.locator('[data-testid="login-submit-button"]')
  await submitButton.click()
  console.log('✅ 已点击登录按钮')

  // 等待跳转到首页
  try {
    // 等待URL变成首页（允许有query参数或hash）
    await page.waitForURL(/\/(\?.*)?$/, { timeout: 15000 })
    console.log('✅ URL已跳转到首页')

    // 等待页面稳定
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })

    // 额外等待React组件渲染
    await page.waitForTimeout(1000)

    console.log('✅ 登录成功,已跳转到首页')
  } catch (error) {
    // 检查是否有错误消息
    const errorElement = page.locator('text=登录失败,text=密码错误,text=手机号错误')
    const hasError = await errorElement.count() > 0

    if (hasError) {
      const errorText = await errorElement.first().textContent()
      throw new Error(`登录失败: ${errorText}`)
    }

    // 检查当前URL
    const currentUrl = page.url()
    console.log(`⚠️ 登录跳转超时，当前URL: ${currentUrl}`)

    throw error
  }
}

/**
 * 快速登录(通过localStorage注入session,跳过UI登录)
 * @param page Playwright Page对象
 */
export async function quickLogin(page: Page) {
  console.log('⚡ 使用快速登录...')

  // 先访问登录页获取cookies
  await page.goto('/login')

  // 通过API登录
  await page.evaluate(async ({ phone, password }) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, password })
    })
    const data = await response.json()

    if (data.error) {
      throw new Error(`登录失败: ${data.error}`)
    }

    // 存储token到localStorage
    if (data.token) {
      localStorage.setItem('sb-auth-token', data.token)
    }
  }, TEST_CREDENTIALS)

  // 刷新页面以应用session
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  console.log('✅ 快速登录成功')
}

/**
 * 登出函数
 * @param page Playwright Page对象
 */
export async function logout(page: Page) {
  console.log('🚪 登出...')

  // 清除localStorage
  await page.evaluate(() => {
    localStorage.clear()
  })

  // 访问首页
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  console.log('✅ 已登出')
}
