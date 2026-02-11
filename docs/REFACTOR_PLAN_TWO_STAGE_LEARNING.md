# 旧代码改造计划书 - 两阶段学习系统升级

**版本**: v1.0
**创建日期**: 2026-02-03
**作者**: 首席维护工程师
**状态**: 待执行

---

## 📋 执行摘要

本计划书详细分析了从现有 v4.0 学习计划系统升级到**两阶段学习系统**所需的代码改造。

### 核心变更摘要

| 维度 | 现有逻辑 (v4.0) | PRD要求 (两阶段) | 影响等级 |
|------|----------------|-----------------|----------|
| **新词定义** | `status != 'known'` 的词 | 完全未标记的词（`word_progress` 表无记录） | 🔴 **高** |
| **完成定义** | 所有词标记为 `known` | 所有词标记过（任何状态） | 🔴 **高** |
| **阶段概念** | 无 | 学习阶段 → 复习阶段 | 🔴 **高** |
| **复习逻辑** | 只复习 `known` 的词 | 复习所有标记过的词 | 🟡 **中** |
| **进度显示** | `learned_words / total`（只统计 known） | `marked_words / total`（统计任何状态） | 🟢 **低** |

---

## 🔍 一、定位改动点 (Code Mapping)

### 1.1 数据库层改动

#### 📄 `supabase/migrations/20260130_upgrade_to_v4.sql`

**现有逻辑**：
```sql
-- 第140-146行：只统计 known 状态
SELECT COUNT(DISTINCT word_id)
INTO v_learned_words
FROM word_progress
WHERE user_id = p_user_id
  AND book_id = p_book_id
  AND status = 'known';  -- ❌ 旧逻辑：只有"认识"才算学过
```

**改造建议**：
```sql
-- ✅ 新逻辑：统计所有标记过的词
SELECT COUNT(DISTINCT word_id)
INTO v_learned_words
FROM word_progress
WHERE user_id = p_user_id
  AND book_id = p_book_id;
-- 删除 status = 'known' 条件
```

**影响**：
- ✅ **复用性**：函数结构不变，只需删除一个条件
- ⚠️ **破坏性**：所有依赖此函数的API返回值会变化

---

#### 📄 `learning_plans` 表结构

**现有字段**：
```sql
status TEXT CHECK (status IN ('active', 'paused', 'completed', 'delayed'))
```

**改造建议**：
```sql
-- 方案A：修改现有字段（推荐）
ALTER TABLE learning_plans
DROP CONSTRAINT IF EXISTS learning_plans_status_check;

ALTER TABLE learning_plans
ADD CONSTRAINT learning_plans_status_check
CHECK (status IN ('learning', 'review', 'paused', 'completed'));

-- 方案B：添加新字段（更安全）
ALTER TABLE learning_plans
ADD COLUMN phase TEXT DEFAULT 'learning'
CHECK (phase IN ('learning', 'review'));

-- 添加完成时间字段
ALTER TABLE learning_plans
ADD COLUMN learning_phase_completed_at TIMESTAMPTZ;
```

**建议**：**方案B**（添加新字段）更安全，兼容性更好

---

#### 📄 新建迁移文件：`20260203_upgrade_to_two_stage.sql`

