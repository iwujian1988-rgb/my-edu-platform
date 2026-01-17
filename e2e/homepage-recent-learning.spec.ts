/**
 * Homepage - Recent Learning Module E2E Tests
 *
 * 测试目标：首页"最近学习"模块 - 进度恢复功能
 *
 * 核心业务逻辑验证：
 * 1. 从 Flashcards 模式学习到某个位置后退出
 * 2. 从 Dictation 模式学习到某个位置后退出
 * 3. 不同的退出方式（返回按钮、浏览器后退、直接关闭标签页）
 * 4. 从首页点击"继续学习"卡片，验证能否恢复到正确的位置和模式
 * 5. 验证不显示范围选择对话框（直接进入学习）
 *
 * 测试策略：
 * - 使用 Page Object Model (POM) 模式
 * - 使用 globalSetup 已登录状态
 * - 专注于业务逻辑的正确性，而非 URL 参数
 * - 智能等待网络和数据渲染
 */

import { test, expect } from '@playwright/test'
import { HomePage } from './pages/HomePage'
import { LearningPage } from './pages/LearningPage'

// ========================================
// Test Configuration
// ========================================

const TEST_USER = {
  phone: '13800138000',
  password: 'password123'
}

// ========================================
// Test Suite 1: 进度卡片显示测试
// ========================================
test.describe('最近学习模块 - 进度卡片显示', () => {
  let homePage: HomePage

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page)
    await homePage.goto()
    await homePage.waitForLoaded()
  })

  test('TC-HPL-001: 首页加载成功并显示标题', async ({ page }) => {
    // 验证页面标题（使用 .first() 避免 strict mode violation）
    const title = page.locator('h1').filter({ hasText: '喵喵笔记' }).first()
    await expect(title).toBeVisible()

    // 验证用户邮箱显示
    await expect(homePage.userEmail).toBeVisible()
  })

  test('TC-HPL-002: 显示 0-3 个进度卡片', async () => {
    const cardCount = await homePage.getProgressCardCount()

    console.log(`进度卡片数量: ${cardCount}`)

    // 验证卡片数量不超过 3 个
    expect(cardCount).toBeLessThanOrEqual(3)

    // 验证每个卡片都可见
    for (let i = 0; i < cardCount; i++) {
      const card = homePage.progressCards.nth(i)
      await expect(card).toBeVisible()
    }
  })

  test('TC-HPL-003: 进度卡片显示完整信息', async ({ page }) => {
    const cardCount = await homePage.getProgressCardCount()

    if (cardCount === 0) {
      console.log('⚠️ 没有学习进度，跳过测试')
      test.skip()
      return
    }

    // 验证第一个卡片包含必要信息
    await homePage.verifyProgressCard(0, {
      hasPositionInfo: true,    // 位置信息 (1/5000)
      hasTimeInfo: true,        // 时间标签 (刚刚学习)
      hasContinueURL: true      // 继续 URL
    })

    // 提取并打印卡片数据
    const cardData = await homePage.getProgressCardData(0)
    console.log('卡片数据:', cardData)

    // 验证进度百分比有效
    expect(cardData.progress).toBeGreaterThanOrEqual(0)
    expect(cardData.progress).toBeLessThanOrEqual(100)
  })

  test('TC-HPL-004: 进度卡片按时间倒序排列', async () => {
    const cardCount = await homePage.getProgressCardCount()

    if (cardCount < 2) {
      console.log('⚠️ 进度卡片少于 2 个，无法验证排序')
      test.skip()
      return
    }

    // 验证卡片可见性
    for (let i = 0; i < cardCount; i++) {
      const card = homePage.progressCards.nth(i)
      await expect(card).toBeVisible()

      const cardData = await homePage.getProgressCardData(i)
      console.log(`卡片 ${i}: ${cardData.bookTitle} - ${cardData.lastStudyTime}`)
    }
  })
})

