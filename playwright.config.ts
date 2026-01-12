import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright 配置文件
 * 用于端到端自动化测试
 *
 * 文档: https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  // 测试文件位置
  testDir: './e2e',

  // 测试超时时间（毫秒）
  timeout: 30 * 1000,

  // 每个测试的超时时间
  expect: {
    timeout: 5000
  },

  // 失败时重试次数
  retries: 1,

  // 并行执行测试
  fullyParallel: true,

  // 在 CI 环境中禁止并行
  // workers: process.env.CI ? 1 : undefined,

  // 测试报告
  reporter: [
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['list'],
    ['json', { outputFile: 'test-results.json' }]
  ],

  // 全局设置
  use: {
    // 基础 URL
    baseURL: 'http://localhost:3000',

    // 收集失败测试的跟踪信息
    trace: 'on-first-retry',

    // 截图配置
    screenshot: 'only-on-failure',

    // 视频录制
    video: 'retain-on-failure',

    // 操作超时
    actionTimeout: 10000,
    navigationTimeout: 30000,
  },

  // 测试项目配置
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },

    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },

    // 移动端测试
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    // {
    //   name: 'Mobile Safari',
    //   use: { ...devices['iPhone 12'] },
    // },
  ],

  // 启动开发服务器
  // 注意: 服务器已在端口 3006 运行，测试将直接使用
  // webServer: {
  //   command: 'npm run dev',
  //   url: 'http://localhost:3006',
  //   reuseExistingServer: !process.env.CI,
  //   timeout: 120 * 1000,
  // },
})
