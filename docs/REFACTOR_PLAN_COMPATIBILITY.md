# 两阶段学习系统 - 兼容性改造方案（低侵入性）

**版本**: v2.0（兼容性优先）
**创建日期**: 2026-02-03
**设计原则**: 向后兼容、渐进式迁移、可灰度发布

---

## 🎯 核心设计原则

### 1. 向后兼容性承诺

| 层级 | 兼容性要求 | 方案 |
|------|-----------|------|
| **API接口** | 旧前端不报错 | ✅ 保留旧字段，新增新字段 |
| **数据库** | 旧逻辑继续运行 | ✅ 添加新字段，不删除旧字段 |
| **前端组件** | 渐进式升级 | ✅ 新旧UI并存，通过Feature Flag切换 |

### 2. 低侵入性承诺

- ✅ **不删除**任何现有字段或函数
- ✅ **不修改**现有函数签名
- ✅ **不破坏**现有业务逻辑
- ✅ **支持**灰度发布和回滚

---

## 📡 一、接口兼容性方案

### 1.1 API响应结构设计

#### 策略：字段冗余（保留旧字段 + 新增新字段）

**❌ 错误做法**（破坏兼容）：
```json
// v4.0 旧响应
{
  "learned_words": 150,  // 只统计 known
  "progress_percentage": 30.0
}

// 两阶段系统响应（直接修改）❌
{
  "learned_words": 450,  // ❌ 破坏了！旧前端依赖此字段
  "marked_words": 450,    // 新增字段
  "progress_percentage": 90.0
}
```

**✅ 正确做法**（保持兼容）：
```json
// 两阶段系统响应（兼容模式）✅
{
  // ========== 旧字段（保持不变） ==========
  "learned_words": 150,          // ✅ 保留：只统计 known（兼容旧前端）
  "progress_percentage": 30.0,   // ✅ 保留：基于 learned_words 计算

  // ========== 新字段（新增） ==========
  "marked_words": 450,           // ✅ 新增：统计所有标记过的词
  "known_words": 350,            // ✅ 新增：统计 known
  "fuzzy_words": 80,             // ✅ 新增：统计 fuzzy
  "unknown_words": 20,           // ✅ 新增：统计 unknown
  "marked_percentage": 90.0,     // ✅ 新增：基于 marked_words 计算
  "phase": "learning"            // ✅ 新增：当前阶段
}
```

**兼容性说明**：
- ✅ 旧前端：继续使用 `learned_words` 和 `progress_percentage`（不受影响）
- ✅ 新前端：使用 `marked_words` 和 `marked_percentage`（新逻辑）
- ✅ 渐进式迁移：新前端逐步替换引用

---

### 1.2 今日任务API兼容方案

**API**: `GET /api/v3/daily-task?bookId=xxx`

**响应结构**：
```json
{
  "id": "...",
  "task_date": "2026-02-03",
  "plan_day": 12,
  "total_words": 23,

  // ========== 旧字段（保持不变） ==========
  "new_words": [...],           // ✅ 保留
  "review_words": [...],        // ✅ 保留
  "completed_words": [...],     // ✅ 保留（只包含 known）
  "all_completed": false,       // ✅ 保留（基于 completed_words）

  // ========== 新字段（新增） ==========
  "phase": "learning",          // ✅ 新增：当前阶段
  "marked_words": [...],        // ✅ 新增：已标记（任何状态）
  "known_words": [...],         // ✅ 新增：已标记 known
  "fuzzy_words": [...],         // ✅ 新增：已标记 fuzzy
  "unknown_words": [...],       // ✅ 新增：已标记 unknown
  "all_marked": false           // ✅ 新增：是否全部标记过
}
```

**后端实现伪代码**：
```typescript
async function getTodayTask(userId: string, bookId: string) {
  // ========== 旧逻辑（保持不变） ==========
  const completedWords = await getCompletedWords(userId, bookId) // 只返回 known
  const allCompleted = completedWords.length === totalWords

  // ========== 新逻辑（新增） ==========
  const markedWords = await getMarkedWords(userId, bookId)  // 任何状态
  const knownWords = await getWordsByStatus(userId, bookId, 'known')
  const fuzzyWords = await getWordsByStatus(userId, bookId, 'fuzzy')
  const unknownWords = await getWordsByStatus(userId, bookId, 'unknown')
  const allMarked = markedWords.length === totalWords
  const phase = await getPlanPhase(userId, bookId)

  return {
    // 旧字段（兼容）
    completed_words: completedWords,
    all_completed: allCompleted,

    // 新字段（新功能）
    phase,
    marked_words: markedWords,
    known_words: knownWords,
    fuzzy_words: fuzzyWords,
    unknown_words: unknownWords,
    all_marked: allMarked
  }
}
```