```sql
-- ============================================================================
-- 两阶段学习系统升级
-- ============================================================================
-- 1. 添加 phase 字段
ALTER TABLE learning_plans
ADD COLUMN IF NOT EXISTS phase TEXT DEFAULT 'learning'
CHECK (phase IN ('learning', 'review'));

-- 2. 添加完成时间字段
ALTER TABLE learning_plans
ADD COLUMN IF NOT EXISTS learning_phase_completed_at TIMESTAMPTZ;

-- 3. 添加复习阶段开始时间
ALTER TABLE learning_plans
ADD COLUMN IF NOT EXISTS review_phase_started_at TIMESTAMPTZ;

-- 4. 修改 daily_task_records 添加标记统计字段
ALTER TABLE daily_task_records
ADD COLUMN IF NOT EXISTS marked_words JSONB DEFAULT '[]';
ALTER TABLE daily_task_records
ADD COLUMN IF NOT EXISTS known_words JSONB DEFAULT '[]';
ALTER TABLE daily_task_records
ADD COLUMN IF NOT EXISTS fuzzy_words JSONB DEFAULT '[]';
ALTER TABLE daily_task_records
ADD COLUMN IF NOT EXISTS unknown_words JSONB DEFAULT '[]';

-- 5. 添加注释
COMMENT ON COLUMN learning_plans.phase IS '学习阶段: learning(学习阶段) | review(复习阶段)';
COMMENT ON COLUMN learning_plans.learning_phase_completed_at IS '学习阶段完成时间';
COMMENT ON COLUMN learning_plans.review_phase_started_at IS '复习阶段开始时间';
COMMENT ON COLUMN daily_task_records.marked_words IS '已标记（任何状态）的词ID数组';
COMMENT ON COLUMN daily_task_records.known_words IS '标记为"认识"的词ID数组';
COMMENT ON COLUMN daily_task_records.fuzzy_words IS '标记为"模糊"的词ID数组';
COMMENT ON COLUMN daily_task_records.unknown_words IS '标记为"不认识"的词ID数组';

-- 6. 创建函数：检测学习阶段是否完成
CREATE OR REPLACE FUNCTION check_learning_phase_completion(
  p_user_id UUID,
  p_book_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_total_words INTEGER;
  v_marked_words INTEGER;
BEGIN
  -- 统计单词书总词数
  SELECT COUNT(*) INTO v_total_words
  FROM words
  WHERE book_id = p_book_id;

  -- 统计已标记的词数（任何状态）
  SELECT COUNT(DISTINCT word_id) INTO v_marked_words
  FROM word_progress
  WHERE user_id = p_user_id
    AND book_id = p_book_id;

  -- 如果所有词都标记过，返回 TRUE
  RETURN v_marked_words >= v_total_words;
END;
$$ LANGUAGE plpgsql STABLE;

COMMENT ON FUNCTION check_learning_phase_completion IS
'检测学习阶段是否完成（所有词都标记过）';

-- 7. 创建函数：自动切换到复习阶段
CREATE OR REPLACE FUNCTION transition_to_review_phase(
  p_user_id UUID,
  p_book_id UUID
) RETURNS VOID AS $$
BEGIN
  -- 更新学习计划状态
  UPDATE learning_plans
  SET phase = 'review',
      learning_phase_completed_at = NOW(),
      review_phase_started_at = NOW(),
      updated_at = NOW()
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND phase = 'learning';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION transition_to_review_phase IS
'自动切换学习计划到复习阶段';
```

---

### 1.2 后端逻辑层改动

#### 📄 `src/lib/learning-plan-server.ts`

**函数1：`generateTodayTask()` - 生成今日任务**

**位置**：第92-242行

**现有逻辑冲突**：
```typescript
// 第138行：获取新学单词（从未学过的，只看 known 状态）
const newWords = await getNewWordsForPlan(userId, bookId, newWordsCount)
```

**改造建议**：
```typescript
// ✅ 新逻辑：检查当前阶段
const plan = await getLearningPlan(userId, bookId)

let newWordsCount: number
if (plan.phase === 'learning') {
  // 学习阶段：生成新词
  newWordsCount = learningPlan.daily_new_words
} else {
  // 复习阶段：不生成新词
  newWordsCount = 0
}

const newWords = newWordsCount > 0
  ? await getNewWordsForPlanV2(userId, bookId, newWordsCount)  // ✅ 使用新版本
  : []

// ✅ 检测是否需要切换到复习阶段
if (plan.phase === 'learning') {
  const isCompleted = await checkLearningPhaseCompletion(userId, bookId)
  if (isCompleted) {
    await transitionToReviewPhase(userId, bookId)
  }
}
```

---

**函数2：`getNewWordsForPlan()` - 获取新学单词**

**位置**：第419-447行

**现有逻辑冲突**：
```typescript
// 第404行注释：只查询标记为"认识"的词作为"已学过"
// 第431行：调用数据库函数 get_new_words_for_learning
// 数据库函数内部逻辑（v4.0）：
//   WHERE wp.status IS NULL OR wp.status != 'known'  -- ❌ 旧逻辑
```

**改造建议**：

**方案A：修改数据库函数（推荐）**

创建新数据库函数：
```sql
-- 在迁移文件中添加
CREATE OR REPLACE FUNCTION get_new_words_for_learning_v2(
  p_user_id UUID,
  p_book_id UUID,
  p_limit INTEGER DEFAULT 20
) RETURNS TABLE (
  id UUID,
  word TEXT,
  phonetic TEXT,
  definition TEXT,
  example_sentence TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT w.id, w.word, w.phonetic, w.definition, w.example_sentence
  FROM words w
  WHERE w.book_id = p_book_id
    AND NOT EXISTS (
      -- ✅ 新逻辑：完全未标记的词（word_progress 表中没有记录）
      SELECT 1 FROM word_progress wp
      WHERE wp.word_id = w.id
        AND wp.user_id = p_user_id
    )
  ORDER BY RANDOM()
  LIMIT p_limit;
END;
$$ LANGUAGE sql STABLE;
```

