import { chromium, FullConfig } from '@playwright/test'

/**
 * 全局setup：在所有测试运行前执行
 * 用于登录并保存认证状态
 *
 * 注意：如果已有有效的存储状态文件，这个setup会被跳过
 */
async function globalSetup(config: FullConfig) {
  console.log('🔧 E2E Global Setup: 开始...')

  // 检查是否已有存储状态文件
  const fs = require('fs')
  const storageStatePath = 'e2e/.auth/admin-storage-state.json'

  if (fs.existsSync(storageStatePath)) {
    console.log('✅ 发现已有的存储状态文件，跳过登录')
    console.log('📂 文件路径:', storageStatePath)
    return
  }

  console.log('⚠️  未找到存储状态文件，需要登录...')
  console.log('💡 提示：手动登录一次后会自动创建存储状态文件')
  console.log('💡 或运行: npx playwright test --project=chromium --update-snapshots')

  // 如果没有存储状态，创建一个临时的
  const browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 访问登录页并登录
    console.log('📍 访问登录页...')
    await page.goto('http://localhost:3003/login', { waitUntil: 'domcontentloaded' })

    // 等待登录表单出现
    await page.waitForSelector('button:has-text("登录")', { timeout: 10000 })
    const loginTab = page.locator('button:has-text("登录")').first()
    await loginTab.click()
    console.log('✅ 已点击登录tab')

    await page.waitForSelector('[data-testid="phone-input"]', { timeout: 5000 })
    await page.waitForTimeout(500)

    // 填写测试账号
    await page.fill('[data-testid="phone-input"]', '15652936305')
    await page.fill('[data-testid="password-input"]', 'wj5236016')
    console.log('✅ 已填写登录信息')

    // 点击登录按钮
    await page.click('[data-testid="login-submit-button"]')
    console.log('✅ 已点击登录按钮')

    // 等待跳转到首页
    await page.waitForURL(/\/(\?.*)?$/, { timeout: 15000 })
    await page.waitForLoadState('domcontentloaded', { timeout: 10000 })
    await page.waitForTimeout(1000)
    console.log('✅ 登录成功')

    // 保存登录状态
    console.log('💾 保存登录状态...')
    await context.storageState({ path: storageStatePath })
    console.log('✅ 存储状态已保存到', storageStatePath)
  } catch (error) {
    console.error('❌ Global Setup失败:', error)
    throw error
  } finally {
    await browser.close()
  }
}

export default globalSetup
