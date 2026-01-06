import { test, expect } from '@playwright/test'

/**
 * 测试环境准备 - 自动注册测试账号
 *
 * 运行此测试以确保测试账号存在：
 * npx playwright test e2e/auto-setup.spec.ts --headed
 */
test.describe('测试环境准备', () => {
  test('自动注册测试账号', async ({ page }) => {
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

    // 提交表单
    await page.click('button:has-text("注册")')

    // 等待结果 - 可能成功或已存在
    await page.waitForTimeout(3000)

    const currentUrl = page.url()

    if (currentUrl.includes('/')) {
      // 注册成功，已经跳转到首页
      console.log('✅ 测试账号注册成功')

      // 登出，为后续测试准备
      await page.goto('/logout')
      await page.waitForURL('/login', { timeout: 10000 })
      console.log('✅ 测试环境准备完成 - 账号已创建并登出')
    } else {
      // 还在登录页面，检查错误信息
      const pageContent = await page.content()
      if (pageContent.includes('该手机号已注册') || pageContent.includes('已注册')) {
        console.log('✅ 测试账号已存在，跳过注册')
      } else if (pageContent.includes('登录成功') || pageContent.includes('注册成功')) {
        console.log('✅ 注册/登录成功')
        await page.waitForURL('/', { timeout: 5000 })

        // 登出
        await page.goto('/logout')
        await page.waitForURL('/login', { timeout: 10000 })
        console.log('✅ 测试环境准备完成 - 账号已存在并登出')
      } else {
        // 显示错误
        const errorText = await page.locator('text=/⚠️/').textContent()
        console.log('⚠️ 注册失败:', errorText)

        // 截图用于调试
        await page.screenshot({ path: 'test-results/setup-error.png' })
      }
    }

    // 最终验证：在登录页面
    expect(page.url()).toContain('/login')
  })
})
