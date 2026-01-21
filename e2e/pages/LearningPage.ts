/**
 * LearningPage - Page Object Model for Learning Pages
 *
 * 封装学习页面（Flashcards、Dictation、Word List）的元素选择器和交互方法
 * 专注于验证进度恢复的正确性
 */

import { Page, Locator, expect } from '@playwright/test'

export class LearningPage {
  readonly page: Page

  // ========================================
  // Flashcards 专用选择器
  // ========================================

  // Flashcards - 进度显示
  readonly flashcardsProgressPercent: Locator
  readonly flashcardsProgressBar: Locator
  readonly flashcardsCurrentWord: Locator

  // Flashcards - 操作按钮
  readonly flashcardsKnownButton: Locator
  readonly flashcardsFuzzyButton: Locator
  readonly flashcardsUnknownButton: Locator
  readonly flashcardsFlipCard: Locator

  // ========================================
  // Dictation 专用选择器
  // ========================================

  // Dictation - 进度显示
  readonly dictationProgressPercent: Locator
  readonly dictationCurrentWordInput: Locator
  readonly dictationCurrentIndex: Locator

  // Dictation - 操作按钮
  readonly dictationSubmitButton: Locator
  readonly dictationSkipButton: Locator
  readonly dictationPlayButton: Locator

  // ========================================
  // 通用选择器
  // ========================================

  readonly backButton: Locator
  readonly scopeDialog: Locator

  // ========================================
  // Constructor
  // ========================================
  constructor(page: Page) {
    this.page = page

    // Flashcards 选择器
    this.flashcardsProgressPercent = page.locator('span:has-text("%").and(.font-black)').first()
    this.flashcardsCurrentWord = page.locator('h2').filter({ hasText: /^[a-zA-Z]+$/ }).first()
    this.flashcardsKnownButton = page.locator('div:has-text("认识")').or(page.getByText('← LEFT'))
    this.flashcardsFuzzyButton = page.locator('div:has-text("模糊")').or(page.getByText('↑ UP'))
    this.flashcardsUnknownButton = page.locator('div:has-text("不认识")').or(page.getByText('RIGHT →'))
    this.flashcardsFlipCard = page.locator('div.rounded-3xl').filter({ hasText: /^[a-zA-Z]+$/ })

    // Dictation 选择器
    this.dictationProgressPercent = page.locator('span:has-text("%")').first()
    this.dictationCurrentWordInput = page.locator('input[type="text"]')
    this.dictationCurrentIndex = page.locator('text=/\\d+\\/\\d+/')
    this.dictationSubmitButton = page.locator('button:has-text("提交")')
    this.dictationSkipButton = page.locator('button:has-text("跳过")')
    this.dictationPlayButton = page.locator('button:has-text("播放")')

    // 通用选择器
    this.backButton = page.locator('a').filter({ hasText: /返回|←/ }).first()
    this.scopeDialog = page.locator('.fixed.inset-0.z-50').filter({
      hasText: /选择学习范围|继续学习/
    })
  }

  // ========================================
  // Flashcards 方法
  // ========================================

  /**
   * 等待 Flashcards 页面加载完成
   */
  async waitForFlashcardsLoaded() {
    // 等待进度条出现
    await expect(this.flashcardsProgressPercent).toBeVisible({ timeout: 10000 })

    // 等待单词卡片出现
    await expect(this.flashcardsCurrentWord).toBeVisible({ timeout: 10000 })

    // 等待网络空闲
    await this.page.waitForLoadState('networkidle', { timeout: 10000 })
  }

