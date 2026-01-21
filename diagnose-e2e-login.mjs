/**
 * 诊断E2E测试登录问题
 */

import { chromium } from 'playwright'

async function diagnoseE2ELogin() {
  console.log('🔍 诊断E2E测试登录问题...\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 1. 访问登录页
    console.log('1️⃣ 访问登录页...')
    await page.goto('http://localhost:3000/login')
    await page.waitForTimeout(1000)

    // 2. 登录
    console.log('2️⃣ 填写登录信息...')
    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    console.log('3️⃣ 等待登录完成...')
    await page.waitForTimeout(5000)

    const loginUrl = page.url()
    console.log('   登录后URL:', loginUrl)

    // 3. 检查cookies
    console.log('\n4️⃣ 检查Cookies:')
    const cookies = await context.cookies()
    console.log('   总Cookies数:', cookies.length)

    const authCookies = cookies.filter(c =>
      c.name.includes('sb-') ||
      c.name.includes('auth') ||
      c.name.includes('token')
    )

    console.log('   认证相关Cookies:')
    authCookies.forEach(cookie => {
      console.log(`     - ${cookie.name}`)
      console.log(`       域名: ${cookie.domain}`)
      console.log(`       路径: ${cookie.path}`)
      console.log(`       HttpOnly: ${cookie.httpOnly}`)
      console.log(`       Secure: ${cookie.secure}`)
      console.log(`       SameSite: ${cookie.sameSite}`)
    })

    // 4. 检查localStorage
    console.log('\n5️⃣ 检查localStorage:')
    const storage = await page.evaluate(() => {
      return {
        keys: Object.keys(localStorage),
        items: Object.keys(localStorage).map(key => ({
          key,
          value: localStorage.getItem(key).substring(0, 50) + '...'
        }))
      }
    })
    console.log('   localStorage keys:', storage.keys.length)
    storage.items.forEach(item => {
      console.log(`     - ${item.key}: ${item.value}`)
    })

    // 5. 测试访问受保护的页面
    console.log('\n6️⃣ 测试访问词库页面...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    console.log('   当前URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('   ❌ 被重定向到登录页 - 认证失败')

      // 检查请求头
      console.log('\n7️⃣ 检查请求头:')
      const requests = []
      page.on('request', request => {
        if (request.url().includes('/api/')) {
          requests.push({
            url: request.url(),
            headers: {
              cookie: request.headers()['cookie'],
              authorization: request.headers()['authorization']
            }
          })
        }
      })

      // 重试一次
      await page.goto('http://localhost:3000/', { waitUntil: 'networkidle' })
      await page.waitForTimeout(2000)

      console.log('   API请求数:', requests.length)
      requests.slice(0, 3).forEach(req => {
        console.log(`     - ${req.url}`)
        console.log(`       Cookie: ${req.headers.cookie ? '存在' : '不存在'}`)
        console.log(`       Authorization: ${req.headers.authorization || '不存在'}`)
      })

    } else {
      console.log('   ✅ 成功访问词库页面')

      const wordCardCount = await page.locator('[data-testid="word-card"]').count()
      console.log(`   单词卡片数: ${wordCardCount}`)
    }

    console.log('\n✅ 诊断完成')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
  } finally {
    await browser.close()
  }
}

diagnoseE2ELogin()
