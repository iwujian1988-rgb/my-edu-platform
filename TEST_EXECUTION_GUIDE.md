# 学习状态恢复功能 - 完整测试执行指南

## 测试环境准备

### 1. 启动开发服务器
```bash
npm run dev
```

### 2. 打开浏览器控制台
- 按 F12 打开开发者工具
- 切换到 Console 标签
- 确保可以看到所有日志

### 3. 清空之前的测试数据
在控制台执行：
```javascript
// 清空保存的状态（可选，用于重置测试）
localStorage.clear()
```

---

## 完整测试用例清单

### 场景A: 竖屏模式（手机/平板）- 加载更多

#### TC-A1: 竖屏 - 加载第2页 - 返回 - 再进入
**目的**: 验证竖屏模式下的状态保存和恢复

**步骤**:
1. 打开浏览器开发者工具（F12）
2. 切换到设备模拟器（手机模式，如 iPhone 12）
3. 进入任意词库
4. 等待第1页加载（50个单词）
5. 滚动到底部，点击"加载更多"
6. 等待第2页加载（总共100个单词）
7. 查看控制台，应该看到：`💾 Saving word list state: { page: 2, ... }`
8. 点击页面左上角"返回"按钮
9. 回到首页，再次点击该词库进入

**预期结果**:
- ✅ 控制台显示：`🔍 [Resume Check] Checking conditions: { hasRestoredState: false, hasURLParams: false }`
- ✅ 控制台显示：`📖 Fetching saved state from database...`
- ✅ 控制台显示：`📊 [Resume Check] Saved state details: { page: 2, hoursSince: < 24, ... }`
- ✅ 控制台显示：`📍 Found recent resume state, showing dialog`
- ✅ 页面显示对话框："继续上次的学习进度？"
- ✅ 对话框显示："上次学习到第 2 页"
- ✅ 点击"继续学习"后，显示100个单词（第1页+第2页）

**失败标志**:
- ❌ 没有显示对话框
- ❌ 对话框显示的页码不正确
- ❌ 点击"继续学习"后页码或筛选条件不正确

---

#### TC-A2: 竖屏 - 加载第2页 + 筛选"未标注" - 返回 - 再进入
**目的**: 验证竖屏模式下筛选条件的保存

**步骤**:
1. 手机模式进入词库
2. 筛选条件选择："未标注"
3. 点击"加载更多"进入第2页
4. 查看控制台：`💾 Saving word list state: { status: 'new', page: 2, ... }`
5. 返回，再次进入

**预期结果**:
- ✅ 显示对话框
- ✅ 对话框显示："上次的学习设置：筛选：未标注"
- ✅ 对话框显示："上次学习到第 2 页"
- ✅ 点击"继续学习"后，显示未标注的第2页单词

---

### 场景B: 横屏模式（PC）- 翻页

#### TC-B1: 横屏 - 翻到第2页 - 返回 - 再进入
**目的**: 验证横屏模式下的分页保存

**步骤**:
1. PC模式（非设备模拟器）
2. 进入词库
3. 点击"下一页"按钮
4. 查看控制台：`💾 Saving word list state: { page: 2, ... }`
5. 返回，再次进入

**预期结果**:
- ✅ 显示对话框
- ✅ 对话框显示："上次学习到第 2 页"
- ✅ 点击"继续学习"后，显示第2页的50个单词（单词1-50被替换）

---

#### TC-B2: 横屏 - 翻到第3页 + 主题筛选 - 返回 - 再进入
**目的**: 验证横屏模式下主题筛选的保存

**步骤**:
1. PC模式进入词库
2. 主题筛选选择：任意主题（如"购物"）
3. 翻页到第3页
4. 查看控制台：`💾 Saving word list state: { theme: '购物', page: 3, ... }`
5. 返回，再次进入

**预期结果**:
- ✅ 显示对话框
- ✅ 对话框显示："上次的学习设置：主题：购物"
- ✅ 对话框显示："上次学习到第 3 页"
- ✅ 点击"继续学习"后，显示购物主题的第3页单词

---

### 场景C: URL参数优先级

#### TC-C1: 从首页"继续学习"进入
**目的**: 验证URL参数优先级高于对话框

**前置条件**: 用户已学习到第3页

**步骤**:
1. 首页找到"继续学习"卡片
2. 点击进入（URL应该是：/library/xxx?page=3）
3. 观察是否显示对话框

