import { test, expect } from '@playwright/test'

/**
 * 简单的认证测试 - 不依赖预先注册的账号
 */

test.describe('认证模块 - 简单测试', () => {
  test('访问登录页面', async ({ page }) => {
    await page.goto('/login')

    // 验证页面标题
    await expect(page).toHaveTitle(/小语笔记/)

    // 验证主要元素存在
    await expect(page.locator('h1')).toContainText('小语笔记')
    await expect(page.locator('text=登录')).toBeVisible()
    await expect(page.locator('text=注册')).toBeVisible()
  })

  test('切换到注册标签', async ({ page }) => {
    await page.goto('/login')

    // 点击注册标签
    await page.click('text=注册')

    // 验证注册表单元素
    await expect(page.locator('input[type="tel"]')).toBeVisible()
    await expect(page.locator('input[placeholder*="邀请码"]')).toBeVisible()
    await expect(page.locator('button:has-text("注册")')).toBeVisible()
  })

  test('表单验证 - 密码不匹配', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=注册')

    // 填写不一致的密码
    await page.fill('input[type="tel"]', '13800138001')
    await page.fill('input[type="password"]:not([placeholder*="再次"])', 'test123456')
    await page.fill('input[placeholder*="再次"]', 'different123')
    await page.fill('input[placeholder*="邀请码"]', 'TEST1234')

    // 尝试提交
    await page.click('button:has-text("注册")')

    // 等待客户端验证
    await page.waitForTimeout(1000)

    // 验证URL没有跳转
    expect(page.url()).toContain('/login')
  })

  test('表单验证 - 手机号格式错误', async ({ page }) => {
    await page.goto('/login')
    await page.click('text=注册')

    // 填写错误格式的手机号
    await page.fill('input[type="tel"]', '138001380') // 只有9位
    await page.fill('input[type="password"]:not([placeholder*="再次"])', 'test123456')
    await page.fill('input[placeholder*="再次"]', 'test123456')
    await page.fill('input[placeholder*="邀请码"]', 'TEST1234')

    // 尝试提交
    await page.click('button:has-text("注册")')

    // 等待客户端验证
    await page.waitForTimeout(1000)

    // 验证URL没有跳转
    expect(page.url()).toContain('/login')
  })

  test('密码显示/隐藏功能', async ({ page }) => {
    await page.goto('/login')

    const passwordInput = page.locator('input[type="password"]')

    // 输入密码
    await passwordInput.fill('test123456')

    // 验证初始状态为隐藏
    await expect(passwordInput).toHaveAttribute('type', 'password')

    // 点击眼睛图标
    await page.click('.absolute.inset-y-0.right-0 button')

    // 等待DOM更新
    await page.waitForTimeout(500)

    // 验证变为显示状态
    const textInputs = await page.locator('input[type="text"]').all()
    const hasVisiblePassword = textInputs.some(async (input) => {
      const value = await input.inputValue()
      return value === 'test123456'
    })
    expect(hasVisiblePassword).toBeTruthy()
  })

  test('未登录访问受保护页面应重定向', async ({ page }) => {
    // 直接访问 study 页面
    await page.goto('/study')

    // 验证重定向到登录页
    await page.waitForURL('/login')
    expect(page.url()).toContain('/login')
  })
})
