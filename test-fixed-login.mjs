/**
 * 测试修复后的登录重定向
 */

import { chromium } from 'playwright'

async function testFixedLogin() {
  console.log('🔍 测试修复后的登录重定向...\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 1. 直接访问需要认证的页面（会被重定向到登录页）
    console.log('1️⃣ 访问词库页面（应重定向到登录）...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
    await page.waitForTimeout(1000)

    let loginUrl = page.url()
    console.log('   当前URL:', loginUrl)

    if (!loginUrl.includes('/login')) {
      console.log('   ⚠️  未被重定向到登录页（可能已登录）')
    } else {
      console.log('   ✅ 正确重定向到登录页')

      // 2. 登录
      console.log('\n2️⃣ 执行登录...')
      await page.fill('input[type="tel"]', '13800138000')
      await page.fill('input[type="password"]', 'password123')
      await page.click('button[type="submit"]')

      // 3. 等待重定向
      console.log('3️⃣ 等待重定向到目标页面...')
      await page.waitForTimeout(5000)

      const finalUrl = page.url()
      console.log('   最终URL:', finalUrl)

      if (finalUrl.includes('/login')) {
        console.log('   ❌ 仍在登录页 - redirect未生效')
      } else if (finalUrl.includes('/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')) {
        console.log('   ✅ 成功重定向到词库页面！')

        // 4. 检查单词卡片
        const wordCardCount = await page.locator('[data-testid="word-card"]').count()
        console.log(`\n4️⃣ 单词卡片数: ${wordCardCount}`)

        if (wordCardCount > 0) {
          console.log('   ✅ 完整流程成功！登录 → 重定向 → 加载数据')
        } else {
          console.log('   ⚠️  重定向成功，但单词卡片未加载')
        }

      } else if (finalUrl === 'http://localhost:3000/') {
        console.log('   ⚠️  重定向到首页（可能没有redirect参数）')
      } else {
        console.log('   ℹ️  重定向到其他页面:', finalUrl)
      }
    }

    console.log('\n✅ 测试完成')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
  } finally {
    await browser.close()
  }
}

testFixedLogin()
