import { test, expect } from '@playwright/test'

test.describe('单词书详情页 - 功能测试（需要登录）', () => {
  test.beforeAll(async () => {
    // 在所有测试前，先注册测试账号（如果不存在）
    // 这通过运行setup测试来实现
    console.log('提示：请先运行 e2e/setup/register-test-user.spec.ts 创建测试账号')
  })

  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')

    // 填写登录表单（使用手机号登录）
    await page.fill('input[placeholder="请输入手机号"]', '13800138000')
    await page.fill('input[placeholder="请输入密码"]', 'test123456')

    // 点击登录按钮
    await page.click('button:has-text("登录")')

    // 等待登录成功并跳转到首页
    await page.waitForURL('/', { timeout: 15000 })
    await page.waitForLoadState('domcontentloaded')

    // 导航到单词书详情页
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)
  })

  test('应该正确显示单词列表', async ({ page }) => {
    // 验证页面标题
    const h1 = page.locator('h1')
    await expect(h1).toBeVisible()
    await expect(h1).toContainText('CET-4 核心词汇')

    // 验证单词卡片存在
    const wordCards = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]')
    const cardCount = await wordCards.count()
    expect(cardCount).toBeGreaterThan(0)

    console.log(`找到 ${cardCount} 个单词卡片`)
  })

  test('应该显示单词的基本信息', async ({ page }) => {
    const firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()

    // 验证单词显示
    const word = await firstCard.locator('h3').textContent()
    expect(word).toBeTruthy()
    console.log('第一个单词:', word)

    // 验证音标显示
    await expect(firstCard.locator('text=/\\//')).toBeVisible()

    // 验证词性徽章显示
    await expect(firstCard.locator('text=/名词|动词|形容词/')).toBeVisible()

    // 验证发音按钮存在
    const speakButtons = await firstCard.locator('button[title*="朗读"]').count()
    expect(speakButtons).toBeGreaterThan(0)
  })

  test('随机排序功能应该工作正常', async ({ page }) => {
    // 获取初始第一个单词的文本
    const firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()
    const firstWordBefore = await firstCard.locator('h3').textContent()

    console.log('随机前第一个单词:', firstWordBefore)

    // 点击随机按钮
    await page.click('button:has-text("随机")')
    await page.waitForTimeout(1000)

    // 获取随机后的第一个单词
    const firstCardAfter = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()
    const firstWordAfter = await firstCardAfter.locator('h3').textContent()

    console.log('随机后第一个单词:', firstWordAfter)

    // 验证随机按钮变为激活状态（紫色边框）
    const randomButton = page.locator('button:has-text("随机")')
    const hasActiveClass = await randomButton.evaluate(el =>
      el.classList.contains('border-purple-400') || el.className.includes('border-purple-400')
    )
    expect(hasActiveClass).toBe(true)

    // 再次点击取消随机
    await randomButton.click()
    await page.waitForTimeout(1000)

    // 验证按钮恢复默认状态
    const isStillActive = await randomButton.evaluate(el =>
      el.classList.contains('border-purple-400') || el.className.includes('border-purple-400')
    )
    expect(isStillActive).toBe(false)
  })

  test('状态筛选功能应该工作正常', async ({ page }) => {
    // 点击筛选按钮
    const filterButton = page.locator('button:has([class*="lucide-filter"])')
    await filterButton.click()
    await page.waitForTimeout(300)

    // 验证下拉菜单出现
    await expect(page.locator('text=未标注')).toBeVisible()

    // 点击"认识"筛选
    await page.click('text=认识')
    await page.waitForTimeout(1000)

    // 验证筛选按钮显示当前筛选条件
    await expect(filterButton).toContainText('认识')

    // 验证按钮变为激活状态
    const isActive = await filterButton.evaluate(el =>
      el.className.includes('border-purple-400')
    )
    expect(isActive).toBe(true)
  })

  test('状态筛选下拉菜单应该显示所有选项', async ({ page }) => {
    // 点击筛选按钮打开菜单
    await page.click('button:has([class*="lucide-filter"])')
    await page.waitForTimeout(300)

    // 验证所有选项都存在
    await expect(page.locator('text=全部')).toBeVisible()
    await expect(page.locator('text=未标注')).toBeVisible()
    await expect(page.locator('text=认识')).toBeVisible()
    await expect(page.locator('text=模糊')).toBeVisible()
    await expect(page.locator('text=不认识')).toBeVisible()

    // 点击外部关闭菜单
    await page.click('body')
    await page.waitForTimeout(300)

    // 验证菜单已关闭
    const menuVisible = await page.locator('text=未标注').isVisible().catch(() => false)
    expect(menuVisible).toBe(false)
  })

  test('单词状态标记功能应该工作正常', async ({ page }) => {
    const firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()

    // 点击"认识"按钮
    await firstCard.locator('button:has-text("认识")').click()
    await page.waitForTimeout(500)

    // 验证按钮变为激活状态（绿色）
    const knownButton = firstCard.locator('button:has-text("认识")')
    const isActive = await knownButton.evaluate(el => el.className.includes('text-green-600'))
    expect(isActive).toBe(true)

    // 点击"模糊"按钮
    await firstCard.locator('button:has-text("模糊")').click()
    await page.waitForTimeout(500)

    // 验证按钮变为激活状态（黄色）
    const fuzzyButton = firstCard.locator('button:has-text("模糊")')
    const isFuzzyActive = await fuzzyButton.evaluate(el => el.className.includes('text-yellow-600'))
    expect(isFuzzyActive).toBe(true)

    // 点击"不认识"按钮
    await firstCard.locator('button:has-text("不认识")').click()
    await page.waitForTimeout(500)

    // 验证按钮变为激活状态（红色）
    const unknownButton = firstCard.locator('button:has-text("不认识")')
    const isUnknownActive = await unknownButton.evaluate(el => el.className.includes('text-red-600'))
    expect(isUnknownActive).toBe(true)
  })

  test('全局隐藏中文功能应该工作正常', async ({ page }) => {
    // 验证初始状态显示中文
    let firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()
    await expect(firstCard.locator('text=/中文：/')).toBeVisible()

    // 点击全局隐藏中文按钮
    await page.click('button:has-text("隐藏中文")')
    await page.waitForTimeout(1000)

    // 验证中文被隐藏（显示占位符）
    firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()
    const chineseText = await firstCard.locator('text=/中文：_/').allTextContents()
    expect(chineseText[0]).toContain('______________________')
    console.log('中文被隐藏:', chineseText[0])

    // 再次点击显示中文
    await page.click('button:has-text("显示中文")')
    await page.waitForTimeout(1000)

    // 验证中文恢复显示
    firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()
    await expect(firstCard.locator('text=/中文：[^_]/')).toBeVisible()
  })

  test('本地隐藏按钮应该可以覆盖全局设置', async ({ page }) => {
    // 先启用全局隐藏
    await page.click('button:has-text("隐藏中文")')
    await page.waitForTimeout(1000)

    // 验证全局隐藏生效
    let firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()
    const chineseText1 = await firstCard.locator('text=/中文：_/').allTextContents()
    expect(chineseText1[0]).toContain('______________________')

    // 点击第一个卡片的本地显示按钮（眼睛图标）
    await firstCard.locator('button:has([class*="lucide-eye"])').first().click()
    await page.waitForTimeout(1000)

    // 验证该卡片显示中文（覆盖全局设置）
    firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()
    await expect(firstCard.locator('text=/中文：[^_]/')).toBeVisible()
  })

  test('发音按钮应该存在并可点击', async ({ page }) => {
    const firstCard = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]').first()

    // 验证发音按钮存在
    const speakButtons = await firstCard.locator('button[title*="朗读"]').count()
    expect(speakButtons).toBeGreaterThan(0)

    // 点击发音按钮
    await firstCard.locator('button[title*="朗读"]').first().click()

    // 验证按钮仍然可见（实际音频无法在测试中验证）
    await expect(firstCard.locator('button[title*="朗读"]').first()).toBeVisible()
  })
})

