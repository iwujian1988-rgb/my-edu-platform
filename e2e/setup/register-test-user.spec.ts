import { test, expect } from '@playwright/test'

/**
 * 测试环境准备 - 注册测试账号
 *
 * 运行此测试以确保测试账号存在：
 * npx playwright test e2e/setup/register-test-user.spec.ts --headed
 */

test.describe('测试环境准备', () => {
  test('注册测试账号 13800138000', async ({ page }) => {
    await page.goto('/login')

    // 切换到注册标签
    await page.click('text=注册')

    // 填写注册表单
    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]:not([placeholder*="再次"])', 'test123456')
    await page.fill('input[placeholder*="再次"]', 'test123456')
    await page.fill('input[placeholder*="邀请码"]', 'TEST1234')

    // 提交表单
    await page.click('button:has-text("注册")')

    // 等待结果 - 等待按钮文本恢复或URL跳转
    await page.waitForTimeout(2000)

    // 检查当前URL
    const currentUrl = page.url()

    if (currentUrl.includes('/study')) {
      // 注册成功，已经跳转到 study 页面
      console.log('✅ 测试账号注册成功并已跳转')
    } else {
      // 还在登录页面，检查是否显示错误
      const pageContent = await page.content()
      if (pageContent.includes('已注册')) {
        console.log('✅ 测试账号已存在，跳过注册')
      } else if (pageContent.includes('注册成功') || pageContent.includes('登录成功')) {
        console.log('✅ 注册/登录成功')
        await page.waitForURL('/study', { timeout: 5000 })
      } else {
        // 截图用于调试
        await page.screenshot({ path: 'test-results/setup-debug.png' })
        console.log('⚠️ 状态未知，已截图')
        console.log('当前URL:', currentUrl)
      }
    }

    // 验证跳转到 study 页面
    expect(page.url()).toContain('/study')

    // 登出，为后续测试准备
    await page.click('button:has-text("退出登录")')
    await page.waitForURL('/login')
    console.log('✅ 测试环境准备完成')
  })
})
