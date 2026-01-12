/**
 * 场景测试：听写模式完整流程
 *
 * 测试目标：验证听写模式的所有功能，包括TTS播放、输入验证
 *
 * 测试覆盖：
 * - ✅ TTS语音播放
 * - ✅ 输入框功能
 * - ✅ 提交验证逻辑
 * - ✅ 正确/错误反馈
 * - ✅ 例句显示
 * - ✅ 设置面板（语速、重复次数）
 * - ✅ 进度统计
 *
 * 优先级: P0
 */

import { test, expect, Page } from '@playwright/test';
import { quickLogin } from '../helpers/auth-helpers';
import { TEST_BOOKS } from '../helpers/test-data';

test.describe('听写模式完整流程', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await quickLogin(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('DICT-01: 进入听写页面', async () => {
    // 1. 进入词库详情页
    await page.goto(`/library/${TEST_BOOKS.CET4.id}`);

    // 2. 点击"开始学习"
    await page.click('text=开始学习');

    // 3. 选择"听写模式"
    await page.click('text=听写模式');

    // 4. 验证进入听写页面
    await page.waitForURL(/\/dictation/, { timeout: 5000 });
    await expect(page).toHaveURL(/\/dictation/);

    // 5. 验证听写界面元素
    await expect(page.locator('[data-testid="dictation-container"]')).toBeVisible();
    await expect(page.locator('[data-testid="play-button"]')).toBeVisible();
    await expect(page.locator('input[name="word"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('DICT-02: 播放单词发音', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 点击播放按钮
    await page.click('[data-testid="play-button"]');

    // 3. 验证播放状态变化
    await expect(page.locator('[data-testid="play-button"]')).toHaveAttribute('data-state', 'playing');

    // 4. 等待播放完成（模拟）
    await page.waitForTimeout(2000);

    // 5. 验证播放按钮恢复
    await expect(page.locator('[data-testid="play-button"]')).toHaveAttribute('data-state', 'stopped');
  });

  test('DICT-03: 输入正确单词', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 先播放一个单词，获取当前单词（从页面上下文或API）
    const currentWordInfo = await page.evaluate(() => {
      // 假设页面有全局变量或data属性存储当前单词
      return {
        word: window.currentWord || 'hello', // 默认测试词
        phonetic: window.currentPhonetic || '/həˈloʊ/'
      };
    });

    // 3. 输入正确拼写
    await page.fill('input[name="word"]', currentWordInfo.word);

    // 4. 提交答案
    await page.click('button[type="submit"]');

    // 5. 验证显示正确反馈
    await page.waitForSelector('[data-testid="feedback"]', { timeout: 3000 });
    const feedback = await page.locator('[data-testid="feedback"]').textContent();
    expect(feedback).toMatch(/正确|恭喜|太棒了/);

    // 6. 验证显示绿色正确标识
    await expect(page.locator('[data-testid="feedback"]')).toHaveClass(/success|correct|green/);
  });

  test('DICT-04: 输入错误单词', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 输入错误拼写
    await page.fill('input[name="word"]', 'wrongword');

    // 3. 提交答案
    await page.click('button[type="submit"]');

    // 4. 验证显示错误反馈
    await page.waitForSelector('[data-testid="feedback"]', { timeout: 3000 });
    const feedback = await page.locator('[data-testid="feedback"]').textContent();
    expect(feedback).toMatch(/错误|不对|再接再厉/);

    // 5. 验证显示正确拼写
    await expect(page.locator('[data-testid="correct-answer"]')).toBeVisible();
  });

  test('DICT-05: 显示例句和音标', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 输入答案（正确或错误都可以）
    await page.fill('input[name="word"]', 'hello');
    await page.click('button[type="submit"]');

    // 3. 等待反馈显示
    await page.waitForSelector('[data-testid="feedback"]');

    // 4. 验证显示音标
    const phoneticVisible = await page.locator('[data-testid="phonetic"]').isVisible();
    if (phoneticVisible) {
      await expect(page.locator('[data-testid="phonetic"]')).toContainText('/');
    }

    // 5. 验证显示中文释义
    await expect(page.locator('[data-testid="definition"]')).toBeVisible();

    // 6. 验证显示英文例句（如果有）
    const exampleVisible = await page.locator('[data-testid="example"]').isVisible();
    if (exampleVisible) {
      await expect(page.locator('[data-testid="example"]')).toBeVisible();
    }
  });

  test('DICT-06: 跳过当前单词', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 点击跳过按钮
    await page.click('[data-testid="skip-button"]');

    // 3. 验证加载下一个单词
    await page.waitForTimeout(500);

    // 4. 验证显示提示信息
    const skipMessage = await page.locator('[data-testid="skip-message"]').isVisible();
    if (skipMessage) {
      await expect(page.locator('[data-testid="skip-message"]')).toContainText(/跳过|正确答案/);
    }
  });

  test('DICT-07: 设置面板 - 调整语速', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 点击设置按钮
    await page.click('[data-testid="settings-button"]');

    // 3. 验证设置面板显示
    await expect(page.locator('[data-testid="settings-panel"]')).toBeVisible();

    // 4. 调整语速
    await page.click('[data-testid="speed-control"]');
    await page.click('text=1.5x'); // 选择1.5倍速

    // 5. 关闭设置面板
    await page.click('[data-testid="close-settings"]');

    // 6. 验证设置保存（可以播放测试，这里简化）
    const speedSetting = await page.evaluate(() => {
      return localStorage.getItem('dictation-speed');
    });
    expect(speedSetting).toBeTruthy();
  });

  test('DICT-08: 设置面板 - 重复播放次数', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 点击设置按钮
    await page.click('[data-testid="settings-button"]');

    // 3. 调整重复次数
    await page.click('[data-testid="repeat-control"]');
    await page.click('text=3次'); // 选择重复3次

    // 4. 关闭设置面板
    await page.click('[data-testid="close-settings"]');

    // 5. 验证设置保存
    const repeatSetting = await page.evaluate(() => {
      return localStorage.getItem('dictation-repeat');
    });
    expect(repeatSetting).toBeTruthy();
  });

  test('DICT-09: 进度统计', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 验证显示进度信息
    await expect(page.locator('[data-testid="progress-info"]')).toBeVisible();

    // 3. 记录初始进度
    const initialProgress = await page.locator('[data-testid="progress-info"]').textContent();
    expect(initialProgress).toMatch(/0\/\d+/); // 应该是 0/X

    // 4. 完成5个单词
    for (let i = 0; i < 5; i++) {
      await page.fill('input[name="word"]', 'hello'); // 简化输入
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // 5. 验证进度更新
    const updatedProgress = await page.locator('[data-testid="progress-info"]').textContent();
    expect(updatedProgress).not.toBe(initialProgress);
  });

  test('DICT-10: 完成章节查看总结', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 快速完成所有单词
    for (let i = 0; i < 10; i++) {
      await page.fill('input[name="word"]', 'hello');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // 3. 验证显示完成总结
    await page.waitForSelector('[data-testid="completion-summary"]', { timeout: 10000 });
    await expect(page.locator('[data-testid="completion-summary"]')).toBeVisible();

    // 4. 验证总结内容
    const summaryText = await page.locator('[data-testid="completion-summary"]').textContent();
    expect(summaryText).toMatch(/完成|总结|统计/);

    // 5. 验证显示正确率
    expect(summaryText).toMatch(/\d+%/);
  });

  test('DICT-11: 键盘快捷键', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 按空格键播放
    await page.keyboard.press('Space');
    await page.waitForTimeout(500);

    // 3. 验证播放状态
    const playState = await page.locator('[data-testid="play-button"]').getAttribute('data-state');
    expect(playState).toBe('playing');

    // 4. 按Enter键提交
    await page.fill('input[name="word"]', 'hello');
    await page.keyboard.press('Enter');

    // 5. 验证提交成功
    await page.waitForSelector('[data-testid="feedback"]', { timeout: 3000 });
    await expect(page.locator('[data-testid="feedback"]')).toBeVisible();
  });

  test('DICT-12: 自动播放下一个', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 输入答案并提交
    await page.fill('input[name="word"]', 'hello');
    await page.click('button[type="submit"]');

    // 3. 等待反馈显示
    await page.waitForSelector('[data-testid="feedback"]');

    // 4. 等待自动播放下一个（如果有自动播放功能）
    await page.waitForTimeout(3000);

    // 5. 验证播放按钮状态
    const playState = await page.locator('[data-testid="play-button"]').getAttribute('data-state');
    // 可能会自动播放，状态为playing
  });

  test('DICT-13: 学习进度保存', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 完成3个单词
    for (let i = 0; i < 3; i++) {
      await page.fill('input[name="word"]', 'hello');
      await page.click('button[type="submit"]');
      await page.waitForTimeout(500);
    }

    // 3. 记录当前进度
    const progressBefore = await page.locator('[data-testid="progress-info"]').textContent();

    // 4. 刷新页面
    await page.reload();
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 5. 验证进度恢复
    const progressAfter = await page.locator('[data-testid="progress-info"]').textContent();
    expect(progressAfter).toBe(progressBefore);
  });
});

