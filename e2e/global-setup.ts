import { chromium, FullConfig } from '@playwright/test'

/**
 * 全局setup：在所有测试运行前执行
 * 用于登录并保存认证状态
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 E2E Global Setup: 开始...')

  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 访问登录页
    console.log('1️⃣ 访问登录页...')
    await page.goto('http://localhost:3003/login')
    await page.waitForTimeout(1000)

    // 登录
    console.log('2️⃣ 执行登录...')
    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // 等待登录完成（跳转到首页）
    console.log('3️⃣ 等待登录完成...')
    await page.waitForURL('http://localhost:3003/', { timeout: 10000 })
    await page.waitForTimeout(2000)

    console.log('✅ 登录成功')

    // 保存storage state（cookies, localStorage等）
    console.log('4️⃣ 保存认证状态...')
    await context.storageState({ path: 'e2e/.auth/admin-storage-state.json' })

    console.log('✅ Global Setup完成！认证状态已保存')
  } catch (error) {
    console.error('❌ Global Setup失败:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
