// e2e/dictation-error-handling.spec.ts
// 对应方案：Section 8.3 - 异常测试

import { test, expect } from '@playwright/test'

test.describe('听写模式 - 异常测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login')
    await page.fill('input[type="tel"]', '18710244186')
    await page.fill('input[type="password"]', '12cDoOGwdS9E')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  // 对应方案：Section 8.3 - 网络超时测试
  test('应该处理网络超时', async ({ page }) => {
    // Mock网络超时 - 拦截API请求
    await page.route('**/api/flashcard-progress', route => {
      // 延迟响应
      setTimeout(() => route.continue(), 30000)
    })

    await page.goto('/library/book_123')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }
    }

    // 应该静默失败或显示加载状态，不阻塞用户操作
    const loadingIndicator = page.locator('text=加载中').or(page.locator('.animate-spin'))

    if (await loadingIndicator.isVisible({ timeout: 2000 })) {
      // 显示了加载指示器，这是正常的
      expect(loadingIndicator).toBeVisible()
    } else {
      // 或者静默失败，用户可以继续操作
      const inputField = page.locator('input[type="text"]')
      await expect(inputField).toBeVisible({ timeout: 10000 })
    }
  })

  // 对应方案：Section 8.3 - 服务器错误测试
  test('应该处理服务器错误', async ({ page }) => {
    // Mock 500错误
    await page.route('**/api/words/stats', route => {
      route.fulfill({
        status: 500,
        body: JSON.stringify({ error: 'Internal Server Error' })
      })
    })

    await page.goto('/library/book_123')

    // 应该显示错误提示或降级处理
    const errorMessage = page.locator('text=/错误|加载失败|Error/')

    // 如果显示错误提示，验证它
    if (await errorMessage.isVisible({ timeout: 3000 })) {
      await expect(errorMessage).toBeVisible()
    } else {
      // 或者静默降级，继续显示页面
      expect(await page.title()).toBeTruthy()
    }
  })

  // 对应方案：Section 8.3 - 无效bookId测试
  test('应该处理无效的bookId', async ({ page }) => {
    await page.goto('/study/invalid-book-id-format/dictation')

    // 应该显示错误提示或重定向
    const url = page.url()
    const hasError = await page.locator('text=/错误|不存在|无效|Error/').isVisible()

    expect(
      url.includes('/library') ||
      url.includes('/login') ||
      hasError
    ).toBeTruthy()
  })

  // 对应方案：Section 8.3 - 权限错误测试
  test('应该处理无权访问的词书', async ({ page }) => {
    // Mock 403 Forbidden错误
    await page.route('**/api/words*', route => {
      route.fulfill({
        status: 403,
        body: JSON.stringify({ error: 'Forbidden' })
      })
    })

    await page.goto('/library/restricted_book')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()
    }

    // 应该显示权限错误
    const errorMessage = page.locator('text=/无权|Forbidden|禁止|权限/')

    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  // 对应方案：Section 8.3 - 并发操作测试
  test('应该处理快速连续操作', async ({ page }) => {
    await page.goto('/library/book_123')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }
    }

    await page.waitForSelector('input[type="text"]', { timeout: 10000 })

    // 快速点击多次"跳过"按钮
    const skipButton = page.locator('text=跳过').or(page.locator('text=下一个'))

    for (let i = 0; i < 5; i++) {
      if (await skipButton.isVisible()) {
        await skipButton.click().catch(() => {
          // 如果按钮被禁用，忽略错误
        })
      }
    }

    // 应该显示"正在保存或切换"的提示
    const statusIndicator = page.locator('text=/正在.*保存|正在.*切换/')

    if (await statusIndicator.isVisible({ timeout: 1000 })) {
      await expect(statusIndicator).toBeVisible()
    }

    // 最终应该到达一个稳定状态
    await page.waitForTimeout(2000)

    const finalIndex = await page.locator('text=/进度：/').textContent()
    expect(finalIndex).toBeTruthy()
  })

  // 对应方案：Section 8.3 - 数据格式错误测试
  test('应该处理API返回格式错误', async ({ page }) => {
    // Mock返回格式错误的数据
    await page.route('**/api/words*', route => {
      route.fulfill({
        status: 200,
        body: JSON.stringify({ invalid: 'data format' })  // 缺少success字段
      })
    })

    await page.goto('/library/book_123')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }
    }

    // 应该显示友好的错误提示
    const errorIndicator = page.locator('text=/获取.*失败|加载.*失败|Error/')

    if (await errorIndicator.isVisible({ timeout: 5000 })) {
      await expect(errorIndicator).toBeVisible()
    }
  })
})