**方案B：新增TypeScript函数**

```typescript
/**
 * 获取完全未标记的单词（两阶段系统专用）
 *
 * @param userId 用户 ID
 * @param bookId 单词书 ID
 * @param limit 数量
 * @returns 单词列表
 */
export async function getUnmarkedWordsForPlan(
  userId: string,
  bookId: string,
  limit: number
): Promise<Array<{ id: string; word: string; phonetic?: string; meaning?: string }>> {
  const supabase = await createClient()

  if (limit <= 0) return []

  // ✅ 新逻辑：查询完全未标记的词
  const { data, error } = await supabase
    .from('words')
    .select('id, word, phonetic, definition, example_sentence')
    .eq('book_id', bookId)

    // ✅ 关键变更：使用 NOT EXISTS 子查询
    const { data, error } = await supabase.rpc('get_unmarked_words', {
      p_user_id: userId,
      p_book_id: bookId,
      p_limit: limit
    })

  if (error) {
    throw new Error(`查询未标记单词失败: ${error.message}`)
  }

  return (data || []).map((w: any) => ({
    id: w.id,
    word: w.word,
    phonetic: w.phonetic || '',
    meaning: w.definition || ''
  }))
}
```

**建议**：**方案A + 方案B** 双保险
- 方案A：数据库层面保证性能
- 方案B：应用层兜底

---

**函数3：`enrichTodayTaskWithWords()` - 丰富今日任务数据**

**位置**：第247-346行

**改造建议**：
```typescript
async function enrichTodayTaskWithWords(
  userId: string,
  bookId: string,
  task: DailyTaskRecord
): Promise<TodayTaskResponse> {
  // ... 现有代码 ...

  // ✅ 新增：查询当前阶段
  const plan = await getLearningPlan(userId, bookId)

  return {
    ...task,
    new_words: newWordsWithStatus,
    review_words: reviewWordsWithStatus,
    phase: plan.phase || 'learning',  // ✅ 新增字段
    marked_words: allWordIds,         // ✅ 新增字段
    known_words: knownWordIds,        // ✅ 新增字段
    fuzzy_words: fuzzyWordIds,        // ✅ 新增字段
    unknown_words: unknownWordIds     // ✅ 新增字段
  }
}
```

---

#### 📄 `src/app/api/v3/daily-task/route.ts`

**现有API响应**：
```json
{
  "id": "...",
  "task_date": "2026-02-03",
  "plan_day": 12,
  "total_words": 23,
  "new_words": [...],
  "review_words": [...],
  "completed_words": [...],
  "all_completed": false
}
```

**改造建议**：
```json
{
  "id": "...",
  "task_date": "2026-02-03",
  "plan_day": 12,
  "total_words": 23,

  // ✅ 新增字段
  "phase": "learning",

  "new_words": [...],
  "review_words": [...],

  // ✅ 新增字段
  "marked_words": ["id1", "id2", ...],
  "known_words": ["id1", ...],
  "fuzzy_words": ["id2", ...],
  "unknown_words": ["id3", ...],

  // 保持兼容
  "completed_words": [...],
  "all_completed": false
}
```

---

#### 📄 `src/app/api/v3/learning-plan/progress/route.ts`

**现有API响应**：
```json
{
  "plan_id": "...",
  "total_words": 500,
  "learned_words": 150,  // ❌ 只统计 known
  "progress_percentage": 30.0,
  "streak_days": 12
}
```

**改造建议**：
```json
{
  "plan_id": "...",
  "total_words": 500,

  // ✅ 修改统计逻辑
  "learned_words": 450,  // ✅ 统计所有标记过的词

  // ✅ 新增详细统计
  "marked_words": 450,
  "known_words": 350,
  "fuzzy_words": 80,
  "unknown_words": 20,

  "progress_percentage": 90.0,

  // ✅ 新增字段
  "phase": "learning",
  "learning_phase_completed_at": null,

  "streak_days": 12
}
```

---

### 1.3 前端改动

#### 📄 `src/components/learning-plan/DailyTaskDisplay.tsx`

**改动点1：进度条计算**

**现有代码（第212-217行）**：
```typescript
const completedCount = completedWordsArray.length  // 已标记"认识"的词
const totalCount = taskData?.total_words || 0
const realProgress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
```

