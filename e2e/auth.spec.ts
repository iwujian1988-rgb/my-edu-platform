import { test, expect } from '@playwright/test'
import {
  gotoLoginPage,
  switchToSignupTab,
  switchToLoginTab,
  fillLoginForm,
  fillSignupForm,
  submitLoginForm,
  submitSignupForm,
  expectSuccessMessage,
  expectErrorMessage,
  expectNavigation,
  logout,
  generateRandomPhone,
  togglePasswordVisibility,
  waitForLoadingToFinish,
  testUsers,
  invitationCodes,
} from './utils/test-helpers'

/**
 * 认证模块测试套件
 *
 * 包含登录、注册、路由保护等功能的端到端测试
 */

test.describe('认证模块 - 核心功能', () => {
  test.beforeEach(async ({ page }) => {
    // 每个测试前导航到登录页
    await gotoLoginPage(page)
  })

  test('001 - 正常注册流程', async ({ page }) => {
    // 切换到注册标签
    await switchToSignupTab(page)

    // 生成随机手机号避免冲突
    const randomPhone = generateRandomPhone()

    // 填写注册表单
    await fillSignupForm(
      page,
      randomPhone,
      'test123456',
      'test123456',
      invitationCodes.valid
    )

    // 提交表单
    await submitSignupForm(page)

    // 验证成功提示
    await expectSuccessMessage(page, '注册成功')

    // 验证跳转到 study 页面
    await expectNavigation(page, '/study')

    // 验证页面显示用户信息
    await expect(page.locator(`text=欢迎回来，${randomPhone}`)).toBeVisible()
  })

  test('002 - 正常登录流程', async ({ page }) => {
    // 注意：此测试需要先注册测试账号
    // 如果账号不存在，先注册
    const phone = testUsers.existing.phone
    const password = testUsers.existing.password

    // 填写登录表单
    await fillLoginForm(page, phone, password)
    await submitLoginForm(page)

    // 验证成功提示
    await expectSuccessMessage(page, '登录成功')

    // 验证跳转到 study 页面
    await expectNavigation(page, '/study')

    // 验证显示用户信息
    await expect(page.locator('text=欢迎回来')).toBeVisible()
  })

  test('003 - 错误密码登录', async ({ page }) => {
    // 使用存在的账号但错误密码
    await fillLoginForm(page, testUsers.existing.phone, 'wrongpassword')
    await submitLoginForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '手机号或密码错误')

    // 验证未跳转
    expect(page.url()).toContain('/login')
  })

  test('004 - 未注册手机号登录', async ({ page }) => {
    // 使用不存在的手机号
    await fillLoginForm(page, '19999999999', 'anypassword')
    await submitLoginForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '手机号或密码错误')

    // 验证未跳转
    expect(page.url()).toContain('/login')
  })

  test('016 - 登出功能', async ({ page }) => {
    // 先登录
    await fillLoginForm(page, testUsers.existing.phone, testUsers.existing.password)
    await submitLoginForm(page)
    await expectNavigation(page, '/study')

    // 点击退出登录
    await page.click('button:has-text("退出登录")')

    // 验证重定向到登录页
    await page.waitForURL('/login')
    expect(page.url()).toContain('/login')

    // 验证无法访问 study 页面
    await page.goto('/study')
    await page.waitForURL('/login')
    expect(page.url()).toContain('/login')
  })
})

test.describe('认证模块 - 表单验证', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLoginPage(page)
    await switchToSignupTab(page)
  })

  test('005 - 注册 - 密码不匹配', async ({ page }) => {
    const randomPhone = generateRandomPhone()

    await fillSignupForm(
      page,
      randomPhone,
      'test123456',
      'different123',
      invitationCodes.valid
    )

    await submitSignupForm(page)

    // 验证错误提示（前端验证）
    await expectErrorMessage(page, '两次输入的密码不一致')
  })

  test('006 - 注册 - 密码过短', async ({ page }) => {
    const randomPhone = generateRandomPhone()

    await fillSignupForm(page, randomPhone, '12345', '12345', invitationCodes.valid)

    await submitSignupForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '密码长度至少为6位')
  })

  test('007 - 注册 - 手机号格式错误（非11位）', async ({ page }) => {
    await fillSignupForm(
      page,
      '138001380', // 只有9位
      'test123456',
      'test123456',
      invitationCodes.valid
    )

    await submitSignupForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '请输入正确的11位手机号')
  })

  test('008 - 注册 - 手机号格式错误（包含非数字）', async ({ page }) => {
    await fillSignupForm(
      page,
      '138abc38000', // 包含字母
      'test123456',
      'test123456',
      invitationCodes.valid
    )

    await submitSignupForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '请输入正确的11位手机号')
  })

  test('013 - 注册 - 空表单验证', async ({ page }) => {
    // 不填写任何字段，直接点击注册
    await submitSignupForm(page)

    // 浏览器原生验证应该阻止提交
    // 检查是否有 required 属性的输入框
    const requiredInputs = page.locator('input[required]')
    await expect(requiredInputs).toHaveCount(4) // 手机号、密码、确认密码、邀请码
  })
})