  /**
   * 获取 Flashcards 当前进度百分比
   */
  async getFlashcardsProgressPercent(): Promise<number> {
    const text = await this.flashcardsProgressPercent.textContent()
    const match = text?.match(/(\d+)%/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * 获取 Flashcards 当前单词文本
   */
  async getFlashcardsCurrentWord(): Promise<string> {
    return await this.flashcardsCurrentWord.textContent() || ''
  }

  /**
   * 获取 Flashcards 当前索引（从 URL hash 中提取）
   */
  async getFlashcardsCurrentIndex(): Promise<number> {
    const url = this.page.url()
    const match = url.match(/#word-(\d+)/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * 在 Flashcards 中标记当前单词为"认识"
   */
  async markFlashcardsAsKnown() {
    await this.flashcardsKnownButton.first().click()
    await this.page.waitForTimeout(500)
  }

  /**
   * 在 Flashcards 中标记当前单词为"模糊"
   */
  async markFlashcardsAsFuzzy() {
    await this.flashcardsFuzzyButton.first().click()
    await this.page.waitForTimeout(500)
  }

  /**
   * 在 Flashcards 中标记当前单词为"不认识"
   */
  async markFlashcardsAsUnknown() {
    await this.flashcardsUnknownButton.first().click()
    await this.page.waitForTimeout(500)
  }

  /**
   * 验证 Flashcards 页面不显示范围选择对话框
   */
  async verifyFlashcardsNoScopeDialog() {
    const isVisible = await this.scopeDialog.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  }

  // ========================================
  // Dictation 方法
  // ========================================

  /**
   * 等待 Dictation 页面加载完成
   */
  async waitForDictationLoaded() {
    // 等待输入框出现
    await expect(this.dictationCurrentWordInput).toBeVisible({ timeout: 10000 })

    // 等待网络空闲
    await this.page.waitForLoadState('networkidle', { timeout: 10000 })
  }

  /**
   * 获取 Dictation 当前进度百分比
   */
  async getDictationProgressPercent(): Promise<number> {
    const text = await this.dictationProgressPercent.textContent()
    const match = text?.match(/(\d+)%/)
    return match ? parseInt(match[1], 10) : 0
  }

  /**
   * 获取 Dictation 当前索引（从页面上提取）
   */
  async getDictationCurrentIndex(): Promise<number> {
    // 方法1: 尝试从页面上查找位置元素
    try {
      const text = await this.dictationCurrentIndex.textContent({ timeout: 2000 })
      const match = text?.match(/(\d+)\/\d+/)
      if (match) {
        return parseInt(match[1], 10) - 1 // 转换为 0-based
      }
    } catch (e) {
      console.log('无法从页面元素获取位置，尝试从 URL hash 提取')
    }

    // 方法2: 从 URL hash 中提取索引（备选方案）
    const url = this.getCurrentURL()
    const hashMatch = url.match(/#word-(\d+)/)
    if (hashMatch) {
      return parseInt(hashMatch[1], 10)
    }

    // 方法3: 默认返回 0
    console.log('无法获取当前位置，返回 0')
    return 0
  }

  /**
   * 在 Dictation 中输入单词并提交
   */
  async submitDictationWord(word: string) {
    await this.dictationCurrentWordInput.fill(word)
    await this.page.keyboard.press('Enter')
    await this.page.waitForTimeout(500)
  }

  /**
   * 在 Dictation 中跳过当前单词
   */
  async skipDictationWord() {
    // 尝试点击"跳过"按钮（如果存在）
    const skipButton = this.page.locator('button:has-text("跳过")')
    const hasSkip = await skipButton.count() > 0

    if (hasSkip) {
      await skipButton.click()
    } else {
      // 备选方案：使用回车键跳过（直接提交空答案或按回车）
      await this.dictationCurrentWordInput.press('Enter')
      await this.page.waitForTimeout(500)
    }
  }

  /**
   * 验证 Dictation 页面不显示范围选择对话框
   */
  async verifyDictationNoScopeDialog() {
    const isVisible = await this.scopeDialog.isVisible().catch(() => false)
    expect(isVisible).toBe(false)
  }

  // ========================================
  // 通用方法
  // ========================================

  /**
   * 验证 URL 包含指定路径
   */
  async verifyURL(path: string) {
    await this.page.waitForURL(`**${path}`, { timeout: 5000 })
    expect(this.page.url()).toContain(path)
  }

  /**
   * 获取当前 URL
   */
  getCurrentURL(): string {
    return this.page.url()
  }

  /**
   * 判断当前是哪种学习模式
   */
  async getLearningMode(): Promise<'flashcards' | 'dictation' | 'word-list' | 'unknown'> {
    const url = this.page.url()

    if (url.includes('/flashcards')) return 'flashcards'
    if (url.includes('/dictation')) return 'dictation'
    if (url.includes('/library/')) return 'word-list'

    return 'unknown'
  }

  /**
   * 判断 URL 是否包含 resume=true 参数
   */
  hasResumeParameter(): boolean {
    const url = this.page.url()
    return url.includes('resume=true')
  }

  /**
   * 判断 URL 是否包含 hash 定位
   */
  hasHashPosition(): boolean {
    const url = this.page.url()
    return /#word-\d+/.test(url)
  }

  /**
   * 返回首页
   */
  async goBackToHomepage() {
    await this.page.goto('http://localhost:3000/')
    await this.page.waitForLoadState('domcontentloaded')
  }

  /**
   * 使用浏览器后退按钮
   */
  async browserBack() {
    await this.page.goBack()
    await this.page.waitForLoadState('domcontentloaded')
  }
}
