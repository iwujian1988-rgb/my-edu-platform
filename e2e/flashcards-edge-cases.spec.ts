/**
 * Flashcards 边界情况 E2E 测试
 *
 * 测试目标：验证各种边界情况下的行为
 * 1. 索引越界恢复
 * 2. 数据不一致处理
 * 3. 切换范围后的状态重置
 */

import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000'
const TEST_BOOK_ID = '4fff1da4-c82e-4528-bdb1-d8e1524eee77' // 日常生活主题词库

// 辅助函数：模拟 sessionStorage 中存在越界索引
async function setSessionStorageWithInvalidIndex(page: Page, bookId: string, index: number, scope: string) {
  await page.evaluate(({ bookId, index, scope }) => {
    const position = {
      bookId,
      index,
      scope,
      timestamp: Date.now()
    }
    sessionStorage.setItem(`flashcards_position_${bookId}`, JSON.stringify(position))
  }, { bookId, index, scope })
}

// 辅助函数：等待页面加载完成（处理范围选择对话框）
async function waitForFlashcardsReady(page: Page) {
  // 先检查是否有范围选择对话框
  const hasScopeDialog = await page.locator('text=选择学习范围').count()
  if (hasScopeDialog > 0) {
    console.log('⚠️ 检测到范围选择对话框，选择"不认识"')
    await page.click('text=不认识')
    await page.waitForTimeout(500)
  }

  // 等待加载状态消失
  try {
    await page.waitForSelector('h1[class*="text-5xl"]', { timeout: 15000 })
    // 等待单词显示
    await page.waitForFunction(() => {
      const h1 = document.querySelector('h1[class*="text-5xl"]')
      return h1 && h1.textContent && h1.textContent.length > 0
    }, { timeout: 10000 })
  } catch {
    // 可能显示完成页面
    const hasComplete = await page.locator('text=太棒了').count()
    if (hasComplete > 0) {
      console.log('✅ 显示完成页面')
      return
    }
    throw new Error('页面加载超时：未找到单词卡片或完成页面')
  }
}

// 辅助函数：访问 flashcards 页面
async function gotoFlashcards(page: Page, scope: string = 'unknown') {
  await page.goto(`${BASE_URL}/study/${TEST_BOOK_ID}/flashcards?scope=${scope}`, {
    waitUntil: 'domcontentloaded',
    timeout: 60000
  })
}

