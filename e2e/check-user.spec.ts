import { test, expect } from '@playwright/test'

/**
 * 用户状态检查 - 确认测试账号状态
 */

test.describe('用户状态检查', () => {
  test('尝试注册新账号', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // 切换到注册标签
    await page.click('button:has-text("注册")')
    await page.waitForTimeout(500)

    // 填写注册表单
    await page.fill('input[placeholder="请输入11位手机号"]', '13800138000')
    await page.fill('input[placeholder="至少6位密码"]', 'test123456')
    await page.fill('input[placeholder="再次输入密码"]', 'test123456')
    await page.fill('input[placeholder="请输入邀请码"]', 'TEST1234')

    // 提交注册
    await page.click('button:has-text("注册")')

    // 等待结果
    await page.waitForTimeout(3000)

    const currentUrl = page.url()
    const pageContent = await page.content()

    console.log('当前URL:', currentUrl)

    if (currentUrl === '/' || currentUrl.endsWith('/')) {
      console.log('✅ 注册成功并已登录')
    } else if (pageContent.includes('该手机号已注册') || pageContent.includes('已注册')) {
      console.log('✅ 账号已存在，尝试登录')

      // 切换到登录标签
      await page.click('button:has-text("登录")')
      await page.waitForTimeout(500)

      // 尝试登录
      await page.fill('input[placeholder="请输入手机号"]', '13800138000')
      await page.fill('input[placeholder="请输入密码"]', 'test123456')

      await page.keyboard.press('Enter')
      await page.waitForTimeout(3000)

      const loginUrl = page.url()
      console.log('登录后URL:', loginUrl)

      if (loginUrl === '/' || loginUrl.endsWith('/')) {
        console.log('✅ 登录成功')
      } else {
        // 检查错误消息
        const errorText = await page.locator('text=/错误|失败/').textContent()
        console.log('❌ 登录失败:', errorText)

        // 截图
        await page.screenshot({ path: 'test-results/login-error.png' })
      }
    } else {
      console.log('❓ 注册结果未知')
      await page.screenshot({ path: 'test-results/register-result.png' })
    }
  })
})
