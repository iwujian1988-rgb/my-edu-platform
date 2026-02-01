# Bug Report: 单词查询API的"先分页后筛选"问题

## 📋 Bug概述

**Bug ID:** `words-api-pagination-filter-bug`
**发现时间:** 2026-01-29
**严重程度:** 中等（影响用户体验，但不导致功能完全不可用）
**状态:** 待修复

---

## 🔍 Bug复现步骤

### 环境条件
- 单词书ID: `00ec921f-df0d-40ee-8003-bf751d65435b`
- 单词总数: 3427个
- "不认识"状态单词: 2个

### 复现步骤
1. 进入单词库详情页
2. 点击"卡片背单词"按钮
3. 选择"继续"（从上次学习进度恢复）
4. 选择 scope=`unknown`（不认识）
5. 观察页面显示

### 预期结果
- 正常显示2个"不认识"的单词

### 实际结果
- 页面报错：`[Flashcards] currentWord is undefined!`
- 控制台显示：`wordsLength: 0`

---

## 📊 技术分析

### API响应对比

#### 1. Stats API（统计接口）
```http
GET /api/words/stats?bookId=00ec921f-df0d-40ee-8003-bf751d65435b
```

**响应：**
```json
{
  "success": true,
  "data": {
    "unknown": 2,  // ✅ 正确统计
    "fuzzy": 123,
    "known": 3302
  }
}
```

#### 2. Words API（单词查询接口）
```http
GET /api/words?bookId=00ec921f-df0d-40ee-8003-bf751d65435b&status=unknown&page=1&pageSize=50
```

**响应：**
```json
{
  "success": true,
  "data": [],  // ❌ 返回空数组
  "page": 1,
  "pageSize": 50,
  "total": 3427
}
```

### 实际单词位置验证

通过脚本遍历所有页（70页）：
```
Page 1-12: 0个 unknown 单词
Page 13: 找到了 1个 unknown 单词 ✅
Page 14-48: 0个 unknown 单词
Page 49: 找到了 1个 unknown 单词 ✅
Page 50-70: 0个 unknown 单词
```

**结论：2个 "unknown" 单词分别在第13页和第49页**

---

## 🐛 Bug根因分析

### 问题代码位置

**文件:** `src/app/api/words/route.ts`
**行号:** 第364-403行（fallback查询逻辑）

### 错误逻辑流程

```typescript
// ❌ 错误：先分页，再筛选
const offset = (page - 1) * pageSize  // offset = 0

// 1. 查询第1页的50个单词（分页在前）
const { data: fallbackWords } = await supabase
  .from('words')
  .select('*')
  .range(offset, offset + pageSize - 1)  // range(0, 49)

// 2. 从这50个单词中筛选 status === 'unknown'
filteredWords = fallbackWords.filter(w => w.status === 'unknown')

// 3. 结果：如果这50个都不是 'unknown'，返回空数组
//     但实际上有2个 'unknown' 在第13页和第49页！
```

### 为什么之前没有暴露？

**历史场景：**
- "不认识"单词有41个
- 分布在前几页
- 第1页的50个单词中就包含了部分 "unknown"
- 所以分页后筛选能找到结果 ✅

**当前场景：**
- "不认识"只剩2个
- 学习进度推进后，大部分单词被标记为"认识"或"模糊"
- 剩余2个 "unknown" 被挤到了后面（第13页、第49页）
- 第1页的50个单词都不是 "unknown"
- 分页后筛选返回空数组 ❌

---

## 📈 影响面评估

### 受影响的功能
1. **单词卡片背单词** - 所有状态筛选（unknown/fuzzy/known）
2. **单词列表** - 状态筛选功能
3. **听写模式** - 状态筛选功能
4. **配对游戏** - 状态筛选功能

### 受影响的用户场景
- ✅ **不影响：**
  - 首次学习（`status='new'` 或 `status='all'`）
  - 单词数量较少的词库（< 50个）
  - 目标状态单词集中在前50个的词库

- ❌ **影响：**
  - 大词库（> 50个单词）
  - 学习进度推进后，剩余单词数量少的场景
  - 目标状态单词分散在后面的词库

### 严重程度评级
- **功能完整性:** ⚠️ 中等（部分功能不可用）
- **用户体验:** ⚠️ 中等（用户无法继续学习）
- **数据丢失:** ✅ 无（数据存在，只是查询不到）
- **影响范围:** 有限（只影响状态筛选场景）

---

## 💡 修复方案

### 方案1：先筛选再分页（推荐）

#### 核心思路
```typescript
// ✅ 正确：先筛选，再分页
// 1. 查询所有符合 status 的 word_id（不分页）
const statusWordIds = await getAllWordIdsByStatus(status)  // 2个

// 2. 对这些 word_id 分页
const paginatedIds = statusWordIds.slice(offset, offset + pageSize)

// 3. 查询分页后的单词详情
const words = await getWordsByIds(paginatedIds)
```

#### 代码修改位置
**文件:** `src/app/api/words/route.ts`
**修改行:** 第363-403行

#### 修改内容
```typescript
// 修改前（第363-403行）
else {
  // 先分页，后筛选 ❌
  const { data: fallbackWords } = await supabase
    .from('words')
    .range(offset, offset + pageSize - 1)
}

// 修改后 ✅
else {
  // 1. 从 progressResult 获取所有符合 status 的 word_id
  const statusWordIds = new Set(
    progressResult.data
      ?.filter(p => p.status === status)
      .map(p => p.word_id) || []
  )

  // 2. 分页
  const paginatedIds = Array.from(statusWordIds)
    .slice(offset, offset + pageSize)

  // 3. 查询单词详情
  const { data: fallbackWords } = await supabase
    .from('words')
    .select('*')
    .in('id', paginatedIds)
}
```

