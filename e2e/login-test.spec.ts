import { test, expect } from '@playwright/test'

/**
 * 登录功能验证测试
 */

test.describe('登录功能测试', () => {
  test('应该能够成功登录', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // 截图初始状态
    await page.screenshot({ path: 'test-results/login-page.png' })

    // 填写表单
    await page.fill('input[placeholder="请输入手机号"]', '13800138000')
    await page.fill('input[placeholder="请输入密码"]', 'test123456')

    // 截图填写后状态
    await page.screenshot({ path: 'test-results/login-page-filled.png' })

    // 点击登录按钮
    await page.click('button:has-text("登录")')

    // 等待跳转
    try {
      await page.waitForURL('/', { timeout: 15000 })
      console.log('✅ 登录成功，跳转到首页')

      // 截图成功状态
      await page.screenshot({ path: 'test-results/login-success.png' })
    } catch (error) {
      console.log('❌ 登录失败或超时')

      // 截图失败状态
      await page.screenshot({ path: 'test-results/login-failed.png' })

      // 检查当前URL
      const currentUrl = page.url()
      console.log('当前URL:', currentUrl)

      // 检查页面内容
      const pageContent = await page.content()
      console.log('页面标题:', await page.title())

      // 查找错误消息
      const errorElements = await page.locator('text=/错误|失败|⚠️/').all()
      console.log('找到的错误元素数量:', errorElements.length)

      for (const elem of errorElements) {
        const text = await elem.textContent()
        console.log('错误消息:', text)
      }

      throw error
    }
  })
})
