# 测试执行指南

**版本**: v1.0
**创建日期**: 2026-01-09
**用途**: 指导测试人员执行和管理自动化测试

---

## 📋 目录

1. [快速开始](#快速开始)
2. [环境准备](#环境准备)
3. [测试数据准备](#测试数据准备)
4. [运行测试](#运行测试)
5. [测试场景说明](#测试场景说明)
6. [故障排查](#故障排查)
7. [测试报告](#测试报告)

---

## 快速开始

### 一键运行所有测试

```bash
# 1. 安装依赖
pnpm install

# 2. 执行测试数据准备
psql -h localhost -U postgres -d my_edu_platform -f tests/setup/test-data-preparation.sql

# 3. 运行所有Playwright测试
npm run test:e2e

# 4. 查看测试报告
npm run test:e2e:report
```

### 快速验证单个场景

```bash
# 只运行卡片背单词测试
npx playwright test e2e/scenarios/flashcards-flow.spec.ts

# 只运行消消乐测试
npx playwright test e2e/scenarios/match-game-flow.spec.ts

# 只运行上架/下架测试
npx playwright test e2e/scenarios/admin-shelf-unshelf.spec.ts

# 只运行完整生命周期测试
npx playwright test e2e/scenarios/full-lifecycle.spec.ts
```

---

## 环境准备

### 必需软件安装

```bash
# Node.js (v18+)
node --version  # 应该显示 v18.x.x 或更高

# PostgreSQL (v14+)
psql --version  # 应该显示 psql (PostgreSQL) 14.x 或更高

# pnpm 或 npm
pnpm --version  # 推荐 pnpm
```

### 安装Playwright浏览器

```bash
# 安装Playwright及浏览器
pnpm install
npx playwright install --with-deps

# 验证安装
npx playwright --version
```

### 环境变量配置

创建 `.env.local` 文件（或使用已存在的）：

```bash
# Supabase配置
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 测试配置
NODE_ENV=test
BASE_URL=http://localhost:3002
```

---

## 测试数据准备

### 方式1: SQL脚本准备（推荐）

```bash
# 执行完整的测试数据准备脚本
psql -h localhost -U postgres -d my_edu_platform \
  -f tests/setup/test-data-preparation.sql

# 验证测试数据
psql -h localhost -U postgres -d my_edu_platform \
  -c "SELECT email FROM users WHERE email LIKE 'test-%';"
```

### 方式2: 手动准备测试数据

```sql
-- 1. 创建测试用户
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'test-user1@example.com',
   crypt('Test123456', gen_salt('bf')),
   NOW());

INSERT INTO public.users (id, email, name, role)
VALUES
  ('00000000-0000-0000-0000-000000000001',
   'test-user1@example.com',
   '测试用户1',
   'user');

-- 2. 创建测试单词书
INSERT INTO public.books (id, title, description, category, is_official, is_published)
VALUES
  ('10000000-0000-0000-0000-000000000001',
   '测试-四级核心词汇',
   '大学英语四级考试核心词汇',
   'exam',
   true,
   true);
```

### 测试数据验证

```bash
# 使用Node脚本验证
node tests/verify-test-data.js

# 或使用psql验证
psql -h localhost -U postgres -d my_edu_platform -c "
  SELECT
    (SELECT COUNT(*) FROM users WHERE email LIKE 'test-%') as test_users,
    (SELECT COUNT(*) FROM books WHERE title LIKE '测试-%') as test_books;
"
```

---

## 运行测试

### 开发服务器配置

```bash
# 终端1: 启动开发服务器（端口3002，避免与开发环境冲突）
BASE_URL=http://localhost:3002 PORT=3002 npm run dev

# 终端2: 运行测试
npm run test:e2e
```

### 测试命令大全

```bash
# 运行所有测试
npm run test:e2e

# 运行特定场景测试
npx playwright test e2e/scenarios/

# 运行前台用户场景
npx playwright test e2e/scenarios/ --grep "前台"

# 运行后台管理场景
npx playwright test e2e/scenarios/ --grep "后台|管理"

# 运行联动测试
npx playwright test e2e/scenarios/ --grep "联动|生命周期"

# 调试模式（显示浏览器窗口）
npx playwright test --debug

# 调试单个测试文件
npx playwright test e2e/scenarios/flashcards-flow.spec.ts --debug

# 显示浏览器但自动运行
npx playwright test --headed

# 只运行失败的测试
npx playwright test --only-failed
```

### 并行执行配置

在 `playwright.config.ts` 中配置：

```typescript
export default defineConfig({
  // 并行执行worker数量
  workers: process.env.CI ? 2 : 4,

  // 完全并行执行测试文件
  fullyParallel: true,

  // 项目配置（可以同时测试多个浏览器）
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] }},
    { name: 'firefox', use: { ...devices['Desktop Firefox'] }},
    { name: 'webkit', use: { ...devices['Desktop Safari'] }},
    { name: 'Mobile Chrome', use: { ...devices['Pixel 5'] }}
  ]
});
```

---

## 测试场景说明

### 已实现测试场景

#### 前台用户场景 (7个)

| 测试文件 | 测试内容 | 优先级 | 状态 |
|---------|---------|-------|------|
| flashcards-flow.spec.ts | 卡片背单词完整流程 | P0 | ✅ 完成 |
| match-game-flow.spec.ts | 消消乐游戏完整流程 | P0 | ✅ 完成 |
| dictation-flow.spec.ts | 听写模式完整流程 | P0 | ⏳ 待实现 |
| custom-wordbook.spec.ts | 自定义词库创建 | P1 | ⏳ 待实现 |
| user-registration.spec.ts | 用户注册与首次学习 | P0 | ⏳ 待实现 |
| permission-restrictions.spec.ts | 用户权限限制 | P1 | ⏳ 待实现 |
| resume-learning.spec.ts | 断点续学功能 | P1 | ⏳ 已存在 |

#### 后台管理场景 (6个)

| 测试文件 | 测试内容 | 优先级 | 状态 |
|---------|---------|-------|------|
| admin-shelf-unshelf.spec.ts | 词库上架/下架 | P0 | ✅ 完成 |
| admin-dashboard.spec.ts | 管理员登录与仪表板 | P0 | ⏳ 待实现 |
| admin-wordbook-crud.spec.ts | 词库创建与编辑 | P1 | ⏳ 待实现 |
| admin-excel-import.spec.ts | Excel批量导入 | P1 | ⏳ 待实现 |
| admin-user-ban.spec.ts | 用户封禁/解封 | P0 | ⏳ 待实现 |
| admin-invitation-codes.spec.ts | 邀请码管理 | P1 | ⏳ 待实现 |

#### 前后台联动场景 (2个)

| 测试文件 | 测试内容 | 优先级 | 状态 |
|---------|---------|-------|------|
| full-lifecycle.spec.ts | 完整用户生命周期 | P0 | ✅ 完成 |
| data-consistency.spec.ts | 数据一致性验证 | P1 | ⏳ 待实现 |

### 测试覆盖率统计

```
总计划场景数: 15
已完成: 4 (27%)
待实现: 11 (73%)

优先级P0: 8个 (已完成3个)
优先级P1: 7个 (已完成1个)
```

---

## 故障排查

### 常见问题

#### 1. 测试超时

**问题**: `Test timeout of 30000ms exceeded`

**解决方案**:
```bash
# 增加超时时间
npx playwright test --timeout=60000

# 或在测试文件中配置
test.setTimeout(60000);
```

#### 2. 找不到元素

**问题**: `Timeout waiting for selector`

**解决方案**:
```typescript
// 增加等待时间
await page.waitForSelector('[data-testid="flashcard-container"]', {
  timeout: 10000
});

// 或使用waitforFunction
await page.waitForFunction(() => {
  return document.querySelector('[data-testid="flashcard-container"]') !== null;
});
```

#### 3. 网络请求失败

**问题**: `NetConnectTimeout`

**解决方案**:
```bash
# 确保开发服务器正在运行
npm run dev

# 检查端口是否正确
curl http://localhost:3002

# 或在测试中重试
await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });
```

#### 4. 数据库连接失败

**问题**: `Connection refused` 或 `password authentication failed`

**解决方案**:
```bash
# 检查PostgreSQL是否运行
psql -h localhost -U postgres -c "SELECT 1;"

# 检查数据库连接配置
cat .env.local | grep SUPABASE

# 重置测试数据
psql -h localhost -U postgres -d my_edu_platform \
  -f tests/setup/test-data-preparation.sql
```

#### 5. 测试数据冲突

**问题**: 测试之间互相影响

**解决方案**:
```typescript
// 使用独立的测试数据
const uniqueEmail = `test-${Date.now()}@example.com`;
const uniqueTitle = `测试词库-${Date.now()}`;

// 每个测试后清理
test.afterEach(async () => {
  await cleanupTestData();
});

// 或使用事务回滚
beforeEach(async () => {
  await transaction.begin();
});
afterEach(async () => {
  await transaction.rollback();
});
```

### 调试技巧

#### 1. 使用调试模式

```bash
# 显示浏览器窗口，逐步执行
npx playwright test --debug

# 暂停执行，打开Playwright Inspector
npx playwright test --debug
# 然后在代码中使用
await page.pause();
```

#### 2. 查看详细日志

```bash
# 显示详细输出
DEBUG=pw:* npx playwright test

# 只显示错误
npx playwright test --reporter=list
```

#### 3. 截图和录屏

```typescript
// 失败时自动截图
test('example', async ({ page }) => {
  await page.screenshot({ path: 'screenshot.png' });
});

// 配置全局截图
use: {
  screenshot: 'only-on-failure',
  video: 'retain-on-failure',
  trace: 'on-first-retry'
}
```

#### 4. 打印调试信息

```typescript
test('example', async ({ page }) => {
  console.log('Current URL:', page.url());

  const element = await page.$('selector');
  console.log('Element text:', await element.textContent());

  // 打印页面HTML
  console.log(await page.content());
});
```

---

## 测试报告

### 生成HTML报告

```bash
# 运行测试并生成HTML报告
npx playwright test --reporter=html

# 自动打开报告
npx playwright show-report
```

### 生成JSON报告

```bash
# 生成JSON格式报告
npx playwright test --reporter=json > test-results.json

# 或在配置中指定
export default defineConfig({
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results.json' }],
    ['junit', { outputFile: 'junit-results.xml' }]
  ]
});
```

### 报告内容说明

#### HTML报告包含:
- ✅ 所有测试的执行状态
- 📊 失败截图和录屏
- ⏱️ 每个测试的执行时间
- 📈 测试趋势（历史对比）
- 🔍 失败堆栈跟踪

#### JSON报告结构:
```json
{
  "stats": {
    "expected": 10,
    "unexpected": 1,
    "flaky": 0
  },
  "tests": [
    {
      "name": "FC-01: 进入卡片背单词页面",
      "status": "passed",
      "duration": 2345
    }
  ]
}
```

### CI/CD集成

#### GitHub Actions示例

```yaml
name: Playwright Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright Browsers
        run: npx playwright install --with-deps
      - name: Prepare test data
        run: psql -f tests/setup/test-data-preparation.sql
      - name: Run Playwright tests
        run: npx playwright test
      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 最佳实践

### 1. 编写可靠的选择器

```typescript
// ❌ 不好：依赖CSS类名
await page.click('.btn-primary');

// ✅ 好：使用data-testid
await page.click('[data-testid="submit-button"]');

// ✅ 好：使用文本内容（如果稳定）
await page.click('text=提交');
```

### 2. 等待策略

```typescript
// ❌ 不好：固定等待
await page.waitForTimeout(3000);

// ✅ 好：等待特定条件
await page.waitForSelector('[data-testid="loaded"]');
await page.waitForURL(/\/success/);
await page.waitForResponse(resp => resp.url().includes('api'));
```

### 3. 页面对象模式

```typescript
// pages/LibraryPage.ts
class LibraryPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/library');
  }

  async startLearning(bookTitle: string) {
    await this.page.click(`[data-testid="book-card"]:has-text("${bookTitle}")`);
    await this.page.click('text=开始学习');
  }
}

// 测试中使用
test('user starts learning', async ({ page }) => {
  const library = new LibraryPage(page);
  await library.goto();
  await library.startLearning('四级核心词汇');
});
```

### 4. 独立的测试数据

```typescript
// 每个测试使用独立数据，避免冲突
test('create book', async ({ page }) => {
  const bookTitle = `测试-${Date.now()}`;
  await createBook(page, { title: bookTitle });
  expect(await getBookTitle(page)).toBe(bookTitle);
});
```

### 5. 清理副作用

```typescript
test.afterEach(async ({ page }) => {
  // 清理测试创建的数据
  await cleanupTestData(page.context());
});

// 或使用测试隔离
test.use({ storageState: 'auth.json' });
```

---

## 附录

### A. 测试脚本速查表

```bash
# 安装
pnpm install
npx playwright install --with-deps

# 数据准备
psql -f tests/setup/test-data-preparation.sql

# 运行测试
npm run test:e2e
npx playwright test --debug
npx playwright test --headed

# 报告
npx playwright show-report
```

### B. 常用Playwright API

```typescript
// 页面导航
await page.goto('/library');
await page.goBack();
await page.goForward();

// 元素操作
await page.click('button');
await page.fill('input', 'text');
await page.selectOption('select', 'value');

// 等待
await page.waitForSelector('div');
await page.waitForTimeout(1000);
await page.waitForURL('/success');

// 断言
await expect(page).toHaveURL('/library');
await expect(element).toBeVisible();
await expect(element).toHaveText('Hello');
```

### C. 参考资源

- [Playwright官方文档](https://playwright.dev)
- [Playwright测试最佳实践](https://playwright.dev/docs/best-practices)
- [项目测试计划](./COMPREHENSIVE_TEST_PLAN.md)

---

**文档维护**: 测试团队
**最后更新**: 2026-01-09
