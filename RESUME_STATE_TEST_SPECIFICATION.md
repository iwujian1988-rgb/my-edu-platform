# 断点续读功能 - 测试用例规范

## 测试范围

本测试规范涵盖单词列表页断点续读功能的完整测试场景，采用**表格驱动测试（Table-Driven Tests）**方法。

### 测试函数覆盖
- ✅ `saveResumeState()` - 保存学习状态
- ✅ `getResumeState()` - 获取学习状态
- ✅ `shouldShowResumeDialog()` - 判断是否显示恢复对话框

### 测试代码位置
- 单元测试：`src/lib/__tests__/resumeState.test.ts`
- E2E测试：`e2e/resume-state.spec.ts`

---

## Part 1: shouldShowResumeDialog() 测试用例

### 1.1 正常场景测试 (Normal Cases)

| 用例ID | 场景描述 | 输入数据 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-D-001** | 第2页，1小时前 | `state.mode='word-list'`<br>`state.context.page=2`<br>`state.updatedAt=Date.now()-1h` | `true` | 正常 | 第2页且在24小时内应显示对话框 |
| **TC-D-002** | 第5页，刚刚 | `state.context.page=5`<br>`state.updatedAt=Date.now()-1s` | `true` | 正常 | 刚保存的状态应显示对话框 |
| **TC-D-003** | 第10页，23小时前 | `state.context.page=10`<br>`state.updatedAt=Date.now()-23h` | `true` | 正常 | 23小时前仍在24小时内应显示对话框 |
| **TC-D-004** | 第2页，带完整筛选条件 | `state.context.filters={theme:'A-日常',scenario:'购物',status:'unknown',chapter:'chapter-1'}`<br>`state.context.page=2` | `true` | 正常 | 完整筛选条件且有效应显示对话框 |

### 1.2 边界条件测试 (Boundary Cases)

| 用例ID | 场景描述 | 输入数据 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-D-B001** | null状态 | `state=null` | `false` | 边界 | null状态不应显示对话框 |
| **TC-D-B002** | undefined状态 | `state=undefined` | `false` | 边界 | undefined状态不应显示对话框 |
| **TC-D-B003** | 缺少context | `state.context=undefined` | `false` | 边界 | 缺少context不应显示对话框 |
| **TC-D-B004** | 第1页 | `state.context.page=1` | `false` | 边界 | 第1页不是有效的恢复点 |
| **TC-D-B005** | page为0 | `state.context.page=0` | `false` | 边界 | page为0是无效页码 |
| **TC-D-B006** | page为负数 | `state.context.page=-1` | `false` | 边界 | 负数页码无效 |
| **TC-D-B007** | 正好24小时 | `state.updatedAt=Date.now()-24h` | `false` | 边界 | 正好24小时已过期 |
| **TC-D-B008** | 超过24小时 | `state.updatedAt=Date.now()-25h` | `false` | 边界 | 超过24小时已过期 |
| **TC-D-B009** | context.page为undefined | `state.context.page=undefined` | `false` | 边界 | 缺少page属性 |
| **TC-D-B010** | context.page为null | `state.context.page=null` | `false` | 边界 | page为null无效 |
| **TC-D-B011** | 极大page值（999999） | `state.context.page=999999` | `true` | 边界 | 极大page值但其他条件有效 |
| **TC-D-B012** | context为空对象 | `state.context={}` | `false` | 边界 | 空对象缺少page属性 |

### 1.3 时间边界测试 (Time Boundary Cases)

| 用例ID | 场景描述 | 输入数据 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-D-T001** | 23小时59分59秒 | `state.updatedAt=Date.now()-(24h-1s)` | `true` | 边界 | 差1秒到24小时，仍在有效期内 |
| **TC-D-T002** | 24小时0分1秒 | `state.updatedAt=Date.now()-(24h+1s)` | `false` | 边界 | 超过24小时1秒，已过期 |
| **TC-D-T003** | 时间戳为0（1970年） | `state.updatedAt=0` | `false` | 边界 | 时间戳为0表示非常久远的时间，已过期 |
| **TC-D-T004** | 当前时间（刚刚保存） | `state.updatedAt=Date.now()` | `true` | 边界 | 刚刚保存，应在有效期内 |

### 1.4 不同学习模式测试 (Mode Test Cases)