**改造建议**：
```typescript
// ✅ 新逻辑：使用 marked_words
const markedWordsArray = normalizeToArray(taskData?.marked_words)
const knownWordsArray = normalizeToArray(taskData?.known_words)

const markedCount = markedWordsArray.length   // 已标记（任何状态）
const knownCount = knownWordsArray.length     // 已认识

const totalCount = taskData?.total_words || 0
const realProgress = totalCount > 0 ? Math.round((markedCount / totalCount) * 100) : 0
```

---

**改动点2：进度文字显示**

**现有代码（第393行）**：
```typescript
<span>{completedCount} / {totalCount} ({realProgress}%)</span>
```

**改造建议**：
```typescript
// ✅ 新显示格式
<span>{markedCount} / {totalCount} 已标记 ({knownCount}个认识)</span>
```

---

**改动点3：添加阶段标签**

**位置**：第330行之后

```typescript
{/* ✨ 新增：阶段标签 */}
<div className="flex items-center gap-2">
  <div className="px-2 py-0.5 text-xs font-black border border-transparent bg-black text-white">
    DAY {taskData?.plan_day || 1}
  </div>

  {/* ✨ 复习阶段标签 */}
  {taskData?.phase === 'review' && (
    <div className="px-2 py-0.5 text-[9px] font-black bg-purple-500 text-white rounded">
      复习阶段
    </div>
  )}
</div>
```

---

#### 📄 `src/app/learning-plan/daily-task/pageClient.tsx`

**改动点：学习提示**

**现有代码（第288-302行）**：
```tsx
{/* 💡 学习提示 */}
<div>
  <ul>
    <li>• 每个词必须标记"认识"才算完成</li>
    <li>• 标记"不认识"的词会在当天循环出现</li>
    <li>• 复习词和新学词混合在一起</li>
  </ul>
</div>
```

**改造建议**：
```tsx
{/* 💡 学习提示 */}
<div>
  {/* ✨ 根据阶段显示不同提示 */}
  {task?.phase === 'review' ? (
    <ul>
      <li>• 复习阶段：巩固之前学过的单词</li>
      <li>• 每个词只需标记一次当前状态</li>
      <li>• 认识的词会延长复习间隔</li>
      <li>• 模糊/不认识的词会重新进入学习</li>
    </ul>
  ) : (
    <ul>
      <li>• 标记任何状态都算"完成当前词"</li>
      <li>• 认识 = 完全掌握，模糊/不认识 = 继续学习</li>
      <li>• 所有词都标记后，进入复习阶段</li>
      <li>• 建议诚实标记，系统会智能安排复习</li>
    </ul>
  )}
</div>
```

---

#### 📄 `src/app/learning-complete/pageClient.tsx`

**改动点1：完成文案**

**现有代码（第169-176行）**：
```tsx
<h1>🎉 今日任务完成！</h1>
<p>太棒了！所有单词都标记"认识"了</p>
```

**改造建议**：
```tsx
<h1>🎉 今日任务完成！</h1>

{/* ✨ 根据阶段显示不同文案 */}
{stats.phase === 'review' ? (
  <p>复习完成！继续巩固，加深记忆</p>
) : (
  <p>所有单词都已标记，即将进入复习阶段</p>
)}
```

---

**改动点2：添加阶段指示器**

**位置**：学习计划进度卡片内（第212行之后）

```tsx
{/* 学习计划进度 */}
<div className="p-6 border-2 rounded-xl">
  <div className="flex items-center gap-2 mb-4">
    <BookOpen className="w-5 h-5" />
    <h2>📚 学习计划进度</h2>
  </div>

  {/* ✨ 新增：阶段指示器 */}
  <div className="flex items-center gap-2 p-3 rounded-lg mb-4" style={{
    backgroundColor: stats.phase === 'review' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(99, 102, 241, 0.1)'
  }}>
    <div className={`w-3 h-3 rounded-full ${
      stats.phase === 'review' ? 'bg-purple-500' : 'bg-indigo-500'
    } animate-pulse`} />
    <span className="text-sm font-bold">
      {stats.phase === 'review' ? '复习阶段' : '学习阶段'}
    </span>
    <span className="text-xs text-gray-500 ml-auto">
      {stats.phase === 'learning'
        ? '新词学习 + 复习巩固'
        : '复习已学单词，加深记忆'}
    </span>
  </div>

  {/* 原有进度条 */}
  {/* ... */}
</div>
```

---

#### 📄 `src/types/learning-plan.ts`

**改动点：类型定义**