---

### 1.3 学习进度API兼容方案

**API**: `GET /api/v3/learning-plan/progress?bookId=xxx`

**响应结构**：
```json
{
  "plan_id": "...",
  "total_words": 500,

  // ========== 旧字段（保持不变） ==========
  "learned_words": 150,          // ✅ 保留：只统计 known
  "progress_percentage": 30.0,   // ✅ 保留：基于 learned_words

  // ========== 新字段（新增） ==========
  "phase": "learning",           // ✅ 新增
  "marked_words": 450,           // ✅ 新增：统计所有标记
  "marked_percentage": 90.0,     // ✅ 新增：基于 marked_words
  "known_words": 350,
  "fuzzy_words": 80,
  "unknown_words": 20,
  "learning_phase_completed_at": null
}
```

---

## 🧱 二、逻辑隔离方案（Strategy模式）

### 2.1 核心问题

新旧逻辑的主要冲突点：

| 功能 | 旧逻辑（v4.0） | 新逻辑（两阶段） |
|------|---------------|----------------|
| **新词选择** | `status != 'known'` | 完全未标记 |
| **完成检测** | 全部 `known` | 全部标记过 |
| **进度计算** | `known / total` | `marked / total` |

**问题**：如何让新旧逻辑共存，且互不影响？

### 2.2 解决方案：Strategy模式 + Feature Flag

#### 架构设计

```
┌─────────────────────────────────────────────┐
│          LearningPlanService                │
│  （统一入口，通过 Strategy 模式路由）         │
└─────────────────┬───────────────────────────┘
                  │
                  │ 根据 phase 字段路由
                  │
      ┌───────────┴──────────┐
      │                      │
      ▼                      ▼
┌─────────────┐      ┌─────────────┐
│  Learning   │      │   Review    │
│  Strategy   │      │  Strategy   │
│ (学习阶段)   │      │ (复习阶段)   │
└─────────────┘      └─────────────┘
      │                      │
      │                      │
      ▼                      ▼
┌─────────────┐      ┌─────────────┐
│ getNewWords │      │ getNewWords │
│  != known   │      │   = 0       │
└─────────────┘      └─────────────┘
```

---

### 2.3 伪代码实现

#### Before（旧代码 - 紧耦合）

```typescript
// ❌ 旧代码：逻辑硬编码，无法扩展
export async function generateTodayTask(userId: string, bookId: string) {
  const plan = await getLearningPlan(userId, bookId)
  const dailyNewWords = plan.daily_new_words

  // ❌ 硬编码：新词 = status != 'known'
  const newWords = await getWordsWhereStatusNotKnown(userId, bookId, dailyNewWords)

  // ❌ 硬编码：复习词 = status = 'known' 且到期的
  const reviewWords = await getDueReviewWords(userId, bookId)

  return { newWords, reviewWords }
}
```

#### After（新代码 - Strategy模式）

