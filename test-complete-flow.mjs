/**
 * 完整测试流程：登录 -> 访问页面 -> 检查单词加载
 */

import { chromium } from 'playwright'

async function testCompleteFlow() {
  console.log('🔍 开始完整流程测试...\n')

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
    
    console.log('3️⃣ 点击登录按钮...')
    await page.click('button[type="submit"]')
    
    // 等待登录完成
    console.log('4️⃣ 等待登录完成...')
    await page.waitForTimeout(5000)
    
    const currentUrl = page.url()
    console.log('   当前URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('❌ 登录失败')
      return
    }

    console.log('✅ 登录成功\n')

    // 5. 访问词库页面
    const testBookId = '003b4ce0-c3f9-407a-a7d6-5e80ada4eae5'
    console.log('5️⃣ 访问词库页面...')
    console.log('   Book ID:', testBookId)
    
    await page.goto(`http://localhost:3000/library/${testBookId}`)
    
    // 等待页面加载
    console.log('6️⃣ 等待页面加载...')
    await page.waitForTimeout(5000)

    // 7. 检查单词卡片
    console.log('7️⃣ 检查单词卡片...')
    const wordCards = await page.locator('[data-testid="word-card"]').count()
    console.log(`   单词卡片数量: ${wordCards}`)

    if (wordCards === 0) {
      console.log('⚠️ 没有找到单词卡片')
      
      // 检查是否有错误消息
      const pageTitle = await page.title()
      console.log('   页面标题:', pageTitle)
      
      // 获取页面内容
      const bodyText = await page.locator('body').textContent()
      if (bodyText.includes('权限') || bodyText.includes('permission')) {
        console.log('❌ 页面显示权限错误')
      }
      
      // 截图
      await page.screenshot({ path: 'test-words-page.png' })
      console.log('📸 已保存截图: test-words-page.png')
    } else {
      console.log(`✅ 找到 ${wordCards} 个单词卡片`)
      
      // 显示第一个单词
      const firstWord = await page.locator('[data-testid="word-card"]').first().textContent()
      console.log('   第一个单词:', firstWord.substring(0, 100))
    }

    // 8. 检查网络请求
    console.log('\n8️⃣ 检查API请求...')
    page.on('console', msg => {
      if (msg.text().includes('Fetch') || msg.text().includes('API') || msg.text().includes('words')) {
        console.log('   📡 Console:', msg.text())
      }
    })

    // 等待一下看看是否有console输出
    await page.waitForTimeout(3000)

    console.log('\n✅ 测试完成')

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
  } finally {
    await browser.close()
  }
}

testCompleteFlow()