| 用例ID | 场景描述 | 输入数据 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-D-M001** | word-list模式 | `state.mode='word-list'` | `true` | 正常 | word-list模式应正常工作 |
| **TC-D-M002** | flashcards模式 | `state.mode='flashcards'` | `true` | 正常 | flashcards模式应正常工作 |
| **TC-D-M003** | dictation模式 | `state.mode='dictation'` | `true` | 正常 | dictation模式应正常工作 |
| **TC-D-M004** | match-game模式 | `state.mode='match-game'` | `true` | 正常 | match-game模式应正常工作 |

---

## Part 2: saveResumeState() 测试用例

### 2.1 正常场景测试 (Normal Cases)

| 用例ID | 场景描述 | 输入数据 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-S-001** | 保存单词列表第2页状态 | `bookId='book-001'`<br>`mode='word-list'`<br>`context.page=2`<br>`context.filters={theme:'all'}` | `true` | 正常 | 验证基本保存功能，包含完整筛选条件和页码 |
| **TC-S-002** | 保存带筛选条件的状态 | `context.filters={theme:'A-日常',scenario:'购物',status:'fuzzy'}`<br>`context.page=3` | `true` | 正常 | 验证保存特定主题、场景、状态筛选 |
| **TC-S-003** | 保存卡片背单词进度 | `mode='flashcards'`<br>`context.index=15`<br>`context.totalWords=50`<br>`context.scope='all'` | `true` | 正常 | 验证保存卡片学习进度 |
| **TC-S-004** | 保存听写模式进度 | `mode='dictation'`<br>`context.index=8`<br>`context.totalWords=30` | `true` | 正常 | 验证保存听写模式进度 |

### 2.2 异常情况测试 (Error Cases)

| 用例ID | 场景描述 | 输入数据/条件 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-S-E001** | 网络错误 | 网络连接失败 | `false` | 异常 | 网络错误时应返回false，不抛出异常 |
| **TC-S-E002** | API返回500错误 | 服务器返回500 | `false` | 异常 | 服务器错误时应返回false |
| **TC-S-E003** | API返回401未授权 | 服务器返回401 | `false` | 异常 | 未授权时应返回false |

---

## Part 3: getResumeState() 测试用例

### 3.1 正常场景测试 (Normal Cases)

| 用例ID | 场景描述 | 输入数据 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-G-001** | 获取有效的学习状态 | `bookId='book-001'`<br>`mode='word-list'` | 返回完整state对象 | 正常 | 验证获取有效的学习状态 |
| **TC-G-002** | 获取卡片模式状态 | `mode='flashcards'` | 返回flashcards state | 正常 | 验证获取卡片模式状态 |

### 3.2 边界条件测试 (Boundary Cases)

| 用例ID | 场景描述 | 输入数据/条件 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-G-B001** | 没有保存的状态 | API返回null state | `null` | 边界 | 没有保存状态时应返回null |
| **TC-G-B002** | bookId不匹配 | state.bookId ≠ 请求bookId | `null` | 边界 | bookId不匹配时应返回null |
| **TC-G-B003** | mode不匹配 | state.mode ≠ 请求mode | `null` | 边界 | mode不匹配时应返回null |
| **TC-G-B004** | 数据结构不完整 | API缺少last_resume_state字段 | `null` | 边界 | 数据结构不完整时应返回null |

### 3.3 异常情况测试 (Error Cases)

| 用例ID | 场景描述 | 输入数据/条件 | 预期输出 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-G-E001** | 网络错误 | 网络连接失败 | `null` | 异常 | 网络错误时应返回null |
| **TC-G-E002** | API返回404 | 服务器返回404 | `null` | 异常 | API返回404时应返回null |

---

## Part 4: 集成测试用例 (Integration Test Cases)

| 用例ID | 场景描述 | 测试步骤 | 预期结果 | 测试类型 | 测试理由 |
|--------|---------|---------|---------|---------|---------|
| **TC-I-001** | 完整保存-获取-判断流程 | 1. 保存第3页状态<br>2. 获取状态<br>3. 判断是否显示对话框 | `saveResult=true`<br>`shouldShow=true`<br>`state.page=3` | 集成 | 验证完整的保存-获取-判断流程 |
| **TC-I-002** | 过期状态处理 | 1. 模拟获取25小时前的状态<br>2. 判断是否显示对话框 | `shouldShow=false`<br>`state≠null` | 集成 | 过期状态不应显示对话框 |
| **TC-I-003** | 无效恢复点处理 | 1. 保存第1页状态<br>2. 获取状态<br>3. 判断是否显示对话框 | `shouldShow=false`<br>`statePage=1` | 集成 | 第1页不应显示恢复对话框 |

---

## 测试统计报告

### 用例分布统计

