# 前台个人学习区逻辑Review报告

## 📊 Review范围

**文件**: `src/app/page.tsx` (首页 - 个人学习区)
**Review时间**: 2026-01-09
**参考文档**: `PRD.md`

---

## 1. 继续学习跳转逻辑

### 实现位置
`src/app/page.tsx:91-130`

### 代码实现
```typescript
// ⭐ 获取用户最后的学习状态
const { data: userPrefs } = await supabase
  .from('user_book_preferences')
  .select('last_resume_state')
  .eq('user_id', user.id)
  .eq('book_id', lastBookId)
  .maybeSingle()

const resumeState = (userPrefs as any)?.last_resume_state
let continueURL = `/library/${lastBookId}` // 默认跳转到词书详情页

// ⭐ 根据学习模式生成不同的跳转 URL
if (resumeState?.mode === 'word-list') {
  // 单词列表：带筛选参数
  const ctx = resumeState.context
  const params = new URLSearchParams()
  if (ctx.filters?.theme && ctx.filters.theme !== 'all') params.append('theme', ctx.filters.theme)
  if (ctx.filters?.scenario && ctx.filters.scenario !== 'all') params.append('scenario', ctx.filters.scenario)
  if (ctx.filters?.status && ctx.filters.status !== 'all') params.append('status', ctx.filters.status)
  if (ctx.page && ctx.page > 1) params.append('page', ctx.page.toString())

  continueURL = `/library/${lastBookId}${params.toString() ? `?${params.toString()}` : ''}`
} else if (resumeState?.mode === 'flashcards') {
  // 卡片模式：带索引
  const index = resumeState.context?.index || 0
  continueURL = `/study/${lastBookId}/flashcards?index=${index}`
} else if (resumeState?.mode === 'dictation') {
  // 听写模式：带索引
  const index = resumeState.context?.index || 0
  continueURL = `/study/${lastBookId}/dictation?index=${index}`
}
```

### PRD要求
> 继续学习卡片：展示上次学习的词书及进度百分比。点击后直接进入该词书的详情页，用户可从详情页选择练习模式。

### ✅ 分析结论
**实现超出预期**！代码不仅满足PRD要求，还实现了智能状态恢复：
- ✅ 支持单词列表筛选条件恢复
- ✅ 支持卡片模式索引恢复
- ✅ 支持听写模式索引恢复
- ✅ 默认跳转到词书详情页（符合PRD）

**状态**: ✅ **优秀** - 超出PRD要求

---

## 2. 百分比（%）逻辑

### 实现位置
`src/app/page.tsx:79-89`

### 代码实现
```typescript
// 计算该书的学习进度
const { data: bookProgress } = await supabase
  .from('word_progress')
  .select('status')
  .eq('user_id', user.id)
  .eq('book_id', lastBookId)

if (bookProgress) {
  const learnedCount = bookProgress.filter((p: any) => p.status !== 'new').length
  const progress = (bookData as any).total_words > 0
    ? Math.round((learnedCount / (bookData as any).total_words) * 100)
    : 0
```

### PRD要求
PRD中没有明确定义"进度百分比"的计算方式，需要从上下文推断：

#### 相关定义：
- **`new`**: 未标注
- **`known`**: 认识
- **`fuzzy`**: 模糊
- **`unknown`**: 不认识

#### 练习模式筛选 (PRD.md:1057):
> 练习模式筛选：`status != 'new'` （只练习标记过的单词）

#### 错题本定义 (PRD.md:810-812):
> 错题本数据源：仅显示标记为"不认识"或"模糊"的单词（不包括"未标注"状态）。

### ❌ 发现问题

**当前实现**:
```typescript
const learnedCount = bookProgress.filter(p => p.status !== 'new').length
```
- 统计所有**非new**状态的单词：`known` + `fuzzy` + `unknown`
- 进度 = (known + fuzzy + unknown) / total_words

**问题分析**:
1. **逻辑不合理**：把"不认识"(`unknown`)和"模糊"(`fuzzy`)的单词也算作"已学习进度"
2. **用户体验差**：用户标记了100个单词为"不认识"，进度显示100%，但实际上用户一个都没记住
3. **与定义矛盾**：`fuzzy`和`unknown`是"需要复习的错题"，不是"已学习"