```typescript
// ✅ 新代码：Strategy模式，逻辑隔离

// ============ 1. 定义 Strategy 接口 ============
interface PhaseStrategy {
  getNewWords(userId: string, bookId: string, limit: number): Promise<Word[]>
  getReviewWords(userId: string, bookId: string, limit: number): Promise<Word[]>
  isCompleted(userId: string, bookId: string): Promise<boolean>
}

// ============ 2. 实现 Learning 阶段 Strategy ============
class LearningPhaseStrategy implements PhaseStrategy {
  async getNewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    // ✅ 新逻辑：完全未标记的词
    return await getUnmarkedWords(userId, bookId, limit)
  }

  async getReviewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    // ✅ 学习阶段：复习标记为 known 且到期的词
    return await getDueReviewWords(userId, bookId, limit)
  }

  async isCompleted(userId: string, bookId: string): Promise<boolean> {
    // ✅ 新逻辑：所有词都标记过（任何状态）
    const totalWords = await getTotalWords(bookId)
    const markedWords = await getMarkedWords(userId, bookId)
    return markedWords.length >= totalWords
  }
}

// ============ 3. 实现 Review 阶段 Strategy ============
class ReviewPhaseStrategy implements PhaseStrategy {
  async getNewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    // ✅ 复习阶段：不生成新词
    return []
  }

  async getReviewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    // ✅ 复习阶段：复习所有标记过且到期的词（不只 known）
    return await getDueReviewWordsIncludeAll(userId, bookId, limit)
  }

  async isCompleted(): Promise<boolean> {
    // ✅ 复习阶段永不完成
    return false
  }
}

// ============ 4. 实现 Legacy 兼容 Strategy ============
class LegacyPhaseStrategy implements PhaseStrategy {
  // ✅ 保持 v4.0 逻辑不变，用于向后兼容
  async getNewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    // ❌ 旧逻辑：status != 'known'
    return await getWordsWhereStatusNotKnown(userId, bookId, limit)
  }

  async getReviewWords(userId: string, bookId: string, limit: number): Promise<Word[]> {
    // ✅ 复习词逻辑不变
    return await getDueReviewWords(userId, bookId, limit)
  }

  async isCompleted(userId: string, bookId: string): Promise<boolean> {
    // ❌ 旧逻辑：全部 known
    const totalWords = await getTotalWords(bookId)
    const knownWords = await getKnownWords(userId, bookId)
    return knownWords.length >= totalWords
  }
}

// ============ 5. Strategy 工厂 ============
class PhaseStrategyFactory {
  private strategies: Map<string, PhaseStrategy> = new Map()

  constructor() {
    this.strategies.set('learning', new LearningPhaseStrategy())
    this.strategies.set('review', new ReviewPhaseStrategy())
    this.strategies.set('legacy', new LegacyPhaseStrategy())  // ✅ 兼容模式
  }

  getStrategy(phase: string): PhaseStrategy {
    // ✅ 如果没有 phase 字段，使用 legacy 策略（向后兼容）
    return this.strategies.get(phase) || this.strategies.get('legacy')!
  }
}

// ============ 6. 主函数（统一入口） ============
export async function generateTodayTask(userId: string, bookId: string) {
  // ✅ 获取学习计划（包含 phase 字段）
  const plan = await getLearningPlan(userId, bookId)

  // ✅ 根据阶段选择策略
  const strategy = new PhaseStrategyFactory().getStrategy(plan.phase || 'legacy')

  // ✅ 使用策略生成任务
  const newWords = await strategy.getNewWords(userId, bookId, plan.daily_new_words)
  const reviewWords = await strategy.getReviewWords(userId, bookId, 50)

  // ✅ 检测是否需要切换阶段
  if (plan.phase === 'learning' && await strategy.isCompleted(userId, bookId)) {
    await transitionToReviewPhase(userId, bookId)
  }

  return { newWords, reviewWords }
}
```

---

### 2.4 核心优势

| 优势 | 说明 |
|------|------|
| **向后兼容** | `legacy` 策略保持旧逻辑，旧数据继续运行 |
| **逻辑隔离** | 新旧逻辑在不同 Strategy 中，互不影响 |
| **易于测试** | 每个 Strategy 独立测试 |
| **易于扩展** | 未来添加新阶段只需新增 Strategy |
| **支持灰度** | 通过 Feature Flag 控制使用哪个 Strategy |

---

## 🎭 三、Feature Flag方案（灰度发布）

### 3.1 设计目标

- ✅ 支持按用户开启新功能
- ✅ 支持按百分比灰度
- ✅ 支持一键回滚
- ✅ 支持A/B测试

### 3.2 数据库设计

```sql
-- 新建表：feature_flags
CREATE TABLE feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  feature_name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, feature_name)
);

-- 索引
CREATE INDEX idx_feature_flags_user_feature ON feature_flags(user_id, feature_name);

-- RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的feature flags"
ON feature_flags FOR SELECT USING (auth.uid() = user_id);
```

### 3.3 使用示例

```typescript
// 检查用户是否启用新功能
async function isTwoStageLearningEnabled(userId: string): Promise<boolean> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('feature_flags')
    .select('enabled')
    .eq('user_id', userId)
    .eq('feature_name', 'two_stage_learning')
    .single()

  return data?.enabled || false
}

// 策略选择（结合 Feature Flag）
function getStrategyForUser(userId: string, plan: LearningPlan): PhaseStrategy {
  const isNewFeatureEnabled = await isTwoStageLearningEnabled(userId)

  if (!isNewFeatureEnabled) {
    // ✅ 旧功能：使用 legacy 策略
    return new LegacyPhaseStrategy()
  }

  // ✅ 新功能：根据 phase 选择策略
  return new PhaseStrategyFactory().getStrategy(plan.phase || 'learning')
}
```

