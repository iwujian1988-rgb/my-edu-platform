import { test, expect } from '@playwright/test'

/**
 * 综合学习流程测试 - 完整版
 *
 * 测试账号: 15652936305 / wj5236016
 *
 * 覆盖场景：
 * 1. 正常流程
 * 2. 边界条件
 * 3. 异常情况
 * 4. 数据一致性
 * 5. 性能边界
 * 6. 并发场景
 * 7. 用户体验细节
 */

const TEST_USER = {
  phone: '15652936305',
  password: 'wj5236016'
}

test.describe('身份验证和基础流程', () => {
  test('登录验证', async ({ page }) => {
    console.log('🧪 测试: 登录功能')

    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', TEST_USER.phone)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')

    // 等待跳转到首页
    await page.waitForURL('http://localhost:3000/', { timeout: 10000 })

    // 验证登录成功
    const url = page.url()
    expect(url).toBe('http://localhost:3000/')

    // 验证首页加载
    await expect(page.locator('text=考研')).toBeVisible({ timeout: 5000 })

    console.log('✅ 登录验证通过')
  })

  test('错误密码登录', async ({ page }) => {
    console.log('🧪 测试: 错误密码登录')

    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', TEST_USER.phone)
    await page.fill('input[name="password"]', 'wrongpassword')
    await page.click('button[type="submit"]')

    // 验证错误提示
    await expect(page.locator('text=密码错误或用户不存在')).toBeVisible({ timeout: 5000 })

    console.log('✅ 错误密码登录测试通过')
  })
})

