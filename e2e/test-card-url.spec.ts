import { test } from '@playwright/test'

test('DEBUG: 检查卡片URL', async ({ page }) => {
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // 检查所有可能的卡片
  console.log('=== 检查 data-testid="progress-card" ===')
  const progressCards = page.locator('a[data-testid="progress-card"]')
  const progressCount = await progressCards.count()
  console.log(`找到 ${progressCount} 个进度卡片`)

  if (progressCount > 0) {
    for (let i = 0; i < Math.min(progressCount, 3); i++) {
      const card = progressCards.nth(i)
      const href = await card.getAttribute('href')
      const text = await card.textContent()
      console.log(`进度卡片 ${i + 1}:`)
      console.log(`  href: ${href}`)
      console.log(`  text: ${text?.substring(0, 100)}`)
    }
  }

  console.log('\n=== 检查旧的class选择器 ===')
  const oldCards = page.locator('a.bg-white.border-\\[3px\\].border-black.rounded-xl')
  const oldCount = await oldCards.count()
  console.log(`找到 ${oldCount} 个旧卡片`)

  for (let i = 0; i < Math.min(oldCount, 3); i++) {
    const card = oldCards.nth(i)
    const href = await card.getAttribute('href')
    const text = await card.textContent()
    console.log(`旧卡片 ${i + 1}:`)
    console.log(`  href: ${href}`)
    console.log(`  text: ${text?.substring(0, 100)}`)
  }

  console.log('\n=== 检查页面HTML ===')
  const pageContent = await page.content()
  const hasProgressCard = pageContent.includes('data-testid="progress-card"')
  console.log(`页面是否包含 progress-card: ${hasProgressCard}`)

  if (!hasProgressCard) {
    console.log('页面不包含 progress-card，可能原因：')
    console.log('  1. progressCards 为空')
    console.log('  2. DashboardContent 未收到 progressCards')
    console.log('  3. 组件未正确渲染')
  }
})
