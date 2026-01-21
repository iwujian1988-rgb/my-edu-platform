/**
 * HomePage - Page Object Model for Homepage
 *
 * 封装首页的元素选择器和交互方法
 * 专注于"最近学习"模块的测试
 */

import { Page, Locator, expect } from '@playwright/test'

export class HomePage {
  readonly page: Page

  // ========================================
  // Selector Constants
  // ========================================

  // Header 区域
  readonly logo: Locator
  readonly title: Locator
  readonly userEmail: Locator
  readonly logoutButton: Locator

  // 统计块区域
  readonly statBoxContainer: Locator
  readonly statBoxes!: Locator

  // 进度卡片区域（最近学习）
  readonly progressCardContainer!: Locator
  readonly progressCards!: Locator

  // 其他统计块
  readonly mistakesBox!: Locator
  readonly todayNewWordsBox!: Locator
  readonly createButton!: Locator

  // ========================================
  // Constructor
  // ========================================
  constructor(page: Page) {
    this.page = page

    // Header 区域选择器（针对已登录的首页）
    this.logo = page.locator('svg').filter({ hasText: 'cat' }).first()
    this.title = page.locator('header').getByRole('heading', { name: '喵喵笔记' }).first()
    this.userEmail = page.locator('p.text-xs.md\\:text-sm.font-bold.text-gray-500.font-mono')
    this.logoutButton = page.getByRole('link', { name: /退出登录/ })

    // 统计块容器（grid 布局）- 使用更通用的选择器
    this.statBoxContainer = page.locator('div.grid.grid-cols-2.lg\\:grid-cols-4')

    // 进度卡片（最近学习）- 使用更宽松的选择器
    // 卡片是 grid 容器内的前几个链接，且包含 /study/ 路径
    this.progressCards = page.locator('div.grid.grid-cols-2 a[href*="/study/"]').or(
      page.locator('a.group').filter({ has: page.locator('div.bg-white') })
    )

    // 错题本统计块
    this.mistakesBox = page.locator('a').filter({
      has: page.locator('text=/错题本待复习/')
    })

    // 今日新增单词统计块
    this.todayNewWordsBox = page.locator('a').filter({
      has: page.locator('text=/今日新增单词/')
    })

    // 新建词库按钮
    this.createButton = page.locator('a').filter({
      has: page.locator('text=/新建词库/')
    })
  }

  // ========================================
  // Page Actions
  // ========================================

