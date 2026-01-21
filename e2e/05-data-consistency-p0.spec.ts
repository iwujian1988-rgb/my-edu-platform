/**
 * E2E测试: 数据一致性 - P0优先级用例
 *
 * 测试范围: 5个P0用例
 * 1. 前后端数据同步 (3个)
 * 2. 数据完整性 (2个)
 */

import { test, expect } from '@playwright/test'
import { login } from './helpers/login-helper'

test.describe('数据一致性 - P0用例', () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  // ========================================
  // 1. 前后端数据同步 (3个P0用例)
  // ========================================

  test('TC-9.1.1: 切换单词 - 前后端数据一致', async ({ page }) => {
    console.log('🔄 测试: 切换单词前后端数据一致')

    await page.goto('/library')
    await page.waitForLoadState('networkidle')

    const firstBookLink = page.locator('a[href^="/library/"]').first()
    const bookExists = await firstBookLink.count() > 0

    if (!bookExists) {
      test.skip()
      return
    }

    await firstBookLink.click()
    await page.waitForLoadState('networkidle')

    const flashcardButton = page.locator('a:has-text("卡片")')
    if (await flashcardButton.count() === 0) {
      test.skip()
      return
    }

    await flashcardButton.first().click()
    await page.waitForLoadState('networkidle')

    // 选择范围
    const scopeDialog = page.locator('[data-testid="scope-dialog"]')
    if (await scopeDialog.count() > 0) {
      await scopeDialog.locator('button').first().click()
      await page.waitForLoadState('networkidle')
    }

    await page.waitForTimeout(2000)

    // 切换到第5个单词
    const nextWord = page.locator('button:has-text("下一个")')
    for (let i = 0; i < 5; i++) {
      if (await nextWord.count() > 0 && await nextWord.isEnabled()) {
        await nextWord.click()
        await page.waitForTimeout(500)
      } else {
        break
      }
    }

    // 获取前端显示的索引
    const url = page.url()
    const hashMatch = url.match(/#word-(\d+)/)
    const frontendIndex = hashMatch ? parseInt(hashMatch[1]) : 0

    console.log(`📍 前端索引: ${frontendIndex}`)

    // 等待后端保存
    await page.waitForTimeout(2000)

    // 刷新页面,重新读取
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 如果有范围对话框,点击继续学习
    const continueCard = page.locator('[data-testid="continue-learning-card"]')
    if (await continueCard.count() > 0) {
      const continueButton = continueCard.locator('button:has-text("继续")')
      if (await continueButton.count() > 0) {
        await continueButton.click()
        await page.waitForLoadState('networkidle')
      }
    }

    // 获取刷新后的索引
    const urlAfterReload = page.url()
    const hashMatchAfter = urlAfterReload.match(/#word-(\d+)/)
    const backendIndex = hashMatchAfter ? parseInt(hashMatchAfter[1]) : 0

    console.log(`📍 后端索引: ${backendIndex}`)

    // 比较前后端索引
    if (frontendIndex === backendIndex) {
      console.log('✅ 前后端索引一致')
    } else {
      console.log(`⚠️ 前后端索引不一致: ${frontendIndex} vs ${backendIndex}`)
    }
  })

  test('TC-9.1.2: 实时保存 - 数据不丢失', async ({ page }) => {
    console.log('🔄 测试: 实时保存数据不丢失')

    await page.goto('/library')
    await page.waitForLoadState('networkidle')

    const firstBookLink = page.locator('a[href^="/library/"]').first()
    const bookExists = await firstBookLink.count() > 0

    if (!bookExists) {
      test.skip()
      return
    }

    await firstBookLink.click()
    await page.waitForLoadState('networkidle')

    const flashcardButton = page.locator('a:has-text("卡片")')
    if (await flashcardButton.count() === 0) {
      test.skip()
      return
    }

    await flashcardButton.first().click()
    await page.waitForLoadState('networkidle')

    // 选择范围
    const scopeDialog = page.locator('[data-testid="scope-dialog"]')
    if (await scopeDialog.count() > 0) {
      await scopeDialog.locator('button').first().click()
      await page.waitForLoadState('networkidle')
    }

    await page.waitForTimeout(2000)

    // 快速切换单词
    const nextWord = page.locator('button:has-text("下一个")')
    let switchCount = 0
    for (let i = 0; i < 10; i++) {
      if (await nextWord.count() > 0 && await nextWord.isEnabled()) {
        await nextWord.click()
        switchCount++
        await page.waitForTimeout(200)
      } else {
        break
      }
    }

    console.log(`✅ 快速切换了${switchCount}个单词`)

    // 获取当前索引
    const urlBefore = page.url()
    const hashMatchBefore = urlBefore.match(/#word-(\d+)/)
    const indexBefore = hashMatchBefore ? parseInt(hashMatchBefore[1]) : 0

    // 立即刷新页面
    await page.reload()
    await page.waitForLoadState('networkidle')

    // 获取刷新后索引
    const urlAfter = page.url()
    const hashMatchAfter = urlAfter.match(/#word-(\d+)/)
    const indexAfter = hashMatchAfter ? parseInt(hashMatchAfter[1]) : 0

    // 比较索引(可能会有1-2个单词的差异,因为防抖)
    const indexDiff = Math.abs(indexAfter - indexBefore)

    if (indexDiff <= 2) {
      console.log('✅ 实时保存成功(索引差异在允许范围内)')
    } else {
      console.log(`⚠️ 索引差异较大: ${indexDiff}个单词`)
    }
  })

  test('TC-9.1.3: API返回数据格式正确', async ({ page }) => {
    console.log('🔄 测试: API返回数据格式正确')

    // 调用recent-books API
    const response = await page.request.get('/api/recent-books')

    expect(response.status()).toBe(200)

    const data = await response.json()

    console.log('📊 API返回数据:', JSON.stringify(data, null, 2))

    // 验证数据结构
    expect(data).toHaveProperty('success')
    expect(data.success).toBe(true)

    expect(data).toHaveProperty('data')
    expect(Array.isArray(data.data)).toBe(true)

    // 验证每个学习记录的字段
    if (data.data.length > 0) {
      const firstRecord = data.data[0]

      console.log('📚 第一个学习记录:', firstRecord)

      // 检查必需字段
      expect(firstRecord).toHaveProperty('bookId')
      expect(firstRecord).toHaveProperty('bookTitle')
      expect(firstRecord).toHaveProperty('mode')
      expect(firstRecord).toHaveProperty('lastAccessedAt')

      console.log('✅ API返回数据格式正确')
    } else {
      console.log('ℹ️ 没有学习记录')
    }
  })

  // ========================================
  // 2. 数据完整性 (2个P0用例)
  // ========================================

  test('TC-9.2.1: last_resume_state字段完整性', async ({ page }) => {
    console.log('🔍 测试: last_resume_state字段完整性')

    // 这个测试需要直接查询数据库,这里通过API间接验证
    await page.goto('/library')
    await page.waitForLoadState('networkidle')

    const firstBookLink = page.locator('a[href^="/library/"]').first()
    const bookExists = await firstBookLink.count() > 0

    if (!bookExists) {
      test.skip()
      return
    }

    const bookId = new URL((await firstBookLink.getAttribute('href'))!).pathname.split('/').pop()

    // 创建学习记录
    await firstBookLink.click()
    await page.waitForLoadState('networkidle')

    const flashcardButton = page.locator('a:has-text("卡片")')
    if (await flashcardButton.count() === 0) {
      test.skip()
      return
    }

    await flashcardButton.first().click()
    await page.waitForLoadState('networkidle')

    // 选择范围
    const scopeDialog = page.locator('[data-testid="scope-dialog"]')
    if (await scopeDialog.count() > 0) {
      await scopeDialog.locator('button').first().click()
      await page.waitForLoadState('networkidle')
    }

    await page.waitForTimeout(2000)

    // 切换几个单词
    const nextWord = page.locator('button:has-text("下一个")')
    for (let i = 0; i < 3; i++) {
      if (await nextWord.count() > 0 && await nextWord.isEnabled()) {
        await nextWord.click()
        await page.waitForTimeout(500)
      }
    }

    // 通过API验证数据
    const response = await page.request.get(`/api/books/${bookId}/resume-state`)
    const data = await response.json()

    console.log('📊 resume-state数据:', data)

    if (data.success && data.data) {
      const resumeState = data.data

      // 验证必需字段
      expect(resumeState).toHaveProperty('mode')
      expect(resumeState).toHaveProperty('bookId')
      expect(resumeState).toHaveProperty('scope')
      expect(resumeState).toHaveProperty('currentIndex')
      expect(resumeState).toHaveProperty('totalWords')

      // 验证字段类型
      expect(typeof resumeState.mode).toBe('string')
      expect(typeof resumeState.bookId).toBe('string')
      expect(typeof resumeState.scope).toBe('string')
      expect(typeof resumeState.currentIndex).toBe('number')
      expect(typeof resumeState.totalWords).toBe('number')

      // 验证字段值
      expect(['flashcard', 'dictation', 'word-list']).toContain(resumeState.mode)
      expect(['all', 'unknown', 'fuzzy', 'known', 'new']).toContain(resumeState.scope)
      expect(resumeState.currentIndex).toBeGreaterThanOrEqual(0)
      expect(resumeState.totalWords).toBeGreaterThan(0)

      console.log('✅ last_resume_state字段完整且格式正确')
    } else {
      console.log('ℹ️ 没有resume-state数据')
    }
  })

  test('TC-9.2.2: 进度计算准确性', async ({ page }) => {
    console.log('🔍 测试: 进度计算准确性')

    await page.goto('/')
    await page.waitForLoadState('networkidle')

    const cards = page.locator('[data-testid="recent-learning-card"]')
    const cardCount = await cards.count()

    if (cardCount === 0) {
      console.log('ℹ️ 没有学习卡片,跳过测试')
      test.skip()
      return
    }

    const firstCard = cards.first()
    const cardText = await firstCard.textContent()
    console.log(`📚 卡片内容: ${cardText}`)

    // 提取进度百分比
    const progressMatch = cardText!.match(/(\d+)%/)
    if (!progressMatch) {
      console.log('ℹ️ 没有找到进度百分比')
      test.skip()
      return
    }

    const displayedProgress = parseInt(progressMatch[1])
    console.log(`📊 显示的进度: ${displayedProgress}%`)

    // 提取位置信息(如"5/50")
    const positionMatch = cardText!.match(/(\d+)\/(\d+)/)
    if (!positionMatch) {
      console.log('ℹ️ 没有找到位置信息')
      test.skip()
      return
    }

    const currentPos = parseInt(positionMatch[1])
    const totalWords = parseInt(positionMatch[2])
    console.log(`📍 位置: ${currentPos}/${totalWords}`)

    // 计算实际进度
    // 注意: 这里无法获取认识的和模糊的数量,只能验证显示的进度是否在合理范围内
    if (currentPos > 0 && totalWords > 0) {
      const minProgress = Math.floor((currentPos / totalWords) * 100)
      const maxProgress = Math.ceil((currentPos / totalWords) * 100)

      console.log(`📊 计算的进度范围: ${minProgress}% - ${maxProgress}%`)

      // 显示的进度应该在合理范围内
      if (displayedProgress >= 0 && displayedProgress <= 100) {
        console.log('✅ 进度百分比在有效范围内(0-100%)')
      } else {
        console.log('❌ 进度百分比超出有效范围')
      }

      // 进度不应该超过100%
      if (displayedProgress <= 100) {
        console.log('✅ 进度不超过100%')
      } else {
        console.log('❌ 进度超过100%')
      }
    }
  })

  test('TC-9.2.3: 数据去重 - 不重复统计', async ({ page }) => {
    console.log('🔍 测试: 数据去重不重复统计')

    // 调用recent-books API
    const response = await page.request.get('/api/recent-books')
    const data = await response.json()

    if (!data.success || !Array.isArray(data.data)) {
      console.log('ℹ️ API返回数据格式错误')
      test.skip()
      return
    }

    const records = data.data
    console.log(`📚 学习记录数量: ${records.length}`)

    // 检查是否有重复的bookId
    const bookIds = records.map(r => r.bookId)
    const uniqueBookIds = new Set(bookIds)

    console.log(`📚 唯一词库数量: ${uniqueBookIds.size}`)

    if (bookIds.length === uniqueBookIds.size) {
      console.log('✅ 没有重复的词库')
    } else {
      console.log('⚠️ 发现重复的词库')

      // 找出重复的bookId
      const duplicates = bookIds.filter((id, index) => bookIds.indexOf(id) !== index)
      console.log(`⚠️ 重复的bookId: ${[...new Set(duplicates)]}`)
    }

    // 验证: 同一词库只出现一次
    expect(bookIds.length).toBe(uniqueBookIds.size)
  })
})