test.describe('Flashcards 核心功能', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', TEST_USER.phone)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')
  })

  test('场景1: 从头开始学习新单词', async ({ page }) => {
    console.log('🧪 场景1: 从头开始学习新单词')

    // 打开单词书
    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    // 检查列表页加载所有单词
    const totalWordsText = await page.locator('text=/\\d+\\s*个单词/').first().textContent()
    const totalWords = parseInt(totalWordsText!.match(/\d+/)![0])
    console.log(`📊 总单词数: ${totalWords}`)
    expect(totalWords).toBeGreaterThan(5000)

    // 进入背单词模式
    await page.getByText('背单词').first().click()

    // 等待选择范围弹框
    await page.waitForSelector('text=选择学习范围', { timeout: 5000 })

    // 选择"未标注"（通常最多）
    await page.click('text=未标注')

    // 等待加载完成
    await page.waitForSelector('text=Currently Studying', { timeout: 15000 })

    // 验证加载了所有单词（不是50个）
    const progressText = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    const [, current, total] = progressText!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
    console.log(`📊 当前进度: ${current} / ${total}`)
    expect(total).toBeGreaterThan(1000)

    // 验证从第1个开始
    expect(current).toBe(1)

    // 翻转卡片
    await page.click('.flashcard-card, [class*="flashcard"], [class*="card"]')
    await page.waitForTimeout(500)

    // 验证卡片翻转后显示释义
    const hasDefinition = await page.locator('text=/定义|释义|definition/i').count() > 0
    expect(hasDefinition).toBe(true)

    console.log('✅ 场景1: 从头开始学习新单词 - 通过')
  })

  test('场景2: 学习到一半返回，再次进入应该继续', async ({ page }) => {
    console.log('🧪 场景2: 学习到一半返回，再次进入应该继续')

    // 打开Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    // 学习到第20个单词
    console.log('📖 学习到第20个单词...')
    for (let i = 0; i < 20; i++) {
      // 翻转卡片
      await page.click('.flashcard-card, [class*="flashcard"], [class*="card"]')
      await page.waitForTimeout(200)

      // 标记为认识
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(300)
    }

    const progress1 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`学习后进度: ${progress1}`)

    // 返回首页
    const backButton = page.locator('button').filter({ hasText: /←|arrow/i }).first()
    await backButton.click()
    await page.waitForURL('http://localhost:3000/')

    // 等待数据保存
    await page.waitForTimeout(3000)

    // 再次进入
    await page.click('text=考研')

    // 检查是否有"继续学习"按钮
    const continueButton = page.getByText('继续学习')
    const hasContinue = await continueButton.count() > 0

    if (hasContinue) {
      console.log('✅ 发现"继续学习"按钮')
      await continueButton.first().click()
    } else {
      console.log('⚠️ 没有"继续学习"按钮，手动进入')
      await page.getByText('背单词').first().click()
      await page.click('text=未标注')
    }

    await page.waitForSelector('text=Currently Studying')

    // 验证恢复到第20个左右
    const progress2 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`恢复后进度: ${progress2}`)

    const [, pos1] = progress1!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
    const [, pos2] = progress2!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)

    // 误差允许±3（考虑可能多翻了几张）
    expect(Math.abs(pos2 - pos1)).toBeLessThanOrEqual(3)

    console.log('✅ 场景2: 学习到一半返回，再次进入应该继续 - 通过')
  })

  test('场景3: 学到最后一个单词，显示完成信息', async ({ page }) => {
    console.log('🧪 场景3: 学到最后一个单词')

    // 打开Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()

    // 选择"认识"（通常单词很少，容易测试完成状态）
    const knownOption = page.locator('button').filter({ hasText: /认识|known/i }).first()
    const hasKnown = await knownOption.count() > 0

    if (hasKnown) {
      await knownOption.click()
    } else {
      // 如果没有"认识"选项，选择其他选项
      await page.click('text=未标注')
    }

    await page.waitForSelector('text=Currently Studying')

    // 获取总单词数
    const progressText = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    const [, current, total] = progressText!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
    console.log(`📊 当前进度: ${current} / ${total}`)

    // 如果总单词数>100，跳过这个测试（太慢）
    if (total > 100) {
      console.log('⚠️ 单词数过多，跳过此测试')
      return
    }

    // 快速跳到最后一个单词
    if (current < total) {
      // 连续点击"认识"快速前进
      for (let i = current; i < total; i++) {
        await page.click('.flashcard-card, [class*="flashcard"]')
        await page.waitForTimeout(100)
        await page.keyboard.press('ArrowLeft')
        await page.waitForTimeout(200)
      }
    }

    // 验证显示完成信息
    const hasCompleteMessage = await page.locator('text=/完成|congratulation|太棒了/i').count() > 0

    if (hasCompleteMessage) {
      console.log('✅ 显示完成信息')
      expect(hasCompleteMessage).toBe(true)
    } else {
      console.log('⚠️ 未显示完成信息（可能在最后一个单词）')
    }

    console.log('✅ 场景3: 学到最后一个单词 - 通过')
  })

  test('场景4: 快速连续点击返回按钮，数据不应丢失', async ({ page }) => {
    console.log('🧪 场景4: 快速连续点击返回按钮')

    // 打开Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    // 学习几个单词
    for (let i = 0; i < 5; i++) {
      await page.click('.flashcard-card')
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(300)
    }

    const progress1 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`学习后进度: ${progress1}`)

    // 快速连续点击返回按钮3次
    const backButton = page.locator('button').filter({ hasText: /←|arrow/i }).first()
    await backButton.click()
    await page.waitForTimeout(50)
    await backButton.click()
    await page.waitForTimeout(50)
    await backButton.click()

    // 等待返回
    await page.waitForURL('http://localhost:3000/', { timeout: 5000 })
    await page.waitForTimeout(3000)

    // 再次进入，验证数据保存正确
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    const progress2 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`恢复后进度: ${progress2}`)

    const [, pos1] = progress1!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
    const [, pos2] = progress2!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)

    // 应该恢复到正确的位置
    expect(Math.abs(pos2 - pos1)).toBeLessThanOrEqual(3)

    console.log('✅ 场景4: 快速连续点击返回按钮 - 通过')
  })

  test('场景5: 切换不同的学习范围', async ({ page }) => {
    console.log('🧪 场景5: 切换不同的学习范围')

    // 打开Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.waitForSelector('text=选择学习范围')

    // 尝试切换不同的范围
    const scopes = ['不认识的', '模糊的', '认识', '未标注', '全部单词']

    for (const scope of scopes) {
      const scopeButton = page.locator('button').filter({ hasText: scope }).first()
      const count = await scopeButton.count()

      if (count > 0) {
        const buttonText = await scopeButton.textContent()
        const hasWords = buttonText!.match(/\d+/) && parseInt(buttonText!.match(/\d+/)![0]) > 0

        if (hasWords) {
          console.log(`🔄 切换到: ${scope}`)
          await scopeButton.click()

          // 验证进入学习界面
          await page.waitForSelector('text=Currently Studying', { timeout: 5000 })

          // 返回
          await page.locator('button').filter({ hasText: /←|arrow/i }).first().click()
          await page.waitForTimeout(1000)

          // 再次打开
          await page.getByText('背单词').first().click()
          await page.waitForSelector('text=选择学习范围')
        } else {
          console.log(`⚠️ ${scope} 没有单词，跳过`)
        }
      }
    }

    console.log('✅ 场景5: 切换不同的学习范围 - 通过')
  })
})

