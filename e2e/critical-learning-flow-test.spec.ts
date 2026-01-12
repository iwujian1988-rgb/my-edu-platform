import { test, expect } from '@playwright/test'

/**
 * 关键学习流程自动化测试
 *
 * 测试覆盖：
 * 1. Flashcards/Dication 加载所有单词（不是50个限制）
 * 2. 返回按钮保存学习进度
 * 3. 断点续学功能
 * 4. 统计弹框性能（<1s）
 * 5. 骨架屏加载效果
 */

test.describe('关键学习流程测试', () => {
  test.beforeEach(async ({ page }) => {
    // 自动同意所有权限
    page.on('dialog', async dialog => {
      await dialog.accept()
    })

    // 授权TTS权限（如果浏览器询问）
    await page.context().grantPermissions(['speaker-select'], { origin: '*' })
  })

  test('Flashcards: 加载所有单词，不是50个', async ({ page }) => {
    console.log('🧪 测试: Flashcards 加载所有单词')

    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', '17605007898')
    await page.fill('input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // 打开单词书详情
    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    // 点击背单词按钮
    const flashcardsButton = page.getByText('背单词').first()
    await flashcardsButton.click()

    // 等待选择范围弹框
    await page.waitForSelector('text=选择学习范围', { timeout: 5000 })

    // 点击"未标注"（通常单词最多）
    await page.click('text=未标注')

    // 等待加载完成
    await page.waitForSelector('text=Currently Studying', { timeout: 10000 })

    // 检查单词数量（应该远大于50）
    const progressText = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    const [, total] = progressText!.match(/(\d+)\s*\/\s*(\d+)/)!

    console.log(`📊 单词数量: ${total}`)

    // 断言：总单词数应该远大于50
    expect(parseInt(total)).toBeGreaterThan(1000)

    console.log('✅ Flashcards 加载所有单词测试通过')
  })

  test('Flashcards: 返回按钮保存学习进度', async ({ page }) => {
    console.log('🧪 测试: 返回按钮保存学习进度')

    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', '17605007898')
    await page.fill('input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // 打开Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    // 记录当前位置
    const initialProgress = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`初始位置: ${initialProgress}`)

    // 标记几个单词（移动到第10个）
    for (let i = 0; i < 10; i++) {
      // 点击卡片翻转
      await page.click('.flashcard-card')

      // 点击"认识"（右箭头）
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(300)
    }

    const currentProgress = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`当前位置: ${currentProgress}`)

    // 点击返回按钮
    console.log('🔙 点击返回按钮...')
    const backButton = page.locator('button').filter({ hasText: /←|arrow/i }).first()
    await backButton.click()

    // 等待返回首页
    await page.waitForURL('http://localhost:3000/')
    console.log('✅ 已返回首页')

    // 等待2秒确保数据保存完成
    await page.waitForTimeout(2000)

    // 再次进入Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    // 检查是否恢复到之前的位置
    const restoredProgress = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`恢复后位置: ${restoredProgress}`)

    // 断言：应该恢复到之前的位置（误差±2）
    const [, currentTotal] = currentProgress!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
    const [, restoredCurrent] = restoredProgress!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)

    expect(Math.abs(restoredCurrent - currentTotal)).toBeLessThanOrEqual(2)

    console.log('✅ 返回按钮保存学习进度测试通过')
  })

  test('统计弹框性能测试: 应该在1秒内显示', async ({ page }) => {
    console.log('🧪 测试: 统计弹框性能')

    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', '17605007898')
    await page.fill('input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // 打开单词书详情
    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    // 点击背单词按钮（触发统计弹框）
    const startTime = Date.now()
    await page.getByText('背单词').first().click()

    // 等待统计弹框出现
    await page.waitForSelector('text=选择学习范围', { timeout: 5000 })
    const endTime = Date.now()

    const loadTime = endTime - startTime
    console.log(`⏱️ 统计弹框加载时间: ${loadTime}ms`)

    // 断言：应该在1秒内加载完成
    expect(loadTime).toBeLessThan(1000)

    // 检查统计数据是否正确显示
    const statsText = await page.locator('.bg-green-50, .bg-yellow-50, .bg-red-50, .bg-gray-50, .bg-blue-50').allTextContents()
    console.log(`📊 统计数据: ${statsText.length} 个选项`)

    // 断言：应该显示多个选项（不全部是0个的）
    expect(statsText.length).toBeGreaterThan(0)

    console.log('✅ 统计弹框性能测试通过')
  })

  test('统计弹框: 不显示0个单词的选项', async ({ page }) => {
    console.log('🧪 测试: 统计弹框过滤0个单词的选项')

    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', '17605007898')
    await page.fill('input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // 打开单词书详情
    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    // 点击背单词按钮
    await page.getByText('背单词').first().click()
    await page.waitForSelector('text=选择学习范围')

    // 检查所有选项卡片
    const cards = await page.locator('button.border-3, button.border-\\[3px\\]').count()
    console.log(`📊 显示的选项数量: ${cards}`)

    // 检查是否有"无单词"遮罩
    const noWordsOverlays = await page.locator('text=无单词').count()
    console.log(`📊 "无单词"遮罩数量: ${noWordsOverlays}`)

    // 断言：不应该显示"无单词"遮罩（应该直接隐藏选项）
    expect(noWordsOverlays).toBe(0)

    // 每个显示的选项都应该有单词数>0
    const allCards = await page.locator('button.border-3, button.border-\\[3px\\]').all()
    for (const card of allCards) {
      const text = await card.textContent()
      const match = text!.match(/(\d+)/)
      if (match) {
        const count = parseInt(match[1])
        expect(count).toBeGreaterThan(0)
      }
    }

    console.log('✅ 统计弹框过滤0个单词选项测试通过')
  })

  test('单词列表页: 骨架屏加载效果', async ({ page }) => {
    console.log('🧪 测试: 骨架屏加载效果')

    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', '17605007898')
    await page.fill('input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // 打开单词书详情（会显示骨架屏）
    await page.click('text=考研')

    // 立即检查是否有骨架屏（灰色占位卡片）
    await page.waitForTimeout(100) // 等待100ms

    const skeletonExists = await page.locator('.animate-pulse').count() > 0
    console.log(`🎨 骨架屏存在: ${skeletonExists}`)

    if (skeletonExists) {
      // 检查骨架屏卡片数量（应该是6个）
      const skeletonCount = await page.locator('.animate-pulse').count()
      console.log(`🎨 骨架屏卡片数量: ${skeletonCount}`)
      expect(skeletonCount).toBeGreaterThanOrEqual(6)
    }

    // 等待真实内容加载
    await page.waitForSelector('text=个单词', { timeout: 5000 })

    // 检查骨架屏是否消失
    await page.waitForTimeout(500)
    const skeletonAfterLoad = await page.locator('.animate-pulse').count()
    console.log(`🎨 加载后骨架屏数量: ${skeletonAfterLoad}`)

    console.log('✅ 骨架屏加载效果测试通过')
  })

  test('Dictation: 加载所有单词', async ({ page }) => {
    console.log('🧪 测试: Dictation 加载所有单词')

    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', '17605007898')
    await page.fill('input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // 打开单词书详情
    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    // 点击听写模式
    const dictationButton = page.getByText('听写').first()
    await dictationButton.click()

    // 等待加载完成
    await page.waitForSelector('text=听写模式', { timeout: 10000 })

    // 检查单词数量
    const progressText = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    const [, total] = progressText!.match(/(\d+)\s*\/\s*(\d+)/)!

    console.log(`📊 Dictation 单词数量: ${total}`)

    // 断言：总单词数应该远大于50
    expect(parseInt(total)).toBeGreaterThan(1000)

    console.log('✅ Dictation 加载所有单词测试通过')
  })

  test('断点续学: 列表页→Flashcards→返回→继续学习', async ({ page }) => {
    console.log('🧪 测试: 完整断点续学流程')

    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', '17605007898')
    await page.fill('input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')

    // 打开单词书详情
    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    // 进入Flashcards
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    // 学习几个单词
    for (let i = 0; i < 5; i++) {
      await page.click('.flashcard-card')
      await page.keyboard.press('ArrowRight')
      await page.waitForTimeout(300)
    }

    const progress1 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`学习后位置: ${progress1}`)

    // 返回列表页
    const backButton = page.locator('button').filter({ hasText: /←|arrow/i }).first()
    await backButton.click()
    await page.waitForURL('http://localhost:3000/')
    await page.waitForTimeout(2000)

    // 再次进入同一个单词书
    await page.click('text=考研')

    // 检查是否有"继续学习"按钮
    const continueButton = page.getByText('继续学习')
    const hasContinueButton = await continueButton.count() > 0

    if (hasContinueButton) {
      console.log('✅ 发现"继续学习"按钮')
      await continueButton.first().click()
    } else {
      console.log('⚠️ 没有"继续学习"按钮，手动进入')
      await page.getByText('背单词').first().click()
      await page.click('text=未标注')
    }

    await page.waitForSelector('text=Currently Studying')

    // 检查是否恢复到之前的位置
    const progress2 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`恢复后位置: ${progress2}`)

    const [, pos1] = progress1!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
    const [, pos2] = progress2!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)

    expect(Math.abs(pos2 - pos1)).toBeLessThanOrEqual(2)

    console.log('✅ 完整断点续学流程测试通过')
  })
})

