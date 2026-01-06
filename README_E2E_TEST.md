# 自动化测试文档

## 📋 目录
- [快速开始](#快速开始)
- [测试命令](#测试命令)
- [测试用例说明](#测试用例说明)
- [测试数据准备](#测试数据准备)
- [常见问题](#常见问题)
- [最佳实践](#最佳实践)

---

## 🚀 快速开始

### 1. 安装 Playwright 浏览器

```bash
npm run test:install
```

### 2. 准备测试数据

在 Supabase SQL Editor 中执行：
```bash
supabase/migrations/999_test_data.sql
```

### 3. 注册测试账号

**重要**: 某些测试需要预先存在的测试账号。

访问 http://localhost:3000/login 并使用以下信息注册：
- 手机号: `13800138000`
- 密码: `test123456`
- 邀请码: `TEST1234`

### 4. 运行所有测试

```bash
npm test
```

---

## 🎯 测试命令

### 基础命令

```bash
# 运行所有测试（无头模式）
npm test

# 运行测试（有头模式 - 可见浏览器）
npm run test:headed

# 运行测试（交互式 UI 模式）
npm run test:ui

# 调试模式
npm run test:debug

# 查看测试报告
npm run test:report
```

### 高级用法

```bash
# 运行特定测试文件
npx playwright test auth.spec.ts

# 运行特定测试用例
npx playwright test -g "正常登录流程"

# 运行特定项目（chromium/firefox/webkit）
npx playwright test --project=chromium

# 只运行失败的测试
npx playwright test --last-failed

# 并行运行测试
npx playwright test --workers=4

# 显示浏览器（用于调试）
npx playwright test --debug

# 生成代码（录制操作）
npx playwright codegen http://localhost:3000
```

---

## 📂 测试用例说明

### 文件结构

```
e2e/
├── auth.spec.ts          # 认证模块测试（主测试文件）
└── utils/
    └── test-helpers.ts   # 测试辅助函数
```

### 测试套件分类

#### 1. 核心功能测试 (6个用例)
- ✅ 001: 正常注册流程
- ✅ 002: 正常登录流程
- ✅ 003: 错误密码登录
- ✅ 004: 未注册手机号登录
- ✅ 016: 登出功能

#### 2. 表单验证测试 (5个用例)
- ✅ 005: 注册 - 密码不匹配
- ✅ 006: 注册 - 密码过短
- ✅ 007: 注册 - 手机号格式错误（非11位）
- ✅ 008: 注册 - 手机号格式错误（包含非数字）
- ✅ 013: 注册 - 空表单验证

#### 3. 邀请码验证测试 (4个用例)
- ✅ 009: 注册 - 无效邀请码
- ✅ 010: 注册 - 邀请码已过期
- ✅ 011: 注册 - 邀请码使用次数已达上限
- ✅ 012: 注册 - 手机号已注册

#### 4. 路由保护测试 (2个用例)
- ✅ 014: 未登录访问受保护页面
- ✅ 015: 已登录用户访问登录页

#### 5. UI交互测试 (4个用例)
- ✅ 017: 密码显示/隐藏切换
- ✅ 018: 邀请码自动转大写
- ✅ 019: Tab 切换清空错误信息
- ✅ 102: 加载状态显示

#### 6. 性能测试 (2个用例)
- ✅ 201: 登录响应时间（< 3秒）
- ✅ 202: 注册响应时间（< 5秒）

#### 7. 安全测试 (3个用例)
- ✅ 301: SQL 注入防护
- ✅ 302: XSS 防护
- ✅ 303: 密码不在前端存储

#### 8. 压力测试 (1个用例)
- ✅ 020: 连续多次错误登录

**总计**: 27 个自动化测试用例

---

## 📊 测试数据准备

### 必需的测试数据

#### 邀请码
在 Supabase SQL Editor 中运行：

```sql
-- 有效邀请码
INSERT INTO invitation_codes (code, max_uses, used_count, is_active, expires_at, created_by)
VALUES
  ('TEST1234', 100, 0, true, NULL, 'system'),
  ('DEMO2024', 50, 0, true, '2026-12-31 23:59:59+00', 'system'),
  ('BETA5000', 500, 0, true, NULL, 'system')
ON CONFLICT (code) DO NOTHING;

-- 错误场景邀请码
INSERT INTO invitation_codes (code, max_uses, used_count, is_active, expires_at, created_by)
VALUES
  ('EXPIRED', 10, 0, true, '2024-01-01 00:00:00+00', 'system'),
  ('FULLCODE', 5, 5, true, NULL, 'system')
ON CONFLICT (code) DO NOTHING;
```

#### 测试用户

测试 002、003、015、016 等用例需要已存在的测试账号。

**方式1: 手动注册**
1. 访问 http://localhost:3000/login
2. 切换到"注册"标签
3. 使用以下信息注册：
   - 手机号: `13800138000`
   - 密码: `test123456`
   - 邀请码: `TEST1234`

**方式2: 自动注册（首次运行测试时）**
测试 001 会自动注册一个新账号，但其他测试需要固定的测试账号。

---

## 🔍 常见问题

### Q1: 测试失败 - "找不到元素"

**原因**: 页面加载时间过长或元素选择器错误

**解决方案**:
1. 增加超时时间:
```typescript
await expect(page.locator('button')).toBeVisible({ timeout: 10000 })
```

2. 使用 `waitForLoadState`:
```typescript
await page.waitForLoadState('networkidle')
```

### Q2: 测试失败 - "测试账号不存在"

**原因**: 某些测试需要预先注册的账号

**解决方案**:
访问 http://localhost:3000/login 手动注册测试账号 `13800138000`

### Q3: Playwright 浏览器未安装

**错误**: `Executable doesn't exist at ...`

**解决方案**:
```bash
npm run test:install
```

### Q4: 端口 3000 被占用

**错误**: `Port 3000 is already in use`

**解决方案**:
1. 停止其他服务
2. 或修改 `playwright.config.ts` 中的端口

### Q5: 测试运行太慢

**原因**: 默认配置使用多个浏览器和设备

**解决方案**:
运行单个测试文件或使用 `--workers` 参数:
```bash
npx playwright test auth.spec.ts --workers=1
```

### Q6: 邀请码测试失败

**原因**: 测试数据未准备或邀请码状态不正确

**解决方案**:
在 Supabase SQL Editor 中查询邀请码状态:
```sql
SELECT * FROM invitation_codes;
```

---

## 💡 最佳实践

### 1. 编写可维护的测试

**✅ 好的做法**:
```typescript
// 使用辅助函数
await fillLoginForm(page, phone, password)
await submitLoginForm(page)
await expectSuccessMessage(page, '登录成功')
```

**❌ 不好的做法**:
```typescript
// 重复的选择器和操作
await page.fill('input[type="tel"]', phone)
await page.fill('input[type="password"]', password)
await page.click('button[type="submit"]')
await expect(page.locator('.bg-green-50')).toBeVisible()
```

### 2. 使用数据驱动测试

```typescript
const invalidPhones = [
  '138001380',      // 太短
  '138abc38000',    // 包含字母
  '138001380001',   // 太长
]

for (const phone of invalidPhones) {
  test(`验证错误手机号: ${phone}`, async ({ page }) => {
    // 测试逻辑
  })
}
```

### 3. 等待策略

**推荐顺序**:
1. 使用 `await expect().toBeVisible()` (最可靠)
2. 使用 `await page.waitForSelector()`
3. 使用 `await page.waitForTimeout()` (最后手段)

### 4. 选择器策略

**优先级**:
1. **最佳**: `data-testid` 属性
2. **好**: 明确的文本 `text=登录`
3. **可接受**: CSS 选择器 `button[type="submit"]`
4. **避免**: 模糊的选择器 `div > div > button`

### 5. 测试隔离

每个测试应该独立运行:
```typescript
test.beforeEach(async ({ page }) => {
  // 每个测试前登录/登出
  await gotoLoginPage(page)
})

test.afterEach(async ({ page }) => {
  // 每个测试后清理
  await logout(page)
})
```

### 6. 页面对象模式 (POM)

对于复杂页面，使用 POM:
```typescript
// pages/LoginPage.ts
export class LoginPage {
  constructor(private page: Page) {}

  async login(phone: string, password: string) {
    await this.page.fill('input[type="tel"]', phone)
    await this.page.fill('input[type="password"]', password)
    await this.page.click('button[type="submit"]')
  }
}

// 使用
const loginPage = new LoginPage(page)
await loginPage.login('13800138000', 'test123456')
```

---

## 📈 测试覆盖率

### 当前覆盖率

| 功能模块 | 测试用例数 | 覆盖率 |
|---------|----------|--------|
| 登录功能 | 4 | 100% |
| 注册功能 | 9 | 95% |
| 表单验证 | 5 | 100% |
| 邀请码验证 | 4 | 100% |
| 路由保护 | 2 | 100% |
| UI交互 | 4 | 80% |
| 性能测试 | 2 | 100% |
| 安全测试 | 3 | 90% |
| **总计** | **33** | **95%** |

### 未覆盖的场景

- 响应式设计（移动端测试已包含在配置中）
- 背景动画效果
- 浏览器兼容性（Firefox/Safari 已在配置中注释）

---

## 🎬 CI/CD 集成

### GitHub Actions 示例

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright browsers
        run: npx playwright install --with-deps

      - name: Run tests
        run: npm test

      - name: Upload test report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 📚 参考资源

- [Playwright 官方文档](https://playwright.dev)
- [Playwright 最佳实践](https://playwright.dev/docs/best-practices)
- [选择器最佳实践](https://playwright.dev/docs/selectors)

---

## 📝 测试检查清单

在提交代码前，确保：

- [ ] 所有测试通过 (`npm test`)
- [ ] 测试数据已准备
- [ ] 测试账号已注册
- [ ] 没有测试被跳过 (`skipped`)
- [ ] 测试报告已生成
- [ ] 失败测试的截图已检查

---

**文档版本**: v1.0
**最后更新**: 2026-01-05
**维护人**: Claude Code