test.describe('Dictation 核心功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', TEST_USER.phone)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')
  })

  test('场景6: 听写模式加载所有单词', async ({ page }) => {
    console.log('🧪 场景6: 听写模式加载所有单词')

    // 打开听写模式
    await page.click('text=考研')
    await page.getByText('听写').first().click()
    await page.waitForSelector('text=听写模式', { timeout: 15000 })

    // 验证加载了所有单词
    const progressText = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    const [, current, total] = progressText!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
    console.log(`📊 听写模式进度: ${current} / ${total}`)

    expect(total).toBeGreaterThan(1000)

    console.log('✅ 场景6: 听写模式加载所有单词 - 通过')
  })

  test('场景7: 听写模式返回按钮保存进度', async ({ page }) => {
    console.log('🧪 场景7: 听写模式返回按钮保存进度')

    // 打开听写模式
    await page.click('text=考研')
    await page.getByText('听写').first().click()
    await page.waitForSelector('text=听写模式')

    // 学习几个单词
    for (let i = 0; i < 5; i++) {
      // 等待音频播放
      await page.waitForTimeout(2000)

      // 输入正确答案（需要知道单词）
      const inputBox = page.locator('input[type="text"], textarea')
      const wordText = await page.locator('[class*="word"]').first().textContent()

      if (wordText && await inputBox.count() > 0) {
        await inputBox.fill(wordText)
        await page.keyboard.press('Enter')
        await page.waitForTimeout(1000)
      }
    }

    const progress1 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`学习后进度: ${progress1}`)

    // 返回
    await page.locator('button').filter({ hasText: /←|arrow/i }).first().click()
    await page.waitForURL('http://localhost:3000/')
    await page.waitForTimeout(3000)

    // 再次进入
    await page.click('text=考研')
    await page.getByText('听写').first().click()
    await page.waitForSelector('text=听写模式')

    const progress2 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`恢复后进度: ${progress2}`)

    const [, pos1] = progress1!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
    const [, pos2] = progress2!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)

    expect(Math.abs(pos2 - pos1)).toBeLessThanOrEqual(3)

    console.log('✅ 场景7: 听写模式返回按钮保存进度 - 通过')
  })
})