#### 优点
- ✅ 完全修复bug
- ✅ 逻辑清晰，符合预期
- ✅ 不影响其他功能

#### 缺点
- ⚠️ 需要先查询所有 word_id（可能有性能影响）
- ⚠️ 修改核心查询逻辑，需要充分测试

---

### 方案2：多次循环查询（不推荐）

#### 核心思路
如果当前页筛选后为空，自动加载下一页，直到找到结果。

```typescript
let words = []
let currentPage = page

while (words.length === 0 && currentPage <= maxPages) {
  const response = await fetchPage(currentPage)
  words = response.filter(w => w.status === status)
  currentPage++
}
```

#### 优点
- ✅ 不修改核心查询逻辑
- ✅ 改动较小

#### 缺点
- ❌ 可能需要多次API调用，性能差
- ❌ 逻辑复杂，容易引入新bug
- ❌ 治标不治本

---

### 方案3：数据库视图或存储过程（长期方案）

#### 核心思路
在数据库层创建物化视图，预计算每个状态的单词分页。

```sql
CREATE MATERIALIZED VIEW words_by_status AS
SELECT
  w.*,
  wp.status,
  ROW_NUMBER() OVER (PARTITION BY wp.status ORDER BY w.order_index) as page_num
FROM words w
LEFT JOIN word_progress wp ON w.id = wp.word_id
```

#### 优点
- ✅ 性能最优
- ✅ 逻辑清晰
- ✅ 易于维护

#### 缺点
- ❌ 需要数据库schema变更
- ❌ 实施周期长
- ❌ 需要维护物化视图刷新

---

## 🔧 修复后影响面分析

### 需要回归测试的场景

#### 1. 功能测试
- [ ] 首次学习新单词（`status='new'`）
- [ ] 继续上次学习进度
- [ ] 切换学习范围（unknown/fuzzy/known/all）
- [ ] 大词库（> 1000个单词）
- [ ] 小词库（< 50个单词）
- [ ] 空词库（0个单词）

#### 2. 性能测试
- [ ] API响应时间（当前 vs 修复后）
- [ ] 数据库查询负载
- [ ] 并发请求处理

#### 3. 边界条件
- [ ] 符合状态的单词为0个
- [ ] 符合状态的单词为1个
- [ ] 符合状态的单词超过1000个
- [ ] 页码超出范围

### 预期性能影响

**修改前（当前）：**
```
查询1: SELECT * FROM words WHERE ... LIMIT 50
查询2: 筛选内存中的数据
总耗时: ~100ms
```

**修改后（方案1）：**
```
查询1: SELECT word_id FROM word_progress WHERE status = 'unknown'  -- ~50ms
内存操作: 分页 word_id 数组  -- ~1ms
查询2: SELECT * FROM words WHERE id IN (...)  -- ~80ms
总耗时: ~131ms（增加31ms）
```

**性能评估：**
- 增加30%的响应时间
- 但从100ms增加到130ms，用户无感知
- 如果 progress 表有索引，性能影响可忽略

### 兼容性影响
- ✅ **API接口不变** - 请求参数和响应格式完全一致
- ✅ **前端无需修改** - 所有调用方无需改动
- ✅ **数据层不变** - 不涉及数据库schema变更

---

## 📝 测试计划

### 单元测试
```typescript
describe('GET /api/words with status filter', () => {
  test('should return paginated results for scattered words', async () => {
    // Setup: 创建1000个单词，其中2个 unknown 在第13页和第49页
    const response = await fetch(
      '/api/words?bookId=test&status=unknown&page=1&pageSize=50'
    )
    const data = await response.json()

    expect(data.data.length).toBeGreaterThan(0)
    expect(data.statusTotal).toBe(2)
  })
})
```

### 集成测试
1. 创建测试词库（3427个单词）
2. 标记3400个为 "known"
3. 标记25个为 "fuzzy"
4. 剩余2个为 "unknown"（分散在不同页）
5. 测试 API 查询 `status=unknown`
6. 验证能正确返回这2个单词

### 回归测试
测试所有调用 `/api/words` 的功能：
- ✅ 单词列表页
- ✅ 卡片背单词
- ✅ 听写模式
- ✅ 配对游戏
- ✅ 打字练习

---

## ⚠️ 风险评估

### 修复风险
- **风险等级:** 🟡 低-中等
- **主要原因:**
  - 修改核心查询逻辑
  - 可能影响性能
  - 需要充分测试

### 缓解措施
1. **代码审查:** 修改后由其他开发人员review
2. **灰度发布:** 先发布到测试环境，验证后再上线
3. **监控告警:** 上线后监控API响应时间和错误率
4. **快速回滚:** 准备回滚脚本，如有问题立即回退

---

## 📅 时间估算

- **代码修改:** 30分钟
- **单元测试:** 1小时
- **集成测试:** 2小时
- **回归测试:** 2小时
- **Code Review:** 1小时
- **总计:** 约6.5小时

---

## 🎯 建议

### 短期（本周）
1. ✅ **采用方案1进行修复**
2. ✅ **执行完整测试计划**
3. ✅ **灰度发布到测试环境**

### 中期（本月）
1. 考虑实施方案3（数据库视图优化）
2. 添加API性能监控
3. 优化大词库的查询性能

### 长期（下季度）
1. 重构单词查询架构
2. 引入缓存机制
3. 优化数据库索引

---

## 📎 相关链接

- **文件:** `src/app/api/words/route.ts`
- **问题行:** 363-403, 406-446
- **相关功能:** 单词列表、卡片背单词、听写模式
- **测试环境:** http://localhost:3000
- **生产环境:** https://your-domain.com

---

**报告生成时间:** 2026-01-29
**报告人:** Claude (AI Assistant)
**优先级:** P1（本周内修复）
