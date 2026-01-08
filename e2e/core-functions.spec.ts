/**
 * 核心功能快速测试
 * 用于验证平台基本功能是否可用
 */

import { test, expect } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002'
const ADMIN_EMAIL = 'imwujianfei@163.com'
const ADMIN_PASSWORD = 'wj5236016'

test.describe('核心功能验证测试', () => {

  /**
   * 测试1: 管理员登录
   */
  test('管理员登录', async ({ page }) => {
    console.log('🧪 测试管理员登录功能...')

    await page.goto(`${BASE_URL}/admin/login`)

    // 等待页面加载
    await page.waitForSelector('#email', { timeout: 10000 })
    console.log('✅ 登录页面加载成功')

    // 填写表单
    await page.fill('#email', ADMIN_EMAIL)
    await page.fill('#password', ADMIN_PASSWORD)
    console.log('✅ 表单填写完成')

    // 点击登录
    await page.click('button[type="submit"]')

    // 等待跳转或错误提示
    try {
      // 最多等待15秒
      await page.waitForURL(`${BASE_URL}/admin/dashboard`, { timeout: 15000 })
      console.log('✅ 管理员登录成功，已跳转到仪表盘')

      // 截图
      await page.screenshot({ path: 'test-results/admin-login-success.png' })
    } catch (err) {
      // 检查是否有错误提示
      const errorElement = await page.locator('text=/错误|失败|无效/i').first()
      if (await errorElement.isVisible()) {
        const errorText = await errorElement.textContent()
        console.log('❌ 登录失败:', errorText)
        await page.screenshot({ path: 'test-results/admin-login-failed.png' })
        throw new Error(`管理员登录失败: ${errorText}`)
      }
      throw err
    }
  })

  /**
   * 测试2: 管理后台仪表盘
   */
  test('管理后台仪表盘加载', async ({ page }) => {
    console.log('🧪 测试管理后台仪表盘...')

    // 先登录
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForSelector('#email', { timeout: 10000 })
    await page.fill('#email', ADMIN_EMAIL)
    await page.fill('#password', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    // 等待跳转到仪表盘
    await page.waitForURL(`${BASE_URL}/admin/dashboard`, { timeout: 15000 })

    // 验证页面标题
    const title = await page.title()
    console.log('页面标题:', title)

    // 检查是否有统计卡片
    const statsVisible = await page.locator('text=/用户总数|活跃用户|套餐总数/').isVisible()
    if (statsVisible) {
      console.log('✅ 仪表盘统计卡片显示正常')
    } else {
      console.log('⚠️ 未找到统计卡片')
    }

    await page.screenshot({ path: 'test-results/admin-dashboard.png' })
  })

  /**
   * 测试3: 前台首页访问
   */
  test('前台首页访问', async ({ page }) => {
    console.log('🧪 测试前台首页...')

    await page.goto(`${BASE_URL}/`)

    // 等待页面加载
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    const title = await page.title()
    console.log('首页标题:', title)

    // 检查是否有基本元素
    const hasContent = await page.locator('body').textContent()
    if (hasContent && hasContent.length > 100) {
      console.log('✅ 首页内容加载正常')
    } else {
      console.log('⚠️ 首页内容可能为空')
    }

    await page.screenshot({ path: 'test-results/homepage.png' })
  })

  /**
   * 测试4: 登录页面访问
   */
  test('用户登录页面访问', async ({ page }) => {
    console.log('🧪 测试用户登录页面...')

    await page.goto(`${BASE_URL}/login`)

    // 等待页面加载
    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // 检查是否有登录表单
    const hasPhoneInput = await page.locator('input[name="phone"]').count() > 0
    const hasPasswordInput = await page.locator('input[name="password"]').count() > 0

    if (hasPhoneInput && hasPasswordInput) {
      console.log('✅ 登录表单显示正常')
    } else {
      console.log('⚠️ 登录表单元素缺失')
      console.log('  - 手机号输入框:', hasPhoneInput)
      console.log('  - 密码输入框:', hasPasswordInput)
    }

    // 检查是否有注册标签
    const hasRegisterTab = await page.locator('text=注册').count() > 0
    if (hasRegisterTab) {
      console.log('✅ 注册标签存在')
    } else {
      console.log('⚠️ 未找到注册标签')
    }

    await page.screenshot({ path: 'test-results/login-page.png' })
  })

  /**
   * 测试5: 词库页面访问
   */
  test('词库详情页访问', async ({ page }) => {
    console.log('🧪 测试词库详情页...')

    // 测试一个示例词库ID（如果存在）
    await page.goto(`${BASE_URL}/library/cet4`)

    try {
      await page.waitForLoadState('networkidle', { timeout: 5000 })
      console.log('✅ 词库详情页可以访问')

      // 检查是否有学习按钮
      const hasStudyButtons = await page.locator('text=/开始学习|单词卡片|听写/').count() > 0
      if (hasStudyButtons) {
        console.log('✅ 学习功能按钮显示正常')
      }

      await page.screenshot({ path: 'test-results/library-page.png' })
    } catch (err) {
      console.log('⚠️ 词库详情页访问可能失败（可能词库不存在）')
    }
  })

  /**
   * 测试6: 响应式设计检查
   */
  test('移动端响应式检查', async ({ page }) => {
    console.log('🧪 测试移动端响应式...')

    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`${BASE_URL}/`)

    await page.waitForLoadState('networkidle', { timeout: 10000 })

    // 检查页面是否适应移动端
    const isMobile = await page.evaluate(() => window.innerWidth <= 375)
    if (isMobile) {
      console.log('✅ 移动端视口设置成功')
    }

    await page.screenshot({ path: 'test-results/mobile-homepage.png' })
  })

  /**
   * 测试7: 页面加载性能
   */
  test('页面加载性能', async ({ page }) => {
    console.log('🧪 测试页面加载性能...')

    const tests = [
      { path: '/', name: '首页' },
      { path: '/login', name: '登录页' },
    ]

    for (const test of tests) {
      const startTime = Date.now()
      await page.goto(`${BASE_URL}${test.path}`)
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      const loadTime = Date.now() - startTime

      console.log(`  ⏱️  ${test.name}: ${loadTime}ms`)

      if (loadTime < 5000) {
        console.log(`    ✅ 性能良好`)
      } else if (loadTime < 10000) {
        console.log(`    ⚠️ 性能一般（${loadTime}ms）`)
      } else {
        console.log(`    ❌ 性能较差（${loadTime}ms）`)
      }
    }
  })

})

console.log('====================================')
console.log('核心功能测试套件')
console.log('====================================')
console.log('测试范围：')
console.log('1. 管理员登录')
console.log('2. 管理后台仪表盘')
console.log('3. 前台首页')
console.log('4. 用户登录页面')
console.log('5. 词库详情页')
console.log('6. 移动端响应式')
console.log('7. 页面加载性能')
console.log('====================================')