**建议的正确逻辑**:
```typescript
// 方案1: 只统计"认识"的单词
const learnedCount = bookProgress.filter(p => p.status === 'known').length
const progress = total_words > 0
  ? Math.round((learnedCount / total_words) * 100)
  : 0

// 方案2: 统计"认识"和"模糊"的单词（模糊也算有一定掌握）
const learnedCount = bookProgress.filter(p => p.status === 'known' || p.status === 'fuzzy').length
const progress = total_words > 0
  ? Math.round((learnedCount / total_words) * 100)
  : 0
```

### ⚠️ 建议
**优先级**: 🔴 高
**影响**: 进度显示不准确，影响用户判断

---

## 3. 错题本数字逻辑

### 实现位置
`src/app/page.tsx:136-142`

### 代码实现
```typescript
// 获取错题数量（状态为 unknown 或 fuzzy 的单词）
const { data: mistakesData } = await supabase
  .from('word_progress')
  .select('id')
  .eq('user_id', user.id)
  .in('status', ['unknown', 'fuzzy'])

mistakesCount = mistakesData?.length || 0
```

### PRD要求
> 错题本：显示错题总数。
> 数据源：仅显示标记为"不认识"或"模糊"的单词（不包括"未标注"状态）。

### ✅ 分析结论
**完全符合PRD要求**：
- ✅ 查询 `unknown` 状态（不认识）
- ✅ 查询 `fuzzy` 状态（模糊）
- ✅ **不包含** `new` 状态（未标注）
- ✅ 统计数量显示

**状态**: ✅ **正确**

---

## 4. 今日新增词数字逻辑

### 实现位置
`src/app/page.tsx:144-153`

### 代码实现
```typescript
// 获取今日新增生词数量
const today = new Date()
today.setHours(0, 0, 0, 0)
const { data: todayWords } = await supabase
  .from('word_progress')
  .select('id')
  .eq('user_id', user.id)
  .gte('created_at', today.toISOString())

todayNewWordsCount = todayWords?.length || 0
```

### PRD要求
> 生词日历：显示今日新增词数。
> 数据源：`word_progress` 表的 `created_at` 字段
> 统计范围：所有状态的单词（known, fuzzy, unknown, new）

### ❌ 发现问题

**问题1: 概念混淆**
- **当前实现**：统计今天**创建**的 `word_progress` 记录数
- **PRD意图**：统计今天**学习**（遇到）的单词数
- **区别**：
  - 如果用户今天第一次遇到单词A，创建了一条 `word_progress` 记录 → 计数+1 ✅
  - 如果用户明天修改了单词A的状态（标记为"认识"）→ `created_at` 是昨天，但用户今天确实"学习"了这个词 → 不计数 ❌

**问题2: 重复计数风险**
- 如果用户今天多次进入同一个词书，`created_at` 是今天的记录会被重复显示吗？
  - 应该不会，因为 `word_progress` 表应该有唯一约束（user_id + word_id + book_id）
  - 但如果用户删除了记录又重新学习，`created_at` 会更新，可能造成混乱

**问题3: 用户期望 vs 实现**
- **用户期望**："我今天学习了多少个新单词？"
- **当前实现**："今天创建了多少条学习记录？"
- **差异**：用户可能更关心"今天标记（学习）了多少个单词"，而不是"第一次遇到多少个单词"

**建议的改进方案**:

```typescript
// 方案1: 统计今天有学习活动的单词（更符合用户期望）
const today = new Date()
today.setHours(0, 0, 0, 0)

const { data: todayActiveWords } = await supabase
  .from('word_progress')
  .select('id')
  .eq('user_id', user.id)
  .gte('updated_at', today.toISOString())  // ✅ 改用 updated_at
  .eq('status', 'new')  // ✅ 只统计今天遇到的新词

todayNewWordsCount = todayActiveWords?.length || 0

// 方案2: 统计今天标记的单词数量（最准确）
// 需要增加一个 activity_log 表记录学习活动
```

### ⚠️ 建议
**优先级**: 🟡 中
**影响**: 用户可能感觉数字不准确，但不影响核心功能

---

## 📊 问题总结