**预期结果**:
- ✅ 不显示对话框
- ✅ 控制台显示：`ℹ️ Has URL params, skipping saved state check`
- ✅ 直接显示第3页

---

#### TC-C2: 手动输入URL参数
**目的**: 验证URL参数恢复功能

**步骤**:
1. 在地址栏输入：`/library/xxx?page=2&status=new`
2. 按回车
3. 观察页面行为

**预期结果**:
- ✅ 不显示对话框
- ✅ 控制台显示：`✅ URL state restoration completed`
- ✅ 筛选条件自动设置为"未标注"
- ✅ 页码自动设置为第2页

---

### 场景D: 时间限制

#### TC-D1: 24小时内的状态
**目的**: 验证24小时内显示对话框

**步骤**:
1. 确保最近24小时内有学习记录
2. 进入词库
3. 观察对话框

**预期结果**:
- ✅ 显示对话框
- ✅ 控制台显示：`isWithin24Hours: true`

---

#### TC-D2: 超过24小时的状态（模拟）
**目的**: 验证超过24小时不显示对话框

**步骤**:
1. 手动修改数据库中的 updatedAt 时间戳（需要数据库访问）
2. 或者等待25小时后测试
3. 进入词库

**预期结果**:
- ✅ 不显示对话框
- ✅ 控制台显示：`ℹ️ Saved state exists but does not meet criteria: { reason: 'Too old' }`

---

### 场景E: 边界条件

#### TC-E1: 只浏览第1页
**目的**: 验证第1页不显示对话框

**步骤**:
1. 进入词库（第1页）
2. 不做任何翻页操作
3. 返回
4. 再次进入

**预期结果**:
- ✅ 不显示对话框
- ✅ 控制台显示：`ℹ️ Saved state exists but does not meet criteria: { reason: 'Invalid page' }`

---

#### TC-E2: 没有任何学习记录
**目的**: 验证首次访问不显示对话框

**步骤**:
1. 使用新用户或新词库
2. 进入词库

**预期结果**:
- ✅ 不显示对话框
- ✅ 控制台显示：`ℹ️ No saved state found in database`

---

#### TC-E3: 空筛选结果
**目的**: 验证筛选后为空的情况

**步骤**:
1. 进入词库
2. 选择一个不存在的主题（如果有）
3. 翻页到第2页
4. 返回，再次进入

**预期结果**:
- ✅ 显示对话框
- ✅ 点击"继续学习"后，可能显示"没有找到符合条件的单词"（这是已知限制）

---

### 场景F: 用户交互

#### TC-F1: 选择"继续学习"
**目的**: 验证"继续学习"功能

**步骤**:
1. 显示对话框后
2. 点击"继续学习"按钮

**预期结果**:
- ✅ 对话框关闭
- ✅ 控制台显示：`🔄 Resuming from saved state:`
- ✅ 控制台显示：`✅ Resume completed`
- ✅ 页面显示保存的筛选条件和页码
- ✅ 再次进入时不再显示对话框（hasRestoredState=true）

---

#### TC-F2: 选择"从头开始"
**目的**: 验证"从头开始"功能

**步骤**:
1. 显示对话框后
2. 点击"从头开始"按钮

**预期结果**:
- ✅ 对话框关闭
- ✅ 控制台显示：`🔄 Starting fresh`
- ✅ 页面显示第1页
- ✅ 筛选条件重置为"全部"
- ✅ 再次进入时不再显示对话框

---

#### TC-F3: 关闭对话框（点击背景）
**目的**: 验证点击背景关闭对话框

**步骤**:
1. 显示对话框后
2. 点击对话框外的背景区域

**预期结果**:
- ⚠️ 当前实现可能不支持此功能（需要确认）
- 或者：对话框关闭，相当于"从头开始"

---

### 场景G: 快速操作

#### TC-G1: 快速翻页
**目的**: 验证防抖机制

**步骤**:
1. 进入词库
2. 快速连续点击"下一页"3次
3. 观察控制台的保存日志

**预期结果**:
- ✅ 控制台只显示最后一次保存（防抖生效）
- ✅ 保存的页码应该是最后一次的页码

---

#### TC-G2: 翻页后立即返回
**目的**: 验证状态保存的及时性

**步骤**:
1. 进入词库
2. 点击"下一页"
3. **立即**点击返回（不等待100ms防抖）
4. 再次进入

**预期结果**:
- ⚠️ 可能：状态未保存（因为防抖未完成）
- 需要确认beforeunload事件是否保存

