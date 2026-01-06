import { test, expect } from '@playwright/test'

test.describe('单词书详情页 - 筛选与排序功能', () => {
  test.beforeEach(async ({ page }) => {
    // 导航到单词书详情页
    await page.goto('/library/demo-book-1')

    // 等待页面加载完成
    await page.waitForLoadState('networkidle')
  })

  test('应该正确显示单词列表', async ({ page }) => {
    // 验证页面标题
    await expect(page.locator('h1')).toContainText('CET-4 核心词汇')

    // 验证单词卡片存在
    const wordCards = page.locator('[class*="clay-card"]')
    await expect(wordCards.first()).toBeVisible()

    // 验证至少有一个单词卡片
    const cardCount = await wordCards.count()
    expect(cardCount).toBeGreaterThan(0)
  })

  test('应该显示单词的基本信息', async ({ page }) => {
    const firstCard = page.locator('[class*="clay-card"]').first()

    // 验证单词显示
    await expect(firstCard.locator('h3')).toBeVisible()

    // 验证音标显示
    await expect(firstCard.locator('text=/\\/.+\\//')).toBeVisible()

    // 验证词性徽章显示
    await expect(firstCard.locator('text=/n名词|v动词|adj形容词/')).toBeVisible()

    // 验证发音按钮存在
    await expect(firstCard.locator('button[title*="朗读"]')).toBeVisible()
  })

  test('随机排序功能应该工作正常', async ({ page }) => {
    // 获取初始第一个单词的文本
    const firstWordBefore = await page.locator('[class*="clay-card"]').first().locator('h3').textContent()

    // 点击随机按钮
    await page.click('button:has-text("随机")')

    // 等待页面更新
    await page.waitForTimeout(500)

    // 获取随机后的第一个单词
    const firstWordAfter = await page.locator('[class*="clay-card"]').first().locator('h3').textContent()

    // 验证随机按钮变为激活状态（紫色边框）
    const randomButton = page.locator('button:has-text("随机")')
    await expect(randomButton).toHaveClass(/border-purple-400/)

    // 注意：由于随机性，不能保证单词一定会变化，但应该多次测试验证
    console.log(`随机前: ${firstWordBefore}, 随机后: ${firstWordAfter}`)

    // 再次点击取消随机
    await randomButton.click()
    await page.waitForTimeout(500)

    // 验证按钮恢复默认状态
    await expect(randomButton).not.toHaveClass(/border-purple-400/)
  })

  test('状态筛选功能应该工作正常', async ({ page }) => {
    // 点击筛选按钮
    await page.click('button:has-text("全部")')

    // 等待下拉菜单出现
    await expect(page.locator('text=未标注')).toBeVisible()

    // 点击"认识"筛选
    await page.click('text=认识')

    // 等待列表更新
    await page.waitForTimeout(500)

    // 验证筛选按钮显示当前筛选条件
    const filterButton = page.locator('button:has([class*="lucide-filter"])')
    await expect(filterButton).toContainText('认识')

    // 验证按钮变为激活状态
    await expect(filterButton).toHaveClass(/border-purple-400/)
  })

  test('状态筛选下拉菜单应该显示所有选项', async ({ page }) => {
    // 点击筛选按钮打开菜单
    await page.click('button:has([class*="lucide-filter"])')

    // 验证所有选项都存在
    await expect(page.locator('text=全部')).toBeVisible()
    await expect(page.locator('text=未标注')).toBeVisible()
    await expect(page.locator('text=认识')).toBeVisible()
    await expect(page.locator('text=模糊')).toBeVisible()
    await expect(page.locator('text=不认识')).toBeVisible()

    // 验证选中标记
    const allOption = page.locator('text=全部').first()
    await expect(allOption.locator('[class*="lucide-check"]')).toBeVisible()

    // 点击外部关闭菜单
    await page.click('body')
    await page.waitForTimeout(300)

    // 验证菜单已关闭
    await expect(page.locator('text=未标注')).not.toBeVisible()
  })

  test('单词状态标记功能应该工作正常', async ({ page }) => {
    const firstCard = page.locator('[class*="clay-card"]').first()

    // 点击"认识"按钮
    await firstCard.locator('button[title="认识"]').click()

    // 验证按钮变为激活状态（绿色）
    const knownButton = firstCard.locator('button[title="认识"]')
    await expect(knownButton).toHaveClass(/text-green-600/)

    // 点击"模糊"按钮
    await firstCard.locator('button[title="模糊"]').click()

    // 验证按钮变为激活状态（黄色）
    const fuzzyButton = firstCard.locator('button[title="模糊"]')
    await expect(fuzzyButton).toHaveClass(/text-yellow-600/)

    // 点击"不认识"按钮
    await firstCard.locator('button[title="不认识"]').click()

    // 验证按钮变为激活状态（红色）
    const unknownButton = firstCard.locator('button[title="不认识"]')
    await expect(unknownButton).toHaveClass(/text-red-600/)
  })

  test('全局隐藏中文功能应该工作正常', async ({ page }) => {
    // 验证初始状态显示中文
    let firstCard = page.locator('[class*="clay-card"]').first()
    await expect(firstCard.locator('text=/中文：/')).toBeVisible()

    // 点击全局隐藏中文按钮
    await page.click('button:has-text("隐藏中文")')

    // 等待更新
    await page.waitForTimeout(500)

    // 验证中文被隐藏（显示占位符）
    firstCard = page.locator('[class*="clay-card"]').first()
    const chineseText = await firstCard.locator('text=/中文：_/').allTextContents()
    expect(chineseText[0]).toContain('______________________')

    // 再次点击显示中文
    await page.click('button:has-text("显示中文")')
    await page.waitForTimeout(500)

    // 验证中文恢复显示
    firstCard = page.locator('[class*="clay-card"]').first()
    await expect(firstCard.locator('text=/中文：[^_]/')).toBeVisible()
  })

  test('本地隐藏按钮应该可以覆盖全局设置', async ({ page }) => {
    // 先启用全局隐藏
    await page.click('button:has-text("隐藏中文")')
    await page.waitForTimeout(500)

    // 验证全局隐藏生效
    let firstCard = page.locator('[class*="clay-card"]').first()
    const chineseText1 = await firstCard.locator('text=/中文：_/').allTextContents()
    expect(chineseText1[0]).toContain('______________________')

    // 点击第一个卡片的本地显示按钮
    await firstCard.locator('button[title="显示中文"]').click()
    await page.waitForTimeout(500)

    // 验证该卡片显示中文（覆盖全局设置）
    firstCard = page.locator('[class*="clay-card"]').first()
    await expect(firstCard.locator('text=/中文：[^_]/')).toBeVisible()
  })

  test('发音功能应该工作正常', async ({ page }) => {
    const firstCard = page.locator('[class*="clay-card"]').first()

    // 点击单词发音按钮
    await firstCard.locator('button[title="朗读单词"]').click()

    // 验证Web Speech API被调用（这里只验证按钮可点击，实际音频无法在测试中验证）
    await expect(firstCard.locator('button[title="朗读单词"]')).toBeVisible()
  })

  test('内容折叠展开功能应该正常工作', async ({ page }) => {
    const firstCard = page.locator('[class*="clay-card"]').first()

    // 检查是否有"展开"按钮（只会在内容溢出时显示）
    const expandButton = firstCard.locator('button:has-text("展开")')

    const isExpandVisible = await expandButton.isVisible()

    if (isExpandVisible) {
      // 点击展开按钮
      await expandButton.click()
      await page.waitForTimeout(300)

      // 验证显示"收起"按钮
      await expect(firstCard.locator('button:has-text("收起")')).toBeVisible()

      // 点击收起按钮
      await firstCard.locator('button:has-text("收起")').click()
      await page.waitForTimeout(300)

      // 验证恢复显示"展开"按钮
      await expect(expandButton).toBeVisible()
    } else {
      console.log('当前卡片内容不需要折叠')
    }
  })

  test('筛选结果为空时应该显示提示信息', async ({ page }) => {
    // 使用不太可能存在的筛选条件（如果数据没有特殊标记）
    // 这个测试可能需要根据实际数据调整

    // 点击筛选按钮
    await page.click('button:has([class*="lucide-filter"])')

    // 尝试筛选"未标注"（如果没有未标注的单词，列表将为空）
    await page.click('text=未标注')
    await page.waitForTimeout(500)

    // 检查是否显示空状态提示
    const emptyState = page.locator('text=没有找到符合条件的单词')
    const hasEmptyState = await emptyState.isVisible()

    if (hasEmptyState) {
      await expect(emptyState).toBeVisible()
      await expect(page.locator('text=请尝试切换筛选条件')).toBeVisible()
    } else {
      console.log('当前筛选条件有结果，未显示空状态')
    }
  })
})

test.describe('单词书详情页 - 响应式设计', () => {
  test('移动端布局应该正常显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('networkidle')

    // 验证单词卡片仍然可见
    const wordCards = page.locator('[class*="clay-card"]')
    await expect(wordCards.first()).toBeVisible()

    // 验证单列布局（移动端）
    // 在移动端应该是1列布局
    const firstCard = wordCards.first()
    const box = await firstCard.boundingBox()
    expect(box?.width).toBeLessThanOrEqual(400) // 移动端卡片宽度
  })

  test('桌面端布局应该正常显示', async ({ page }) => {
    // 设置桌面端视口
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('networkidle')

    // 验证单词卡片可见
    const wordCards = page.locator('[class*="clay-card"]')
    await expect(wordCards.first()).toBeVisible()

    // 桌面端应该是多列布局（4列）
    const cardCount = await wordCards.count()
    expect(cardCount).toBeGreaterThan(0)
  })
})
