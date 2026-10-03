import { createServer } from 'vite'
import { chromium } from 'playwright'
import { expect } from '@playwright/test'
import assert from 'node:assert/strict'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const root = path.dirname(fileURLToPath(import.meta.url))
const project = path.resolve(root, '../../..')
const server = await createServer({ root, configFile: false,
  resolve: { alias: [
    { find: 'next/link', replacement: path.join(root, 'stubs.tsx') },
    { find: '@/lib/readingProgress', replacement: path.join(root, 'stubs.tsx') },
    { find: '@', replacement: path.join(project, 'src') },
  ] },
  server: { host: '127.0.0.1', port: 43183, strictPort: true, fs: { allow: [project] } }, esbuild: { jsx: 'automatic' },
})
let browser
try {
  await server.listen()
  const address = server.httpServer.address()
  browser = await chromium.launch({ headless: true })
  const results = []
  for (const width of [320, 390, 1280]) {
    for (const dark of [false, true]) {
      const page = await browser.newPage({ viewport: { width, height: 844 }, reducedMotion: 'reduce' })
      const errors = []
      page.on('pageerror', e => errors.push(e.message))
      await page.route('**/api/**', route => route.fulfill({ json: { data: [] } }))
      await page.goto(`http://127.0.0.1:${address.port}`)
      if (dark) await page.evaluate(() => document.documentElement.classList.add('dark'))
      const toggle = page.getByRole('button', { name: '输入练习', exact: true })
      await toggle.click()
      const inputs = page.getByRole('textbox')
      assert.equal(await inputs.count(), 6)
      await page.getByText('中文提示', { exact: true }).click()
      assert.equal(await page.locator('article').getByText('出口', { exact: true }).count(), 1)
      const field = inputs.first()
      await field.fill('sortie')
      await field.press('Enter')
      assert.equal(await inputs.nth(1).evaluate(el => el === document.activeElement), true)
      if (width < 1024) assert.equal(await page.locator('nav').isVisible(), false)
      await inputs.nth(1).fill('bonjur')
      await inputs.nth(1).press('Enter')
      assert.equal(await inputs.nth(1).getAttribute('aria-invalid'), 'true')
      const alignment = await inputs.nth(1).evaluate(el => {
        const next = el.closest('p').querySelectorAll('input')[1]
        return { first: el.getBoundingClientRect().top, next: next.getBoundingClientRect().top }
      })
      assert.ok(Math.abs(alignment.first - alignment.next) <= 1, `Misaligned fields at ${width}px: ${JSON.stringify(alignment)}`)
      const fieldWidth = await inputs.nth(1).evaluate(el => el.getBoundingClientRect().width)
      for (const mode of ['无提示', '首字母提示', '中文提示']) {
        await page.getByText(mode, { exact: true }).click()
        const row = await inputs.nth(1).evaluate(el => {
          const next = el.closest('p').querySelectorAll('input')[1]
          return { delta: Math.abs(el.getBoundingClientRect().top - next.getBoundingClientRect().top), width: el.getBoundingClientRect().width }
        })
        assert.ok(row.delta <= 1, `Hint ${mode} shifts the input row: ${JSON.stringify(row)}`)
        assert.equal(row.width, fieldWidth, 'Feedback must not widen the field')
      }
      await page.getByRole('button', { name: '字号与显示' }).click()
      await page.getByRole('dialog').getByText('首字母提示', { exact: true }).click()
      await page.getByRole('button', { name: '关闭阅读设置' }).click()
      await expect(page.getByRole('radio', { name: '首字母提示' })).toBeChecked()
      assert.equal(await page.locator('article').getByText('B…', { exact: true }).count(), 1)
      const styles = await field.evaluate(el => {
        const style = getComputedStyle(el)
        return { fontSize: parseFloat(style.fontSize), height: el.getBoundingClientRect().height, background: style.backgroundColor, color: style.color }
      })
      assert.ok(styles.fontSize >= 16)
      assert.ok(styles.height >= 44)
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
      await page.evaluate(() => window.scrollTo(0, 0))
      await page.screenshot({ path: path.join(root, `reader-${width}-${dark ? 'dark' : 'light'}.png`), animations: 'disabled' })
      await page.locator('article p').nth(6).scrollIntoViewIfNeeded()
      const anchor = await page.locator('article p').evaluateAll(ps => {
        const index = ps.findIndex(p => p.getBoundingClientRect().bottom > 72)
        return { index, top: ps[index].getBoundingClientRect().top, y: scrollY, height: document.documentElement.scrollHeight }
      })
      await toggle.click()
      await expect(page.locator('article')).toHaveAttribute('data-mode', 'all')
      await expect.poll(async () => Math.abs(await page.locator('article p').nth(anchor.index).evaluate(el => el.getBoundingClientRect().top) - anchor.top)).toBeLessThanOrEqual(2)
      await toggle.click()
      assert.equal(await page.getByRole('textbox').first().inputValue(), 'sortie')
      for (const size of [15, 22]) {
        await page.getByRole('button', { name: '字号与显示' }).click()
        await page.getByRole('dialog').getByRole('button', { name: String(size), exact: true }).click()
        await expect(page.getByRole('dialog')).not.toBeVisible()
        const fieldMetrics = await inputs.first().evaluate(el => {
          const style = getComputedStyle(el)
          const canvas = document.createElement('canvas')
          const context = canvas.getContext('2d')
          context.font = style.font
          return {
            available: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
            placeholder: context.measureText(el.placeholder).width,
          }
        })
        assert.ok(fieldMetrics.available >= fieldMetrics.placeholder, `Placeholder clipped at ${size}px: ${JSON.stringify(fieldMetrics)}`)
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false)
        await inputs.nth(1).fill('bonjour')
        const beforeError = await inputs.nth(1).evaluate(el => ({ width: el.getBoundingClientRect().width, top: el.getBoundingClientRect().top + scrollY }))
        await inputs.nth(1).fill('bonjur')
        await inputs.nth(1).press('Enter')
        const afterError = await inputs.nth(1).evaluate(el => ({ width: el.getBoundingClientRect().width, top: el.getBoundingClientRect().top + scrollY }))
        assert.deepEqual(afterError, beforeError, `Error shifts field at font size ${size}`)
      }
      assert.deepEqual(errors, [])
      results.push({ width, dark, ...styles, result: 'pass' })
      await page.close()
    }
  }
  console.log(JSON.stringify(results, null, 2))
} finally {
  await browser?.close()
  await server.close()
}
