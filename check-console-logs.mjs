/**
 * Capture browser console logs
 */

import { chromium } from 'playwright'

async function checkConsoleLogs() {
  console.log('🔍 Capturing browser console logs...\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  const logs = []

  // Capture all console messages
  page.on('console', msg => {
    const text = msg.text()
    logs.push(text)
    if (text.includes('useWordData') || text.includes('Skip') || text.includes('Filter')) {
      console.log('📡', text)
    }
  })

  try {
    // Login
    console.log('1️⃣ Logging in...')
    await page.goto('http://localhost:3000/login')
    await page.waitForTimeout(1000)

    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForURL(/^(?!.*\/login).*/, { timeout: 10000 })
    await page.waitForTimeout(2000)

    console.log('✅ Logged in\n')

    // Access library page
    console.log('2️⃣ Accessing library page...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
    await page.waitForTimeout(3000)

    // Check word cards
    const wordCardCount = await page.locator('[data-testid="word-card"]').count()
    console.log(`\n3️⃣ Word cards in DOM: ${wordCardCount}`)

    console.log('\n4️⃣ All relevant console logs:')
    logs.forEach(log => {
      if (log.includes('useWordData') || log.includes('Server') || log.includes('Skip') || log.includes('Filter') || log.includes('Fetch')) {
        console.log('   ', log)
      }
    })

    console.log('\n✅ Check complete')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    await browser.close()
  }
}

checkConsoleLogs()