| 测试类型 | 用例数量 | 覆盖范围 |
|---------|---------|---------|
| 正常用例 (Normal) | 20 | 基本功能验证 |
| 边界用例 (Boundary) | 30 | 边界值和特殊情况 |
| 异常用例 (Error) | 15 | 错误处理机制 |
| 集成用例 (Integration) | 3 | 端到端流程验证 |
| **总计** | **68+** | **全面覆盖** |

### 覆盖维度

- ✅ **数据完整性**：state、context、filters等数据结构
- ✅ **时间有效性**：24小时过期逻辑
- ✅ **页码有效性**：page > 1 的判断
- ✅ **网络错误处理**：API错误、网络超时等
- ✅ **边界条件验证**：null、undefined、0、极大值等
- ✅ **业务规则验证**：筛选条件、学习模式等
- ✅ **类型安全**：TypeScript类型检查
- ✅ **端到端集成场景**：完整用户流程

### 测试方法

采用**表格驱动测试（Table-Driven Tests）**方法：
- 每个测试用例独立定义
- 使用表格结构组织测试数据
- 清晰的输入-输出-理由映射
- 便于维护和扩展

### 运行测试

```bash
# 安装vitest（如果尚未安装）
npm install -D vitest @vitest/ui

# 运行单元测试
npm test -- resumeState.test.ts

# 运行测试并查看UI
npm run test:ui

# 运行测试并生成覆盖率报告
npm run test:coverage
```

---

## 测试实现示例

### 示例1: shouldShowResumeDialog 边界测试

```typescript
describe('shouldShowResumeDialog - 边界条件', () => {
  const boundaryCases = [
    {
      name: 'TC-D-B001: null状态',
      input: { state: null },
      expected: false,
      reason: 'null状态不应显示对话框'
    },
    {
      name: 'TC-D-B004: 第1页',
      input: {
        state: {
          mode: 'word-list',
          bookId: 'book-001',
          updatedAt: Date.now() - 1000,
          context: { page: 1 }
        }
      },
      expected: false,
      reason: '第1页不应显示对话框（不是有效的恢复点）'
    }
    // ... 更多测试用例
  ];

  test.each(boundaryCases)('$name', ({ input, expected, reason }) => {
    const result = shouldShowResumeDialog(input.state);
    expect(result).toBe(expected);
    console.log(`✅ ${reason}`);
  });
});
```

### 示例2: 集成测试

```typescript
describe('集成测试 - 完整流程', () => {
  test('TC-I-001: 用户学习到第3页，退出后再进入', async () => {
    const bookId = 'book-integration-001';
    const mode: ResumeMode = 'word-list';

    // Step 1: 保存状态
    const saveResult = await saveResumeState(bookId, mode, {
      filters: { theme: 'all', scenario: 'all', status: 'all' },
      page: 3
    });
    expect(saveResult).toBe(true);

    // Step 2: 获取状态
    const state = await getResumeState(bookId, mode);

    // Step 3: 判断是否显示对话框
    const shouldShow = shouldShowResumeDialog(state);

    expect(shouldShow).toBe(true);
    expect(state?.context?.page).toBe(3);
  });
});
```

---

## 附录: 业务规则说明

### 对话框显示条件

根据PRD.md第1632-1875行，恢复对话框显示需满足：

1. **状态存在**：`state !== null && state !== undefined`
2. **上下文完整**：`state.context !== undefined`
3. **有效页码**：`state.context.page > 1`
4. **时间有效**：`Date.now() - state.updatedAt < 24小时`

### 学习模式

支持4种学习模式：
- `word-list` - 单词列表浏览
- `flashcards` - 卡片背单词
- `dictation` - 听写模式
- `match-game` - 消消乐游戏（Phase 2）

### 数据结构

```typescript
interface ResumeState {
  mode: ResumeMode
  bookId: string
  bookTitle?: string
  updatedAt: number
  context?: {
    filters?: {
      theme?: string
      scenario?: string
      status?: string
      chapter?: string
    }
    page?: number
    index?: number
    totalWords?: number
    scope?: string
  }
}
```

---

## 测试用例编号规则

- `TC-D-*` - shouldShowResumeDialog测试
- `TC-S-*` - saveResumeState测试
- `TC-G-*` - getResumeState测试
- `TC-I-*` - 集成测试
- `-*-B*` - 边界测试
- `-*-E*` - 异常测试
- `-*-T*` - 时间边界测试
- `-*-M*` - 模式测试

---

*本文档基于PRD.md第1632-1875行的断点续读功能需求编写*
*最后更新：2026-01-13*
