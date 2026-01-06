import { test, expect } from '@playwright/test'

test.describe('单词书详情页 - 基础功能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 先访问首页确认服务器运行正常
    await page.goto('/')
    await page.waitForLoadState('networkidle')

    // 导航到单词书详情页
    await page.goto('/library/demo-book-1')

    // 等待页面加载完成
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('页面应该正确加载', async ({ page }) => {
    // 检查URL
    expect(page.url()).toContain('/library/demo-book-1')

    // 检查页面标题
    const title = await page.title()
    console.log('页面标题:', title)

    // 截图用于调试
    await page.screenshot({ path: 'test-debug-page.png' })
  })

  test('应该显示页面内容', async ({ page }) => {
    // 等待主要内容加载
    await page.waitForSelector('body', { timeout: 10000 })

    // 尝试查找页面元素
    const h1Exists = await page.locator('h1').count()
    console.log('H1元素数量:', h1Exists)

    const buttons = await page.locator('button').count()
    console.log('按钮数量:', buttons)

    // 截图
    await page.screenshot({ path: 'test-debug-content.png', fullPage: true })
  })

  test('检查重定向', async ({ page }) => {
    // 检查当前URL
    const currentUrl = page.url()
    console.log('当前URL:', currentUrl)

    // 如果重定向到登录页
    if (currentUrl.includes('/login')) {
      console.log('页面被重定向到登录页，需要先登录')
      // 这里可以添加登录逻辑
    }
  })
})