---

## 📝 四、核心模块伪代码对比

### 4.1 新词生成逻辑

#### Before（旧代码）

```typescript
// ❌ 旧代码：硬编码逻辑
export async function getNewWordsForPlan(
  userId: string,
  bookId: string,
  limit: number
): Promise<Word[]> {
  const supabase = await createClient()

  // ❌ 旧逻辑：查询 status != 'known' 的词
  const { data, error } = await supabase
    .from('words')
    .select('id, word, phonetic, definition')
    .eq('book_id', bookId)

    // ❌ 硬编码：通过 LEFT JOIN 过滤
    .not('word_progress.status', 'eq', 'known')  // 模糊的SQL伪代码

    .limit(limit)

  return data || []
}
```

#### After（新代码 - 兼容模式）

```typescript
// ✅ 新代码：通过数据库函数隔离逻辑

// ============ 数据库函数（向后兼容） ============
/*
-- 新建函数：get_unmarked_words（新逻辑）
CREATE OR REPLACE FUNCTION get_unmarked_words(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.word, w.phonetic, w.definition
  FROM words w
  WHERE w.book_id = p_book_id
    AND NOT EXISTS (
      SELECT 1 FROM word_progress wp
      WHERE wp.word_id = w.id AND wp.user_id = p_user_id
    )
  LIMIT p_limit;
END;
$$ LANGUAGE sql STABLE;

-- 保留旧函数：get_words_not_known（旧逻辑）
CREATE OR REPLACE FUNCTION get_words_not_known(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (...) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.word, w.phonetic, w.definition
  FROM words w
  WHERE w.book_id = p_book_id
    AND NOT EXISTS (
      SELECT 1 FROM word_progress wp
      WHERE wp.word_id = w.id
        AND wp.user_id = p_user_id
        AND wp.status = 'known'  -- ❌ 旧逻辑
    )
  LIMIT p_limit;
END;
$$ LANGUAGE sql STABLE;
*/

// ============ TypeScript 封装（兼容模式） ============
export async function getNewWordsForPlan(
  userId: string,
  bookId: string,
  limit: number,
  options?: { useLegacyLogic?: boolean }  // ✅ 新增：兼容选项
): Promise<Word[]> {
  const supabase = await createClient()

  // ✅ 检查用户是否启用新功能
  const useLegacy = options?.useLegacy ?? !await isTwoStageLearningEnabled(userId)

  const functionName = useLegacy
    ? 'get_words_not_known'    // ❌ 旧逻辑：向后兼容
    : 'get_unmarked_words'     // ✅ 新逻辑：新功能

  const { data, error } = await supabase.rpc(functionName, {
    p_user_id: userId,
    p_book_id: bookId,
    p_limit: limit
  })

  if (error) {
    throw new Error(`查询新词失败: ${error.message}`)
  }

  return data || []
}
```

---

### 4.2 进度计算逻辑

#### Before（旧代码）

```typescript
// ❌ 旧代码：只统计 known
export async function getLearningPlanProgress(
  userId: string,
  bookId: string
): Promise<Progress> {
  const supabase = await createClient()

  // ❌ 硬编码：只统计 known
  const { count: learnedWords } = await supabase
    .from('word_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('book_id', bookId)
    .eq('status', 'known')  // ❌ 旧逻辑

  const progress = (learnedWords / totalWords) * 100

  return {
    learned_words: learnedWords,
    progress_percentage: progress
  }
}
```

#### After（新代码 - 兼容模式）

```typescript
// ✅ 新代码：同时返回新旧统计
export async function getLearningPlanProgress(
  userId: string,
  bookId: string
): Promise<Progress> {
  const supabase = await createClient()

  // ========== 并行查询（性能优化） ==========
  const [
    knownResult,
    fuzzyResult,
    unknownResult
  ] = await Promise.all([
    supabase
      .from('word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('status', 'known'),

    supabase
      .from('word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('status', 'fuzzy'),

    supabase
      .from('word_progress')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('book_id', bookId)
      .eq('status', 'unknown')
  ])

  // ========== 旧统计（保持兼容） ==========
  const learnedWords = knownResult.count || 0
  const oldProgress = (learnedWords / totalWords) * 100

  // ========== 新统计（新增） ==========
  const markedWords = learnedWords + (fuzzyResult.count || 0) + (unknownResult.count || 0)
  const newProgress = (markedWords / totalWords) * 100

  // ========== 返回完整数据（向后兼容） ==========
  return {
    // ✅ 旧字段（保持兼容）
    learned_words: learnedWords,
    progress_percentage: oldProgress,

    // ✅ 新字段（新增）
    marked_words: markedWords,
    marked_percentage: newProgress,
    known_words: knownResult.count || 0,
    fuzzy_words: fuzzyResult.count || 0,
    unknown_words: unknownResult.count || 0
  }
}
```