**位置**：第129-157行

```typescript
/**
 * 今日任务响应（包含单词详情）
 */
export interface TodayTaskResponse {
  id: string
  task_date: string
  plan_day: number
  total_words: number
  new_words: WordWithStatus[]
  review_words: WordWithStatus[]
  completed_words: string[]

  // ✨ 新增字段
  phase: 'learning' | 'review'           // 当前阶段
  marked_words: string[]                 // 已标记（任何状态）
  known_words: string[]                  // 已标记"认识"
  fuzzy_words: string[]                  // 已标记"模糊"
  unknown_words: string[]                // 已标记"不认识"

  all_completed: boolean
  started_at?: string
  completed_at?: string
}

/**
 * 学习计划进度统计
 */
export interface LearningPlanProgress {
  plan_id: string
  total_words: number
  learned_words: number                  // ✅ 修改：统计所有标记过的词

  // ✨ 新增字段
  phase: 'learning' | 'review'           // 当前阶段
  marked_words: number                   // 已标记数量
  known_words: number                    // 认识数量
  fuzzy_words: number                    // 模糊数量
  unknown_words: number                  // 不认识数量
  learning_phase_completed_at?: string   // 学习阶段完成时间
  review_phase_started_at?: string       // 复习阶段开始时间

  progress_percentage: number
  streak_days: number
  daily_new_words: number
  review_ratio: number
}
```

---

## ♻️ 二、复用性评估 (Reusability)

### 2.1 可以直接复用的代码

| 组件/函数 | 文件 | 复用方式 | 说明 |
|----------|------|----------|------|
| `FlashcardQueue` | `components/learning-plan/FlashcardQueue.tsx` | ✅ 无需改动 | 卡片背单词逻辑不变 |
| `DictationQueue` | `components/learning-plan/DictationQueue.tsx` | ✅ 无需改动 | 听写模式逻辑不变 |
| `LearningPlanWorkspace` | `components/learning-plan/LearningPlanWorkspace.tsx` | ✅ 无需改动 | Tab切换逻辑不变 |
| `getDueReviewWords()` | `lib/learning-plan-server.ts:360` | ✅ 无需改动 | 复习词查询逻辑不变 |
| RLS策略 | `20260127_add_learning_plan.sql:84-101` | ✅ 无需改动 | 安全策略不变 |
| 触发器 | `20260127_add_learning_plan.sql:419-434` | ✅ 无需改动 | 自动更新时间戳不变 |

### 2.2 需要废弃的代码

| 函数/逻辑 | 位置 | 废弃原因 | 替代方案 |
|----------|------|----------|----------|
| `get_learning_plan_progress()` 中的 `status = 'known'` 过滤 | `20260130_upgrade_to_v4.sql:146` | 统计逻辑变更 | 删除该条件 |
| `getNewWordsForPlan()` 的旧查询逻辑 | `lib/learning-plan-server.ts:431` | 新词定义变更 | 使用新数据库函数 `get_unmarked_words` |
| 进度条 `completed_count / total_count` | `DailyTaskDisplay.tsx:217` | 进度定义变更 | 使用 `marked_count / total_count` |
| 学习提示 "必须标记认识才算完成" | `daily-task/pageClient.tsx:299` | 文案不准确 | 更新为两阶段提示 |

### 2.3 需要重构的代码

| 函数/组件 | 重构原因 | 重构复杂度 |
|----------|----------|------------|
| `generateTodayTask()` | 需添加阶段检测逻辑 | 🟡 **中** |
| `getNewWordsForPlan()` | 需修改查询条件 | 🟡 **中** |
| `enrichTodayTaskWithWords()` | 需添加新字段 | 🟢 **低** |
| `DailyTaskDisplay` | 进度条逻辑变更 | 🟢 **低** |
| `LearningCompletePage` | 添加阶段说明 | 🟢 **低** |

---

## 🗄️ 三、数据结构审查

### 3.1 现有表结构评估

#### `learning_plans` 表

| 字段 | 类型 | PRD需求 | 状态 | 建议 |
|------|------|---------|------|------|
| `id` | UUID | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `user_id` | UUID | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `book_id` | UUID | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `daily_new_words` | INTEGER | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `review_ratio` | INTEGER | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `total_words` | INTEGER | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `start_date` | DATE | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `estimated_end_date` | DATE | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `actual_end_date` | DATE | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `status` | TEXT | ⚠️ 需扩展 | ⚠️ 冲突 | **建议添加新字段 `phase`** |
| `created_at` | TIMESTAMPTZ | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `updated_at` | TIMESTAMPTZ | ✅ 需保留 | ✅ 兼容 | 无需改动 |

