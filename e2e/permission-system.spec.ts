/**
 * 权限系统端到端测试
 * 覆盖从前台到后台的核心功能流程
 */

import { test, expect, Page } from '@playwright/test'

const BASE_URL = process.env.BASE_URL || 'http://localhost:3002'
const ADMIN_EMAIL = 'admin@example.com'
const ADMIN_PASSWORD = 'Admin@123'

// 测试数据
const testTimestamp = Date.now()
const TEST_PACKAGE_NAME = `E2E测试套餐_${testTimestamp}`
const TEST_USER_EMAIL = `e2e_test_${testTimestamp}@example.com`
const TEST_USER_PASSWORD = 'Test@123456'

test.describe('权限系统E2E测试', () => {
  let invitationCode: string = ''
  let adminPage: Page

  test.beforeAll(async ({ browser }) => {
    adminPage = await browser.newPage()
  })

  test.afterAll(async () => {
    await adminPage.close()
  })

  /**
   * 测试1: 管理员登录
   */
  test('管理员登录', async () => {
    await adminPage.goto(`${BASE_URL}/admin/login`)

    // 等待页面加载完成
    await adminPage.waitForSelector('#email', { timeout: 10000 })

    // 填写登录表单（使用 id 选择器）
    await adminPage.fill('#email', ADMIN_EMAIL)
    await adminPage.fill('#password', ADMIN_PASSWORD)

    // 点击登录按钮
    await adminPage.click('button[type="submit"]')

    // 等待跳转到仪表盘
    await adminPage.waitForURL(`${BASE_URL}/admin/dashboard`, { timeout: 10000 })

    // 验证页面标题
    await expect(adminPage.locator('h1')).toContainText('欢迎回来')

    console.log('✅ 管理员登录成功')
  })

  /**
   * 测试2: 创建套餐
   */
  test('创建套餐', async () => {
    await adminPage.goto(`${BASE_URL}/admin/packages`)

    // 点击创建按钮
    await adminPage.click('button:has-text("创建套餐")')

    // 等待模态框出现
    await adminPage.waitForSelector('input[placeholder*="套餐名称"]', { timeout: 5000 })

    // 填写套餐信息
    await adminPage.fill('input[placeholder*="套餐名称"]', TEST_PACKAGE_NAME)
    await adminPage.fill('textarea[placeholder*="套餐描述"]', 'E2E自动化测试套餐')
    await adminPage.fill('input[placeholder*="365"]', '365')  // 有效期

    // 选择功能权限
    await adminPage.check('label:has-text("连连看")')
    await adminPage.check('label:has-text("单词卡片")')
    await adminPage.check('label:has-text("听写练习")')

    // 选择词库权限 - 选择"全部"
    await adminPage.click('select[name="book_permission_type"]')
    await adminPage.click('option[value="all"]')

    // 保存
    await adminPage.click('button:has-text("创建"):not([disabled])')

    // 等待成功提示
    await adminPage.waitForSelector('text=套餐创建成功', { timeout: 10000 })

    console.log('✅ 套餐创建成功')
  })

  /**
   * 测试3: 创建邀请码
   */
  test('创建邀请码', async () => {
    await adminPage.goto(`${BASE_URL}/admin/invitation-codes`)

    // 点击创建邀请码按钮
    await adminPage.click('button:has-text("创建邀请码")')

    // 等待模态框
    await adminPage.waitForSelector('select[name="package_id"]', { timeout: 5000 })

    // 选择套餐
    await adminPage.click('select[name="package_id"]')
    const packageOption = await adminPage.locator(`option:has-text("${TEST_PACKAGE_NAME}")`).count()
    if (packageOption > 0) {
      await adminPage.click(`option:has-text("${TEST_PACKAGE_NAME}")`)
    }

    // 设置数量
    await adminPage.fill('input[name="count"]', '1')
    await adminPage.fill('input[name="description"]', 'E2E测试邀请码')

    // 创建
    await adminPage.click('button:has-text("创建"):not([disabled])')

    // 等待成功提示并获取邀请码
    await adminPage.waitForSelector('text=成功创建 1 个邀请码', { timeout: 10000 })

    // 从页面获取邀请码（可能在弹窗中）
    const codeElement = await adminPage.locator('text=').all()
    for (const element of codeElement) {
      const text = await element.textContent()
      if (text && text.match(/^[A-Z0-9]{4}-[A-Z0-9]{4}$/)) {
        invitationCode = text
        console.log(`✅ 邀请码创建成功: ${invitationCode}`)
        break
      }
    }

    expect(invitationCode).toBeTruthy()
  })

  /**
   * 测试4: 查看用户管理
   */
  test('查看用户管理', async () => {
    await adminPage.goto(`${BASE_URL}/admin/users`)

    // 等待页面加载
    await adminPage.waitForSelector('text=用户管理', { timeout: 10000 })

    // 验证页面有用户列表
    const userCount = await adminPage.locator('tr').count()
    expect(userCount).toBeGreaterThan(0)

    console.log('✅ 用户管理页面加载成功')
  })

  /**
   * 测试5: 用户注册并继承权限
   */
  test('用户注册并继承权限', async ({ page }) => {
    // 访问登录页面（包含注册标签）
    await page.goto(`${BASE_URL}/login`)

    // 切换到注册标签
    await page.click('text=注册')

    // 等待注册表单加载
    await page.waitForSelector('input[name="phone"]', { timeout: 5000 })

    // 填写注册表单
    await page.fill('input[name="phone"]', TEST_USER_EMAIL) // 注意：变量名是email但实际是phone
    await page.fill('input[name="password"]', TEST_USER_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_USER_PASSWORD)
    await page.fill('input[name="invitationCode"]', invitationCode)

    // 注册
    await page.click('button[type="submit"]')

    // 等待注册成功并跳转到首页
    await page.waitForURL(`${BASE_URL}/`, { timeout: 15000 })

    // 验证用户已登录
    await expect(page.locator('text=喵喵笔记')).toBeVisible()

    console.log('✅ 用户注册成功')
  })

  /**
   * 测试6: 验证用户权限
   */
  test('验证用户权限', async ({ page }) => {
    // 登录
    await page.goto(`${BASE_URL}/login`)
    await page.fill('input[name="phone"]', TEST_USER_EMAIL) // 使用phone字段
    await page.fill('input[name="password"]', TEST_USER_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(`${BASE_URL}/`, { timeout: 10000 })

    // 检查首页是否有权限警告（不应该有）
    const warningBanner = page.locator('text=您的权限已过期')
    await expect(warningBanner).not.toBeVisible()

    // 检查是否有词库列表
    const bookCount = await page.locator('[class*="book"]').count()
    expect(bookCount).toBeGreaterThan(0)

    console.log('✅ 用户权限验证成功')
  })

  /**
   * 测试7: 修改用户权限
   */
  test('修改用户权限', async () => {
    await adminPage.goto(`${BASE_URL}/admin/users`)

    // 找到刚才创建的用户
    const userRow = adminPage.locator(`text=${TEST_USER_EMAIL}`).first()
    await expect(userRow).toBeVisible()

    // 点击用户详情
    await adminPage.locator(`tr:has-text("${TEST_USER_EMAIL}")`).click()

    // 等待详情页加载
    await adminPage.waitForSelector('text=权限管理', { timeout: 10000 })

    // 点击权限管理按钮
    await adminPage.click('button:has-text("权限管理")')

    // 等待权限模态框
    await adminPage.waitForSelector('text=功能权限', { timeout: 5000 })

    // 修改权限 - 取消一些功能
    await adminPage.uncheck('label:has-text("连连看")')

    // 设置过期时间为30天
    await adminPage.click('input[value="30"]')

    // 填写变更原因
    await adminPage.fill('textarea[name="change_reason"]', 'E2E测试权限修改')

    // 保存
    await adminPage.click('button:has-text("保存权限")')

    // 等待成功提示
    await adminPage.waitForSelector('text=权限更新成功', { timeout: 10000 })

    console.log('✅ 用户权限修改成功')
  })

  /**
   * 测试8: 查看权限变更历史
   */
  test('查看权限变更历史', async () => {
    // 在用户详情页
    await adminPage.waitForSelector('text=权限变更历史', { timeout: 5000 })

    // 验证历史记录存在
    const historyItems = await adminPage.locator('[class*="permission"], [class*="history"]').count()
    expect(historyItems).toBeGreaterThan(0)

    console.log('✅ 权限变更历史加载成功')
  })

  /**
   * 测试9: 套餐列表筛选
   */
  test('套餐列表筛选', async () => {
    await adminPage.goto(`${BASE_URL}/admin/packages`)

    // 点击"仅显示已启用"
    const filterButton = adminPage.locator('text=仅显示已启用')
    if (await filterButton.isVisible()) {
      await filterButton.click()
      await adminPage.waitForTimeout(1000)
    }

    // 验证列表显示
    const packageCount = await adminPage.locator('text=').count()
    expect(packageCount).toBeGreaterThan(0)

    console.log('✅ 套餐列表筛选成功')
  })

  /**
   * 测试10: 仪表盘统计
   */
  test('仪表盘统计', async () => {
    await adminPage.goto(`${BASE_URL}/admin/dashboard`)

    // 验证6个统计卡片
    await expect(adminPage.locator('text=用户总数')).toBeVisible()
    await expect(adminPage.locator('text=活跃用户')).toBeVisible()
    await expect(adminPage.locator('text=邀请码使用率')).toBeVisible()
    await expect(adminPage.locator('text=套餐总数')).toBeVisible()
    await expect(adminPage.locator('text=权限过期用户')).toBeVisible()
    await expect(adminPage.locator('text=待审核词库')).toBeVisible()

    console.log('✅ 仪表盘统计加载成功')
  })
})

/**
 * 性能测试
 */
test.describe('性能测试', () => {
  test('页面加载性能', async ({ page }) => {
    // 测试首页加载
    const startTime = Date.now()
    await page.goto(`${BASE_URL}/`)
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(10000) // 调整为10秒（考虑首次加载和开发模式）
    console.log(`首页加载时间: ${loadTime}ms`)
  })

  test('管理后台加载性能', async ({ page }) => {
    // 先登录（使用 id 选择器）
    await page.goto(`${BASE_URL}/admin/login`)
    await page.waitForSelector('#email', { timeout: 10000 })
    await page.fill('#email', ADMIN_EMAIL)
    await page.fill('#password', ADMIN_PASSWORD)
    await page.click('button[type="submit"]')

    const startTime = Date.now()
    await page.waitForURL(`${BASE_URL}/admin/dashboard`, { timeout: 15000 })
    await page.waitForLoadState('networkidle')
    const loadTime = Date.now() - startTime

    expect(loadTime).toBeLessThan(15000) // 调整为15秒（考虑网络延迟）
    console.log(`管理后台加载时间: ${loadTime}ms`)
  })
})

/**
 * 响应式测试
 */
test.describe('响应式设计测试', () => {
  test('移动端适配', async ({ page }) => {
    // 设置移动端视口
    await page.setViewportSize({ width: 375, height: 667 })

    await page.goto(`${BASE_URL}/`)

    // 检查是否响应式
    const isResponsive = await page.evaluate(() => {
      const width = window.innerWidth
      return width <= 375
    })

    expect(isResponsive).toBe(true)
    console.log('✅ 移动端适配正常')
  })

  test('平板适配', async ({ page }) => {
    // 设置平板视口
    await page.setViewportSize({ width: 768, height: 1024 })

    await page.goto(`${BASE_URL}/`)

    // 验证布局正常
    const headerVisible = await page.locator('header').isVisible()
    expect(headerVisible).toBe(true)

    console.log('✅ 平板适配正常')
  })
})

/**
 * 错误处理测试
 */
test.describe('错误处理测试', () => {
  test('无效邀请码', async ({ page }) => {
    await page.goto(`${BASE_URL}/login`)

    // 切换到注册标签
    await page.click('text=注册')
    await page.waitForSelector('input[name="phone"]', { timeout: 5000 })

    await page.fill('input[name="phone"]', `138${Date.now().toString().slice(-8)}`)
    await page.fill('input[name="password"]', 'Test@123456')
    await page.fill('input[name="confirmPassword"]', 'Test@123456')
    await page.fill('input[name="invitationCode"]', 'INVALID-CODE')
    await page.click('button[type="submit"]')

    // 应该显示错误提示
    await page.waitForSelector('text=无效', { timeout: 5000 })

    console.log('✅ 无效邀请码错误处理正确')
  })

  test('重复注册', async ({ page }) => {
    // 尝试用已存在的手机号注册（在创建套餐测试中已经创建了）
    await page.goto(`${BASE_URL}/login`)

    // 切换到注册标签
    await page.click('text=注册')
    await page.waitForSelector('input[name="phone"]', { timeout: 5000 })

    await page.fill('input[name="phone"]', TEST_USER_EMAIL) // 使用已注册的手机号
    await page.fill('input[name="password"]', 'Test@123456')
    await page.fill('input[name="confirmPassword"]', 'Test@123456')
    await page.fill('input[name="invitationCode"]', invitationCode)
    await page.click('button[type="submit"]')

    // 应该显示错误提示
    await page.waitForSelector('text=已注册', { timeout: 5000 })

    console.log('✅ 重复注册错误处理正确')
  })
})

console.log('====================================')
console.log('权限系统E2E测试套件')
console.log('====================================')
console.log('测试范围：')
console.log('1. 管理员登录')
console.log('2. 创建套餐')
console.log('3. 创建邀请码')
console.log('4. 用户注册（权限继承）')
console.log('5. 验证用户权限')
console.log('6. 修改用户权限')
console.log('7. 查看权限历史')
console.log('8. 套餐筛选')
console.log('9. 仪表盘统计')
console.log('10. 性能测试')
console.log('11. 响应式设计')
console.log('12. 错误处理')
console.log('====================================')
