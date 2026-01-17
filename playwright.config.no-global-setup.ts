import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置文件（不使用global setup）
 * 用于场景化测试
 */
export default defineConfig({
  testDir: './e2e',

  // 不使用global setup
  // globalSetup: undefined,

  timeout: 60 * 1000,
  expect: {
    timeout: 10000
  },

  retries: 0,  // 不重试，快速看到结果

  fullyParallel: false,  // 顺序执行，避免干扰

  reporter: [
    ['list'],
    ['html', { open: 'never' }]
  ],

  use: {
    baseURL: 'http://localhost:3000',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
    actionTimeout: 15000,
    navigationTimeout: 30000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