**✅ 结论**：**建议添加新字段**（而不是修改现有字段）

```sql
-- ✅ 推荐：添加新字段
ALTER TABLE learning_plans
ADD COLUMN phase TEXT DEFAULT 'learning'
CHECK (phase IN ('learning', 'review'));

ALTER TABLE learning_plans
ADD COLUMN learning_phase_completed_at TIMESTAMPTZ;

ALTER TABLE learning_plans
ADD COLUMN review_phase_started_at TIMESTAMPTZ;
```

**原因**：
1. 保持向后兼容
2. 旧代码可以继续运行（新字段有默认值）
3. 逐步迁移，风险更低

---

#### `daily_task_records` 表

| 字段 | 类型 | PRD需求 | 状态 | 建议 |
|------|------|---------|------|------|
| `id` | UUID | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `user_id` | UUID | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `book_id` | UUID | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `plan_id` | UUID | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `task_date` | DATE | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `plan_day` | INTEGER | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `new_words` | JSONB | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `review_words` | JSONB | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `completed_words` | JSONB | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `uncompleted_words` | JSONB | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `total_words` | INTEGER | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `all_completed` | BOOLEAN | ✅ 需保留 | ⚠️ 逻辑变更 | **需更新触发器逻辑** |
| `started_at` | TIMESTAMPTZ | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `completed_at` | TIMESTAMPTZ | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `created_at` | TIMESTAMPTZ | ✅ 需保留 | ✅ 兼容 | 无需改动 |
| `updated_at` | TIMESTAMPTZ | ✅ 需保留 | ✅ 兼容 | 无需改动 |

**✅ 需要添加的字段**：

```sql
-- ✅ 新增：详细标记统计
ALTER TABLE daily_task_records
ADD COLUMN IF NOT EXISTS marked_words JSONB DEFAULT '[]';
ALTER TABLE daily_task_records
ADD COLUMN IF NOT EXISTS known_words JSONB DEFAULT '[]';
ALTER TABLE daily_task_records
ADD COLUMN IF NOT EXISTS fuzzy_words JSONB DEFAULT '[]';
ALTER TABLE daily_task_records
ADD COLUMN IF NOT EXISTS unknown_words JSONB DEFAULT '[]';
```

---

#### `review_schedule` 表

**评估结果**：✅ **完全兼容，无需改动**

| 字段 | 类型 | PRD需求 | 状态 |
|------|------|---------|------|
| `word_id` | UUID | ✅ 需保留 | ✅ 兼容 |
| `user_id` | UUID | ✅ 需保留 | ✅ 兼容 |
| `book_id` | UUID | ✅ 需保留 | ✅ 兼容 |
| `review_count` | INTEGER | ✅ 需保留 | ✅ 兼容 |
| `next_review_date` | DATE | ✅ 需保留 | ✅ 兼容 |
| `interval_days` | INTEGER(7/15/30) | ✅ 需保留 | ✅ 兼容 |

**现有复习间隔逻辑**：7 → 15 → 30
**PRD要求**：1 → 7 → 15 → 30

**⚠️ 冲突点**：复习间隔起点不同

**改造建议**：

```sql
-- ✅ 修改间隔类型（添加 1）
ALTER TABLE review_schedule
DROP CONSTRAINT IF EXISTS review_schedule_interval_days_check;

ALTER TABLE review_schedule
ADD CONSTRAINT review_schedule_interval_days_check
CHECK (interval_days IN (1, 7, 15, 30));

-- ✅ 更新现有数据（将 7 改为 1）
UPDATE review_schedule
SET interval_days = 1
WHERE interval_days = 7
  AND review_count = 0;  -- 只修改第一次复习的词
```

---

#### `word_progress` 表

**评估结果**：✅ **完全兼容，无需改动**

现有表结构已支持三态标记（`known`/`fuzzy`/`unknown`），完全符合PRD需求。

---

### 3.2 索引优化建议

**新增索引**：

```sql
-- 优化：查询完全未标记的词
CREATE INDEX IF NOT EXISTS idx_words_unmarked
ON words(book_id, id);

-- 优化：查询学习阶段状态
CREATE INDEX IF NOT EXISTS idx_learning_plans_phase
ON learning_plans(user_id, phase)
WHERE phase = 'learning';

-- 优化：查询复习阶段状态
CREATE INDEX IF NOT EXISTS idx_learning_plans_review
ON learning_plans(user_id, phase)
WHERE phase = 'review';
```

