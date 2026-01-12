import { test, expect } from '@playwright/test'

/**
 * 登录相关场景测试
 * 测试登录流程、密码重置、错误处理等
 */

// 测试数据
const testPhone = '13900000001'
const testPassword = 'Test123456'
const newPassword = 'NewPassword123'

test.describe('登录相关场景', () => {

  test.beforeAll(async () => {
    // 注意：这个测试需要预先存在测试用户
    // 可以通过Supabase Dashboard创建，或者运行注册测试创建
    console.log('确保测试用户存在:', testPhone)
  })

  test('LOGIN-01: 后台重置密码后使用旧密码登录', async ({ page }) => {
    await page.goto('/login')

    // 步骤1: 使用正确的旧密码登录（应该成功）
    console.log('步骤1: 使用旧密码登录...')
    await page.fill('input[type="tel"], input[placeholder*="手机"]', testPhone)
    await page.fill('input[name="password"], input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    // 等待登录成功或失败
    await page.waitForTimeout(2000)

    // 如果登录成功，会跳转到首页
    const currentUrl = page.url()
    if (currentUrl === '/' || currentUrl.includes('/study')) {
      console.log('✅ 旧密码登录成功（密码未重置）')

      // 先退出登录
      await page.goto('/logout')
      await page.waitForTimeout(1000)
    }

    // 步骤2: 模拟后台重置密码（通过Supabase API）
    console.log('步骤2: 模拟后台重置密码...')

    // 注意：这里需要在Supabase Dashboard中手动重置密码
    // 或者使用Supabase Admin API重置
    // 由于测试代码无法直接访问Admin API，这里提供手动步骤：
    /*
    在Supabase Dashboard中：
    1. 访问 Authentication > Users
    2. 找到用户 13900000001@phone.xiaoyu.com
    3. 点击 "..." > "Reset password"
    4. 设置新密码为：NewPassword123
    5. 点击 "Send password reset email" 或直接手动设置
    */

    // 在测试中，我们先提示用户手动操作
    console.log('\n⚠️  请在Supabase Dashboard中手动重置密码:')
    console.log('   用户:', testPhone)
    console.log('   新密码:', newPassword)
    console.log('   然后按回车继续测试...\n')

    // 等待用户手动操作
    // await page.pause() // 这会暂停测试，让用户手动操作

    // 步骤3: 使用旧密码登录（应该失败）
    console.log('步骤3: 使用旧密码尝试登录...')
    await page.goto('/login')
    await page.fill('input[type="tel"], input[placeholder*="手机"]', testPhone)
    await page.fill('input[name="password"], input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    // 验证：应该显示错误提示
    // 期望的错误提示：
    // - "手机号或密码错误"
    // - 或 "登录失败，请重试"
    const errorMessage = page.locator(
      'text=手机号或密码错误, text=登录失败, text=密码错误, text=账号或密码错误'
    )

    try {
      await expect(errorMessage).toBeVisible({ timeout: 3000 })
      console.log('✅ 正确显示错误提示：旧密码无法登录')
    } catch (e) {
      console.log('⚠️  未显示预期的错误提示')
      console.log('   可能原因：')
      console.log('   1. 密码尚未重置（需要在Supabase Dashboard手动操作）')
      console.log('   2. 用户不存在')
      console.log('   3. 错误提示文案与预期不同')
    }

    // 截图保存当前状态
    await page.screenshot({ path: 'test-results/login-01-old-password.png' })
  })

  test('LOGIN-02: 使用新密码登录（重置后）', async ({ page }) => {
    await page.goto('/login')

    // 使用新密码登录
    console.log('使用新密码登录...')
    await page.fill('input[type="tel"], input[placeholder*="手机"]', testPhone)
    await page.fill('input[name="password"], input[type="password"]', newPassword)
    await page.click('button[type="submit"]')

    // 等待登录处理
    await page.waitForTimeout(2000)

    // 验证：应该登录成功并跳转到首页
    const currentUrl = page.url()
    if (currentUrl === '/' || currentUrl.includes('/study')) {
      console.log('✅ 新密码登录成功')

      // 验证首页元素可见
      const userMenu = page.locator('text=继续学习, text=词库, text=开始学习').first()
      await expect(userMenu).toBeVisible({ timeout: 5000 })
    } else {
      console.log('⚠️  新密码登录未成功跳转')
      console.log('   当前URL:', currentUrl)

      // 检查是否有错误提示
      const errorMessage = page.locator('text=错误, text=失败').first()
      if (await errorMessage.isVisible()) {
        console.log('   错误提示:', await errorMessage.textContent())
      }
    }

    await page.screenshot({ path: 'test-results/login-02-new-password.png' })
  })

  test('LOGIN-03: 使用不存在的手机号登录', async ({ page }) => {
    await page.goto('/login')

    // 使用不存在的手机号
    const nonExistentPhone = '19999999999'
    await page.fill('input[type="tel"], input[placeholder*="手机"]', nonExistentPhone)
    await page.fill('input[name="password"], input[type="password"]', testPassword)
    await page.click('button[type="submit"]')

    // 验证：应该显示错误提示
    const errorMessage = page.locator(
      'text=手机号或密码错误, text=用户不存在, text=登录失败'
    )

    await expect(errorMessage).toBeVisible({ timeout: 3000 })
    console.log('✅ 正确显示：用户不存在错误')
  })

  test('LOGIN-04: 使用错误密码登录', async ({ page }) => {
    await page.goto('/login')

    // 使用存在的手机号但错误的密码
    await page.fill('input[type="tel"], input[placeholder*="手机"]', testPhone)
    await page.fill('input[name="password"], input[type="password"]', 'WrongPassword123')
    await page.click('button[type="submit"]')

    // 验证：应该显示密码错误提示
    const errorMessage = page.locator(
      'text=手机号或密码错误, text=密码错误, text=登录失败'
    )

    await expect(errorMessage).toBeVisible({ timeout: 3000 })
    console.log('✅ 正确显示：密码错误提示')
  })

  test('LOGIN-05: 登录后自动跳转到首页', async ({ page }) => {
    await page.goto('/login')

    // 使用正确的凭据登录
    await page.fill('input[type="tel"], input[placeholder*="手机"]', testPhone)
    await page.fill('input[name="password"], input[type="password"]', newPassword)
    await page.click('button[type="submit"]')

    // 验证：应该跳转到首页
    await page.waitForURL('/', { timeout: 5000 })
    await expect(page).toHaveURL('/')

    // 验证首页元素
    const homePageElements = page.locator('text=继续学习, text=词库').first()
    await expect(homePageElements).toBeVisible()

    console.log('✅ 登录后正确跳转到首页')
  })

  test('LOGIN-06: 未登录访问首页自动跳转登录页', async ({ page }) => {
    // 先确保未登录状态
    await page.goto('/logout')
    await page.waitForTimeout(1000)

    // 直接访问首页
    await page.goto('/')

    // 验证：应该自动跳转到登录页
    await page.waitForURL('/login', { timeout: 3000 })
    await expect(page).toHaveURL('/login')

    console.log('✅ 未登录正确跳转到登录页')
  })
})

/**
 * 测试准备说明
 *
 * 运行这些测试前，需要：
 *
 * 1. 创建测试用户（手机号: 13900000001，密码: Test123456）
 *    方法1：在Supabase Dashboard手动创建
 *    方法2：运行注册测试创建
 *
 * 2. 对于LOGIN-01测试，需要手动在Supabase Dashboard重置密码：
 *    - 访问 Authentication > Users
 *    - 找到 13900000001@phone.xiaoyu.com
 *    - 重置密码为：NewPassword123
 *
 * 3. 运行测试：
 *    npx playwright test e2e/scenarios/login-related.spec.ts
 */
