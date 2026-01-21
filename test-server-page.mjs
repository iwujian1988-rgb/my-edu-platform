/**
 * Test script to check server-side page execution
 */

import { chromium } from 'playwright'

async function testServerPage() {
  console.log('🔍 Testing server-side page execution...\n')

  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Monitor console logs
    page.on('console', msg => {
      const text = msg.text()
      if (text.includes('Server') || text.includes('initial')) {
        console.log('📡 Browser:', text)
      }
    })

    // Login first
    console.log('1️⃣ Logging in...')
    await page.goto('http://localhost:3000/login')
    await page.waitForTimeout(1000)

    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    await page.waitForTimeout(5000)

    const loginUrl = page.url()
    console.log('   After login:', loginUrl)

    if (loginUrl.includes('/login')) {
      console.log('❌ Login failed')
      return
    }

    console.log('✅ Login success\n')

    // Now go to library page
    console.log('2️⃣ Accessing library page...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
    await page.waitForTimeout(5000)

    const currentUrl = page.url()
    console.log('   Current URL:', currentUrl)

    if (currentUrl.includes('/login')) {
      console.log('❌ Redirected to login - auth failed')
      return
    }

    // Check for word cards
    const wordCardCount = await page.locator('[data-testid="word-card"]').count()
    console.log(`\n3️⃣ Word cards found: ${wordCardCount}`)

    if (wordCardCount > 0) {
      console.log('✅ SUCCESS: Word cards are being rendered!')
    } else {
      console.log('❌ FAIL: No word cards found')
    }

    // Check localStorage
    const storage = await page.evaluate(() => {
      return {
        hasInitialData: typeof window !== 'undefined' && 'initialData' in window,
        wordCount: document.querySelectorAll('[data-testid="word-card"]').length
      }
    })

    console.log('\n4️⃣ Client state:')
    console.log('   Word count in DOM:', storage.wordCount)

    console.log('\n✅ Test complete')

  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    await browser.close()
  }
}

testServerPage()
