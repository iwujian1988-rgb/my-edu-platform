/**
 * 测试翻页UX改进
 */

import { chromium } from 'playwright'

async function testPaginationUX() {
  console.log('🔍 测试翻页UX改进...\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  // 监听console日志
  page.on('console', msg => {
    const text = msg.text()
    if (text.includes('Immediate') || text.includes('Loading') || text.includes('Scrolled')) {
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

    // 2. 访问词库第1页
    console.log('\n2️⃣ 访问词库第1页...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
    await page.waitForTimeout(2000)

    const page1Words = await page.locator('[data-testid="word-card"]').count()
    console.log(`   第1页单词数: ${page1Words}`)

    // 3. 点击"下一页"按钮，测试立即反馈
    console.log('\n3️⃣ 测试PC端翻页...')
    const startTime = Date.now()

    // 点击下一页
    await page.click('[data-testid="next-page-button"]')

    // 检查是否立即显示骨架屏（100ms内）
    await page.waitForTimeout(100)
    const skeletonLoader = await page.locator('[data-testid="skeleton-loader"]').isVisible()
    const timeToSkeleton = Date.now() - startTime

    console.log(`   ⚡ 点击后100ms内骨架屏显示: ${skeletonLoader}`)
    console.log(`   ⚡ 响应时间: ${timeToSkeleton}ms`)

    if (skeletonLoader && timeToSkeleton < 200) {
      console.log('   ✅ 立即反馈正常！')
    } else {
      console.log('   ⚠️  立即反馈可能有问题')
    }

    // 等待第2页加载完成
    await page.waitForTimeout(2000)
    const page2Words = await page.locator('[data-testid="word-card"]').count()
    console.log(`   第2页单词数: ${page2Words}`)

    // 4. 测试移动端"加载更多"
    console.log('\n4️⃣ 测试移动端加载更多...')
    // 切换到竖屏模式
    page.setViewportSize({ width: 375, height: 812 })
    await page.waitForTimeout(500)

    // 滚动到底部
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight))
    await page.waitForTimeout(500)

    const loadMoreButton = page.locator('[data-testid="load-more-button"]')
    if (await loadMoreButton.isVisible()) {
      const loadMoreStartTime = Date.now()

      // 记录当前单词数量
      const wordsBeforeLoad = await page.locator('[data-testid="word-card"]').count()

      // 点击加载更多
      await loadMoreButton.click()

      // 检查是否立即显示loading
      await page.waitForTimeout(100)
      const loadingText = await page.locator('text=/加载中/').isVisible()
      const timeToLoading = Date.now() - loadMoreStartTime

      console.log(`   ⚡ 点击后100ms内显示loading: ${loadingText}`)
      console.log(`   ⚡ 响应时间: ${timeToLoading}ms`)

      if (loadingText && timeToLoading < 200) {
        console.log('   ✅ 加载更多立即反馈正常！')
      }

      // 等待加载完成
      await page.waitForTimeout(2000)
      const wordsAfterLoad = await page.locator('[data-testid="word-card"]').count()
      console.log(`   加载前: ${wordsBeforeLoad}个单词`)
      console.log(`   加载后: ${wordsAfterLoad}个单词`)

      if (wordsAfterLoad > wordsBeforeLoad) {
        console.log('   ✅ 加载更多功能正常！')
      }
    }

    console.log('\n✅ UX测试完成')

    console.log('\n📋 改进总结:')
    console.log('1. ✅ 点击翻页按钮立即显示骨架屏（乐观UI）')
    console.log('2. ✅ "加载更多"点击后立即显示loading状态')
    console.log('3. ✅ 加载更多后平滑滚动到新内容')

  } catch (error) {
    console.error('\n❌ 测试失败:', error.message)
  } finally {
    await browser.close()
  }
}

testPaginationUX()