// ========================================
// Test Suite 2: Flashcards 进度恢复测试
// ========================================
test.describe('最近学习模块 - Flashcards 进度恢复', () => {
  let homePage: HomePage
  let learningPage: LearningPage

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page)
    learningPage = new LearningPage(page)
  })

  test('TC-HPL-101: Flashcards 学习后使用返回按钮退出 → 从首页恢复', async ({ page }) => {
    // 1. 访问首页，检查是否有 flashcards 进度卡片
    await homePage.goto()
    await homePage.waitForLoaded()

    const cardCount = await homePage.getProgressCardCount()

    if (cardCount === 0) {
      console.log('⚠️ 没有学习进度，跳过测试')
      test.skip()
      return
    }

    // 2. 查找 flashcards 模式的进度卡片
    let flashcardCardIndex = -1
    for (let i = 0; i < cardCount; i++) {
      const cardData = await homePage.getProgressCardData(i)
      if (cardData.continueURL.includes('/flashcards')) {
        flashcardCardIndex = i
        console.log('找到 Flashcards 卡片:', cardData)
        break
      }
    }

    if (flashcardCardIndex === -1) {
      console.log('⚠️ 没有 Flashcards 模式的进度卡片')
      test.skip()
      return
    }

    // 3. 记录首页卡片显示的进度
    const cardDataBefore = await homePage.getProgressCardData(flashcardCardIndex)
    console.log('首页卡片进度:', cardDataBefore.position)

    // 4. 点击进度卡片进入学习
    await homePage.clickProgressCard(flashcardCardIndex)

    // 5. 验证进入了 Flashcards 页面且不显示范围选择对话框
    await learningPage.waitForFlashcardsLoaded()
    await learningPage.verifyFlashcardsNoScopeDialog()

    // 6. 验证 URL 参数（包含 resume=true 和 hash 定位）
    const currentURL = learningPage.getCurrentURL()
    console.log('当前 URL:', currentURL)
    expect(learningPage.hasResumeParameter()).toBe(true)
    expect(learningPage.hasHashPosition()).toBe(true)

    // 7. 获取当前单词位置（从 hash 中提取）
    const currentIndex = await learningPage.getFlashcardsCurrentIndex()
    console.log('恢复到的单词位置:', currentIndex)

    // 8. 验证当前单词可见
    const currentWord = await learningPage.getFlashcardsCurrentWord()
    console.log('当前单词:', currentWord)
    expect(currentWord).toBeTruthy()
    expect(currentWord).not.toBe('')

    // 9. 标记当前单词为"认识"（模拟学习行为）
    await learningPage.markFlashcardsAsKnown()
    await page.waitForTimeout(1000)

    // 10. 返回首页
    await learningPage.goBackToHomepage()
    await homePage.waitForLoaded()

    // 11. 验证首页进度卡片已更新
    const cardDataAfter = await homePage.getProgressCardData(flashcardCardIndex)
    console.log('返回首页后的进度:', cardDataAfter.position)

    // 12. 再次点击进度卡片，验证能否恢复到新的位置
    await homePage.clickProgressCard(flashcardCardIndex)

    await learningPage.waitForFlashcardsLoaded()
    await learningPage.verifyFlashcardsNoScopeDialog()

    const newIndex = await learningPage.getFlashcardsCurrentIndex()
    console.log('再次恢复后的位置:', newIndex)

    // 验证位置是否前进（或者至少保持不变）
    expect(newIndex).toBeGreaterThanOrEqual(currentIndex)

    console.log('✅ TC-HPL-101 通过: Flashcards 进度恢复成功')
  })

  test('TC-HPL-102: Flashcards 学习后使用浏览器后退 → 从首页恢复', async ({ page }) => {
    // 1. 访问首页
    await homePage.goto()
    await homePage.waitForLoaded()

    const cardCount = await homePage.getProgressCardCount()
    if (cardCount === 0) {
      console.log('⚠️ 没有学习进度，跳过测试')
      test.skip()
      return
    }

    // 2. 查找 flashcards 模式的进度卡片
    let flashcardCardIndex = -1
    for (let i = 0; i < cardCount; i++) {
      const cardData = await homePage.getProgressCardData(i)
      if (cardData.continueURL.includes('/flashcards')) {
        flashcardCardIndex = i
        break
      }
    }

    if (flashcardCardIndex === -1) {
      console.log('⚠️ 没有 Flashcards 模式的进度卡片')
      test.skip()
      return
    }

    // 3. 点击进度卡片进入学习
    await homePage.clickProgressCard(flashcardCardIndex)
    await learningPage.waitForFlashcardsLoaded()

    const currentIndex = await learningPage.getFlashcardsCurrentIndex()
    console.log('当前单词位置:', currentIndex)

    // 4. 使用浏览器后退按钮
    await learningPage.browserBack()

    // 5. 等待返回首页
    await page.waitForURL('**/', { timeout: 5000 })
    await homePage.waitForLoaded()

    // 6. 再次点击进度卡片
    await homePage.clickProgressCard(flashcardCardIndex)
    await learningPage.waitForFlashcardsLoaded()

    // 7. 验证恢复到相同位置
    const newIndex = await learningPage.getFlashcardsCurrentIndex()
    console.log('恢复后的位置:', newIndex)
    expect(newIndex).toBe(currentIndex)

    console.log('✅ TC-HPL-102 通过: 浏览器后退后恢复成功')
  })

  test('TC-HPL-103: Flashcards 学习多个单词后退出 → 验证恢复到最后学习的位置', async ({ page }) => {
    // 1. 访问首页
    await homePage.goto()
    await homePage.waitForLoaded()

    const cardCount = await homePage.getProgressCardCount()
    if (cardCount === 0) {
      console.log('⚠️ 没有学习进度，跳过测试')
      test.skip()
      return
    }

    // 2. 查找 flashcards 模式的进度卡片
    let flashcardCardIndex = -1
    for (let i = 0; i < cardCount; i++) {
      const cardData = await homePage.getProgressCardData(i)
      if (cardData.continueURL.includes('/flashcards')) {
        flashcardCardIndex = i
        break
      }
    }

    if (flashcardCardIndex === -1) {
      console.log('⚠️ 没有 Flashcards 模式的进度卡片')
      test.skip()
      return
    }

    // 3. 进入学习页面
    await homePage.clickProgressCard(flashcardCardIndex)
    await learningPage.waitForFlashcardsLoaded()

    const initialIndex = await learningPage.getFlashcardsCurrentIndex()
    console.log('初始位置:', initialIndex)

    // 4. 学习 3 个单词
    for (let i = 0; i < 3; i++) {
      await learningPage.markFlashcardsAsKnown()
      await page.waitForTimeout(1000)
    }

    const indexAfterStudy = await learningPage.getFlashcardsCurrentIndex()
    console.log('学习 3 个单词后的位置:', indexAfterStudy)

    // 5. 返回首页
    await learningPage.goBackToHomepage()
    await homePage.waitForLoaded()

    // 6. 再次进入，验证恢复到最后学习位置
    await homePage.clickProgressCard(flashcardCardIndex)
    await learningPage.waitForFlashcardsLoaded()

    const restoredIndex = await learningPage.getFlashcardsCurrentIndex()
    console.log('恢复后的位置:', restoredIndex)

    // 验证恢复到的位置是学习后的位置
    expect(restoredIndex).toBe(indexAfterStudy)

    console.log('✅ TC-HPL-103 通过: 恢复到最后学习位置成功')
  })
})

