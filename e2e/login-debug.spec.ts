import { test, expect } from '@playwright/test'

/**
 * 登录调试测试 - 详细诊断
 */

test.describe('登录调试', () => {
  test('检查登录页面元素', async ({ page }) => {
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // 检查页面标题
    const title = await page.title()
    console.log('页面标题:', title)

    // 截图
    await page.screenshot({ path: 'test-results/debug-01-initial.png' })

    // 查找输入框
    const phoneInput = page.locator('input[placeholder="请输入手机号"]')
    const phoneCount = await phoneInput.count()
    console.log('找到手机输入框数量:', phoneCount)

    const passwordInput = page.locator('input[placeholder="请输入密码"]')
    const passwordCount = await passwordInput.count()
    console.log('找到密码输入框数量:', passwordCount)

    if (phoneCount > 0 && passwordCount > 0) {
      // 填写表单
      await phoneInput.first().fill('13800138000')
      await passwordInput.first().fill('test123456')

      await page.screenshot({ path: 'test-results/debug-02-filled.png' })

      // 查找登录按钮 - 尝试多种选择器
      const selectors = [
        'button:has-text("登录")',
        'button[type="submit"]',
        'form button[type="submit"]',
        'text=登录',
      ]

      for (const selector of selectors) {
        const button = page.locator(selector).first()
        const count = await button.count()
        console.log(`选择器 "${selector}" 找到按钮数量:`, count)

        if (count > 0) {
          const buttonText = await button.textContent()
          const isVisible = await button.isVisible()
          const isEnabled = await button.isEnabled()

          console.log(`  - 文本: "${buttonText}"`)
          console.log(`  - 可见: ${isVisible}`)
          console.log(`  - 可用: ${isEnabled}`)
        }
      }

      // 尝试按回车键提交表单（更可靠的方式）
      console.log('尝试按回车键提交表单...')
      await page.keyboard.press('Enter')

      await page.waitForTimeout(3000)

      // 检查当前URL
      const currentUrl = page.url()
      console.log('提交后URL:', currentUrl)

      await page.screenshot({ path: 'test-results/debug-03-after-submit.png' })

      // 检查是否仍在登录页
      if (currentUrl.includes('/login')) {
        // 查找错误消息
        const errorSelectors = [
          'text=/错误/',
          'text=/失败/',
          'text=/⚠️/',
          '[role="alert"]',
          '.error',
          '.error-message'
        ]

        console.log('查找错误消息...')
        for (const selector of errorSelectors) {
          const elem = page.locator(selector)
          const count = await elem.count()
          if (count > 0) {
            console.log(`找到错误元素 (${selector}):`)
            for (let i = 0; i < count; i++) {
              const text = await elem.nth(i).textContent()
              console.log(`  [${i}] ${text}`)
            }
          }
        }
      } else if (currentUrl === '/' || currentUrl.endsWith('/')) {
        console.log('✅ 登录成功！已跳转到首页')
      }
    } else {
      console.log('❌ 未找到输入框')
    }
  })
})