---

## 📋 四、受影响文件清单及修改建议

### 4.1 数据库迁移文件

| 文件 | 改动类型 | 优先级 | 工作量 |
|------|----------|--------|--------|
| **新建**：`20260203_upgrade_to_two_stage.sql` | ✨ 新建迁移 | 🔴 P0 | 2h |
| `20260130_upgrade_to_v4.sql` | 🔧 修改函数 | 🟡 P1 | 0.5h |

---

### 4.2 后端逻辑文件

| 文件 | 改动函数/位置 | 改动类型 | 优先级 | 工作量 |
|------|---------------|----------|--------|--------|
| `lib/learning-plan-server.ts` | `generateTodayTask()` (92-242行) | 🔧 修改逻辑 | 🔴 P0 | 1.5h |
| `lib/learning-plan-server.ts` | `getNewWordsForPlan()` (419-447行) | 🔧 修改查询 | 🔴 P0 | 1h |
| `lib/learning-plan-server.ts` | **新增**：`getUnmarkedWordsForPlan()` | ✨ 新建函数 | 🔴 P0 | 1h |
| `lib/learning-plan-server.ts` | `enrichTodayTaskWithWords()` (247-346行) | 🔧 添加字段 | 🟡 P1 | 0.5h |
| `api/v3/daily-task/route.ts` | GET handler | 🔧 添加字段 | 🟡 P1 | 0.5h |
| `api/v3/daily-task/route.ts` | POST handler | 🔧 添加检测 | 🟡 P1 | 0.5h |
| `api/v3/learning-plan/progress/route.ts` | GET handler | 🔧 修改统计 | 🟡 P1 | 0.5h |
| `api/v3/learning-plan/status/route.ts` | POST handler | ✨ 新增阶段切换 | 🟢 P2 | 1h |

---

### 4.3 前端组件文件

| 文件 | 改动位置 | 改动类型 | 优先级 | 工作量 |
|------|----------|----------|--------|--------|
| `types/learning-plan.ts` | 第129-157行 | 🔧 添加字段 | 🔴 P0 | 0.5h |
| `components/learning-plan/DailyTaskDisplay.tsx` | 第212-396行 | 🔧 进度逻辑 | 🟡 P1 | 1h |
| `components/learning-plan/DailyTaskDisplay.tsx** | 第330行后 | ✨ 添加标签 | 🟡 P1 | 0.5h |
| `app/learning-plan/daily-task/pageClient.tsx` | 第288-302行 | 🔧 更新提示 | 🟡 P1 | 0.5h |
| `app/learning-complete/pageClient.tsx` | 第169-176行 | 🔧 更新文案 | 🟡 P1 | 0.5h |
| `app/learning-complete/pageClient.tsx` | 第212行后 | ✨ 添加指示器 | 🟡 P1 | 1h |

---

### 4.4 测试文件

| 文件 | 改动类型 | 优先级 | 工作量 |
|------|----------|--------|--------|
| **新建**：`__tests__/two-stage-learning.test.ts` | ✨ 新建测试 | 🟡 P1 | 2h |
| **新建**：`__tests__/integration/phase-transition.test.ts` | ✨ 集成测试 | 🟢 P2 | 1.5h |

---

## 🎯 五、实施策略建议

### 5.1 分阶段实施计划

**阶段1：数据库准备（P0，必须先完成）**
- 创建迁移文件 `20260203_upgrade_to_two_stage.sql`
- 在测试环境执行迁移
- 验证表结构和索引

**阶段2：后端逻辑升级（P0）**
- 修改 `getNewWordsForPlan()` 函数
- 修改 `generateTodayTask()` 函数
- 添加阶段检测逻辑
- 更新API响应字段

**阶段3：前端适配（P1）**
- 更新类型定义
- 修改进度条逻辑
- 更新学习提示文案
- 添加阶段标签

**阶段4：测试与验证（P1）**
- 单元测试
- 集成测试
- 用户验收测试

**阶段5：灰度发布（P2）**
- 选定测试用户
- 收集反馈
- 修复问题
- 全量发布

---

### 5.2 风险控制

| 风险 | 影响 | 缓解措施 |
|------|------|----------|
| 数据库迁移失败 | 🔴 高 | 1. 先在测试环境验证<br>2. 备份生产数据<br>3. 准备回滚脚本 |
| 新词生成逻辑错误 | 🔴 高 | 1. 代码审查<br>2. 单元测试覆盖<br>3. 灰度发布 |
| 用户困惑进度变化 | 🟡 中 | 1. 更新提示文案<br>2. 添加帮助文档<br>3. 客服培训 |
| 性能下降 | 🟡 中 | 1. 添加索引<br>2. 查询优化<br>3. 监控告警 |

---

### 5.3 回滚方案

**如果升级失败，执行以下回滚步骤**：

```sql
-- 回滚脚本：20260203_rollback_two_stage.sql