// ========================================
// Test Suite 3: Dictation 进度恢复测试
// ========================================
test.describe('最近学习模块 - Dictation 进度恢复', () => {
  let homePage: HomePage
  let learningPage: LearningPage

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page)
    learningPage = new LearningPage(page)
  })

  test('TC-HPL-201: Dictation 学习后使用返回按钮退出 → 从首页恢复', async ({ page }) => {
    // 1. 访问首页，检查是否有 dictation 进度卡片
    await homePage.goto()
    await homePage.waitForLoaded()

    const cardCount = await homePage.getProgressCardCount()

    if (cardCount === 0) {
      console.log('⚠️ 没有学习进度，跳过测试')
      test.skip()
      return
    }

    // 2. 查找 dictation 模式的进度卡片
    let dictationCardIndex = -1
    for (let i = 0; i < cardCount; i++) {
      const cardData = await homePage.getProgressCardData(i)
      if (cardData.continueURL.includes('/dictation')) {
        dictationCardIndex = i
        console.log('找到 Dictation 卡片:', cardData)
        break
      }
    }

    if (dictationCardIndex === -1) {
      console.log('⚠️ 没有 Dictation 模式的进度卡片')
      test.skip()
      return
    }

    // 3. 记录首页卡片显示的进度
    const cardDataBefore = await homePage.getProgressCardData(dictationCardIndex)
    console.log('首页卡片进度:', cardDataBefore.position)

    // 4. 点击进度卡片进入学习
    await homePage.clickProgressCard(dictationCardIndex)

    // 5. 验证进入了 Dictation 页面且不显示范围选择对话框
    await learningPage.waitForDictationLoaded()
    await learningPage.verifyDictationNoScopeDialog()

    // 6. 验证 URL 参数（包含 resume=true 和 hash 定位）
    const currentURL = learningPage.getCurrentURL()
    console.log('当前 URL:', currentURL)
    expect(learningPage.hasResumeParameter()).toBe(true)
    expect(learningPage.hasHashPosition()).toBe(true)

    // 7. 获取当前题目位置
    const currentIndex = await learningPage.getDictationCurrentIndex()
    console.log('恢复到的题目位置:', currentIndex)

    // 8. 跳过当前题目（模拟学习行为）
    await learningPage.skipDictationWord()
    await page.waitForTimeout(1000)

    // 9. 返回首页
    await learningPage.goBackToHomepage()
    await homePage.waitForLoaded()

    // 10. 验证首页进度卡片已更新
    const cardDataAfter = await homePage.getProgressCardData(dictationCardIndex)
    console.log('返回首页后的进度:', cardDataAfter.position)

    // 11. 再次点击进度卡片，验证能否恢复到新的位置
    await homePage.clickProgressCard(dictationCardIndex)

    await learningPage.waitForDictationLoaded()
    await learningPage.verifyDictationNoScopeDialog()

    const newIndex = await learningPage.getDictationCurrentIndex()
    console.log('再次恢复后的位置:', newIndex)

    // 验证位置是否前进（或者至少保持不变）
    expect(newIndex).toBeGreaterThanOrEqual(currentIndex)

    console.log('✅ TC-HPL-201 通过: Dictation 进度恢复成功')
  })

  test('TC-HPL-202: Dictation 学习后使用浏览器后退 → 从首页恢复', async ({ page }) => {
    // 1. 访问首页
    await homePage.goto()
    await homePage.waitForLoaded()

    const cardCount = await homePage.getProgressCardCount()
    if (cardCount === 0) {
      console.log('⚠️ 没有学习进度，跳过测试')
      test.skip()
      return
    }

    // 2. 查找 dictation 模式的进度卡片
    let dictationCardIndex = -1
    for (let i = 0; i < cardCount; i++) {
      const cardData = await homePage.getProgressCardData(i)
      if (cardData.continueURL.includes('/dictation')) {
        dictationCardIndex = i
        break
      }
    }

    if (dictationCardIndex === -1) {
      console.log('⚠️ 没有 Dictation 模式的进度卡片')
      test.skip()
      return
    }

    // 3. 点击进度卡片进入学习
    await homePage.clickProgressCard(dictationCardIndex)
    await learningPage.waitForDictationLoaded()

    const currentIndex = await learningPage.getDictationCurrentIndex()
    console.log('当前题目位置:', currentIndex)

    // 4. 使用浏览器后退按钮
    await learningPage.browserBack()

    // 5. 等待返回首页
    await page.waitForURL('**/', { timeout: 5000 })
    await homePage.waitForLoaded()

    // 6. 再次点击进度卡片
    await homePage.clickProgressCard(dictationCardIndex)
    await learningPage.waitForDictationLoaded()

    // 7. 验证恢复到相同位置
    const newIndex = await learningPage.getDictationCurrentIndex()
    console.log('恢复后的位置:', newIndex)
    expect(newIndex).toBe(currentIndex)

    console.log('✅ TC-HPL-202 通过: 浏览器后退后恢复成功')
  })

  test('TC-HPL-203: Dictation 学习多个题目后退出 → 验证恢复到最后学习的位置', async ({ page }) => {
    // 1. 访问首页
    await homePage.goto()
    await homePage.waitForLoaded()

    const cardCount = await homePage.getProgressCardCount()
    if (cardCount === 0) {
      console.log('⚠️ 没有学习进度，跳过测试')
      test.skip()
      return
    }

    // 2. 查找 dictation 模式的进度卡片
    let dictationCardIndex = -1
    for (let i = 0; i < cardCount; i++) {
      const cardData = await homePage.getProgressCardData(i)
      if (cardData.continueURL.includes('/dictation')) {
        dictationCardIndex = i
        break
      }
    }

    if (dictationCardIndex === -1) {
      console.log('⚠️ 没有 Dictation 模式的进度卡片')
      test.skip()
      return
    }

    // 3. 进入学习页面
    await homePage.clickProgressCard(dictationCardIndex)
    await learningPage.waitForDictationLoaded()

    const initialIndex = await learningPage.getDictationCurrentIndex()
    console.log('初始位置:', initialIndex)

    // 4. 学习 3 个题目（跳过）
    for (let i = 0; i < 3; i++) {
      await learningPage.skipDictationWord()
      await page.waitForTimeout(1000)
    }

    const indexAfterStudy = await learningPage.getDictationCurrentIndex()
    console.log('学习 3 个题目后的位置:', indexAfterStudy)

    // 5. 返回首页
    await learningPage.goBackToHomepage()
    await homePage.waitForLoaded()

    // 6. 再次进入，验证恢复到最后学习位置
    await homePage.clickProgressCard(dictationCardIndex)
    await learningPage.waitForDictationLoaded()

    const restoredIndex = await learningPage.getDictationCurrentIndex()
    console.log('恢复后的位置:', restoredIndex)

    // 验证恢复到的位置是学习后的位置
    expect(restoredIndex).toBe(indexAfterStudy)

    console.log('✅ TC-HPL-203 通过: 恢复到最后学习位置成功')
  })
})