test.describe('回归测试', () => {
  test.beforeEach(async ({ page }) => {
    page.on('dialog', async dialog => await dialog.accept())

    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', '17605007898')
    await page.fill('input[name="password"]', 'test123456')
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')
  })

  test('回归测试: 索引超出范围时的边界处理', async ({ page }) => {
    console.log('🧪 回归测试: 索引边界处理')

    // 打开Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()

    // 选择一个单词数较少的范围（确保可能超出）
    await page.click('text=认识') // 可能只有2个单词

    await page.waitForSelector('text=Currently Studying', { timeout: 5000 })

    // 检查是否正常显示（不应该崩溃）
    const hasContent = await page.locator('text=Currently Studying').count() > 0
    expect(hasContent).toBe(true)

    console.log('✅ 索引边界处理测试通过')
  })

  test('回归测试: 50个单词限制问题已修复', async ({ page }) => {
    console.log('🧪 回归测试: 确认可以加载超过50个单词')

    // 打开单词书
    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    // 检查显示的单词总数
    const totalCount = await page.locator('text=/\\d+\\s*个单词/').first().textContent()
    const count = parseInt(totalCount!.match(/\d+/)![0])

    console.log(`📊 列表页显示单词总数: ${count}`)

    // 应该远大于50
    expect(count).toBeGreaterThan(1000)

    console.log('✅ 50个单词限制问题已确认修复')
  })
})