---

### 4.3 前端组件兼容方案

#### Before（旧代码）

```tsx
// ❌ 旧代码：直接使用 progress 字段
function DailyTaskDisplay({ taskData }: Props) {
  const progress = taskData.progress_percentage
  const learned = taskData.learned_words

  return (
    <div>
      <div>进度: {progress}%</div>
      <div>已学: {learned}个</div>
    </div>
  )
}
```

#### After（新代码 - 兼容模式）

```tsx
// ✅ 新代码：支持新旧字段，自动降级
function DailyTaskDisplay({ taskData }: Props) {
  // ========== 优先使用新字段，降级到旧字段 ==========
  const hasNewFields = 'marked_percentage' in taskData

  const progress = hasNewFields
    ? taskData.marked_percentage  // ✅ 新字段
    : taskData.progress_percentage // ❌ 旧字段（降级）

  const learned = hasNewFields
    ? taskData.marked_words        // ✅ 新字段
    : taskData.learned_words       // ❌ 旧字段（降级）

  const known = taskData.known_words || 0  // ✅ 新字段（可选）

  return (
    <div>
      {/* ✅ 兼容显示 */}
      <div>进度: {progress}%</div>
      <div>已标记: {learned}个 ({known}个认识)</div>

      {/* ✨ 阶段标签（新功能，可选） */}
      {taskData.phase === 'review' && (
        <span className="tag">复习阶段</span>
      )}
    </div>
  )
}
```

---

## 🚀 五、渐进式迁移路线图

### 阶段1：数据库准备（无影响）

```sql
-- ✅ 只添加新字段，不修改旧字段
ALTER TABLE learning_plans ADD COLUMN phase TEXT DEFAULT 'legacy';
ALTER TABLE daily_task_records ADD COLUMN marked_words JSONB DEFAULT '[]';
```

**影响评估**：
- ✅ 旧代码继续运行（使用新字段的默认值）
- ✅ 无业务逻辑变更

---

### 阶段2：后端兼容升级（向后兼容）

```typescript
// ✅ 新旧API字段并存
return {
  // 旧字段
  learned_words: 150,
  progress_percentage: 30.0,

  // 新字段
  marked_words: 450,
  marked_percentage: 90.0
}
```

**影响评估**：
- ✅ 旧前端继续使用 `learned_words`
- ✅ 新前端开始使用 `marked_words`
- ✅ 可通过 Feature Flag 控制

---

### 阶段3：前端渐进升级（可灰度）

```tsx
// ✅ 新旧UI并存，通过 Feature Flag 切换
function DailyTaskDisplay({ taskData }: Props) {
  const isNewUI = useFeatureFlag('two_stage_learning_ui')

  if (isNewUI) {
    return <NewDailyTaskDisplay data={taskData} />
  }

  return <OldDailyTaskDisplay data={taskData} />
}
```

**影响评估**：
- ✅ 10% 用户 → 新UI
- ✅ 收集反馈 → 优化
- ✅ 100% 用户 → 新UI

---

### 阶段4：旧代码下线（完全迁移）

```sql
-- ⚠️ 6个月后：删除旧字段（确认无使用）
ALTER TABLE learning_plans DROP COLUMN IF EXISTS status;
```

**影响评估**：
- ✅ 确认无旧前端依赖
- ✅ 通过监控确认旧字段未被访问
- ✅ 通知用户升级

---

## ✅ 六、兼容性检查清单

### 6.1 API兼容性

- [x] 保留旧字段（`learned_words`, `progress_percentage`）
- [x] 新增新字段（`marked_words`, `marked_percentage`）
- [x] 旧字段值保持不变（向后兼容）
- [x] 新字段为可选（前端可选使用）

### 6.2 数据库兼容性