  /**
   * 访问首页
   */
  async goto() {
    await this.page.goto('http://localhost:3000/')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * 等待首页加载完成
   */
  async waitForLoaded() {
    // 等待页面标题出现
    await expect(this.title).toBeVisible()

    // 等待统计块容器出现（表示 RPC 数据已加载）
    await expect(this.statBoxContainer).toBeVisible()

    // 等待网络空闲（RPC 调用完成）
    await this.page.waitForLoadState('networkidle', { timeout: 10000 })
  }

  /**
   * 获取进度卡片数量
   */
  async getProgressCardCount(): Promise<number> {
    return await this.progressCards.count()
  }

  /**
   * 获取指定索引的进度卡片数据
   * @param index 卡片索引（0-based）
   */
  async getProgressCardData(index: number) {
    const card = this.progressCards.nth(index)

    // 等待卡片可见
    await expect(card).toBeVisible()

    try {
      // 获取完整的卡片文本（用于调试）
      const fullText = await card.textContent()
      console.log(`卡片 ${index} 完整文本:`, fullText?.trim())

      // 获取 href（继续学习的 URL）
      const continueURL = await card.getAttribute('href') || ''

      // 提取书名和模式
      // 格式: "考研默写•全部单词0%2/5862•10小时前"
      let bookTitle = ''
      let progress = 0
      let position = ''
      let lastStudyTime = ''

      if (fullText) {
        // 提取书名（在 % 之前）
        const percentIndex = fullText.indexOf('%')
        if (percentIndex > 0) {
          bookTitle = fullText.substring(0, percentIndex).trim()
        } else {
          bookTitle = fullText.split('•')[0].trim()
        }

        // 提取进度百分比
        const progressMatch = fullText.match(/(\d+)%/)
        if (progressMatch) {
          progress = parseInt(progressMatch[1], 10)
        }

        // 提取位置信息 (格式: "2/5862")
        const positionMatch = fullText.match(/(\d+\/\d+)/)
        if (positionMatch) {
          position = positionMatch[1]
        }

        // 提取时间标签
        const timeMatch = fullText.match(/(刚刚|\d+分钟|\d+小时|\d+天)前/)
        if (timeMatch) {
          lastStudyTime = timeMatch[1] + '前'
        }
      }

      const result = {
        bookTitle,
        progress,
        position,
        lastStudyTime,
        continueURL
      }

      console.log(`卡片 ${index} 提取数据:`, result)
      return result
    } catch (error) {
      // 如果提取失败，返回默认值
      console.log('提取卡片数据失败，返回默认值:', error)
      return {
        bookTitle: '',
        progress: 0,
        position: '',
        lastStudyTime: '',
        continueURL: ''
      }
    }
  }

  /**
   * 点击指定索引的进度卡片
   * @param index 卡片索引（0-based）
   */
  async clickProgressCard(index: number) {
    const card = this.progressCards.nth(index)
    await expect(card).toBeVisible()

    const cardData = await this.getProgressCardData(index)
    console.log(`点击进度卡片 ${index}:`, cardData)

    await card.click()
  }

  /**
   * 验证进度卡片显示的内容
   */
  async verifyProgressCard(index: number, expectedData: {
    bookTitle?: string
    progress?: number
    hasPositionInfo?: boolean
    hasTimeInfo?: boolean
    hasContinueURL?: boolean
  }) {
    const cardData = await this.getProgressCardData(index)

    if (expectedData.bookTitle) {
      expect(cardData.bookTitle).toContain(expectedData.bookTitle)
    }

    if (expectedData.progress !== undefined) {
      expect(cardData.progress).toBeGreaterThanOrEqual(expectedData.progress)
    }

    if (expectedData.hasPositionInfo) {
      expect(cardData.position).toMatch(/\d+\/\d+/)
    }

    if (expectedData.hasTimeInfo) {
      expect(cardData.lastStudyTime).toBeTruthy()
      expect(cardData.lastStudyTime).not.toBe('')
    }

    if (expectedData.hasContinueURL) {
      expect(cardData.continueURL).toBeTruthy()
      expect(cardData.continueURL).toContain('/study/')
    }
  }

  /**
   * 获取错题本数量
   */
  async getMistakesCount(): Promise<number> {
    const text = await this.mistakesBox.locator('span.text-3xl').textContent()
    return parseInt(text || '0', 10)
  }

  /**
   * 获取今日新增单词数量
   */
  async getTodayNewWordsCount(): Promise<number> {
    const text = await this.todayNewWordsBox.locator('span.text-3xl').textContent()
    return parseInt(text || '0', 10)
  }

  /**
   * 点击退出登录
   */
  async logout() {
    await this.logoutButton.click()
  }

  /**
   * 验证页面 URL 包含指定路径
   */
  async verifyURL(path: string) {
    await this.page.waitForURL(`**${path}`)
    expect(this.page.url()).toContain(path)
  }

  /**
   * 验证 URL 包含 resume=true 参数
   */
  async verifyResumeParameter() {
    const url = this.page.url()
    expect(url).toContain('resume=true')
  }

  /**
   * 验证 URL 包含 hash 定位
   */
  async verifyHashPosition() {
    const url = this.page.url()
    expect(url).toMatch(/#word-\d+/)
  }

  /**
   * 验证不显示范围选择对话框
   * （从首页进入时不应该显示对话框）
   */
  async verifyNoScopeDialog() {
    const dialog = this.page.locator('.fixed.inset-0.z-50').filter({
      hasText: /选择学习范围|继续上次的学习进度/
    })

    // 等待一小段时间确保对话框不会突然出现
    await this.page.waitForTimeout(500)

    const isVisible = await dialog.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  }
}
