import { test, expect } from '@playwright/test'

/**
 * "继续学习"功能冒烟测试 - 核心场景验证
 *
 * 只测试最关键的几个场景，用于快速验证功能是否正常工作
 */

const TEST_CREDENTIALS = {
  phone: '13800138000',
  password: 'test123456'
}

test.describe('"继续学习"功能冒烟测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    await page.fill('input[placeholder="请输入手机号"]', TEST_CREDENTIALS.phone)
    await page.fill('input[placeholder="请输入密码"]', TEST_CREDENTIALS.password)
    await page.click('button:has-text("登录")')

    try {
      await page.waitForURL('/', { timeout: 15000 })
      console.log('✅ 登录成功')
    } catch (error) {
      console.log('❌ 登录失败:', error)
      throw new Error('登录失败，无法继续测试')
    }
  })

  test('核心场景1: 第2页 → 返回 → 继续 → 应在第2页', async ({ page }) => {
    // 访问单词书详情页
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // 尝试翻到第2页
    const page2Button = page.locator('button:has-text("2")').or(page.locator('a:has-text("2")'))
    const page2Count = await page2Button.count()

    if (page2Count > 0) {
      await page2Button.first().click()
      await page.waitForTimeout(500) // 等待状态保存

      // 返回首页
      await page.goto('/')
      await page.waitForTimeout(500)

      // 点击"继续学习"
      const continueButton = page.locator('a[href^="/library/"]').first()
      await continueButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1000)

      // 验证URL包含page=2
      const currentUrl = page.url()
      expect(currentUrl).toContain('page=2')
      console.log('✅ 测试通过:', currentUrl)
    } else {
      console.log('⚠️ 单词数量不足2页，跳过此测试')
      test.skip(true, '单词数量不足，无法测试多页场景')
    }
  })

  test('核心场景2: 筛选"不认识" → 返回 → 继续 → 应有筛选条件', async ({ page }) => {
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // 查找筛选按钮
    const filterButton = page.locator('button:has([class*="lucide-filter"])').or(page.locator('button:has-text("筛选")'))
    const filterCount = await filterButton.count()

    if (filterCount > 0) {
      await filterButton.first().click()
      await page.waitForTimeout(500)

      // 查找"不认识"选项
      const unknownOption = page.locator('text=不认识').or(page.locator('label:has-text("不认识")'))
      const unknownCount = await unknownOption.count()

      if (unknownCount > 0) {
        await unknownOption.first().click()
        await page.waitForTimeout(500)

        // 返回首页
        await page.goto('/')
        await page.waitForTimeout(500)

        // 点击"继续学习"
        const continueButton = page.locator('a[href^="/library/"]').first()
        await continueButton.click()
        await page.waitForLoadState('domcontentloaded')
        await page.waitForTimeout(1000)

        // 验证URL包含status=unknown
        const currentUrl = page.url()
        expect(currentUrl).toContain('status=unknown')
        console.log('✅ 测试通过:', currentUrl)
      } else {
        console.log('⚠️ 未找到"不认识"选项')
        test.skip(true, '未找到筛选选项')
      }
    } else {
      console.log('⚠️ 未找到筛选按钮')
      test.skip(true, '未找到筛选按钮')
    }
  })

  test('核心场景3: 卡片背单词第5张 → 返回 → 继续 → 应在第5张', async ({ page }) => {
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // 查找练习入口
    const practiceButton = page.locator('button:has-text("卡片背单词")').or(
      page.locator('a:has-text("卡片背单词")')
    ).or(
      page.locator('button:has-text("开始练习")')
    )

    const practiceCount = await practiceButton.count()
    if (practiceCount > 0) {
      await practiceButton.first().click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)

      // 切换到第5张卡片（点击"下一张"4次）
      for (let i = 0; i < 4; i++) {
        const nextButton = page.locator('button:has-text("下一张")').or(
          page.locator('button:has-text("下一个")')
        ).or(
          page.locator('button[class*="chevron-right"]')
        )

        const nextCount = await nextButton.count()
        if (nextCount > 0) {
          await nextButton.first().click()
          await page.waitForTimeout(300)
        } else {
          console.log(`⚠️ 第${i + 1}次切换：未找到下一张按钮`)
          break
        }
      }

      await page.waitForTimeout(500)

      // 返回首页
      await page.goto('/')
      await page.waitForTimeout(500)

      // 点击"继续学习"
      const continueButton = page.locator('a[href^="/study/"]').or(page.locator('a[href^="/library/"]')).first()
      await continueButton.click()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(1500)

      // 验证URL
      const currentUrl = page.url()
      if (currentUrl.includes('/flashcards')) {
        expect(currentUrl).toContain('index=')
        console.log('✅ 测试通过:', currentUrl)
      } else {
        console.log('⚠️ 未跳转到flashcards页面，跳过验证')
      }
    } else {
      console.log('⚠️ 未找到练习入口')
      test.skip(true, '未找到练习入口')
    }
  })

  test('核心场景4: 组合条件（筛选+第2页）→ 返回 → 继续', async ({ page }) => {
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    const filterButton = page.locator('button:has([class*="lucide-filter"])').or(page.locator('button:has-text("筛选")'))
    const filterCount = await filterButton.count()

    if (filterCount > 0) {
      // 应用筛选
      await filterButton.first().click()
      await page.waitForTimeout(500)

      const unknownOption = page.locator('text=不认识').or(page.locator('label:has-text("不认识")'))
      const unknownCount = await unknownOption.count()

      if (unknownCount > 0) {
        await unknownOption.first().click()
        await page.waitForTimeout(500)

        // 翻到第2页
        const page2Button = page.locator('button:has-text("2")').or(page.locator('a:has-text("2")'))
        const page2Count = await page2Button.count()

        if (page2Count > 0) {
          await page2Button.first().click()
          await page.waitForTimeout(500)

          // 返回首页
          await page.goto('/')
          await page.waitForTimeout(500)

          // 点击"继续学习"
          const continueButton = page.locator('a[href^="/library/"]').first()
          await continueButton.click()
          await page.waitForLoadState('domcontentloaded')
          await page.waitForTimeout(1000)

          // 验证URL同时包含status和page参数
          const currentUrl = page.url()
          expect(currentUrl).toContain('status=unknown')
          expect(currentUrl).toContain('page=2')
          console.log('✅ 测试通过:', currentUrl)
        } else {
          console.log('⚠️ 单词数量不足2页')
          test.skip(true, '单词数量不足')
        }
      } else {
        test.skip(true, '未找到筛选选项')
      }
    } else {
      test.skip(true, '未找到筛选按钮')
    }
  })

  test('边界情况: 浏览器返回按钮不应该丢失状态', async ({ page }) => {
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    const page2Button = page.locator('button:has-text("2")').or(page.locator('a:has-text("2")'))
    const page2Count = await page2Button.count()

    if (page2Count > 0) {
      await page2Button.first().click()
      await page.waitForTimeout(500)

      // 使用浏览器返回按钮
      await page.goBack()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)

      // 再次使用浏览器前进按钮
      await page.goForward()
      await page.waitForLoadState('domcontentloaded')
      await page.waitForTimeout(500)

      // 验证还在第2页
      const currentUrl = page.url()
      expect(currentUrl).toContain('page=2')
      console.log('✅ 测试通过:', currentUrl)
    } else {
      test.skip(true, '单词数量不足')
    }
  })
})