test.describe('单词书详情页 - 响应式设计', () => {
  test.beforeEach(async ({ page }) => {
    // 先登录
    await page.goto('/login')
    await page.waitForLoadState('domcontentloaded')
    await page.fill('input[placeholder="请输入手机号"]', '13800138000')
    await page.fill('input[placeholder="请输入密码"]', 'test123456')
    await page.click('button:has-text("登录")')
    await page.waitForURL('/', { timeout: 15000 })
  })

  test('移动端布局应该正常显示', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // 验证单词卡片可见
    const wordCards = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]')
    await expect(wordCards.first()).toBeVisible()

    // 验证标题可见
    await expect(page.locator('h1')).toBeVisible()
  })

  test('桌面端布局应该正常显示', async ({ page }) => {
    // 设置桌面端视口
    await page.setViewportSize({ width: 1920, height: 1080 })
    await page.goto('/library/demo-book-1')
    await page.waitForLoadState('domcontentloaded')
    await page.waitForTimeout(1000)

    // 验证单词卡片可见
    const wordCards = page.locator('section[class*="grid"]').locator('div[class*="clay-card"]')
    await expect(wordCards.first()).toBeVisible()

    // 桌面端应该显示多个卡片
    const cardCount = await wordCards.count()
    expect(cardCount).toBeGreaterThan(0)
  })
})