test.describe('认证模块 - 邀请码验证', () => {
  test.beforeEach(async ({ page }) => {
    await gotoLoginPage(page)
    await switchToSignupTab(page)
  })

  test('009 - 注册 - 无效邀请码', async ({ page }) => {
    const randomPhone = generateRandomPhone()

    await fillSignupForm(
      page,
      randomPhone,
      'test123456',
      'test123456',
      invitationCodes.invalid // INVALID
    )

    await submitSignupForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '邀请码无效或已失效')
  })

  test('010 - 注册 - 邀请码已过期', async ({ page }) => {
    const randomPhone = generateRandomPhone()

    await fillSignupForm(
      page,
      randomPhone,
      'test123456',
      'test123456',
      invitationCodes.expired // EXPIRED
    )

    await submitSignupForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '邀请码已过期')
  })

  test('011 - 注册 - 邀请码使用次数已达上限', async ({ page }) => {
    const randomPhone = generateRandomPhone()

    await fillSignupForm(
      page,
      randomPhone,
      'test123456',
      'test123456',
      invitationCodes.full // FULLCODE
    )

    await submitSignupForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '邀请码使用次数已达上限')
  })

  test('012 - 注册 - 手机号已注册', async ({ page }) => {
    // 使用已存在的手机号
    await fillSignupForm(
      page,
      testUsers.existing.phone,
      'newpassword123',
      'newpassword123',
      invitationCodes.valid
    )

    await submitSignupForm(page)

    // 验证错误提示
    await expectErrorMessage(page, '该手机号已注册')
  })
})

test.describe('认证模块 - 路由保护', () => {
  test('014 - 未登录访问受保护页面', async ({ page }) => {
    // 直接访问 study 页面（不登录）
    await page.goto('/study')

    // 验证重定向到登录页
    await page.waitForURL('/login')
    expect(page.url()).toContain('/login')
  })

  test('015 - 已登录用户访问登录页', async ({ page }) => {
    // 先登录
    await gotoLoginPage(page)
    await fillLoginForm(page, testUsers.existing.phone, testUsers.existing.password)
    await submitLoginForm(page)
    await expectNavigation(page, '/study')

    // 已登录状态下访问登录页
    await page.goto('/login')

    // 验证重定向回 study 页面
    await page.waitForURL('/study')
    expect(page.url()).toContain('/study')
  })
})

test.describe('认证模块 - UI交互', () => {
  test('017 - 密码显示/隐藏切换', async ({ page }) => {
    await gotoLoginPage(page)

    const passwordInput = page.locator('input[type="password"]')

    // 输入密码
    await passwordInput.fill('test123456')

    // 验证初始状态为隐藏（type="password"）
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // 点击眼睛图标
    await togglePasswordVisibility(page)

    // 验证变为显示（type="text"）
    const textInput = page.locator('input[type="text"]').first()
    await expect(textInput).toHaveValue('test123456')

    // 再次点击
    await togglePasswordVisibility(page)

    // 验证又变回隐藏
    await expect(passwordInput).toHaveAttribute('type', 'password')
  })

  test('018 - 邀请码自动转大写', async ({ page }) => {
    await gotoLoginPage(page)
    await switchToSignupTab(page)

    const inviteInput = page.locator('input[placeholder*="邀请码"]')

    // 输入小写邀请码
    await inviteInput.fill('test1234')

    // 验证自动转为大写
    await expect(inviteInput).toHaveValue('TEST1234')
  })

  test('019 - Tab 切换清空错误信息', async ({ page }) => {
    // 在登录页触发错误
    await fillLoginForm(page, 'wrong', 'wrong')
    await submitLoginForm(page)
    await expectErrorMessage(page, '手机号或密码')

    // 切换到注册标签
    await switchToSignupTab(page)

    // 验证错误提示消失
    const errorBox = page.locator('.bg-red-50, [class*="bg-red"]')
    await expect(errorBox).not.toBeVisible()

    // 切换回登录标签
    await switchToLoginTab(page)

    // 验证表单被清空
    await expect(page.locator('input[type="tel"]')).toHaveValue('')
    await expect(page.locator('input[type="password"]')).toHaveValue('')
  })

  test('102 - 加载状态显示', async ({ page }) => {
    await gotoLoginPage(page)
    await switchToSignupTab(page)

    const randomPhone = generateRandomPhone()

    // 填写表单
    await fillSignupForm(
      page,
      randomPhone,
      'test123456',
      'test123456',
      invitationCodes.valid
    )

    // 点击注册按钮
    await submitSignupForm(page)

    // 立即验证按钮文字变为"注册中..."
    const submitButton = page.locator('button:has-text("注册")')
    await expect(submitButton).toContainText('注册中...')

    // 验证按钮被禁用
    await expect(submitButton).toBeDisabled()

    // 等待加载完成
    await waitForLoadingToFinish(page)
  })
})

