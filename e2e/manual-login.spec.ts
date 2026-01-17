/**
 * 手动登录测试 - 用于验证登录流程
 */

import { test, expect } from '@playwright/test'

test.describe('手动登录测试', () => {
  test('测试登录流程', async ({ page }) => {
    console.log('🔐 开始登录测试')

    // 访问登录页
    await page.goto('/login')
    await page.waitForLoadState('networkidle')

    // 截图 - 登录前
    await page.screenshot({ path: 'test-results/01-login-page.png' })
    console.log('📸 已截图: 登录页')

    // 填写表单
    const phoneInput = page.locator('input[type="tel"]').first()
    const passwordInput = page.locator('input[type="password"]').first()

    await phoneInput.fill('13800138000')
    await passwordInput.fill('test123456')

    console.log('📝 已填写: 13800138000 / test123456')

    // 截图 - 填写后
    await page.screenshot({ path: 'test-results/02-form-filled.png' })

    // 点击登录按钮
    const submitButton = page.locator('button[type="submit"]').first()
    await submitButton.click()

    console.log('✅ 已点击登录按钮')

    // 等待响应
    await page.waitForTimeout(5000)

    // 截图 - 点击后
    await page.screenshot({ path: 'test-results/03-after-click.png' })

    // 检查当前状态
    const currentUrl = page.url()
    console.log('📍 当前URL:', currentUrl)

    // 检查是否有错误消息
    const errorMessage = page.locator('text=错误,text=失败,text=手机号,text=密码')
    const hasError = await errorMessage.count() > 0

    if (hasError) {
      const errorText = await errorMessage.first().textContent()
      console.log('❌ 登录错误:', errorText)
    } else {
      console.log('ℹ️ 没有发现错误消息')
    }

    // 检查页面标题
    const pageTitle = await page.title()
    console.log('📄 页面标题:', pageTitle)

    // 检查是否在首页
    if (currentUrl === '/' || currentUrl.endsWith('/')) {
      console.log('✅ 成功跳转到首页')

      // 截图 - 首页
      await page.screenshot({ path: 'test-results/04-homepage.png' })
    } else {
      console.log('⚠️ 未跳转到首页，仍在:', currentUrl)
    }

    // 尝试访问library
    console.log('📚 尝试访问词书列表...')
    await page.goto('/library')
    await page.waitForLoadState('networkidle')

    // 截图 - library页
    await page.screenshot({ path: 'test-results/05-library-page.png' })

    // 查找词书卡片
    const bookLinks = page.locator('a[href^="/library/"]')
    const bookCount = await bookLinks.count()

    console.log(`📖 找到 ${bookCount} 个词书链接`)

    if (bookCount > 0) {
      const firstLink = bookLinks.first()
      const href = await firstLink.getAttribute('href')
      console.log('  第一个词书链接:', href)

      // 获取词书名称
      const cardText = await firstLink.textContent()
      console.log('  词书名称:', cardText?.substring(0, 50))
    }
  })
})
