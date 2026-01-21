# 自定义词库管理 API 测试指南

## 概述

本文档描述了自定义词库管理模块的所有 API 测试用例和执行指南。

**测试覆盖率目标：80%+**

**测试框架：Vitest**

## 测试文件结构

```
src/app/api/
├── books/[bookId]/chapters/__tests__/
│   └── chapters.test.ts              # 章节 CRUD 测试（GET, POST）
├── books/[bookId]/chapters/[chapterId]/__tests__/
│   └── chapter.test.ts               # 章节详情测试（PUT, DELETE）
├── words/batch-delete/__tests__/
│   └── batch-delete.test.ts          # 批量删除测试
├── words/batch-move/__tests__/
│   └── batch-move.test.ts            # 批量移动测试
└── smart-import/__tests__/
    └── smart-import.test.ts          # 智能导入测试（POST, GET）
```

## 测试统计

### 总体统计

| 模块 | 测试文件数 | 测试用例数 | 覆盖功能点 |
|------|-----------|-----------|-----------|
| 章节管理 | 2 | 16 | GET（列表）, POST（创建）, PUT（更新）, DELETE（删除） |
| 批量删除 | 1 | 11 | 批量删除, 权限检查, 限额控制, 部分成功 |
| 批量移动 | 1 | 12 | 批量移动, 章节验证, 单词数更新, 事务性 |
| 智能导入 | 1 | 17 | 导入, 缓存, 配额, 重试, 章节选择 |
| **总计** | **5** | **56** | **全覆盖** |

---

## 1. 章节管理 API 测试

### 文件：`chapters.test.ts`

#### GET /api/books/[bookId]/chapters

**测试用例：**
- ✅ 应该成功获取章节列表（不包含单词数）
- ✅ 应该成功获取章节列表（包含单词数统计）
- ✅ 应该返回401当用户未认证
- ✅ 应该返回404当词库不存在
- ✅ 应该按order_index降序排列章节

#### POST /api/books/[bookId]/chapters

**测试用例：**
- ✅ 应该成功创建新章节
- ✅ 应该自动计算order_index（添加到最后）
- ✅ 应该拒绝创建重复标题的章节
- ✅ 应该验证标题长度（1-50字符）
- ✅ 应该拒绝非词库创建者创建章节
- ✅ 应该拒绝官方词库创建章节
- ✅ 应该返回400当缺少必需参数

---

### 文件：`chapter.test.ts`

#### PUT /api/books/[bookId]/chapters/[chapterId]

**测试用例：**
- ✅ 应该成功更新章节标题
- ✅ 应该允许更新章节标题为自己（幂等性）
- ✅ 应该拒绝更新为其他章节的标题（重复检查）
- ✅ 应该返回404当章节不存在
- ✅ 应该拒绝更新非同一词库的章节

#### DELETE /api/books/[bookId]/chapters/[chapterId]

**测试用例：**
- ✅ 应该成功删除空章节
- ✅ 应该拒绝删除默认章节
- ✅ 应该删除包含单词的章节（先移动到默认章节）
- ✅ 应该在没有默认章节时创建一个
- ✅ 应该返回404当章节不存在
- ✅ 应该拒绝删除非词库创建者的章节
- ✅ 应该拒绝删除官方词库的章节

---

## 2. 批量删除 API 测试

### 文件：`batch-delete.test.ts`

#### POST /api/words/batch-delete

**测试用例：**
- ✅ 应该成功批量删除多个单词
- ✅ 应该支持部分成功场景
- ✅ 应该返回400当wordIds不是数组
- ✅ 应该返回400当wordIds为空数组
- ✅ 应该限制每次最多删除100个单词
- ✅ 应该返回404当单词不存在
- ✅ 应该拒绝删除其他用户的单词
- ✅ 应该支持删除来自不同词库的单词（如果是同一用户）
- ✅ 应该异步更新词库统计（不阻塞响应）
- ✅ 应该返回401当用户未认证
- ✅ 应该幂等（重复删除不会报错）

