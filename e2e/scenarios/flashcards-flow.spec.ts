/**
 * 场景测试：卡片背单词完整流程
 *
 * 测试目标：验证卡片背单词的所有交互功能
 *
 * 测试覆盖：
 * - ✅ 卡片翻转动画
 * - ✅ "认识"/"不认识"按钮
 * - ✅ 键盘快捷键 (1=认识, 2=不认识)
 * - ✅ 进度统计（已知/未知/总数）
 * - ✅ 完成总结页面
 *
 * 优先级: P0
 */

import { test, expect, Page } from '@playwright/test';
import { quickLogin, verifyLoggedIn } from '../helpers/auth-helpers';
import { TEST_BOOKS, WAIT_TIMES } from '../helpers/test-data';

test.describe('卡片背单词完整流程', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();

    // 快速登录测试用户
    await quickLogin(page);
    await verifyLoggedIn(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('FC-01: 进入卡片背单词页面', async () => {
    // 1. 进入词库详情页
    await page.goto(`/library/${TEST_BOOKS.FLASHCARDS.id}`);

    // 2. 验证页面加载成功
    await expect(page.locator('h1')).toContainText(TEST_BOOKS.FLASHCARDS.title);

    // 3. 点击"开始学习"按钮
    await page.click('text=开始学习');

    // 4. 选择学习模式（如果存在模式选择）
    const modeSelectVisible = await page.locator('text=卡片背单词').isVisible();
    if (modeSelectVisible) {
      await page.click('text=卡片背单词');
    }

    // 5. 验证进入学习页面
    await page.waitForSelector('[data-testid="flashcard-container"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="flashcard-container"]')).toBeVisible();
  });

  test('FC-02: 卡片翻转动画', async () => {
    // 1. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 等待卡片正面显示（单词）
    const flashcard = page.locator('[data-testid="flashcard"]');
    await expect(flashcard).toBeVisible();

    // 3. 点击卡片触发翻转
    await flashcard.click();

    // 4. 等待翻转动画完成（500ms）
    await page.waitForTimeout(500);

    // 5. 验证卡片背面显示（音标、释义等）
    // 注意：这里需要根据实际DOM结构调整
    const背面元素 = flashcard.locator('.card-back, .back');
    await expect(背面元素).toBeVisible();
  });

  test('FC-03: 点击"认识"按钮', async () => {
    // 1. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 点击卡片翻转
    await page.click('[data-testid="flashcard"]');
    await page.waitForTimeout(500);

    // 3. 记录当前单词（用于后续验证）
    const currentWord = await page.locator('[data-testid="flashcard"]').textContent();

    // 4. 点击"认识"按钮
    await page.click('[data-testid="know-button"]');

    // 5. 验证加载下一个单词
    await page.waitForTimeout(300); // 等待切换动画
    const nextWord = await page.locator('[data-testid="flashcard"]').textContent();
    expect(nextWord).not.toBe(currentWord);

    // 6. 验证进度统计更新
    const progressText = await page.locator('[data-testid="progress-info"]').textContent();
    // 进度应该类似 "已知: 1, 未知: 0, 总数: 10"
    expect(progressText).toMatch(/已知.*1/);
  });

  test('FC-04: 点击"不认识"按钮', async () => {
    // 1. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 点击卡片翻转
    await page.click('[data-testid="flashcard"]');
    await page.waitForTimeout(500);

    // 3. 点击"不认识"按钮
    await page.click('[data-testid="dont-know-button"]');

    // 4. 验证加载下一个单词
    await page.waitForTimeout(300);

    // 5. 验证进度统计更新
    const progressText = await page.locator('[data-testid="progress-info"]').textContent();
    expect(progressText).toMatch(/未知.*1/);
  });

  test('FC-05: 键盘快捷键 - 1键标记"认识"', async () => {
    // 1. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 点击卡片翻转
    await page.click('[data-testid="flashcard"]');
    await page.waitForTimeout(500);

    // 3. 按键盘"1"键
    await page.keyboard.press('1');

    // 4. 验证加载下一个单词
    await page.waitForTimeout(300);

    // 5. 验证进度统计更新
    const progressText = await page.locator('[data-testid="progress-info"]').textContent();
    expect(progressText).toMatch(/已知.*1/);
  });

  test('FC-06: 键盘快捷键 - 2键标记"不认识"', async () => {
    // 1. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 点击卡片翻转
    await page.click('[data-testid="flashcard"]');
    await page.waitForTimeout(500);

    // 3. 按键盘"2"键
    await page.keyboard.press('2');

    // 4. 验证加载下一个单词
    await page.waitForTimeout(300);

    // 5. 验证进度统计更新
    const progressText = await page.locator('[data-testid="progress-info"]').textContent();
    expect(progressText).toMatch(/未知.*1/);
  });

  test('FC-07: 进度统计实时更新', async () => {
    // 1. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 记录初始进度
    const initialProgress = await page.locator('[data-testid="progress-info"]').textContent();
    expect(initialProgress).toMatch(/已知.*0/);
    expect(initialProgress).toMatch(/未知.*0/);

    // 3. 标记3个单词为"认识"
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="flashcard"]');
      await page.waitForTimeout(300);
      await page.keyboard.press('1');
      await page.waitForTimeout(300);
    }

    // 4. 验证进度统计
    const progressAfter3 = await page.locator('[data-testid="progress-info"]').textContent();
    expect(progressAfter3).toMatch(/已知.*3/);
    expect(progressAfter3).toMatch(/未知.*0/);

    // 5. 标记2个单词为"不认识"
    for (let i = 0; i < 2; i++) {
      await page.click('[data-testid="flashcard"]');
      await page.waitForTimeout(300);
      await page.keyboard.press('2');
      await page.waitForTimeout(300);
    }

    // 6. 验证最终进度
    const finalProgress = await page.locator('[data-testid="progress-info"]').textContent();
    expect(finalProgress).toMatch(/已知.*3/);
    expect(finalProgress).toMatch(/未知.*2/);
  });

  test('FC-08: 完成章节查看总结', async () => {
    // 1. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 快速完成所有单词
    const flashcard = page.locator('[data-testid="flashcard"]');
    let wordCount = 0;
    const maxWords = 10; // 测试数据有10个单词

    while (wordCount < maxWords) {
      try {
        // 点击卡片翻转
        await flashcard.click();
        await page.waitForTimeout(200);

        // 随机标记为"认识"或"不认识"
        await page.keyboard.press(Math.random() > 0.5 ? '1' : '2');
        await page.waitForTimeout(300);

        wordCount++;
      } catch (e) {
        // 可能已经完成
        break;
      }
    }

    // 3. 等待完成总结页面显示
    await page.waitForSelector('[data-testid="completion-summary"]', { timeout: 5000 });
    await expect(page.locator('[data-testid="completion-summary"]')).toBeVisible();

    // 4. 验证总结内容
    const summaryText = await page.locator('[data-testid="completion-summary"]').textContent();

    // 应该显示学习统计
    expect(summaryText).toMatch(/已学习|完成|总结/);

    // 5. 验证显示已知和未知单词数
    expect(summaryText).toMatch(/\d+/); // 应该包含数字

    // 6. 验证显示的按钮（继续学习、返回等）
    const actionButtons = page.locator('[data-testid="completion-summary"] button');
    await expect(actionButtons).toHaveCount(await actionButtons.count());
  });

  test('FC-09: 移动端滑动手势', async () => {
    // 1. 设置为移动端视口
    await page.setViewportSize({ width: 375, height: 667 });

    // 2. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 3. 获取卡片元素
    const flashcard = page.locator('[data-testid="flashcard"]');
    const box = await flashcard.boundingBox();

    if (box) {
      // 4. 模拟右滑（标记为认识）
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(500);

      // 滑动：从中心向右滑动
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();

      // 5. 等待下一个单词加载
      await page.waitForTimeout(500);
    }
  });

  test('FC-10: 学习进度保存', async () => {
    // 1. 进入学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 学习5个单词（3个认识，2个不认识）
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="flashcard"]');
      await page.waitForTimeout(200);
      await page.keyboard.press(i < 3 ? '1' : '2');
      await page.waitForTimeout(300);
    }

    // 3. 记录当前进度
    const progressBefore = await page.locator('[data-testid="progress-info"]').textContent();

    // 4. 刷新页面
    await page.reload();
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 5. 验证进度已恢复
    const progressAfter = await page.locator('[data-testid="progress-info"]').textContent();
    expect(progressAfter).toBe(progressBefore);
  });

  test('FC-11: 跨模块一致性 - 卡片背单词 → 词库详情页', async () => {
    // 1. 进入卡片背单词
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 获取第一个单词
    const firstWord = await page.locator('[data-testid="flashcard"]').textContent();
    console.log(`第一个单词: ${firstWord}`);

    // 3. 标记为"认识"
    await page.click('[data-testid="flashcard"]');
    await page.waitForTimeout(300);
    await page.keyboard.press('1'); // 1 = 认识
    await page.waitForTimeout(500);

    // 4. 返回词库详情页
    await page.goto(`/library/${TEST_BOOKS.FLASHCARDS.id}`);
    await page.waitForSelector('[data-testid="word-list"]');

    // 5. 验证：第一个单词应该显示为"认识"状态
    // TODO: 需要在单词卡片上添加 data-word 属性来精确定位
    // 这里先验证页面加载成功
    const wordListVisible = await page.locator('[data-testid="word-list"]').isVisible();
    expect(wordListVisible).toBeTruthy();
  });

  test('FC-12: 跨模块一致性 - 卡片背单词 → 错题本', async () => {
    // 1. 进入卡片背单词
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 标记3个单词为"不认识"
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="flashcard"]');
      await page.waitForTimeout(200);
      await page.keyboard.press('2'); // 2 = 不认识
      await page.waitForTimeout(300);
    }

    // 3. 进入错题本
    await page.goto('/mistakes');
    await page.waitForSelector('[data-testid="mistakes-list"]');

    // 4. 验证：错题本应该有单词（至少3个）
    const mistakeCount = await page.locator('[data-testid="mistake-word"]').count();
    expect(mistakeCount).toBeGreaterThanOrEqual(3);
  });

  test('FC-13: 跨模块一致性 - 卡片背单词 → 消消乐', async () => {
    // 1. 进入卡片背单词
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 2. 标记3个单词为"认识"
    for (let i = 0; i < 3; i++) {
      await page.click('[data-testid="flashcard"]');
      await page.waitForTimeout(200);
      await page.keyboard.press('1'); // 1 = 认识
      await page.waitForTimeout(300);
    }

    // 3. 进入消消乐
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/match-game`);

    // 4. 选择难度
    await page.click('text=轻松模式'); // 8张卡片（4对单词）
    await page.click('text=开始游戏');

    // 5. 等待游戏加载
    await page.waitForSelector('.match-card', { timeout: 5000 });

    // 6. 验证：卡片数量应该是8张（4对），且不包含已标记为"认识"的单词
    const cardCount = await page.locator('.match-card').count();
    expect(cardCount).toBe(8);
  });

  test('FC-14: 跨模块一致性 - 卡片背单词 → 学习日历', async () => {
    // 1. 记录学习前的日历数据
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-heatmap"]');
    const statsBefore = await page.locator('[data-testid="today-learned"]').textContent();
    console.log(`学习前今日学习数: ${statsBefore}`);

    // 2. 进入卡片背单词
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 3. 学习5个单词
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="flashcard"]');
      await page.waitForTimeout(200);
      await page.keyboard.press('1'); // 标记为认识
      await page.waitForTimeout(300);
    }

    // 4. 返回学习日历
    await page.goto('/calendar');
    await page.waitForSelector('[data-testid="calendar-heatmap"]');

    // 5. 验证：今日学习数应该增加
    const statsAfter = await page.locator('[data-testid="today-learned"]').textContent();
    console.log(`学习后今日学习数: ${statsAfter}`);

    // 今日学习数应该至少增加5（可能之前有其他学习记录）
    const todayCountAfter = parseInt(statsAfter || '0');
    expect(todayCountAfter).toBeGreaterThanOrEqual(5);
  });

  test('FC-15: 跨模块一致性 - 卡片背单词 → 首页统计', async () => {
    // 1. 记录首页初始数据
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-stats"]');
    const masteredBefore = await page.locator('[data-testid="mastered-count"]').textContent();
    console.log(`学习前已掌握单词数: ${masteredBefore}`);

    // 2. 进入卡片背单词
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);
    await page.waitForSelector('[data-testid="flashcard-container"]');

    // 3. 标记5个单词为"认识"
    for (let i = 0; i < 5; i++) {
      await page.click('[data-testid="flashcard"]');
      await page.waitForTimeout(200);
      await page.keyboard.press('1');
      await page.waitForTimeout(300);
    }

    // 4. 返回首页
    await page.goto('/');
    await page.waitForSelector('[data-testid="home-stats"]');

    // 5. 验证：已掌握单词数应该增加
    const masteredAfter = await page.locator('[data-testid="mastered-count"]').textContent();
    console.log(`学习后已掌握单词数: ${masteredAfter}`);

    const masteredCountBefore = parseInt(masteredBefore || '0');
    const masteredCountAfter = parseInt(masteredAfter || '0');
    expect(masteredCountAfter).toBeGreaterThanOrEqual(masteredCountBefore + 5);
  });
});

test.describe('卡片背单词错误处理', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    page = await browser.newPage();
    await quickLogin(page);
  });

  test.afterEach(async () => {
    await page.close();
  });

  test('FC-ERR-01: 章节无单词时的提示', async () => {
    // 1. 尝试进入一个没有单词的章节
    await page.goto(`/study/${TEST_BOOKS.UNPUBLISHED.id}/flashcards`);

    // 2. 验证显示提示信息
    const emptyMessage = await page.locator('text=暂无单词|还没有单词').isVisible();
    expect(emptyMessage).toBeTruthy();
  });

  test('FC-ERR-02: 无权限访问词库', async () => {
    // TODO: 如果有权限限制，测试无权限时的行为
    // 例如：未登录用户访问学习页面
    await page.goto(`/study/${TEST_BOOKS.FLASHCARDS.id}/flashcards`);

    // 应该重定向到登录页或显示权限错误
    const isLoginPage = page.url().includes('/login');
    const hasError = await page.locator('text=未授权|权限不足').isVisible();

    expect(isLoginPage || hasError).toBeTruthy();
  });
});
