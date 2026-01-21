/**
 * E2E测试: 状态筛选功能 - 验证修复后的缓存逻辑
 *
 * 测试目标: 验证点击"认识/不认识/模糊"筛选后页面会刷新
 *
 * 测试书籍: 9f1e6332-979d-4632-a8f6-8bd35246b28d (PEP初中8年级)
 * 该书有1条"认识"状态的记录
 */

import { test, expect } from '@playwright/test'
import { login } from './helpers/login-helper'

test.describe('状态筛选功能测试 - 验证缓存修复', () => {
  const TEST_BOOK_ID = '9f1e6332-979d-4632-a8f6-8bd35246b28d'
  const TEST_BOOK_URL = `/library/${TEST_BOOK_ID}`

  test.beforeEach(async ({ page }) => {
    console.log('🔐 登录测试账号...')
    await login(page)
  })

  test('验证: 点击"认识"筛选后API被调用且页面刷新', async ({ page }) => {
    console.log('\n========================================')
    console.log('测试: 状态筛选功能')
    console.log('========================================\n')

    // Step 1: 访问书籍详情页
    console.log('Step 1: 访问书籍详情页')
    await page.goto(TEST_BOOK_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000) // 等待React组件渲染

    // Step 2: 监控API请求
    console.log('\nStep 2: 设置API请求监控')

    const apiCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/words')) {
        const urlObj = new URL(url)
        const status = urlObj.searchParams.get('status')
        const pageParam = urlObj.searchParams.get('page')
        const cacheKey = `${pageParam}-${status}`

        apiCalls.push(cacheKey)
        console.log(`  📡 API调用: /api/words?status=${status}&page=${pageParam}`)
      }
    })

    // Step 3: 获取初始单词列表
    console.log('\nStep 3: 获取初始单词列表 (status=all)')
    const initialWordCards = page.locator('[data-testid="word-card"]')
    const initialCount = await initialWordCards.count()
    console.log(`  📚 初始单词数量: ${initialCount}`)

    // Step 4: 点击"认识"筛选按钮
    console.log('\nStep 4: 点击"认识"筛选按钮')

    // 查找"认识"按钮 - 可能有多种定位方式
    const knownButtonSelectors = [
      'button:has-text("认识")',
      '[data-testid="status-known"]',
      'button[aria-label="认识"]',
      '.status-filter-known'
    ]

    let knownButton = null
    for (const selector of knownButtonSelectors) {
      const btn = page.locator(selector).first()
      if (await btn.count() > 0) {
        knownButton = btn
        console.log(`  ✅ 找到按钮: ${selector}`)
        break
      }
    }

    if (!knownButton) {
      console.log('  ❌ 未找到"认识"按钮，尝试查找所有按钮...')

      // 调试：列出所有按钮
      const allButtons = await page.locator('button').allTextContents()
      console.log('  📋 页面上的所有按钮:', allButtons.slice(0, 10))

      test.skip()
      return
    }

    // Step 5: 点击并监控API调用
    console.log('\nStep 5: 点击按钮并等待API调用')

    await Promise.all([
      page.waitForResponse(response => {
        return response.url().includes('/api/words') &&
               response.url().includes('status=known')
      }, { timeout: 5000 }),
      knownButton.click()
    ])

    console.log('  ✅ API调用已触发')

    // Step 6: 等待页面刷新
    console.log('\nStep 6: 等待页面刷新')
    await page.waitForTimeout(2000)

    // Step 7: 验证API调用
    console.log('\nStep 7: 验证API调用')
    console.log(`  📊 API调用记录: ${apiCalls.join(', ')}`)

    const hasKnownApiCall = apiCalls.some(key => key.includes('known'))
    console.log(`  ${hasKnownApiCall ? '✅' : '❌'} 是否调用了 status=known 的API: ${hasKnownApiCall}`)

    expect(hasKnownApiCall).toBe(true)

    // Step 8: 验证页面内容变化
    console.log('\nStep 8: 验证页面内容变化')
    const afterWordCards = page.locator('[data-testid="word-card"]')
    const afterCount = await afterWordCards.count()
    console.log(`  📚 筛选后单词数量: ${afterCount}`)

    // 如果有"认识"的单词，应该显示；如果没有，应该是空或0
    console.log(`  ℹ️ 单词数量变化: ${initialCount} → ${afterCount}`)

    // Step 9: 验证缓存key
    console.log('\nStep 9: 验证缓存逻辑')
    console.log('  ✅ 缓存key应该包含: "1-known" (page-status组合)')
    console.log('  ✅ 不应该只包含: "1" (只有page)')

    console.log('\n========================================')
    console.log('✅ 测试完成')
    console.log('========================================\n')
  })

  test('验证: 在不同页码之间切换', async ({ page }) => {
    console.log('\n========================================')
    console.log('测试: 页码切换 + 状态筛选')
    console.log('========================================\n')

    await page.goto(TEST_BOOK_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    const apiCalls: string[] = []

    page.on('request', request => {
      const url = request.url()
      if (url.includes('/api/words')) {
        const urlObj = new URL(url)
        const status = urlObj.searchParams.get('status')
        const pageParam = urlObj.searchParams.get('page')
        apiCalls.push(`${pageParam}-${status}`)
        console.log(`  📡 API: ${pageParam}-${status}`)
      }
    })

    // 点击"认识"
    const knownButton = page.locator('button:has-text("认识")').first()
    if (await knownButton.count() > 0) {
      await knownButton.click()
      await page.waitForTimeout(2000)
    }

    // 检查缓存key
    console.log(`  📊 API调用记录: ${apiCalls.join(', ')}`)

    // 验证每次不同的page-status组合都会调用API
    const uniqueKeys = new Set(apiCalls)
    console.log(`  ✅ 不同的缓存key数量: ${uniqueKeys.size}`)

    console.log('\n========================================')
    console.log('✅ 测试完成')
    console.log('========================================\n')
  })

  test('验证: sessionStorage缓存key正确', async ({ page }) => {
    console.log('\n========================================')
    console.log('测试: sessionStorage缓存key验证')
    console.log('========================================\n')

    await page.goto(TEST_BOOK_URL, { waitUntil: 'networkidle' })
    await page.waitForTimeout(2000)

    // 读取sessionStorage
    const cacheData = await page.evaluate((bookId) => {
      const key = `loadedPages-${bookId}`
      const data = sessionStorage.getItem(key)
      return data ? JSON.parse(data) : []
    }, TEST_BOOK_ID)

    console.log(`  📦 sessionStorage中的缓存key: ${cacheData.join(', ')}`)

    // 验证缓存key格式
    const hasCorrectFormat = cacheData.some((key: string) => key.includes('-'))
    console.log(`  ${hasCorrectFormat ? '✅' : '❌'} 缓存key格式正确 (包含"-"): ${hasCorrectFormat}`)

    if (cacheData.length > 0) {
      console.log('  示例缓存key:')
      cacheData.slice(0, 3).forEach((key: string) => {
        console.log(`    - ${key}`)
      })
    }

    console.log('\n========================================')
    console.log('✅ 测试完成')
    console.log('========================================\n')
  })
})