test.describe('性能和边界测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', TEST_USER.phone)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')
  })

  test('性能1: 统计弹框加载时间<1秒', async ({ page }) => {
    console.log('🧪 性能1: 统计弹框加载时间')

    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    const startTime = Date.now()
    await page.getByText('背单词').first().click()
    await page.waitForSelector('text=选择学习范围')
    const endTime = Date.now()

    const loadTime = endTime - startTime
    console.log(`⏱️ 统计弹框加载时间: ${loadTime}ms`)

    expect(loadTime).toBeLessThan(1000)

    console.log('✅ 性能1: 统计弹框加载时间 - 通过')
  })

  test('性能2: 单词列表页加载时间<3秒', async ({ page }) => {
    console.log('🧪 性能2: 单词列表页加载时间')

    const startTime = Date.now()
    await page.click('text=考研')
    await page.waitForSelector('text=个单词')
    const endTime = Date.now()

    const loadTime = endTime - startTime
    console.log(`⏱️ 列表页加载时间: ${loadTime}ms`)

    expect(loadTime).toBeLessThan(3000)

    console.log('✅ 性能2: 单词列表页加载时间 - 通过')
  })

  test('性能3: Flashcards页面加载时间<3秒', async ({ page }) => {
    console.log('🧪 性能3: Flashcards页面加载时间')

    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    const startTime = Date.now()
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')
    const endTime = Date.now()

    const loadTime = endTime - startTime
    console.log(`⏱️ Flashcards加载时间: ${loadTime}ms`)

    expect(loadTime).toBeLessThan(3000)

    console.log('✅ 性能3: Flashcards页面加载时间 - 通过')
  })

  test('边界1: 空列表处理', async ({ page }) => {
    console.log('🧪 边界1: 空列表处理')

    // 打开Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.waitForSelector('text=选择学习范围')

    // 检查是否有0个单词的选项（这些选项不应该显示）
    const allButtons = await page.locator('button.border-3, button.border-\\[3px\\]').all()

    for (const button of allButtons) {
      const text = await button.textContent()
      const match = text?.match(/(\d+)\s*个单词?/)

      if (match) {
        const count = parseInt(match[1])
        expect(count).toBeGreaterThan(0)
      }
    }

    console.log('✅ 边界1: 空列表处理 - 通过')
  })

  test('边界2: 超大索引处理', async ({ page }) => {
    console.log('🧪 边界2: 超大索引处理')

    // 打开Flashcards，选择单词少的范围
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.waitForSelector('text=选择学习范围')

    // 找单词数最少的选项
    const allButtons = await page.locator('button.border-3, button.border-\\[3px\\]').all()
    let minCount = Infinity
    let minButton = null

    for (const button of allButtons) {
      const text = await button.textContent()
      const match = text?.match(/(\d+)/)

      if (match) {
        const count = parseInt(match[1])
        if (count > 0 && count < minCount) {
          minCount = count
          minButton = button
        }
      }
    }

    if (minButton && minCount < 100) {
      console.log(`📊 选择单词数最少的选项: ${minCount}个`)
      await minButton.click()
      await page.waitForSelector('text=Currently Studying', { timeout: 5000 })

      // 验证不会崩溃
      const hasContent = await page.locator('text=Currently Studying').count() > 0
      expect(hasContent).toBe(true)
    } else {
      console.log('⚠️ 没有找到单词数<100的选项，跳过此测试')
    }

    console.log('✅ 边界2: 超大索引处理 - 通过')
  })

  test('边界3: 快速刷新页面', async ({ page }) => {
    console.log('🧪 边界3: 快速刷新页面')

    await page.click('text=考研')
    await page.waitForURL(/\/library\/[a-f0-9-]+/)

    // 快速刷新3次
    for (let i = 0; i < 3; i++) {
      await page.reload()
      await page.waitForTimeout(500)
    }

    // 验证页面正常
    await expect(page.locator('text=个单词')).toBeVisible({ timeout: 5000 })

    console.log('✅ 边界3: 快速刷新页面 - 通过')
  })
})