- [x] 新字段有默认值（`phase = 'legacy'`）
- [x] 旧字段不删除（保留6个月）
- [x] 旧索引不删除（保证查询性能）
- [x] 旧约束不修改（避免数据校验失败）

### 6.3 前端兼容性

- [x] 旧UI继续显示（使用旧字段）
- [x] 新UI可选启用（Feature Flag）
- [x] 自动降级逻辑（新字段不存在时使用旧字段）
- [x] 路由不变（URL兼容）

---

## 🎯 七、侵入性评估

| 改动项 | 侵入性 | 风险等级 | 缓解措施 |
|--------|--------|----------|----------|
| 添加数据库字段 | 🟢 低 | 无 | 新字段有默认值 |
| 添加Strategy类 | 🟢 低 | 无 | 不修改旧类 |
| 添加API字段 | 🟢 低 | 无 | 旧字段保留 |
| 修改前端组件 | 🟡 中 | 低 | 可选Feature Flag |
| 删除旧字段 | 🔴 高 | 高 | ✅ 不执行（6个月后评估） |

**总结**：本次改造采用**添加式开发**，不删除任何现有代码，确保低侵入性。

---

## 📊 八、测试策略

### 8.1 兼容性测试

```typescript
// 测试：旧前端不受影响
describe('兼容性测试', () => {
  it('旧API字段保持不变', async () => {
    const response = await getTodayTask(userId, bookId)

    // ✅ 旧字段存在且值正确
    expect(response).toHaveProperty('learned_words')
    expect(response).toHaveProperty('progress_percentage')
    expect(response.learned_words).toBe(150)  // ✅ 旧逻辑值
  })

  it('新API字段可选使用', async () => {
    const response = await getTodayTask(userId, bookId)

    // ✅ 新字段存在
    expect(response).toHaveProperty('marked_words')
    expect(response).toHaveProperty('marked_percentage')

    // ✅ 新字段值不同（新逻辑）
    expect(response.marked_words).toBe(450)  // ✅ 新逻辑值
  })
})
```

### 8.2 Feature Flag测试

```typescript
describe('Feature Flag测试', () => {
  it('禁用时使用旧逻辑', async () => {
    await setFeatureFlag(userId, 'two_stage_learning', false)
    const task = await generateTodayTask(userId, bookId)

    // ✅ 使用旧逻辑：status != 'known'
    expect(task.newWords.length).toBe(20)
  })

  it('启用时使用新逻辑', async () => {
    await setFeatureFlag(userId, 'two_stage_learning', true)
    const task = await generateTodayTask(userId, bookId)

    // ✅ 使用新逻辑：完全未标记
    expect(task.newWords.length).toBe(15)  // 可能更少
  })
})
```

---

## 📝 九、回滚方案

### 9.1 紧急回滚（即时生效）

```typescript
// ✅ 通过 Feature Flag 一键回滚
async function emergencyRollback() {
  const supabase = await createClient()

  // 禁用新功能
  await supabase
    .from('feature_flags')
    .update({ enabled: false })
    .eq('feature_name', 'two_stage_learning')

  // ✅ 所有用户立即切回旧逻辑
}
```

### 9.2 数据库回滚（可选执行）

```sql
-- ⚠️ 6个月后执行（确认无依赖）
ALTER TABLE learning_plans DROP COLUMN IF EXISTS phase;
ALTER TABLE daily_task_records DROP COLUMN IF EXISTS marked_words;
```

---

## 🎓 十、最佳实践总结

### ✅ DO（推荐做法）

1. ✅ **字段冗余**：保留旧字段，新增新字段
2. ✅ **Strategy模式**：新旧逻辑隔离
3. ✅ **Feature Flag**：支持灰度发布
4. ✅ **渐进式迁移**：分阶段，小步快跑
5. ✅ **自动降级**：新字段不存在时使用旧字段
6. ✅ **充分测试**：兼容性测试必须覆盖

### ❌ DON'T（避免做法）

1. ❌ **直接修改旧字段**：破坏向后兼容
2. ❌ **删除旧代码**：导致旧前端报错
3. ❌ **硬编码逻辑**：难以扩展和维护
4. ❌ **一次性全量发布**：风险高，难以回滚
5. ❌ **缺少降级逻辑**：新字段不存在时崩溃

---

**文档结束**

**下一步**：
1. 评审本方案
2. 确认Feature Flag实现
3. 开始阶段1：数据库准备
