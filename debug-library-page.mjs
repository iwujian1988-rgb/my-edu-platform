/**
 * Playwright深度调试：访问词库页面并检查数据
 */

import { chromium } from 'playwright'

async function debugLibraryPage() {
  console.log('🔍 开始深度调试词库页面...\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // 1. 监听所有console日志
    const consoleLogs = []
    page.on('console', msg => {
      const log = `[${msg.type()}] ${msg.text()}`
      consoleLogs.push(log)
      if (msg.text().includes('Server') || msg.text().includes('initial') || msg.text().includes('Fetch')) {
        console.log('📡 Browser:', log)
      }
    })

    // 2. 监听所有网络请求
    const apiRequests = []
    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/')) {
        console.log('🌐 API Request:', request.method(), url)
        apiRequests.push({ type: 'request', url, method: request.method() })
      }
    })

    page.on('response', response => {
      const url = response.url()
      if (url.includes('/api/')) {
        console.log('📦 API Response:', response.status(), url)
        apiRequests.push({ type: 'response', url, status: response.status() })
      }
    })

    // 3. 访问登录页
    console.log('\n1️⃣ 访问登录页...')
    await page.goto('http://localhost:3000/login')
    await page.waitForTimeout(1000)

    // 4. 登录
    console.log('\n2️⃣ 填写登录信息...')
    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    console.log('   ⏳ 等待登录完成...')
    await page.waitForTimeout(5000)

    const loginUrl = page.url()
    console.log('   登录后URL:', loginUrl)

    if (loginUrl.includes('/login')) {
      console.log('❌ 登录失败')
      return
    }

    console.log('✅ 登录成功\n')

    // 5. 访问词库页面
    const testBookId = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'
    console.log(`\n3️⃣ 访问词库页面...`)
    console.log('   URL:', `http://localhost:3000/library/${testBookId}`)

    await page.goto(`http://localhost:3000/library/${testBookId}`)
    await page.waitForTimeout(5000)

    // 6. 检查页面内容
    console.log('\n4️⃣ 检查页面状态...')

    // 检查是否被重定向到登录页
    const currentUrl = page.url()
    console.log('   当前URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('❌ 被重定向到登录页 - 服务端认证失败')
      await page.screenshot({ path: 'debug-redirected-to-login.png' })
      console.log('   📸 已保存截图: debug-redirected-to-login.png')
      return
    }

    // 检查单词卡片
    const wordCardCount = await page.locator('[data-testid="word-card"]').count()
    console.log(`   单词卡片数量: ${wordCardCount}`)

    if (wordCardCount > 0) {
      console.log('   ✅ 找到单词卡片！')
      const firstWord = await page.locator('[data-testid="word-card"]').first().textContent()
      console.log(`   第一个单词: ${firstWord.substring(0, 100)}...`)
    } else {
      console.log('   ❌ 没有找到单词卡片')
    }

    // 检查是否有错误信息
    const pageContent = await page.content()
    if (pageContent.includes('error') || pageContent.includes('Error')) {
      console.log('   ⚠️  页面包含错误信息')
    }

    // 7. 检查localStorage数据
    console.log('\n5️⃣ 检查localStorage...')
    const localStorageData = await page.evaluate(() => {
      return {
        keys: Object.keys(localStorage),
        wordProgress: localStorage.getItem('word-progress-003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
      }
    })
    console.log('   localStorage keys:', localStorageData.keys)
    console.log('   word-progress:', localStorageData.wordProgress ? '(存在)' : '(不存在)')

    // 8. 截图保存
    console.log('\n6️⃣ 保存截图...')
    await page.screenshot({ path: 'debug-library-page.png', fullPage: true })
    console.log('   ✅ 已保存完整页面截图: debug-library-page.png')

    // 9. 总结Console日志
    console.log('\n7️⃣ 关键Console日志:')
    const importantLogs = consoleLogs.filter(log =>
      log.includes('Server') ||
      log.includes('initial') ||
      log.includes('Skip') ||
      log.includes('Fetch') ||
      log.includes('API') ||
      log.includes('error') ||
      log.includes('Error')
    )
    importantLogs.slice(-20).forEach(log => console.log('   ', log))

    // 10. 总结API请求
    console.log('\n8️⃣ API请求总结:')
    console.log(`   总API请求数: ${apiRequests.length}`)
    apiRequests.forEach(req => {
      console.log(`   ${req.type}: ${req.method || ''} ${req.url} (${req.status || ''})`)
    })

    console.log('\n✅ 调试完成')
    console.log('\n提示:')
    console.log('1. 查看 debug-library-page.png 了解页面实际显示')
    console.log('2. 检查上述Console日志，查找服务端数据传递的证据')
    console.log('3. 如果没有看到"Server"相关日志，说明服务端代码可能未执行')

  } catch (error) {
    console.error('\n❌ 调试失败:', error.message)
  } finally {
    await browser.close()
  }
}

debugLibraryPage()