---

## 3. 批量移动 API 测试

### 文件：`batch-move.test.ts`

#### POST /api/words/batch-move

**测试用例：**
- ✅ 应该成功批量移动单词到目标章节
- ✅ 应该成功移动单词到默认章节（null）
- ✅ 应该拒绝移动来自不同词库的单词
- ✅ 应该返回400当wordIds不是数组或为空
- ✅ 应该限制每次最多移动100个单词
- ✅ 应该返回404当单词不存在
- ✅ 应该拒绝移动其他用户词库的单词
- ✅ 应该返回404当目标章节不存在
- ✅ 应该拒绝移动到不同词库的章节
- ✅ 应该更新源章节和目标章节的单词计数
- ✅ 应该返回401当用户未认证
- ✅ 应该处理全有或全无事务（all-or-nothing）

---

## 4. 智能导入 API 测试

### 文件：`smart-import.test.ts`

#### POST /api/smart-import

**测试用例：**
- ✅ 应该成功导入单词（不使用缓存）
- ✅ 应该使用Redis缓存（如果可用）
- ✅ 应该支持指定目标章节
- ✅ 应该自动创建默认章节（如果未指定）
- ✅ 应该验证并去重单词列表
- ✅ 应该限制每次最多导入100个单词
- ✅ 应该验证单词格式（只允许字母和连字符）
- ✅ 应该拒绝导入官方词库
- ✅ 应该拒绝非词库创建者导入
- ✅ 应该检查每日配额限制（500词/天）
- ✅ 应该更新每日配额使用量
- ✅ 应该返回401当用户未认证

#### GET /api/smart-import

**测试用例：**
- ✅ 应该返回今日配额使用情况
- ✅ 应该返回0当今日未使用配额
- ✅ 应该返回401当用户未认证

---

## 测试执行指南

### 前置条件

1. **安装测试依赖**
   ```bash
   npm install --save-dev vitest @vitest/ui
   ```

2. **配置测试环境**
   ```bash
   # 复制环境变量
   cp .env.example .env.test

   # 配置测试数据库（使用独立的测试数据库）
   ```

3. **Vitest 配置**（已在 `vitest.config.ts` 中配置）

### 运行测试

#### 运行所有测试
```bash
npm test
```

#### 运行特定文件
```bash
# 章节管理测试
npm test chapters.test.ts

# 批量操作测试
npm test batch-delete.test.ts
npm test batch-move.test.ts

# 智能导入测试
npm test smart-import.test.ts
```

#### 运行特定测试用例
```bash
npm test -t "应该成功批量删除多个单词"
```

#### 监听模式（开发时使用）
```bash
npm test -- --watch
```

#### 生成覆盖率报告
```bash
npm test -- --coverage
```

#### UI 模式（图形化界面）
```bash
npm test -- --ui
```

---

## 测试覆盖率目标

### 代码覆盖率目标

| 指标 | 目标 | 说明 |
|------|------|------|
| 语句覆盖率 | 80%+ | 所有可执行语句 |
| 分支覆盖率 | 75%+ | 所有条件分支 |
| 函数覆盖率 | 85%+ | 所有函数 |
| 行覆盖率 | 80%+ | 所有代码行 |

### 功能覆盖点

#### 权限控制
- ✅ 未认证用户（401）
- ✅ 非词库创建者（403）
- ✅ 官方词库限制（403）

#### 输入验证
- ✅ 参数类型验证
- ✅ 参数范围验证（1-50字符标题，最多100词批量操作）
- ✅ 必需参数检查
- ✅ 格式验证（单词只允许字母和连字符）

#### 业务逻辑
- ✅ 章节CRUD（创建、读取、更新、删除）
- ✅ 章节排序（order_index自动计算）
- ✅ 章节标题唯一性
- ✅ 默认章节保护
- ✅ 单词批量操作（删除、移动）
- ✅ 批量操作事务性（all-or-nothing / partial-success）
- ✅ 章节单词计数更新
- ✅ 智能导入（缓存、重试、配额）
- ✅ Redis缓存优先策略