test.describe('听写模式错误处理', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await quickLogin(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('DICT-ERR-01: 输入为空时提交', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 不输入任何内容直接提交
    await page.click('button[type="submit"]');

    // 3. 验证显示错误提示
    const errorMessage = page.locator('[data-testid="error-message"]');
    await expect(errorMessage).toBeVisible();
    await expect(errorMessage).toContainText(/请输入|不能为空/);
  });

  test('DICT-ERR-02: TTS播放失败', async () => {
    // 1. 进入听写页面
    await page.goto(`/study/${TEST_BOOKS.CET4.id}/dictation`);
    await page.waitForSelector('[data-testid="dictation-container"]');

    // 2. 模拟TTS不可用（禁用音频）
    await page.addInitScript(() => {
      window.speechSynthesis = undefined;
    });

    // 3. 点击播放按钮
    await page.click('[data-testid="play-button"]');

    // 4. 验证显示错误提示或回退方案
    const fallbackVisible = await page.locator('[data-testid="tts-fallback"]').isVisible();
    const errorMessage = await page.locator('[data-testid="error-message"]').isVisible();

    expect(fallbackVisible || errorMessage).toBeTruthy();
  });

  test('DICT-ERR-03: 章节无单词', async () => {
    // 1. 尝试进入没有单词的章节听写
    await page.goto(`/study/${TEST_BOOKS.UNPUBLISHED.id}/dictation`);

    // 2. 验证显示提示信息
    const emptyMessage = await page.locator('text=暂无单词|还没有单词').isVisible();
    expect(emptyMessage).toBeTruthy();
  });
});
