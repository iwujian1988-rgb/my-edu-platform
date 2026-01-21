/**
 * Check if server-side HTML contains initial words
 */

import { chromium } from 'playwright'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

function loadEnvFile() {
  try {
    const envPath = join(__dirname, '.env.local')
    const envContent = readFileSync(envPath, 'utf-8')
    const envVars = {}
    envContent.split('\n').forEach(line => {
      const [key, ...valueParts] = line.split('=')
      const value = valueParts.join('=').trim()
      const cleanValue = value.replace(/^[\\\"']|[\\\"']$/g, '')
      if (key && cleanValue) {
        envVars[key.trim()] = cleanValue
      }
    })
    return envVars
  } catch (error) {
    return {}
  }
}

async function checkServerHTML() {
  console.log('🔍 Checking server-side HTML generation...\n')

  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const page = await context.newPage()

  try {
    // Get auth cookie from environment
    const env = loadEnvFile()

    // Login to get session cookie
    console.log('1️⃣ Logging in...')
    await page.goto('http://localhost:3000/login')
    await page.waitForTimeout(1000)

    await page.fill('input[type="tel"]', '13800138000')
    await page.fill('input[type="password"]', 'password123')
    await page.click('button[type="submit"]')

    // Wait for navigation after login
    await page.waitForURL(/^(?!.*\/login).*/, { timeout: 10000 })
    await page.waitForTimeout(2000)

    console.log('✅ Logged in\n')

    // Access library page
    console.log('2️⃣ Accessing library page...')
    await page.goto('http://localhost:3000/library/003b4ce0-c3f9-407a-a7d6-5e80ada4eae5')
    await page.waitForTimeout(3000)

    // Get page HTML
    const html = await page.content()

    // Check for server-side data
    console.log('3️⃣ Analyzing HTML...')

    // Check for word cards
    const wordCardMatches = html.match(/data-testid="word-card"/g)
    const wordCardCount = wordCardMatches ? wordCardMatches.length : 0
    console.log(`   Word cards in HTML: ${wordCardCount}`)

    // Check for initial data script
    const hasInitialDataScript = html.includes('initialWords') || html.includes('__NEXT_DATA__')
    console.log(`   Has initial data: ${hasInitialDataScript}`)

    // Look for console logs in the HTML
    const hasServerLog = html.includes('[Server Page]')
    console.log(`   Has server log in HTML: ${hasServerLog}`)

    // Check if there are any words in the HTML
    const wordMatches = html.match(/<strong>[a-z]+<\/strong>/gi)
    const wordCount = wordMatches ? wordMatches.length : 0
    console.log(`   Potential word elements: ${wordCount}`)

    if (wordCardCount > 0) {
      console.log('\n✅ SUCCESS: Server is rendering word cards!')
    } else {
      console.log('\n❌ FAIL: No word cards in HTML')
      console.log('\n   This means the server-side function is either:')
      console.log('   1. Not being called')
      console.log('   2. Returning an error')
      console.log('   3. Returning empty array')

      // Save HTML for inspection
      const fs = await import('fs')
      fs.writeFileSync('debug-page.html', html)
      console.log('\n   💾 HTML saved to debug-page.html for inspection')
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message)
  } finally {
    await browser.close()
  }
}

checkServerHTML()