| 功能 | 状态 | 严重性 | 问题描述 |
|------|------|--------|----------|
| **继续学习跳转** | ✅ 优秀 | - | 超出PRD要求，支持多模式状态恢复 |
| **百分比逻辑** | ❌ 错误 | 🔴 高 | 把"不认识"算作进度，应只统计"认识" |
| **错题本数字** | ✅ 正确 | - | 完全符合PRD要求 |
| **今日新增词** | ⚠️ 待优化 | 🟡 中 | 统计"创建"而非"学习"，建议改用updated_at |

---

## 🔧 修复建议

### 1. 修复百分比逻辑（高优先级）

**当前代码** (`src/app/page.tsx:86-89`):
```typescript
const learnedCount = bookProgress.filter((p: any) => p.status !== 'new').length
const progress = (bookData as any).total_words > 0
  ? Math.round((learnedCount / (bookData as any).total_words) * 100)
  : 0
```

**修复后**:
```typescript
// 只统计"认识"的单词作为进度
const learnedCount = bookProgress.filter((p: any) => p.status === 'known').length
const progress = (bookData as any).total_words > 0
  ? Math.round((learnedCount / (bookData as any).total_words) * 100)
  : 0
```

**或者** (如果要把模糊也算有掌握):
```typescript
// 统计"认识"和"模糊"的单词
const learnedCount = bookProgress.filter((p: any) =>
  p.status === 'known' || p.status === 'fuzzy'
).length
const progress = (bookData as any).total_words > 0
  ? Math.round((learnedCount / (bookData as any).total_words) * 100)
  : 0
```

### 2. 优化今日新增词逻辑（中优先级）

**当前代码** (`src/app/page.tsx:147-152`):
```typescript
const { data: todayWords } = await supabase
  .from('word_progress')
  .select('id')
  .eq('user_id', user.id)
  .gte('created_at', today.toISOString())
```

**建议修改**:
```typescript
// 统计今天有学习活动的单词
const { data: todayWords } = await supabase
  .from('word_progress')
  .select('id')
  .eq('user_id', user.id)
  .gte('updated_at', today.toISOString())  // ✅ 改用 updated_at
  .eq('status', 'new')  // ✅ 只统计新遇到的词
```

---

## 🎯 产品建议

### 建议明确PRD定义

**1. 明确"学习进度"的定义**
```
问题：当前PRD没有明确定义什么是"学习进度"

建议：
- 🟢 已学习（known）：用户认识，计入进度
- 🟡 部分掌握（fuzzy）：模糊，是否计入进度？
- 🔴 未掌握（unknown）：不认识，不应计入进度
- ⚪ 未标注（new）：未学习，不应计入进度

推荐方案：
- 保守方案：进度 = known / total * 100%
- 激进方案：进度 = (known + fuzzy) / total * 100%
```

**2. 明确"今日新增词"的定义**
```
问题：created_at 还是 updated_at？

建议：
- 选项A（保守）：今天首次遇到的单词数（created_at）
- 选项B（积极）：今天有学习活动的单词数（updated_at）

推荐：选项B更符合用户预期
```

---

## 📝 测试验证

### 测试场景1: 百分比逻辑
```
前置条件：某本书有100个单词
操作：
1. 用户标记20个为"认识"(known)
2. 用户标记30个为"模糊"(fuzzy)
3. 用户标记50个为"不认识"(unknown)

当前结果显示：进度 = 100% ❌
正确结果应该是：
- 保守方案：进度 = 20% (只算known)
- 激进方案：进度 = 50% (known + fuzzy)
```

### 测试场景2: 今日新增词
```
前置条件：用户昨天学习了单词A（标记为new）
操作：
1. 用户今天修改单词A为"认识"
2. 用户今天第一次遇到单词B（标记为new）

当前结果显示：今日新增 = 1 (只有B) ❌
正确结果应该是：今日新增 = 2 (A和B今天都有学习活动)
```

---

## ✅ 总结

### 优秀实现
- ✅ **继续学习跳转逻辑**：超预期实现，支持多模式状态恢复
- ✅ **错题本数字**：完全符合PRD要求

### 需要修复
- ❌ **百分比逻辑**：把"不认识"算作进度，需要修复（高优先级）
- ⚠️ **今日新增词**：统计逻辑可以优化（中优先级）

### 优先级建议
1. **立即修复**：百分比逻辑（影响用户判断）
2. **后续优化**：今日新增词逻辑（提升体验）

---

**Review完成时间**: 2026-01-09
**Reviewer**: Claude
**状态**: ✅ 完成，发现2个问题需要修复
