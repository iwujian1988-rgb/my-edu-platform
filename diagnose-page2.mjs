/**
 * 诊断第2页无数据问题
 */

import { chromium } from 'playwright'

async function diagnosePage2() {
  console.log('🔍 诊断第2页无数据问题...\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 监听所有请求
  const requests = []
  page.on('request', request => {
    if (request.url().includes('/api/')) {
      console.log('📤 Request:', request.method(), request.url())
      requests.push({
        url: request.url(),
        method: request.method(),
        headers: {
          cookie: request.headers()['cookie'] ? '存在' : '不存在',
          authorization: request.headers()['authorization'] || '不存在'
        }
      })
    }
  })

  page.on('response', response => {
    if (response.url().includes('/api/')) {
      console.log('📥 Response:', response.status(), response.url())
    }
  })

  // 监听console
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('Fetch') || text.includes('API') || text.includes('error') || text.includes('Error')) {
      console.log('📡', text)
    }
  })

  try {
    // 1. 登录
    console.log('1️⃣ 登录...')
    await page.goto('http://localhost:3000/login')
    await page.waitForTimeout(1000)
    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')
    await page.waitForTimeout(3000)

    // 2. 访问第1页
    console.log('\n2️⃣ 访问第1页...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5?page=1')
    await page.waitForTimeout(2000)

    const page1Words = await page.locator('[data-testid="word-card"]').count()
    console.log(`   第1页单词数: ${page1Words}`)

    // 3. 访问第2页
    console.log('\n3️⃣ 访问第2页...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5?page=2')
    await page.waitForTimeout(3000)

    const page2Words = await page.locator('[data-testid="word-card"]').count()
    console.log(`   第2页单词数: ${page2Words}`)

    if (page2Words === 0) {
      console.log('\n   ❌ 第2页确实没有数据！')
      console.log('\n4️⃣ API请求分析:')
      requests.forEach(req => {
        console.log(`   ${req.method} ${req.url}`)
        console.log(`     Cookie: ${req.headers.cookie}`)
        console.log(`     Authorization: ${req.headers.authorization}`)
      })
    } else {
      console.log('\n   ✅ 第2页有数据')
    }

    console.log('\n✅ 诊断完成')

  } catch (error) {
    console.error('\n❌ 错误:', error.message)
  } finally {
    await browser.close()
  }
}

diagnosePage2()
