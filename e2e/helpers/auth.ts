/**
 * 测试辅助工具 - Mock认证
 *
 * 用于在E2E测试中绕过登录流程
 */

import { Page } from '@playwright/test'

/**
 * 模拟登录状态 - 通过设置session cookie
 * 这样就不需要每次都走登录流程
 */
export async function mockLogin(page: Page) {
  // 1. 访问页面
  await page.goto('/')

  // 2. 直接设置一个session cookie（这会绕过Supabase Auth检查）
  // 注意：这只对测试有效，实际生产环境中仍然需要真实的Supabase Auth
  await page.context().addCookies([
    {
      name: 'sb-localhost-auth-token',
      value: JSON.stringify({
        access_token: 'mock-access-token',
        refresh_token: 'mock-refresh-token',
        user: {
          id: 'test-user-id',
          email: '13800138000@phone.xiaoyu.com',
          phone: '13800138000'
        }
      }),
      domain: 'localhost',
      path: '/',
      httpOnly: false,
      secure: false
    }
  ])

  // 3. 刷新页面以应用cookie
  await page.reload()
  await page.waitForLoadState('domcontentloaded')
}

/**
 * 导航到单词书详情页（假设已登录）
 */
export async function navigateToBookDetail(page: Page, bookId: string = 'demo-book-1') {
  await page.goto(`/library/${bookId}`)
  await page.waitForLoadState('domcontentloaded')
  await page.waitForTimeout(1000)
}

/**
 * 检查是否需要登录（用于调试）
 */
export async function checkAuthStatus(page: Page) {
  const currentUrl = page.url()

  if (currentUrl.includes('/login')) {
    console.log('⚠️ 页面重定向到登录页，认证失败')
    return false
  }

  console.log('✅ 认证成功，当前页面:', currentUrl)
  return true
}