#### 边界条件
- ✅ 空列表处理
- ✅ 超限处理
- ✅ 不存在资源（404）
- ✅ 重复数据处理
- ✅ 部分成功场景

---

## CI/CD 集成

### GitHub Actions 配置示例

```yaml
name: API Tests

on:
  pull_request:
    paths:
      - 'src/app/api/books/**'
      - 'src/app/api/words/**'
      - 'src/app/api/smart-import/**'

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm test -- --coverage
      - uses: codecov/codecov-action@v3
```

---

## Mock 策略

所有测试使用 Vitest 的 `vi.mock()` 功能进行依赖隔离：

### Mock 的依赖
- `@/lib/supabase/server` - Supabase 客户端和用户认证
- `@/lib/utils/cache` - Redis 缓存操作
- `global.fetch` - Youdao API 调用

### Mock 数据示例
```typescript
const mockUser = { id: 'test-user-id', email: 'test@example.com' }
const mockBook = { id: 'book-1', created_by: 'test-user-id', is_official: false }
const mockSupabase = {
  from: vi.fn(),
  select: vi.fn(),
  eq: vi.fn(),
  single: vi.fn(),
  // ...
}
```

---

## 已知限制

1. **集成测试缺失**：当前测试主要是单元测试，缺少端到端集成测试
2. **Redis 实际连接测试**：Redis 测试依赖 mock，未测试真实连接
3. **外部 API 实际调用**：Youdao API 使用 mock，未测试真实重试机制
4. **并发测试缺失**：未测试高并发场景下的数据一致性

---

## 后续改进计划

### 短期（1-2周）
- [ ] 添加集成测试（使用真实数据库）
- [ ] 添加 Redis 实际连接测试
- [ ] 提高测试覆盖率至 85%+

### 中期（1个月）
- [ ] 添加性能测试（API 响应时间）
- [ ] 添加并发测试（并发单词导入、批量操作）
- [ ] 添加负载测试（模拟大量请求）

### 长期（持续）
- [ ] 添加端到端测试（Playwright）
- [ ] 添加混沌工程测试（网络故障、Redis 不可用等）
- [ ] 建立测试覆盖率监控和告警

---

## 测试最佳实践

1. **测试命名**：使用 `应该...` （should...）格式描述测试意图
2. **测试隔离**：每个测试用例独立，不依赖其他测试
3. **Mock 清理**：每次测试后清理 mock 状态（`afterEach`）
4. **边界测试**：重点测试边界条件和异常场景
5. **权限测试**：每个 API 都测试未认证/无权限场景

---

## 测试维护

### 何时更新测试

- ✅ 新增 API 功能时
- ✅ 修改业务逻辑时
- ✅ 修复 Bug 时（添加回归测试）
- ✅ 修改 API 接口时

### 测试审查清单

- [ ] 所有新功能都有测试覆盖
- [ ] 测试覆盖率 >= 80%
- [ ] 所有测试用例都能通过
- [ ] Mock 数据符合真实场景
- [ ] 测试命名清晰、描述准确

---

## 附录：测试文件快速导航

| 功能模块 | 测试文件路径 | 主要测试内容 |
|---------|------------|------------|
| 章节列表/创建 | `books/[bookId]/chapters/__tests__/chapters.test.ts` | GET（列表）, POST（创建） |
| 章节更新/删除 | `books/[bookId]/chapters/[chapterId]/__tests__/chapter.test.ts` | PUT, DELETE |
| 批量删除 | `words/batch-delete/__tests__/batch-delete.test.ts` | POST（批量删除） |
| 批量移动 | `words/batch-move/__tests__/batch-move.test.ts` | POST（批量移动） |
| 智能导入 | `smart-import/__tests__/smart-import.test.ts` | POST（导入）, GET（配额） |

---

**文档版本：v1.0**

**创建日期：2026-01-15**

**最后更新：2026-01-15**