-- 1. 删除新字段
ALTER TABLE learning_plans DROP COLUMN IF EXISTS phase;
ALTER TABLE learning_plans DROP COLUMN IF EXISTS learning_phase_completed_at;
ALTER TABLE learning_plans DROP COLUMN IF EXISTS review_phase_started_at;

ALTER TABLE daily_task_records DROP COLUMN IF EXISTS marked_words;
ALTER TABLE daily_task_records DROP COLUMN IF EXISTS known_words;
ALTER TABLE daily_task_records DROP COLUMN IF EXISTS fuzzy_words;
ALTER TABLE daily_task_records DROP COLUMN IF EXISTS unknown_words;

-- 2. 恢复旧函数
DROP FUNCTION IF EXISTS check_learning_phase_completion;
DROP FUNCTION IF EXISTS transition_to_review_phase;
DROP FUNCTION IF EXISTS get_unmarked_words;

-- 3. 恢复复习间隔约束
ALTER TABLE review_schedule
DROP CONSTRAINT IF EXISTS review_schedule_interval_days_check;

ALTER TABLE review_schedule
ADD CONSTRAINT review_schedule_interval_days_check
CHECK (interval_days IN (7, 15, 30));
```

---

## 📊 六、工作量评估

| 阶段 | 任务 | 预估工时 | 责任人 |
|------|------|----------|--------|
| **阶段1** | 数据库迁移 | 2h | 后端工程师 |
| **阶段2** | 后端逻辑升级 | 4.5h | 后端工程师 |
| **阶段3** | 前端适配 | 4h | 前端工程师 |
| **阶段4** | 测试与验证 | 3.5h | QA工程师 |
| **阶段5** | 灰度发布 | 4h | 运维工程师 |
| **总计** | - | **18h** | - |

---

## ✅ 七、检查清单

### 7.1 开发前检查

- [ ] PRD文档已评审通过
- [ ] 技术方案已评审
- [ ] 测试环境已准备
- [ ] 代码审查人员已确定

### 7.2 开发中检查

- [ ] 数据库迁移脚本已编写
- [ ] 单元测试已编写
- [ ] 代码已通过审查
- [ ] 文档已更新

### 7.3 发布前检查

- [ ] 测试环境验证通过
- [ ] 性能测试通过
- [ ] 安全测试通过
- [ ] 回滚方案已准备

### 7.4 发布后检查

- [ ] 监控告警已配置
- [ ] 用户反馈已收集
- [ ] 问题已修复
- [ ] 文档已归档

---

## 📝 附录

### A. 相关文档

- [PRD文档](./TWO_STAGE_LEARNING_PRD.md)
- [前端最小改动方案](./FRONTEND_MINIMAL_CHANGES.md)
- [技术设计文档](./learning-plan-flowchart.md)

### B. 数据库ER图变更

```
学习计划系统 v4.0 → 两阶段学习系统

learning_plans 表变更：
  + phase: TEXT (learning/review)           ✨ 新增
  + learning_phase_completed_at: TIMESTAMPTZ ✨ 新增
  + review_phase_started_at: TIMESTAMPTZ    ✨ 新增

daily_task_records 表变更：
  + marked_words: JSONB []                  ✨ 新增
  + known_words: JSONB []                   ✨ 新增
  + fuzzy_words: JSONB []                   ✨ 新增
  + unknown_words: JSONB []                 ✨ 新增

review_schedule 表变更：
  interval_days: (1,7,15,30)                🔧 修改（添加1）
```

### C. API接口变更对比

| API | v4.0 | 两阶段系统 |
|-----|------|------------|
| `GET /api/v3/daily-task` | 无phase字段 | ✅ 添加phase |
| `GET /api/v3/daily-task` | 无marked_words | ✅ 添加marked_words |
| `GET /api/v3/learning-plan/progress` | learned_words只统计known | 🔧 统计所有标记 |
| `POST /api/v3/learning-plan/transition` | - | ✨ 新增接口 |

---

**文档结束**

**下一步行动**：
1. 召开技术评审会议
2. 确定实施时间表
3. 分配开发任务
4. 开始阶段1：数据库准备