---

### 场景H: 并发和竞争

#### TC-H1: 恢复状态时切换页面
**目的**: 验证恢复过程中的状态一致性

**步骤**:
1. 显示对话框
2. 点击"继续学习"
3. 在恢复完成前（200ms内），快速点击浏览器返回

**预期结果**:
- ✅ 不应该出现错误
- ✅ 状态应该保持一致

---

#### TC-H2: 多个词库之间的状态隔离
**目的**: 验证不同词库的状态不会互相干扰

**步骤**:
1. 进入词库A，翻到第2页
2. 返回
3. 进入词库B，翻到第3页
4. 返回
5. 再次进入词库A

**预期结果**:
- ✅ 词库A显示对话框，提示第2页
- ✅ 词库B的状态不影响词库A

---

## 测试结果记录表

| 测试用例 | 状态 | 预期 | 实际 | 备注 |
|---------|------|------|------|------|
| TC-A1 | ⏳ | 显示对话框，恢复第2页 | 待测试 | |
| TC-A2 | ⏳ | 显示对话框，恢复筛选和第2页 | 待测试 | |
| TC-B1 | ⏳ | 显示对话框，恢复第2页 | 待测试 | |
| TC-B2 | ⏳ | 显示对话框，恢复筛选和第3页 | 待测试 | |
| TC-C1 | ⏳ | 不显示对话框，URL恢复 | 待测试 | |
| TC-C2 | ⏳ | 不显示对话框，URL恢复 | 待测试 | |
| TC-D1 | ⏳ | 显示对话框 | 待测试 | |
| TC-D2 | ⏳ | 不显示对话框 | 待测试 | |
| TC-E1 | ⏳ | 不显示对话框 | 待测试 | |
| TC-E2 | ⏳ | 不显示对话框 | 待测试 | |
| TC-E3 | ⏳ | 显示对话框，可能为空 | 待测试 | |
| TC-F1 | ⏳ | 成功恢复 | 待测试 | |
| TC-F2 | ⏳ | 从头开始 | 待测试 | |
| TC-F3 | ⏳ | 待确认 | 待测试 | |
| TC-G1 | ⏳ | 防抖生效 | 待测试 | |
| TC-G2 | ⏳ | 待验证 | 待测试 | |
| TC-H1 | ⏳ | 无错误 | 待测试 | |
| TC-H2 | ⏳ | 状态隔离 | 待测试 | |

---

## 控制台日志参考

### 正常流程（显示对话框）
```
🔍 [Resume Check] Checking conditions: { hasRestoredState: false, hasURLParams: false, bookId: "xxx" }
📖 Fetching saved state from database...
📊 [Resume Check] Saved state details: {
  hasState: true,
  page: 2,
  hoursSince: "0.05",
  isWithin24Hours: true,
  pageGreaterThan1: true,
  shouldShowDialog: true,
  filters: { status: "new", theme: "all", scenario: "all", chapter: "all" }
}
📍 Found recent resume state, showing dialog
```

### URL参数恢复（不显示对话框）
```
ℹ️ No URL params to restore, will check saved state
🔍 [Resume Check] Checking conditions: { hasRestoredState: false, hasURLParams: true, bookId: "xxx" }
ℹ️ Has URL params, skipping saved state check
```

### 不符合条件（不显示对话框）
```
🔍 [Resume Check] Checking conditions: { hasRestoredState: false, hasURLParams: false, bookId: "xxx" }
📖 Fetching saved state from database...
📊 [Resume Check] Saved state details: {
  hasState: true,
  page: 1,
  hoursSince: "0.05",
  isWithin24Hours: true,
  pageGreaterThan1: false,
  shouldShowDialog: false
}
ℹ️ Saved state exists but does not meet criteria: { reason: 'Invalid page' }
```

### 已恢复过（不显示对话框）
```
🔍 [Resume Check] Checking conditions: { hasRestoredState: true, hasURLParams: false, bookId: "xxx" }
ℹ️ Already restored, skipping resume check
```

---

## 已知BUG和限制

1. **章节筛选为空**: 如果客户端筛选后为空，会显示"没有找到符合条件的单词"
2. **点击背景关闭**: 当前实现可能不支持点击背景关闭对话框
3. **防抖期间返回**: 如果在防抖期间（100ms）返回，状态可能未保存

---

**创建时间**: 2026-01-13
**测试人员**: 用户 + Claude
**测试状态**: 准备执行