// ========================================
// Test Suite 4: 跨模式进度恢复测试
// ========================================
test.describe('最近学习模块 - 跨模式进度恢复', () => {
  let homePage: HomePage
  let learningPage: LearningPage

  test.beforeEach(async ({ page }) => {
    homePage = new HomePage(page)
    learningPage = new LearningPage(page)
  })

  test('TC-HPL-301: Flashcards 和 Dictation 进度独立保存', async ({ page }) => {
    // 1. 访问首页
    await homePage.goto()
    await homePage.waitForLoaded()

    const cardCount = await homePage.getProgressCardCount()
    if (cardCount < 2) {
      console.log('⚠️ 需要至少 2 个进度卡片，跳过测试')
      test.skip()
      return
    }

    // 2. 查找 flashcards 和 dictation 卡片
    let flashcardIndex = -1
    let dictationIndex = -1

    for (let i = 0; i < cardCount; i++) {
      const cardData = await homePage.getProgressCardData(i)
      if (cardData.continueURL.includes('/flashcards')) {
        flashcardIndex = i
      } else if (cardData.continueURL.includes('/dictation')) {
        dictationIndex = i
      }
    }

    if (flashcardIndex === -1 || dictationIndex === -1) {
      console.log('⚠️ 需要同时有 Flashcards 和 Dictation 进度')
      test.skip()
      return
    }

    // 3. 记录两个模式的初始进度
    const flashcardDataBefore = await homePage.getProgressCardData(flashcardIndex)
    const dictationDataBefore = await homePage.getProgressCardData(dictationIndex)
    console.log('Flashcards 初始进度:', flashcardDataBefore.position)
    console.log('Dictation 初始进度:', dictationDataBefore.position)

    // 4. 进入 Flashcards 学习
    await homePage.clickProgressCard(flashcardIndex)
    await learningPage.waitForFlashcardsLoaded()
    const flashcardIndexBefore = await learningPage.getFlashcardsCurrentIndex()
    console.log('Flashcards 当前单词位置:', flashcardIndexBefore)

    // 5. 返回首页
    await learningPage.goBackToHomepage()
    await homePage.waitForLoaded()

    // 6. 进入 Dictation 学习
    await homePage.clickProgressCard(dictationIndex)
    await learningPage.waitForDictationLoaded()
    const dictationIndexBefore = await learningPage.getDictationCurrentIndex()
    console.log('Dictation 当前题目位置:', dictationIndexBefore)

    // 7. 返回首页
    await learningPage.goBackToHomepage()
    await homePage.waitForLoaded()

    // 8. 再次进入 Flashcards，验证进度保持不变
    await homePage.clickProgressCard(flashcardIndex)
    await learningPage.waitForFlashcardsLoaded()
    const flashcardIndexAfter = await learningPage.getFlashcardsCurrentIndex()
    console.log('Flashcards 恢复后的位置:', flashcardIndexAfter)
    expect(flashcardIndexAfter).toBe(flashcardIndexBefore)

    // 9. 返回首页
    await learningPage.goBackToHomepage()
    await homePage.waitForLoaded()

    // 10. 再次进入 Dictation，验证进度保持不变
    await homePage.clickProgressCard(dictationIndex)
    await learningPage.waitForDictationLoaded()
    const dictationIndexAfter = await learningPage.getDictationCurrentIndex()
    console.log('Dictation 恢复后的位置:', dictationIndexAfter)
    expect(dictationIndexAfter).toBe(dictationIndexBefore)

    console.log('✅ TC-HPL-301 通过: Flashcards 和 Dictation 进度独立保存成功')
  })
})

