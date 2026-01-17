/**
 * 诊断测试：检查登录状态和页面加载
 */

import { test, expect } from '@playwright/test'

test.describe('诊断：登录状态和页面加载', () => {
  test('CHECK-01: 验证登录状态', async ({ page }) => {
    console.log('📍 检查登录状态...')

    // 1. 访问首页
    await page.goto('/')
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    console.log('✅ 首页加载成功')
    console.log('   当前URL:', page.url())

    // 2. 检查是否在首页（已登录）还是在登录页（未登录）
    const isOnLoginPage = page.url().includes('/login')
    const isOnHomePage = page.url() === '/'

    console.log(`   在登录页: ${isOnLoginPage ? '是' : '否'}`)
    console.log(`   在首页: ${isOnHomePage ? '是' : '否'}`)

    if (isOnHomePage) {
      console.log('✅ 已登录状态确认')
    } else if (isOnLoginPage) {
      console.log('❌ 未登录，需要登录')
    }
  })

  test('CHECK-02: 访问词库列表页', async ({ page }) => {
    console.log('📍 检查词库列表页...')

    await page.goto('/library')
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    console.log('✅ 词库列表页加载成功')
    console.log('   当前URL:', page.url())

    // 截图
    await page.screenshot({ path: 'test-results/library-page.png' })
    console.log('   📸 已保存截图: test-results/library-page.png')
  })

  test('CHECK-03: 检查特定词书', async ({ page }) => {
    const bookId = 'fe71d0da-c1c4-4cb7-ba31-bb6c0bbc6468'
    console.log(`📍 检查词书: ${bookId}`)

    await page.goto(`/library/${bookId}`)
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    console.log('✅ 词书详情页加载成功')
    console.log('   当前URL:', page.url())

    // 截图
    await page.screenshot({ path: 'test-results/book-detail-page.png' })
    console.log('   📸 已保存截图: test-results/book-detail-page.png')

    // 检查页面标题
    const title = await page.title()
    console.log('   页面标题:', title)
  })

  test('CHECK-04: 直接访问听写页面', async ({ page }) => {
    const bookId = 'fe71d0da-c1c4-4cb7-ba31-bb6c0bbc6468'
    console.log(`📍 直接访问听写页面...`)

    await page.goto(`/study/${bookId}/dictation`)

    // 等待页面加载
    await page.waitForTimeout(5000)

    console.log('✅ 听写页面请求完成')
    console.log('   当前URL:', page.url())

    // 截图
    await page.screenshot({ path: 'test-results/dictation-page.png', fullPage: true })
    console.log('   📸 已保存截图: test-results/dictation-page.png')

    // 检查页面内容
    const bodyText = await page.locator('body').textContent()
    console.log('   页面包含文本长度:', bodyText?.length)

    // 查找关键元素
    const hasDictationWord = bodyText?.includes('听写') || false
    const hasScopeDialog = bodyText?.includes('选择') || false
    const hasStats = bodyText?.includes('认识') || false

    console.log(`   包含"听写": ${hasDictationWord ? '✅' : '❌'}`)
    console.log(`   包含"选择": ${hasScopeDialog ? '✅' : '❌'}`)
    console.log(`   包含"认识": ${hasStats ? '✅' : '❌'}`)
  })
})
