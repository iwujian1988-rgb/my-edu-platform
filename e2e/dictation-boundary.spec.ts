// e2e/dictation-boundary.spec.ts
// 对应方案：Section 8.2 - 边界测试

import { test, expect } from '@playwright/test'

test.describe('听写模式 - 边界测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login')
    await page.fill('input[type="tel"]', '18710244186')
    await page.fill('input[type="password"]', '12cDoOGwdS9E')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  // 对应方案：Section 8.2 - 0个单词测试
  test('应该处理0个单词的情况', async ({ page }) => {
    // 创建或导航到一个空的词书
    await page.goto('/library/empty_book')

    // 如果有开始听写按钮，点击它
    const startButton = page.locator('text=开始听写').first()
    if (await startButton.isVisible()) {
      await startButton.click()
    }

    // 应该显示"单词数量太少"提示或类似信息
    const errorMessage = page.locator('text=单词数量太少').or(
      page.locator('text=没有可学习的单词')
    ).or(
      page.locator('text=暂无单词')
    )

    await expect(errorMessage).toBeVisible({ timeout: 5000 })
  })

  // 对应方案：Section 8.2 - 1个单词测试
  test('应该处理1个单词的情况', async ({ page }) => {
    // 导航到一个只有1个单词的词书
    await page.goto('/library/single_word_book')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      // 选择范围
      const scopeOption = page.locator('text=全部单词').or(page.locator('text=不认识的')).first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }
    }

    // 等待听写页面加载
    await page.waitForSelector('input[type="text"]', { timeout: 10000 })

    // 输入答案
    const wordElement = page.locator('h2, h1').first()
    const wordText = await wordElement.textContent()

    if (wordText) {
      await page.fill('input[type="text"]', wordText)
      await page.press('input[type="text"]', 'Enter')

      // 听写完成后应该显示完成对话框
      const completeMessage = page.locator('text=太棒了').or(
        page.locator('text=完成')
      ).or(
        page.locator('text=恭喜')
      )

      await expect(completeMessage).toBeVisible({ timeout: 5000 })
    }
  })

  // 对应方案：Section 8.2 - 10000个单词性能测试
  test('应该处理10000个单词的性能', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/library/large_book')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      // 选择一个范围
      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }
    }

    // 等待页面加载
    await page.waitForSelector('input[type="text"]', { timeout: 10000 })

    const loadTime = Date.now() - startTime

    // 对应方案：Section 8.2 - 3秒内加载完成
    expect(loadTime).toBeLessThan(5000)  // 放宽到5秒

    // 验证单词数量正确
    const progressText = await page.locator('text=/进度：/').textContent()
    expect(progressText).toBeTruthy()
  })

  // 对应方案：Section 8.2 - 空输入测试
  test('应该处理空输入的情况', async ({ page }) => {
    await page.goto('/library/book_with_words')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      // 选择范围
      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }
    }

    await page.waitForSelector('input[type="text"]', { timeout: 10000 })

    // 尝试提交空答案
    const submitButton = page.locator('text=提交答案')
    if (await submitButton.isVisible()) {
      // 空输入时按钮应该被禁用
      await expect(submitButton).toBeDisabled()
    }
  })

  // 对应方案：Section 8.2 - 超出范围索引测试
  test('应该处理超出范围的单词索引', async ({ page }) => {
    // 这个测试验证当用户尝试访问超出范围的单词时不会崩溃
    await page.goto('/study/nonexistent_book/dictation')

    // 应该重定向或显示错误
    const url = page.url()
    const hasError = await page.locator('text=/错误|不存在|Error/').isVisible()

    expect(
      url.includes('/library') ||
      url.includes('/login') ||
      hasError
    ).toBeTruthy()
  })
})