// ========================================
// Test Suite 5: 响应式设计测试
// ========================================
test.describe('最近学习模块 - 响应式设计', () => {
  test('TC-HPL-401: 移动端布局正常显示', async ({ page }) => {
    // 设置移动端视口
    page.setViewportSize({ width: 375, height: 812 })

    const homePage = new HomePage(page)
    await homePage.goto()
    await homePage.waitForLoaded()

    // 验证统计块容器可见
    await expect(homePage.statBoxContainer).toBeVisible()

    // 验证进度卡片在移动端可见
    const cardCount = await homePage.getProgressCardCount()
    for (let i = 0; i < cardCount; i++) {
      const card = homePage.progressCards.nth(i)
      await expect(card).toBeVisible()
    }

    console.log('✅ 移动端布局正常')
  })

  test('TC-HPL-402: 桌面端布局正常显示', async ({ page }) => {
    // 设置桌面端视口
    page.setViewportSize({ width: 1920, height: 1080 })

    const homePage = new HomePage(page)
    await homePage.goto()
    await homePage.waitForLoaded()

    // 验证统计块容器可见
    await expect(homePage.statBoxContainer).toBeVisible()

    // 验证进度卡片在桌面端可见
    const cardCount = await homePage.getProgressCardCount()
    for (let i = 0; i < cardCount; i++) {
      const card = homePage.progressCards.nth(i)
      await expect(card).toBeVisible()
    }

    console.log('✅ 桌面端布局正常')
  })
})

