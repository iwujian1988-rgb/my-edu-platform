# 🧪 自动化测试快速参考

## 🚀 快速开始

```bash
# 1. 准备环境（首次运行）
npm run test:install

# 2. 运行所有测试
npm test

# 3. 查看测试报告
npm run test:report
```

---

## 📝 测试命令速查

| 命令 | 说明 |
|------|------|
| `npm test` | 运行所有测试（无头模式） |
| `npm run test:headed` | 运行测试（可见浏览器） |
| `npm run test:ui` | 交互式 UI 模式 |
| `npm run test:debug` | 调试模式（带断点） |
| `npm run test:report` | 打开 HTML 测试报告 |
| `npm run test:install` | 安装 Playwright 浏览器 |

---

## 🎯 常用命令

```bash
# 运行单个测试文件
npx playwright test auth.spec.ts

# 运行特定测试用例
npx playwright test -g "正常登录流程"

# 只运行失败的测试
npx playwright test --last-failed

# 调试特定测试
npx playwright test auth.spec.ts --debug

# 录制测试（自动生成代码）
npx playwright codegen http://localhost:3000
```

---

## 📊 测试用例统计

| 分类 | 用例数 |
|------|--------|
| 核心功能 | 6 |
| 表单验证 | 5 |
| 邀请码验证 | 4 |
| 路由保护 | 2 |
| UI交互 | 4 |
| 性能测试 | 2 |
| 安全测试 | 3 |
| **总计** | **26** |

---

## 🔧 测试辅助函数

```typescript
// 导航到登录页
await gotoLoginPage(page)

// 切换注册标签
await switchToSignupTab(page)

// 填写登录表单
await fillLoginForm(page, '13800138000', 'test123456')

// 填写注册表单
await fillSignupForm(page, phone, password, confirmPassword, inviteCode)

// 提交表单
await submitLoginForm(page)
await submitSignupForm(page)

// 验证结果
await expectSuccessMessage(page, '登录成功')
await expectErrorMessage(page, '手机号或密码错误')
await expectNavigation(page, '/study')
```

---

## 🧪 测试数据

### 有效邀请码
- `TEST1234` - 永不过期，100次使用
- `DEMO2024` - 过期时间 2026-12-31
- `BETA5000` - 永不过期，500次使用

### 错误场景邀请码
- `INVALID` - 无效邀请码
- `EXPIRED` - 已过期
- `FULLCODE` - 使用次数已达上限

### 测试账号
- 手机号: `13800138000`
- 密码: `test123456`

---

## 📁 目录结构

```
e2e/
├── auth.spec.ts              # 认证模块测试
└── utils/
    └── test-helpers.ts       # 测试辅助函数

playwright.config.ts          # Playwright 配置
scripts/
├── setup-tests.sh            # Linux/Mac 安装脚本
└── setup-tests.bat           # Windows 安装脚本
```

---

## 🐛 调试技巧

### 1. 使用调试模式
```bash
npm run test:debug
```

### 2. 暂停执行
```typescript
await page.pause() // 在代码中插入断点
```

### 3. 截图
```typescript
await page.screenshot({ path: 'debug.png' })
```

### 4. 查看日志
```bash
npx playwright test --reporter=list
```

---

## ⚠️ 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|---------|
| `Executable doesn't exist` | 浏览器未安装 | 运行 `npm run test:install` |
| `Test timeout` | 页面加载慢 | 增加超时时间 |
| `Cannot find element` | 选择器错误 | 检查元素选择器 |
| `Test account not found` | 测试账号未注册 | 手动注册测试账号 |

---

## 📚 参考资源

- [Playwright 文档](https://playwright.dev)
- [测试最佳实践](README_E2E_TEST.md)
- [手工测试用例](TEST_AUTH.md)

---

**提示**: 首次运行前请确保：
1. ✅ 已安装 Playwright 浏览器
2. ✅ 已准备测试数据（运行 SQL 脚本）
3. ✅ 已注册测试账号（13800138000）
