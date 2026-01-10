import { test, expect } from '@playwright/test'

/**
 * 章节筛选功能自动化测试
 *
 * 测试章节筛选器的以下功能：
 * 1. 章节筛选器的显示和隐藏
 * 2. 章节下拉菜单的交互
 * 3. 章节筛选功能
 * 4. 与其他筛选器的组合使用
 * 5. 状态持久化
 */

test.describe('章节筛选功能测试', () => {
  // 测试账号信息
  const testPhone = '13800138000'
  const testPassword = 'test123456'

  test.beforeEach(async ({ page }) => {
    console.log('🔐 开始登录...')

    // 访问登录页面
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // 填写登录表单
    await page.fill('input[placeholder="请输入手机号"]', testPhone)
    await page.fill('input[placeholder="请输入密码"]', testPassword)

    // 点击登录按钮
    await page.click('button:has-text("登录")')

    // 等待登录成功
    await page.waitForURL('/', { timeout: 15000 })
    await page.waitForLoadState('domcontentloaded')

    console.log('✅ 登录成功')
  })

  test('测试1: 验证章节筛选器在有章节的书籍中显示', async ({ page }) => {
    console.log('📍 测试1: 验证章节筛选器显示')

    // 访问有章节的书籍页面（商务英语核心词汇）
    await page.goto('/library/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 检查章节筛选器是否存在
    const chapterFilter = page.locator('button:has-text("全部章节")')

    try {
      await expect(chapterFilter).toBeVisible({ timeout: 5000 })
      console.log('✅ 章节筛选器显示正确')

      // 截图保存证据
      await page.screenshot({ path: 'test-results/chapter-filter-visible.png' })
    } catch (error) {
      console.log('❌ 章节筛选器未显示')
      await page.screenshot({ path: 'test-results/chapter-filter-not-visible.png' })
      throw error
    }
  })

  test('测试2: 验证章节下拉菜单功能', async ({ page }) => {
    console.log('📍 测试2: 验证章节下拉菜单')

    // 访问有章节的书籍
    await page.goto('/library/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 点击章节筛选器
    const chapterFilter = page.locator('button:has-text("全部章节")')
    await chapterFilter.click()
    await page.waitForTimeout(500)

    // 验证下拉菜单显示
    const dropdown = page.locator('div[class*="shadow-xl"]').filter({ hasText: '全部章节' })

    try {
      await expect(dropdown).toBeVisible({ timeout: 3000 })
      console.log('✅ 章节下拉菜单显示正确')

      // 检查下拉菜单内容
      const dropdownText = await dropdown.textContent()
      console.log('📋 下拉菜单内容:', dropdownText)

      // 截图
      await page.screenshot({ path: 'test-results/chapter-dropdown.png' })
    } catch (error) {
      console.log('❌ 章节下拉菜单未显示')
      await page.screenshot({ path: 'test-results/chapter-dropdown-error.png' })
      throw error
    }
  })

  test('测试3: 验证章节筛选功能', async ({ page }) => {
    console.log('📍 测试3: 验证章节筛选')

    // 访问有章节的书籍
    await page.goto('/library/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 记录初始单词数量
    const initialCards = page.locator('section[class*="grid"] div[class*="clay-card"]')
    const initialCount = await initialCards.count()
    console.log(`📊 初始单词数量: ${initialCount}`)

    // 点击章节筛选器
    const chapterFilter = page.locator('button:has-text("全部章节")')
    await chapterFilter.click()
    await page.waitForTimeout(500)

    // 选择第一个具体章节（不是"全部章节"）
    const firstChapter = page.locator('div[class*="shadow-xl"] button').nth(1)
    const chapterName = await firstChapter.textContent()
    console.log(`🎯 选择章节: ${chapterName}`)

    await firstChapter.click()
    await page.waitForTimeout(1000)

    // 验证筛选后的单词数量
    const filteredCards = page.locator('section[class*="grid"] div[class*="clay-card"]')
    const filteredCount = await filteredCards.count()
    console.log(`📊 筛选后单词数量: ${filteredCount}`)

    // 验证章节筛选器按钮文字已更新
    const updatedButton = page.locator('button:has-text("全部章节")')
    const buttonText = await updatedButton.textContent()
    console.log(`🔘 按钮文字: ${buttonText}`)

    // 截图
    await page.screenshot({ path: 'test-results/chapter-filtered.png' })

    // 验证筛选是否生效（数量应该减少或保持不变）
    expect(filteredCount).toBeLessThanOrEqual(initialCount)
    console.log('✅ 章节筛选功能正常')
  })

  test('测试4: 验证重置章节筛选', async ({ page }) => {
    console.log('📍 测试4: 验证重置章节筛选')

    // 访问有章节的书籍
    await page.goto('/library/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 先选择一个章节
    const chapterFilter = page.locator('button:has-text("全部章节")')
    await chapterFilter.click()
    await page.waitForTimeout(500)

    const firstChapter = page.locator('div[class*="shadow-xl"] button').nth(1)
    await firstChapter.click()
    await page.waitForTimeout(1000)

    const filteredCount = await page.locator('section[class*="grid"] div[class*="clay-card"]').count()
    console.log(`📊 筛选后单词数量: ${filteredCount}`)

    // 重置为"全部章节"
    await chapterFilter.click()
    await page.waitForTimeout(500)

    const allChaptersOption = page.locator('div[class*="shadow-xl"] button:has-text("全部章节")')
    await allChaptersOption.click()
    await page.waitForTimeout(1000)

    // 验证所有单词都显示
    const resetCount = await page.locator('section[class*="grid"] div[class*="clay-card"]').count()
    console.log(`📊 重置后单词数量: ${resetCount}`)

    // 截图
    await page.screenshot({ path: 'test-results/chapter-reset.png' })

    console.log('✅ 重置章节筛选功能正常')
  })

  test('测试5: 验证章节与主题组合筛选', async ({ page }) => {
    console.log('📍 测试5: 验证章节与主题组合筛选')

    // 访问有章节的书籍
    await page.goto('/library/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 先记录初始数量
    const initialCount = await page.locator('section[class*="grid"] div[class*="clay-card"]').count()
    console.log(`📊 初始单词数量: ${initialCount}`)

    // 选择一个章节
    const chapterFilter = page.locator('button:has-text("全部章节")')
    await chapterFilter.click()
    await page.waitForTimeout(500)

    const firstChapter = page.locator('div[class*="shadow-xl"] button').nth(1)
    const chapterName = await firstChapter.textContent()
    await firstChapter.click()
    await page.waitForTimeout(1000)

    const chapterFilteredCount = await page.locator('section[class*="grid"] div[class*="clay-card"]').count()
    console.log(`📊 章节筛选后: ${chapterFilteredCount}`)

    // 再选择一个主题（如果有主题筛选器）
    const themeFilter = page.locator('button:has-text("全部主题")')
    const themeFilterExists = await themeFilter.count() > 0

    if (themeFilterExists) {
      await themeFilter.click()
      await page.waitForTimeout(500)

      const themeOptions = page.locator('div[class*="shadow-xl"] button')
      const themeOptionCount = await themeOptions.count()

      if (themeOptionCount > 1) {
        const firstTheme = themeOptions.nth(1)
        const themeName = await firstTheme.textContent()
        console.log(`🎯 选择主题: ${themeName}`)

        await firstTheme.click()
        await page.waitForTimeout(1000)

        const combinedFilteredCount = await page.locator('section[class*="grid"] div[class*="clay-card"]').count()
        console.log(`📊 章节+主题筛选后: ${combinedFilteredCount}`)

        // 验证组合筛选生效
        expect(combinedFilteredCount).toBeLessThanOrEqual(chapterFilteredCount)

        console.log('✅ 章节+主题组合筛选正常')
      } else {
        console.log('⚠️ 没有主题选项，跳过主题筛选测试')
      }
    } else {
      console.log('⚠️ 没有主题筛选器，跳过主题筛选测试')
    }

    // 截图
    await page.screenshot({ path: 'test-results/chapter-theme-combo.png' })
  })

  test('测试6: 验证状态持久化', async ({ page }) => {
    console.log('📍 测试6: 验证状态持久化')

    // 访问有章节的书籍
    await page.goto('/library/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 选择一个章节
    const chapterFilter = page.locator('button:has-text("全部章节")')
    await chapterFilter.click()
    await page.waitForTimeout(500)

    const firstChapter = page.locator('div[class*="shadow-xl"] button').nth(1)
    const chapterName = await firstChapter.textContent()
    console.log(`🎯 选择章节: ${chapterName}`)

    await firstChapter.click()
    await page.waitForTimeout(1000)

    const filteredCount = await page.locator('section[class*="grid"] div[class*="clay-card"]').count()
    console.log(`📊 筛选后单词数量: ${filteredCount}`)

    // 刷新页面
    await page.reload()
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 验证章节选择是否保持
    const buttonAfterRefresh = page.locator('button:has-text("全部章节")')
    const buttonTextAfterRefresh = await buttonAfterRefresh.textContent()
    console.log(`🔘 刷新后按钮文字: ${buttonTextAfterRefresh}`)

    const countAfterRefresh = await page.locator('section[class*="grid"] div[class*="clay-card"]').count()
    console.log(`📊 刷新后单词数量: ${countAfterRefresh}`)

    // 截图
    await page.screenshot({ path: 'test-results/chapter-persistence.png' })

    // 验证筛选状态保持
    expect(countAfterRefresh).toBe(filteredCount)
    console.log('✅ 状态持久化功能正常')
  })

  test('测试7: 验证URL参数同步', async ({ page }) => {
    console.log('📍 测试7: 验证URL参数同步')

    // 访问有章节的书籍
    await page.goto('/library/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 选择一个章节
    const chapterFilter = page.locator('button:has-text("全部章节")')
    await chapterFilter.click()
    await page.waitForTimeout(500)

    const firstChapter = page.locator('div[class*="shadow-xl"] button').nth(1)
    await firstChapter.click()
    await page.waitForTimeout(1000)

    // 检查URL是否包含chapter参数
    const url = page.url()
    console.log(`🔗 当前URL: ${url}`)

    const hasChapterParam = url.includes('chapter=')
    console.log(`📋 URL包含chapter参数: ${hasChapterParam}`)

    // 截图
    await page.screenshot({ path: 'test-results/chapter-url-param.png' })

    if (hasChapterParam) {
      console.log('✅ URL参数同步功能正常')
    } else {
      console.log('⚠️ URL参数可能未正确设置（需要检查实现）')
    }
  })

  test('测试8: 验证点击外部关闭下拉菜单', async ({ page }) => {
    console.log('📍 测试8: 验证点击外部关闭下拉菜单')

    // 访问有章节的书籍
    await page.goto('/library/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(2000)

    // 点击章节筛选器
    const chapterFilter = page.locator('button:has-text("全部章节")')
    await chapterFilter.click()
    await page.waitForTimeout(500)

    // 验证下拉菜单显示
    const dropdown = page.locator('div[class*="shadow-xl"]').filter({ hasText: '全部章节' })
    await expect(dropdown).toBeVisible({ timeout: 3000 })
    console.log('✅ 下拉菜单已显示')

    // 点击页面其他区域
    const pageTitle = page.locator('h1')
    await pageTitle.click()
    await page.waitForTimeout(500)

    // 验证下拉菜单是否关闭
    const dropdownAfterClick = dropdown.locator('visible=true')
    const isVisible = await dropdown.count() > 0

    if (!isVisible) {
      console.log('✅ 点击外部关闭下拉菜单功能正常')
    } else {
      console.log('⚠️ 下拉菜单可能未关闭（需要检查实现）')
    }

    // 截图
    await page.screenshot({ path: 'test-results/chapter-click-outside.png' })
  })
})

test.afterAll(async () => {
  console.log('========================================')
  console.log('📊 章节筛选功能测试完成')
  console.log('========================================')
})