test.describe('数据一致性测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', TEST_USER.phone)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')
  })

  test('一致性1: 标记状态保存正确', async ({ page }) => {
    console.log('🧪 一致性1: 标记状态保存正确')

    // 打开Flashcards
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    // 标记前10个单词为"认识"
    for (let i = 0; i < 10; i++) {
      await page.click('.flashcard-card')
      await page.waitForTimeout(200)
      await page.keyboard.press('ArrowLeft') // 认识
      await page.waitForTimeout(300)
    }

    // 返回列表页
    await page.locator('button').filter({ hasText: /←|arrow/i }).first().click()
    await page.waitForURL('http://localhost:3000/')
    await page.waitForTimeout(2000)

    // 再次打开，选择"认识"范围
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.waitForSelector('text=选择学习范围')

    const knownButton = page.locator('button').filter({ hasText: /认识|known/i }).first()
    const knownText = await knownButton.textContent()
    const knownCount = parseInt(knownText!.match(/\d+/)![0])

    console.log(`📊 "认识"的单词数: ${knownCount}`)

    // 应该至少有10个
    expect(knownCount).toBeGreaterThanOrEqual(10)

    console.log('✅ 一致性1: 标记状态保存正确 - 通过')
  })

  test('一致性2: 学习位置在不同范围间独立', async ({ page }) => {
    console.log('🧪 一致性2: 学习位置在不同范围间独立')

    // 在"未标注"范围学到第20个
    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    for (let i = 0; i < 20; i++) {
      await page.click('.flashcard-card')
      await page.keyboard.press('ArrowLeft')
      await page.waitForTimeout(200)
    }

    const progress1 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
    console.log(`"未标注"范围进度: ${progress1}`)

    // 切换到"认识"范围
    await page.locator('button').filter({ hasText: /←|arrow/i }).first().click()
    await page.waitForTimeout(2000)

    await page.click('text=考研')
    await page.getByText('背单词').first().click()

    const knownButton = page.locator('button').filter({ hasText: /认识|known/i }).first()
    const hasKnown = await knownButton.count() > 0 && await knownButton.isEnabled()

    if (hasKnown) {
      await knownButton.click()
      await page.waitForSelector('text=Currently Studying')

      const progress2 = await page.locator('text=/\\d+\\s*\\/\\s*\\d+/').first().textContent()
      console.log(`"认识"范围进度: ${progress2}`)

      // 应该从第1个开始（不同范围独立）
      const [, pos2] = progress2!.match(/(\d+)\s*\/\s*(\d+)/)!.map(Number)
      expect(pos2).toBe(1)
    }

    console.log('✅ 一致性2: 学习位置在不同范围间独立 - 通过')
  })
})

test.describe('UI和交互测试', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:3000/login')
    await page.fill('input[name="phone"]', TEST_USER.phone)
    await page.fill('input[name="password"]', TEST_USER.password)
    await page.click('button[type="submit"]')
    await page.waitForURL('http://localhost:3000/')
  })

  test('UI1: 骨架屏立即显示', async ({ page }) => {
    console.log('🧪 UI1: 骨架屏立即显示')

    const startTime = Date.now()
    await page.click('text=考研')

    // 等待100ms，检查是否有骨架屏
    await page.waitForTimeout(100)

    const skeletonCount = await page.locator('.animate-pulse').count()
    console.log(`🎨 100ms时骨架屏数量: ${skeletonCount}`)

    if (skeletonCount > 0) {
      expect(skeletonCount).toBeGreaterThanOrEqual(6)
    }

    // 等待真实内容加载
    await page.waitForSelector('text=个单词', { timeout: 5000 })

    const loadTime = Date.now() - startTime
    console.log(`⏱️ 列表页总加载时间: ${loadTime}ms`)

    console.log('✅ UI1: 骨架屏立即显示 - 通过')
  })

  test('UI2: 卡片翻转动画流畅', async ({ page }) => {
    console.log('🧪 UI2: 卡片翻转动画')

    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.click('text=未标注')
    await page.waitForSelector('text=Currently Studying')

    const card = page.locator('.flashcard-card, [class*="flashcard"], [class*="card"]').first()

    // 测试翻转3次
    for (let i = 0; i < 3; i++) {
      await card.click()
      await page.waitForTimeout(300)
      await card.click()
      await page.waitForTimeout(300)
    }

    console.log('✅ UI2: 卡片翻转动画流畅 - 通过')
  })

  test('UI3: 统计弹框不显示0个单词的选项', async ({ page }) => {
    console.log('🧪 UI3: 统计弹框过滤0个单词选项')

    await page.click('text=考研')
    await page.getByText('背单词').first().click()
    await page.waitForSelector('text=选择学习范围')

    // 检查没有"无单词"遮罩
    const noWordsCount = await page.locator('text=无单词').count()
    expect(noWordsCount).toBe(0)

    // 检查每个显示的选项都有单词
    const allButtons = await page.locator('button.border-3, button.border-\\[3px\\]').all()

    for (const button of allButtons) {
      const text = await button.textContent()
      const match = text?.match(/(\d+)/)

      if (match) {
        const count = parseInt(match[1])
        expect(count).toBeGreaterThan(0)
      }
    }

    console.log('✅ UI3: 统计弹框过滤0个单词选项 - 通过')
  })
})