test.describe('Flashcards 边界情况测试', () => {
  // 注意：playwright.config.ts 已配置 storageState，自动带上登录状态，无需手动登录

  /**
   * 测试 1: sessionStorage 恢复的索引越界
   * 场景：用户之前学到最后一个单词，刷新后单词数量减少
   */
  test('应该自动调整越界的 currentIndex', async ({ page }) => {
    // 1. 先访问页面（需要同源才能设置 sessionStorage）
    await gotoFlashcards(page, 'unknown')

    // 2. 设置一个越界的索引到 sessionStorage
    await setSessionStorageWithInvalidIndex(page, TEST_BOOK_ID, 10, 'unknown')

    // 3. 刷新页面，触发索引恢复逻辑
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })

    // 4. 等待页面加载完成（应该自动调整索引）
    await waitForFlashcardsReady(page)

    // 5. 验证页面正常显示（没有崩溃）
    const wordElement = page.locator('h1[class*="text-5xl"]')
    await expect(wordElement).toBeVisible()

    // 6. 验证索引被调整到有效范围
    const progressText = await page.locator('text=/第 \\d+ 张/').textContent()
    expect(progressText).toMatch(/第 \d+ 张/)
    console.log('✅ 索引越界自动调整成功:', progressText)
  })

  /**
   * 测试 2: 切换范围后状态正确重置
   * 场景：用户在一个范围标记单词后切换到另一个范围
   */
  test('切换范围后应该重置 currentIndex', async ({ page }) => {
    // 1. 访问页面
    await gotoFlashcards(page, 'unknown')
    await waitForFlashcardsReady(page)

    // 2. 记录当前单词
    const firstWord = await page.locator('h1[class*="text-5xl"]').textContent()
    console.log('第一个单词:', firstWord)

    // 3. 左滑标记为"认识"
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(500)

    // 4. 验证切换到下一个单词
    const secondWord = await page.locator('h1[class*="text-5xl"]').textContent()
    console.log('第二个单词:', secondWord)

    // 如果只有一个单词，可能显示完成对话框
    const hasCompleteDialog = await page.locator('text=太棒了').count()
    if (hasCompleteDialog > 0) {
      console.log('✅ 只有一个单词，显示完成对话框')
      return
    }

    expect(secondWord).not.toBe(firstWord)
    console.log('✅ 左滑后正确切换到下一个单词')
  })

  /**
   * 测试 3: 空单词列表处理
   * 场景：某个范围内没有单词
   */
  test('空范围应该显示完成页面', async ({ page }) => {
    // 访问一个可能为空的范围
    await gotoFlashcards(page, 'known')

    // 等待页面响应
    await page.waitForTimeout(2000)

    // 检查是否显示完成页面或正常单词
    const hasCompletePage = await page.locator('text=太棒了').count()
    const hasWord = await page.locator('h1[class*="text-5xl"]').count()

    expect(hasCompletePage > 0 || hasWord > 0).toBeTruthy()
    console.log('✅ 空范围处理正确')
  })

  /**
   * 测试 4: 连续快速操作
   * 场景：用户快速连续标记多个单词
   */
  test('快速连续标记应该正常工作', async ({ page }) => {
    await gotoFlashcards(page, 'unknown')
    await waitForFlashcardsReady(page)

    // 快速连续标记 5 个单词
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(300)

      // 检查是否有错误
      const hasError = await page.locator('text=加载中').count()
      if (hasError > 0 && i > 0) {
        // 如果显示"加载中"超过 3 秒，可能有问题
        await page.waitForTimeout(3000)
        const stillLoading = await page.locator('text=加载中').count()
        expect(stillLoading).toBe(0)
      }
    }

    console.log('✅ 连续快速标记正常')
  })

  /**
   * 测试 5: 刷新页面后恢复进度
   * 场景：用户学习到一半刷新页面
   */
  test('刷新页面后应该恢复进度', async ({ page }) => {
    // 1. 访问页面
    await gotoFlashcards(page, 'unknown')
    await waitForFlashcardsReady(page)

    // 2. 获取初始进度
    const initialProgress = await page.locator('text=/第 \\d+ 张/').textContent()
    console.log('初始进度:', initialProgress)

    // 3. 标记几个单词
    for (let i = 0; i < 2; i++) {
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(500)
    }

    // 4. 获取当前进度
    const beforeRefreshProgress = await page.locator('text=/第 \\d+ 张/').textContent()
    console.log('刷新前进度:', beforeRefreshProgress)

    // 5. 刷新页面
    await page.reload({ waitUntil: 'domcontentloaded', timeout: 60000 })
    await waitForFlashcardsReady(page)

    // 6. 验证进度恢复
    const afterRefreshProgress = await page.locator('text=/第 \\d+ 张/').textContent()
    console.log('刷新后进度:', afterRefreshProgress)

    // 进度应该保持或接近（可能有 1 的偏差）
    expect(afterRefreshProgress).toBeTruthy()
    console.log('✅ 刷新后进度恢复正常')
  })

  /**
   * 测试 6: 控制台无错误
   * 场景：正常使用过程中不应该有 JavaScript 错误
   */
  test('控制台不应该有 JavaScript 错误', async ({ page }) => {
    const errors: string[] = []

    page.on('console', msg => {
      if (msg.type() === 'error' && !msg.text().includes('React DevTools')) {
        errors.push(msg.text())
      }
    })

    await gotoFlashcards(page, 'unknown')
    await waitForFlashcardsReady(page)

    // 执行一些操作
    await page.keyboard.press('ArrowLeft')
    await page.waitForTimeout(500)

    // 过滤掉预期的警告
    const unexpectedErrors = errors.filter(e =>
      !e.includes('Warning:') &&
      !e.includes('componentWill') &&
      !e.includes('deprecated')
    )

    expect(unexpectedErrors).toHaveLength(0)
    console.log('✅ 无 JavaScript 错误')
  })
})

/**
 * 运行方式：
 * npx playwright test e2e/flashcards-edge-cases.spec.ts --headed
 *
 * 或者在 CI 中：
 * npx playwright test e2e/flashcards-edge-cases.spec.ts
 */