test.describe('认证模块 - 性能测试', () => {
  test('201 - 登录响应时间', async ({ page }) => {
    await gotoLoginPage(page)

    // 记录开始时间
    const startTime = Date.now()

    // 执行登录
    await fillLoginForm(page, testUsers.existing.phone, testUsers.existing.password)
    await submitLoginForm(page)

    // 等待跳转
    await page.waitForURL('/study', { timeout: 5000 })

    // 计算耗时
    const endTime = Date.now()
    const duration = endTime - startTime

    // 验证响应时间 < 3秒（预留一些缓冲时间）
    expect(duration).toBeLessThan(3000)

    console.log(`登录响应时间: ${duration}ms`)
  })

  test('202 - 注册响应时间', async ({ page }) => {
    await gotoLoginPage(page)
    await switchToSignupTab(page)

    const randomPhone = generateRandomPhone()

    // 记录开始时间
    const startTime = Date.now()

    // 执行注册
    await fillSignupForm(
      page,
      randomPhone,
      'test123456',
      'test123456',
      invitationCodes.valid
    )
    await submitSignupForm(page)

    // 等待跳转
    await page.waitForURL('/study', { timeout: 5000 })

    // 计算耗时
    const endTime = Date.now()
    const duration = endTime - startTime

    // 验证响应时间 < 5秒（注册需要创建用户和同步数据，预留更多时间）
    expect(duration).toBeLessThan(5000)

    console.log(`注册响应时间: ${duration}ms`)
  })
})

test.describe('认证模块 - 安全测试', () => {
  test('301 - SQL 注入防护', async ({ page }) => {
    await gotoLoginPage(page)

    // 尝试 SQL 注入
    await fillLoginForm(
      page,
      "13800138000' OR '1'='1",
      "password' OR '1'='1"
    )
    await submitLoginForm(page)

    // 验证不执行注入，返回错误
    await expectErrorMessage(page, '手机号或密码错误')
    expect(page.url()).toContain('/login')
  })

  test('302 - XSS 防护', async ({ page }) => {
    await gotoLoginPage(page)
    await switchToSignupTab(page)

    // 尝试 XSS 攻击
    await page.fill('input[type="tel"]', "<script>alert('XSS')</script>")
    await page.fill('input[type="password"]:not([placeholder*="再次"])', 'test123456')
    await page.fill('input[placeholder*="再次"]', 'test123456')
    await page.fill('input[placeholder*="邀请码"]', invitationCodes.valid)

    await submitSignupForm(page)

    // 验证不执行 JavaScript
    // 如果 XSS 成功，会有 alert 弹窗，导致超时
    // 这里我们验证没有弹窗，并返回验证错误
    await expectErrorMessage(page, '请输入正确的11位手机号')
  })

  test('303 - 密码不在前端存储', async ({ page }) => {
    await gotoLoginPage(page)

    // 输入密码
    await page.fill('input[type="password"]', 'test123456')

    // 检查 localStorage
    const localStorage = await page.evaluate(() => {
      return JSON.stringify(window.localStorage)
    })

    // 验证密码不在 localStorage 中
    expect(localStorage).not.toContain('test123456')

    // 检查 sessionStorage
    const sessionStorage = await page.evaluate(() => {
      return JSON.stringify(window.sessionStorage)
    })

    // 验证密码不在 sessionStorage 中
    expect(sessionStorage).not.toContain('test123456')
  })
})

test.describe('认证模块 - 压力测试', () => {
  test('020 - 连续多次错误登录', async ({ page }) => {
    await gotoLoginPage(page)

    // 连续10次错误登录
    for (let i = 0; i < 10; i++) {
      await fillLoginForm(page, testUsers.existing.phone, 'wrongpass')
      await submitLoginForm(page)

      // 验证每次都显示错误
      await expectErrorMessage(page, '手机号或密码错误')

      // 清空表单
      await page.fill('input[type="tel"]', testUsers.existing.phone)
      await page.fill('input[type="password"]', 'wrongpass')
    }

    // 验证账号未被锁定（使用正确密码仍可登录）
    await fillLoginForm(page, testUsers.existing.phone, testUsers.existing.password)
    await submitLoginForm(page)
    await expectSuccessMessage(page, '登录成功')
  })
})