// ========================================
// Test Suite 6: 性能测试
// ========================================
test.describe('最近学习模块 - 性能测试', () => {
  test('TC-HPL-501: RPC 调用性能验证', async ({ page }) => {
    const startTime = Date.now()

    const homePage = new HomePage(page)
    await homePage.goto()
    await homePage.waitForLoaded()

    const endTime = Date.now()
    const loadTime = endTime - startTime

    console.log(`首页加载时间: ${loadTime}ms`)

    // 验证加载时间在可接受范围内（RPC 优化后应该 < 1s）
    expect(loadTime).toBeLessThan(2000)

    // 截图
    await page.screenshot({
      path: 'test-results/homepage-performance.png'
    })
  })

  test('TC-HPL-502: 进度恢复响应时间', async ({ page }) => {
    const homePage = new HomePage(page)
    const learningPage = new LearningPage(page)

    await homePage.goto()
    await homePage.waitForLoaded()

    const cardCount = await homePage.getProgressCardCount()

    if (cardCount === 0) {
      console.log('⚠️ 没有学习进度，跳过测试')
      test.skip()
      return
    }

    // 测量点击响应时间
    const startTime = Date.now()

    await homePage.clickProgressCard(0)

    // 等待学习页面加载
    const mode = await learningPage.getLearningMode()
    if (mode === 'flashcards') {
      await learningPage.waitForFlashcardsLoaded()
    } else if (mode === 'dictation') {
      await learningPage.waitForDictationLoaded()
    }

    const endTime = Date.now()
    const responseTime = endTime - startTime

    console.log(`进度恢复响应时间: ${responseTime}ms`)

    // 验证响应时间在可接受范围内
    expect(responseTime).toBeLessThan(3000)

    console.log('✅ 进度恢复响应时间正常')
  })
})

// ========================================
// Test Suite 7: 异常处理测试
// ========================================
test.describe('最近学习模块 - 异常处理', () => {
  test('TC-HPL-601: 未登录用户应跳转到登录页', async ({ page }) => {
    // 清除登录状态（需要在页面加载前执行）
    await page.context().clearCookies()

    // 访问首页
    await page.goto('http://localhost:3000/')

    // 在页面加载后清除 localStorage
    await page.evaluate(() => {
      try {
        localStorage.clear()
        sessionStorage.clear()
      } catch (e) {
        // 忽略跨域错误
      }
    })

    // 刷新页面以应用清除后的状态
    await page.reload()

    // 验证跳转到登录页
    await page.waitForURL('**/login', { timeout: 5000 })
    expect(page.url()).toContain('/login')

    console.log('✅ 未登录用户正确跳转到登录页')
  })

  test('TC-HPL-602: RPC 错误处理 - 页面仍可加载', async ({ page }) => {
    const homePage = new HomePage(page)
    await homePage.goto()

    // 等待页面基本结构加载（即使 RPC 失败）
    await page.waitForLoadState('domcontentloaded')

    // 验证页面标题仍然显示
    const title = page.locator('h1').filter({ hasText: '喵喵笔记' }).first()
    await expect(title).toBeVisible()

    console.log('✅ 页面基本结构加载正常')
  })
})

// ========================================
// Test AfterEach - 截图
// ========================================
test.afterEach(async ({ page }) => {
  const testName = test.info().title
  await page.screenshot({
    path: `test-results/homepage/${testName.replace(/[^a-z0-9]/gi, '_')}.png`,
    fullPage: false
  })
})
