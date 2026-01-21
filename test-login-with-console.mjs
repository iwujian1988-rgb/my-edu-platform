/**
 * 测试登录并捕获控制台日志
 */

import { chromium } from 'playwright'

async function testLoginWithConsole() {
  console.log('🔍 测试登录并捕获控制台...\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 捕获console日志
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('[Login]') || text.includes('error') || text.includes('Error')) {
      console.log('📡', text)
    }
  })

  try {
    // 1. 访问需要认证的页面
    console.log('1️⃣ 访问词库页面...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
    await page.waitForTimeout(1000)

    console.log('   当前URL:', page.url())

    // 2. 登录
    console.log('\n2️⃣ 填写登录信息...')
    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]', 'password123')

    console.log('\n3️⃣ 点击登录按钮...')
    await page.click('button[type="submit"]')

    // 3. 等待跳转
    console.log('\n4️⃣ 等待跳转（最多10秒）...')
    try {
      await page.waitForFunction(
        () => !window.location.pathname.includes('/login'),
        { timeout: 10000 }
      )
      console.log('   ✅ 页面已跳转')
    } catch (e) {
      console.log('   ⚠️  10秒后仍在登录页')
    }

    const finalUrl = page.url()
    console.log('\n5️⃣ 最终URL:', finalUrl)

    if (finalUrl.includes('/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')) {
      console.log('   ✅ 成功！')

      const wordCount = await page.locator('[data-testid="word-card"]').count()
      console.log(`   单词卡片: ${wordCount}`)
    } else if (finalUrl.includes('/login')) {
      console.log('   ❌ 失败：仍在登录页')

      // 检查是否有错误消息
      const errorElement = await page.$('p:has-text("⚠️")')
      if (errorElement) {
        const errorText = await errorElement.textContent()
        console.log('   错误消息:', errorText)
      }
    }

    console.log('\n✅ 测试完成')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
  } finally {
    await browser.close()
  }
}

testLoginWithConsole()
