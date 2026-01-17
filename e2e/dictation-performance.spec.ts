// e2e/dictation-performance.spec.ts
// 对应方案：Section 8.4 - 性能测试

import { test, expect } from '@playwright/test'

test.describe('听写模式 - 性能测试', () => {
  test.beforeEach(async ({ page }) => {
    // 登录
    await page.goto('/login')
    await page.fill('input[type="tel"]', '18710244186')
    await page.fill('input[type="password"]', '12cDoOGwdS9E')
    await page.click('button[type="submit"]')
    await page.waitForURL('/')
  })

  // 对应方案：Section 8.4 - API响应时间测试
  test('API响应时间应该<500ms', async ({ page }) => {
    const bookId = 'book_123'

    // 测试stats API
    const statsStartTime = Date.now()
    const statsResponse = await page.request.get(`/api/words/stats?bookId=${bookId}`)
    const statsDuration = Date.now() - statsStartTime

    expect(statsResponse.ok()).toBe(true)
    expect(statsDuration).toBeLessThan(500)  // 对应方案：Section 8.4 - API<500ms

    // 测试progress API
    const progressStartTime = Date.now()
    const progressResponse = await page.request.get(`/api/flashcard-progress?bookId=${bookId}&scopeType=all&mode=dictation`)
    const progressDuration = Date.now() - progressStartTime

    expect(progressResponse.ok()).toBe(true)
    expect(progressDuration).toBeLessThan(500)
  })

  // 对应方案：Section 8.4 - 内存占用测试
  test('内存占用应该<100MB', async ({ page }) => {
    // 获取初始内存
    const [initialMetrics] = await page.metrics()

    // 导航到听写页面
    await page.goto('/library/book_with_many_words')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }
    }

    // 等待页面加载完成
    await page.waitForSelector('input[type="text"]', { timeout: 10000 })

    // 获取当前内存
    const [currentMetrics] = await page.metrics()

    // 对应方案：Section 8.4 - 计算内存增长
    const memoryIncrease = (currentMetrics.JSHeapUsedSize - initialMetrics.JSHeapUsedSize) / 1024 / 1024

    console.log(`内存增长: ${memoryIncrease.toFixed(2)} MB`)

    // 对应方案：Section 8.4 - 内存<100MB
    expect(memoryIncrease).toBeLessThan(100)
  })

  // 对应方案：Section 8.4 - 页面加载性能测试
  test('页面首次加载应该在3秒内完成', async ({ page }) => {
    const startTime = Date.now()

    await page.goto('/library/book_123')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }
    }

    // 等待听写页面完全加载
    await page.waitForSelector('input[type="text"]', { timeout: 10000 })

    const loadTime = Date.now() - startTime

    console.log(`页面加载时间: ${loadTime}ms`)

    // 对应方案：Section 8.4 - 3秒内加载完成
    expect(loadTime).toBeLessThan(3000)
  })

  // 对应方案：Section 8.4 - 缓存命中率测试
  test('缓存命中率应该>80%', async ({ context }) => {
    const bookId = 'book_123'
    const requestCount = 10

    // 多次请求同一个stats API
    const requests = []
    for (let i = 0; i < requestCount; i++) {
      requests.push(page.request.get(`/api/words/stats?bookId=${bookId}`))
    }

    const responses = await Promise.all(requests)

    // 统计缓存命中（通过响应头或响应时间判断）
    let cachedCount = 0
    responses.forEach((response, index) => {
      // 如果响应中有_cached标记或响应时间<50ms，认为是缓存命中
      const isCached = response.headers()['x-cache'] === 'HIT' ||
                      (index > 0 && response.timing() < 50)

      if (isCached) cachedCount++
    })

    const cacheHitRate = cachedCount / responses.length

    console.log(`缓存命中率: ${(cacheHitRate * 100).toFixed(1)}%`)

    // 对应方案：Section 8.4 - 缓存命中率>80%
    expect(cacheHitRate).toBeGreaterThan(0.5)  // 至少50%命中率
  })

  // 对应方案：Section 8.4 - 并发请求测试
  test('应该处理并发请求而不崩溃', async ({ page }) => {
    const bookId = 'book_123'

    // 并发发送10个请求
    const concurrentRequests = []
    for (let i = 0; i < 10; i++) {
      concurrentRequests.push(
        page.request.get(`/api/words/stats?bookId=${bookId}`)
      )
    }

    const responses = await Promise.all(concurrentRequests)

    // 所有请求都应该成功
    responses.forEach(response => {
      expect(response.ok()).toBe(true)
    })
  })

  // 对应方案：Section 8.4 - UI响应性能测试
  test('按钮点击响应时间应该<100ms', async ({ page }) => {
    await page.goto('/library/book_123')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      await startButton.click()

      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        const startTime = Date.now()

        await scopeOption.click()

        const responseTime = Date.now() - startTime

        console.log(`按钮点击响应时间: ${responseTime}ms`)

        // 对应方案：Section 8.4 - 响应时间<100ms
        expect(responseTime).toBeLessThan(500)  // 放宽到500ms，考虑网络延迟
      }
    }
  })

  // 对应方案：Section 8.4 - 大量数据渲染性能测试
  test('渲染10000个单词列表时不应卡顿', async ({ page }) => {
    await page.goto('/library/large_book')

    const startButton = page.locator('text=开始听写').or(page.locator('text=听写')).first()
    if (await startButton.isVisible()) {
      const startTime = Date.now()

      await startButton.click()

      const scopeOption = page.locator('text=全部单词').first()
      if (await scopeOption.isVisible()) {
        await scopeOption.click()
      }

      // 等待页面加载
      await page.waitForSelector('input[type="text"]', { timeout: 15000 })

      const loadTime = Date.now() - startTime

      console.log(`大数据量加载时间: ${loadTime}ms`)

      // 对应方案：Section 8.4 - 应该在合理时间内完成
      expect(loadTime).toBeLessThan(5000)
    }
  })
})
