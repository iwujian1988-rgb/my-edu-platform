# 学习计划模块技术设计文档

> **版本**: v1.0.0
> **作者**: 系统架构师
> **日期**: 2026-01-27
> **核心原则**: 最小侵入性 (Principle of Least Intrusion)

---

## 目录

1. [现有代码修改清单](#1-现有代码修改清单-legacy-code-modification-list) ⭐ 最重要
2. [数据库变更](#2-数据库变更-schema-changes)
3. [模块复用策略](#3-模块复用策略)
4. [接口与数据流](#4-接口与数据流)
5. [部署与迁移](#5-部署与迁移)
6. [风险评估](#6-风险评估)

---

## 1. 现有代码修改清单 (Legacy Code Modification List)

> **原则**: 能新建就新建，能扩展不修改，必须修改时必须高亮预警

### 1.1 需要修改的现有文件

#### 🔴 高风险修改

| 文件路径 | 修改原因 | 推荐方案 | 风险等级 |
|---------|---------|---------|---------|
| `src/app/api/word-progress/route.ts` | 扩展标记逻辑，支持复习计划更新 | **方案 A (推荐)**: 新建 `/api/v3/word-mark/route.ts`，在新文件中实现统一标记入口<br>**方案 B**: 直接修改原文件，新增 `source` 和 `updateReviewSchedule` 参数 | 🟡 中 |
| `src/types/database.ts` | 添加新表类型定义 | **方案 A**: 直接添加新表类型（不影响现有类型）<br>`learning_plans`, `review_schedule`, `daily_task_records` | 🟢 低 |

#### 🟡 中风险修改

| 文件路径 | 修改原因 | 推荐方案 | 风险等级 |
|---------|---------|---------|---------|
| `src/app/study/[bookId]/flashcards/pageClient.tsx` | 添加"复习/新学"类型标签显示 | **方案 A (推荐)**: 复制为 `flashcards-v2/pageClient.tsx`，在新文件中添加标签<br>**方案 B**: 添加 Optional Prop `showTypeTag?`，兼容现有逻辑 | 🟡 中 |
| `src/app/study/[bookId]/dictation/pageClient.tsx` | 支持从今日任务传入单词列表 | **方案 A**: 无需修改，通过 URL 参数传递<br>**方案 B**: 添加 Optional Props | 🟢 低 |
| `src/lib/words-server.ts` | 复用单词查询逻辑 | **方案 B (推荐)**: 复制函数到新文件 `learning-plan-server.ts`，彻底解耦<br>**方案 A**: 导出现有函数，供新模块调用（有耦合风险） | 🟢 低 |

#### 🟢 低风险修改

| 文件路径 | 修改原因 | 推荐方案 | 风险等级 |
|---------|---------|---------|---------|
| `src/app/page.tsx` (首页) | 添加"今日学习任务"卡片入口 | **方案 A**: 直接添加新组件（不影响现有首页结构） | 🟢 低 |

### 1.2 新建文件清单

#### 页面组件 (4 个)

```
src/app/learning-plan/
├── plan-select/
│   └── page.tsx                    # 学习计划设置页
├── daily-task/
│   └── page.tsx                    # 今日任务页
├── learning-flow/
│   ├── page.tsx                    # 学习流程页（入口）
│   └── components/
│       ├── FlashcardQueue.tsx      # 卡片队列管理
│       └── DictationQueue.tsx      # 听写队列管理
└── learning-complete/
    └── page.tsx                    # 学习完成页
```

#### API 接口 (5 个)

```
src/app/api/v3/learning-plan/
├── route.ts                        # GET (查询计划), POST (创建计划)
├── [planId]/route.ts               # GET, PATCH, DELETE
├── daily-task/route.ts             # GET (获取今日任务), POST (生成今日任务)
├── review-schedule/route.ts        # GET (查询复习计划)
└── word-mark/route.ts              # POST (统一标记入口) ⭐ 核心
```

#### 数据库迁移 (1 个)

```
supabase/migrations/
└── 20260127_add_learning_plan_system.sql
```

#### 工具函数 (2 个)

```
src/lib/
├── learning-plan-server.ts         # 学习计划业务逻辑
└── review-algorithm.ts             # 复习算法（遗忘曲线）
```

#### 类型定义 (1 个)

```
src/types/learning-plan.ts          # 学习计划相关类型
```

---

## 2. 数据库变更 (Schema Changes)

> **原则**: 旧表只能做加法，严禁做减法或修改现有字段类型

### 2.1 现有表扩展 (仅添加字段)

#### word_progress 表

```sql
-- ✅ 安全：仅添加字段，不修改现有结构
ALTER TABLE word_progress
ADD COLUMN IF NOT EXISTS next_review_date DATE;

COMMENT ON COLUMN word_progress.next_review_date IS
'下次复习日期（学习计划系统使用）';

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_word_progress_next_review
ON word_progress(user_id, book_id, next_review_date)
WHERE next_review_date IS NOT NULL;
```

**风险评估**: 🟢 低
- 仅添加可选字段，不影响现有查询
- 现有行该字段默认为 NULL
- 向后兼容

### 2.2 新建表

#### 表1: learning_plans (学习计划表)

```sql
CREATE TABLE IF NOT EXISTS learning_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,

  -- 学习目标设置
  daily_new_words INTEGER NOT NULL CHECK (daily_new_words > 0 AND daily_new_words <= 100),
  daily_max_words INTEGER NOT NULL CHECK (daily_max_words >= daily_new_words),
  total_words INTEGER NOT NULL,

  -- 时间管理
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  estimated_end_date DATE,
  actual_end_date DATE,

  -- 状态管理
  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'paused', 'completed', 'delayed')),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 约束
  UNIQUE(user_id, book_id, status)
);

-- 索引
CREATE INDEX idx_learning_plans_user_active
ON learning_plans(user_id, status)
WHERE status = 'active';

-- RLS 策略
ALTER TABLE learning_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的学习计划"
ON learning_plans FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户只能创建自己的学习计划"
ON learning_plans FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户只能更新自己的学习计划"
ON learning_plans FOR UPDATE
USING (auth.uid() = user_id);

COMMENT ON TABLE learning_plans IS '学习计划表';
```

#### 表2: review_schedule (复习计划表)

```sql
CREATE TABLE IF NOT EXISTS review_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  word_id UUID NOT NULL REFERENCES words(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,

  -- 复习算法核心字段
  review_count INTEGER NOT NULL DEFAULT 0
    CHECK (review_count >= 0 AND review_count <= 100),

  next_review_date DATE NOT NULL,
  interval_days INTEGER NOT NULL DEFAULT 7
    CHECK (interval_days IN (7, 15, 30)),

  -- 时间戳
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 约束：每个用户每个单词只有一条复习计划
  UNIQUE(user_id, word_id, book_id)
);

-- 索引（查询性能关键）
CREATE INDEX idx_review_schedule_next_date
ON review_schedule(user_id, book_id, next_review_date)
WHERE next_review_date <= CURRENT_DATE;

CREATE INDEX idx_review_schedule_user_word
ON review_schedule(user_id, word_id);

-- RLS 策略
ALTER TABLE review_schedule ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的复习计划"
ON review_schedule FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的复习计划"
ON review_schedule FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的复习计划"
ON review_schedule FOR UPDATE
USING (auth.uid() = user_id);

COMMENT ON TABLE review_schedule IS '复习计划表（基于艾宾浩斯遗忘曲线）';
COMMENT ON COLUMN review_schedule.review_count IS '连续标记"known"的次数（0/1/2/3+）';
COMMENT ON COLUMN review_schedule.interval_days IS '当前复习间隔：7天→15天→30天';
```

#### 表3: daily_task_records (每日任务记录表)

```sql
CREATE TABLE IF NOT EXISTS daily_task_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES learning_plans(id) ON DELETE CASCADE,

  -- 任务信息
  task_date DATE NOT NULL,
  plan_day INTEGER NOT NULL CHECK (plan_day > 0),

  -- 单词列表（JSON 存储）
  new_words JSONB NOT NULL DEFAULT '[]',
  review_words JSONB NOT NULL DEFAULT '[]',
  completed_words JSONB NOT NULL DEFAULT '[]',

  total_words INTEGER NOT NULL GENERATED ALWAYS AS
    (jsonb_array_length(new_words) + jsonb_array_length(review_words)) STORED,

  all_completed BOOLEAN NOT NULL DEFAULT FALSE,

  -- 时间追踪
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- 约束
  UNIQUE(user_id, book_id, task_date)
);

-- 索引
CREATE INDEX idx_daily_task_records_date
ON daily_task_records(user_id, book_id, task_date)
WHERE task_date <= CURRENT_DATE;

CREATE INDEX idx_daily_task_records_completed
ON daily_task_records(user_id, all_completed)
WHERE all_completed = TRUE;

-- RLS 策略
ALTER TABLE daily_task_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "用户只能查看自己的任务记录"
ON daily_task_records FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "用户可以创建自己的任务记录"
ON daily_task_records FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "用户可以更新自己的任务记录"
ON daily_task_records FOR UPDATE
USING (auth.uid() = user_id);

COMMENT ON TABLE daily_task_records IS '每日任务记录表';
COMMENT ON COLUMN daily_task_records.new_words IS '新学词ID数组: ["uuid1", "uuid2", ...]';
COMMENT ON COLUMN daily_task_records.review_words IS '复习词ID数组';
COMMENT ON COLUMN daily_task_records.completed_words IS '已完成（标记known）的词ID数组';
```

### 2.3 数据库迁移文件

**文件名**: `supabase/migrations/20260127_add_learning_plan_system.sql`

```sql
-- ============================================================================
-- 学习计划系统数据库迁移
-- 版本: v1.0.0
-- 日期: 2026-01-27
-- 文档: tech-design-learning-plan.md
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. 扩展现有表 word_progress（仅添加字段）
-- ----------------------------------------------------------------------------

ALTER TABLE word_progress
ADD COLUMN IF NOT EXISTS next_review_date DATE;

COMMENT ON COLUMN word_progress.next_review_date IS
'下次复习日期（学习计划系统使用）';

CREATE INDEX IF NOT EXISTS idx_word_progress_next_review
ON word_progress(user_id, book_id, next_review_date)
WHERE next_review_date IS NOT NULL;

-- ----------------------------------------------------------------------------
-- 2. 创建学习计划表 learning_plans
-- ----------------------------------------------------------------------------

-- [见 2.2 表1 完整定义]

-- ----------------------------------------------------------------------------
-- 3. 创建复习计划表 review_schedule
-- ----------------------------------------------------------------------------

-- [见 2.2 表2 完整定义]

-- ----------------------------------------------------------------------------
-- 4. 创建每日任务记录表 daily_task_records
-- ----------------------------------------------------------------------------

-- [见 2.2 表3 完整定义]

-- ----------------------------------------------------------------------------
-- 5. 创建辅助函数
-- ----------------------------------------------------------------------------

-- 函数：获取今日需要复习的单词数
CREATE OR REPLACE FUNCTION get_due_review_count(
  p_user_id UUID,
  p_book_id UUID
) RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM review_schedule
    WHERE user_id = p_user_id
      AND book_id = p_book_id
      AND next_review_date <= CURRENT_DATE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 函数：检查单词是否在今日任务中
CREATE OR REPLACE FUNCTION is_word_in_today_task(
  p_user_id UUID,
  p_book_id UUID,
  p_word_id UUID
) RETURNS BOOLEAN AS $$
DECLARE
  v_task_record RECORD;
BEGIN
  SELECT * INTO v_task_record
  FROM daily_task_records
  WHERE user_id = p_user_id
    AND book_id = p_book_id
    AND task_date = CURRENT_DATE;

  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;

  RETURN (
    p_word_id IN (SELECT jsonb_array_elements_text(new_words))
    OR p_word_id IN (SELECT jsonb_array_elements_text(review_words))
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 授权
GRANT EXECUTE ON FUNCTION get_due_review_count TO authenticated;
GRANT EXECUTE ON FUNCTION is_word_in_today_task TO authenticated;
```

---

## 3. 模块复用策略

### 3.1 听写模式复用

#### 现有文件
- `src/app/study/[bookId]/dictation/pageClient.tsx`

#### 复用方式
**结论**: ✅ **无需修改现有代码**

**实现方案**:
1. 通过 URL 参数传入单词列表和来源
2. 完成后返回到指定的 `returnUrl`
3. 听写模式内部调用统一的标记 API

**调用示例**:
```typescript
// 从今日任务跳转
const words = ['uuid1', 'uuid2', 'uuid3']
const url = `/study/${bookId}/dictation?words=${words.join(',')}&source=daily_task&returnUrl=/learning-plan/daily-task`

window.location.href = url
```

**改动清单**:
- ❌ 无需修改听写模式代码
- ✅ 新增 URL 参数处理（如果尚未支持）
- ✅ 调用统一标记 API: `/api/v3/word-mark`

### 3.2 卡片模式复用

#### 现有文件
- `src/app/study/[bookId]/flashcards/pageClient.tsx`

#### 复用方式
**结论**: ⚠️ **需要轻微修改**

**实现方案**:

**方案 A (推荐)**: 复制为新组件
```bash
# 复制现有组件
cp -r src/app/study/[bookId]/flashcards \
     src/app/learning-plan/learning-flow/components/FlashcardQueue

# 修改复制的文件
```

**方案 B**: 添加 Optional Props
```typescript
// 在现有 flashcards/pageClient.tsx 中添加
interface FlashcardProps {
  // ... 现有 props
  showTypeTag?: boolean        // 新增：显示类型标签（复习/新学）
  wordType?: 'review' | 'new'  // 新增：单词类型
  source?: 'normal' | 'daily_task'  // 新增：来源标识
}
```

**推荐决策**: 采用 **方案 A**，原因：
- 完全隔离，不影响现有卡片模式
- 可以自由定制队列管理逻辑
- 避免引入复杂的条件判断

**新增功能** (在复制的组件中):
1. 显示"复习/新学"类型标签（UI）
2. 调用统一标记 API: `/api/v3/word-mark`
3. 支持队列循环逻辑（前端状态管理）

### 3.3 标记系统复用

#### 现有文件
- `src/app/api/word-progress/route.ts`

#### 复用方式
**结论**: 🔴 **必须新建统一入口**

**实现方案**: **方案 A (推荐)**

**新建文件**: `src/app/api/v3/word-mark/route.ts`

```typescript
// 统一标记入口（所有标记调用此函数）
export async function POST(request: NextRequest) {
  const body = await request.json()
  const { wordId, bookId, status, source } = body

  // 1. 更新 word_progress 表（复用现有逻辑）
  await updateWordProgress(user_id, wordId, bookId, status)

  // 2. 更新复习计划（新增逻辑）
  await updateReviewSchedule(user_id, wordId, bookId, status)

  // 3. 更新今日任务（新增逻辑）
  await updateTodayTask(user_id, bookId, wordId, status)

  // 4. 记录历史（复用现有逻辑）
  await recordMarkHistory(user_id, wordId, bookId, status, source)

  return NextResponse.json({ success: true })
}
```

**关键点**:
- 复用现有的 `updateWordProgress` 逻辑（从 `/api/word-progress` 中提取）
- 新增复习计划更新逻辑
- 新增今日任务更新逻辑
- 所有模块（听写、卡片、单词列表）统一调用此接口

**改动清单**:
- ✅ 新建 `/api/v3/word-mark/route.ts`
- ✅ 提取公共逻辑到 `src/lib/learning-plan-server.ts`
- ⚠️ 修改现有 `/api/word-progress/route.ts`，内部调用新接口（可选，向后兼容）

### 3.4 单词列表影响

#### 现有文件
- `src/app/study/[bookId]/page.tsx` (单词列表页)
- `src/app/api/word-progress/batch-update/route.ts`

#### 复用方式
**结论**: ⚠️ **需要修改批量更新逻辑**

**修改文件**: `src/app/api/word-progress/batch-update/route.ts`

**修改方案**:
```typescript
// 现有逻辑
for (const word of words) {
  await updateWordProgress(user, word.id, status)

  // ✅ 新增：检查是否在今日任务中
  const inTodayTask = await isWordInTodayTask(user, bookId, word.id)

  if (inTodayTask) {
    // 更新今日任务进度
    await updateTodayTask(user, bookId, word.id, status)
  }
}
```

**风险评估**: 🟡 中
- 影响面：单词列表的标记行为
- 向后兼容：是（只添加逻辑，不修改现有行为）
- 测试重点：标记后今日任务是否正确更新

### 3.5 单词查询逻辑复用（彻底解耦）

#### 现有文件
- `src/lib/words-server.ts` (现有单词查询逻辑)

#### 复用方式
**结论**: ✅ **采用方案 B（复制函数），彻底解耦**

#### 为什么选择方案 B？

**风险场景**:
```typescript
// ❌ 如果采用方案 A（导出函数）
// src/lib/words-server.ts
export async function getWordsByStatus(userId, bookId, status) {
  return db.query(`
    SELECT * FROM words
    WHERE status = $1
    -- 未来可能添加新逻辑：
    -- AND is_active = true
    -- AND visibility = 'public'
  `, [status])
}

// src/lib/learning-plan-server.ts
import { getWordsByStatus } from './words-server'

// ⚠️ 风险：如果 words-server.ts 添加了新的过滤条件，
// 学习计划的查询逻辑会受到影响，可能导致查询结果为空！
```

**方案 B 实现**:
```typescript
// ✅ 方案 B：复制函数，彻底解耦
// src/lib/learning-plan-server.ts

/**
 * 获取未学过的单词（用于新学词）
 * 独立实现，不依赖 words-server.ts
 */
export async function getNewWordsForPlan(
  userId: string,
  bookId: string,
  limit: number
): Promise<string[]> {
  const db = await getDbClient()

  const { rows } = await db.query(`
    SELECT w.id
    FROM words w
    LEFT JOIN word_progress wp
      ON wp.word_id = w.id
      AND wp.user_id = $1
      AND wp.book_id = $2
    WHERE w.book_id = $2
      AND wp.id IS NULL  -- 从未学过
    ORDER BY w.sort_order, w.id
    LIMIT $3
  `, [userId, bookId, limit])

  return rows.map((row: any) => row.id)
}

/**
 * 获取到期需要复习的单词
 * 独立实现，不依赖 words-server.ts
 */
export async function getDueReviewWords(
  userId: string,
  bookId: string,
  limit: number
): Promise<Array<{ word_id: string; review_count: number }>> {
  const db = await getDbClient()

  const { rows } = await db.query(`
    SELECT
      rs.word_id,
      rs.review_count
    FROM review_schedule rs
    WHERE rs.user_id = $1
      AND rs.book_id = $2
      AND rs.next_review_date <= CURRENT_DATE
    ORDER BY
      CASE WHEN rs.next_review_date < CURRENT_DATE THEN 0 ELSE 1 END,  -- 过期的优先
      rs.next_review_date ASC
    LIMIT $3
  `, [userId, bookId, limit])

  return rows
}

/**
 * 获取今日任务单词详情（包含单词内容）
 * 独立实现，不依赖 words-server.ts
 */
export async function getTodayTaskWords(
  userId: string,
  bookId: string,
  wordIds: string[]
): Promise<Word[]> {
  const db = await getDbClient()

  const { rows } = await db.query(`
    SELECT
      w.id,
      w.word,
      w.phonetic,
      w.meaning,
      w.example,
      wp.status,
      wp.practice_count,
      rs.review_count,
      rs.next_review_date
    FROM words w
    LEFT JOIN word_progress wp
      ON wp.word_id = w.id
      AND wp.user_id = $1
      AND wp.book_id = $2
    LEFT JOIN review_schedule rs
      ON rs.word_id = w.id
      AND rs.user_id = $1
      AND rs.book_id = $2
    WHERE w.id = ANY($3)
    ORDER BY array_position($3, w.id)
  `, [userId, bookId, wordIds])

  return rows
}
```

**优势对比**:

| 维度 | 方案 A（导出函数） | 方案 B（复制函数，推荐） |
|-----|------------------|----------------------|
| 代码复用 | ✅ 高 | ⚠️ 低（有重复） |
| 耦合度 | 🔴 高（依赖旧模块） | 🟢 无（完全独立） |
| 维护成本 | 🔴 高（改动影响面大） | 🟢 低（独立维护） |
| 风险隔离 | 🔴 差（旧代码bug会传染） | 🟢 好（完全隔离） |
| 未来扩展 | ⚠️ 受限（必须兼容旧接口） | ✅ 自由（可以随意优化） |
| 符合"最小侵入性" | ❌ 否 | ✅ 是 |

**决策**: 采用 **方案 B**

**理由**:
1. **绝对安全**: 旧模块的任何改动都不会影响新功能
2. **独立迭代**: 新模块可以优化查询逻辑（比如添加缓存、索引优化）
3. **代码所有权**: 新功能有自己的代码实现，不依赖旧代码的维护周期
4. **符合原则**: 彻底贯彻"最小侵入性"原则

**备注**:
- 虽然有代码重复，但这是"有意的重复"（Intentional Duplication）
- 未来如果发现两个模块的查询逻辑一致，再考虑抽取公共函数（那是重构优化的范畴，不属于初期开发）

---

## 4. 接口与数据流

### 4.1 新增 API 接口

#### API 1: 创建/查询学习计划

**端点**: `POST /api/v3/learning-plan`

**请求体**:
```json
{
  "bookId": "uuid",
  "dailyNewWords": 20,
  "dailyMaxWords": 50
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "plan-uuid",
    "user_id": "user-uuid",
    "book_id": "book-uuid",
    "daily_new_words": 20,
    "daily_max_words": 50,
    "total_words": 4500,
    "estimated_days": 135,
    "status": "active",
    "start_date": "2026-01-27"
  }
}
```

#### API 2: 获取今日任务

**端点**: `GET /api/v3/learning-plan/daily-task?bookId=xxx`

**逻辑**:
```typescript
async function getTodayTask(bookId: string) {
  // 1. 查询今日任务记录
  let todayTask = await db.query(`
    SELECT * FROM daily_task_records
    WHERE user_id = $1 AND book_id = $2 AND task_date = CURRENT_DATE
  `, [user.id, bookId])

  // 2. 如果不存在，生成今日任务
  if (!todayTask) {
    todayTask = await generateTodayTask(user.id, bookId)
  }

  return todayTask
}

async function generateTodayTask(userId: string, bookId: string) {
  // 1. 获取学习计划
  const plan = await getActivePlan(userId, bookId)

  // 2. 查询到期复习词
  const reviewWords = await db.query(`
    SELECT word_id
    FROM review_schedule
    WHERE user_id = $1 AND book_id = $2
      AND next_review_date <= CURRENT_DATE
    ORDER BY next_review_date ASC
    LIMIT $3
  `, [userId, bookId, plan.daily_max_words])

  // 3. 计算新学词数量
  const remainingSlots = plan.daily_max_words - reviewWords.length
  const newWordsCount = Math.min(plan.daily_new_words, remainingSlots)

  // 4. 获取新学词
  const newWords = await getNewWords(userId, bookId, newWordsCount)

  // 5. 创建今日任务记录
  const todayTask = await db.query(`
    INSERT INTO daily_task_records
    (user_id, book_id, plan_id, task_date, plan_day, new_words, review_words)
    VALUES ($1, $2, $3, CURRENT_DATE, $4, $5, $6)
    RETURNING *
  `, [userId, bookId, plan.id, plan.current_day, JSON.stringify(newWords), JSON.stringify(reviewWords)])

  return todayTask
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "id": "task-uuid",
    "task_date": "2026-01-27",
    "plan_day": 5,
    "total_words": 28,
    "new_words": ["uuid1", "uuid2", ...],
    "review_words": ["uuid10", "uuid11", ...],
    "completed_words": ["uuid1", "uuid2"],
    "all_completed": false
  }
}
```

#### API 3: 统一标记入口 ⭐ 核心

**端点**: `POST /api/v3/word-mark`

**请求体**:
```json
{
  "wordId": "word-uuid",
  "bookId": "book-uuid",
  "status": "known",
  "source": "daily_task_flashcard"
}
```

**完整逻辑**:
```typescript
export async function POST(request: NextRequest) {
  const { wordId, bookId, status, source } = await request.json()
  const user = await getCurrentUser()

  // 开启事务
  const client = await getDbClient()
  await client.query('BEGIN')

  try {
    // 1. 更新 word_progress 表
    await client.query(`
      INSERT INTO word_progress (user_id, word_id, book_id, status, practice_count, last_practiced_at)
      VALUES ($1, $2, $3, $4, 1, NOW())
      ON CONFLICT (user_id, word_id, book_id)
      DO UPDATE SET
        status = $4,
        practice_count = word_progress.practice_count + 1,
        last_practiced_at = NOW(),
        updated_at = NOW()
    `, [user.id, wordId, bookId, status])

    // 2. 更新复习计划表
    if (status === 'known') {
      // 获取当前复习次数
      const { review_count } = await client.query(`
        SELECT COALESCE(review_count, 0) as review_count
        FROM review_schedule
        WHERE user_id = $1 AND word_id = $2 AND book_id = $3
      `, [user.id, wordId, bookId])

      const intervals = [7, 15, 30]
      const nextInterval = intervals[Math.min(review_count, 2)]
      const nextDate = addDays(new Date(), nextInterval)

      await client.query(`
        INSERT INTO review_schedule
        (user_id, word_id, book_id, review_count, next_review_date, interval_days)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (user_id, word_id, book_id)
        DO UPDATE SET
          review_count = $4,
          next_review_date = $5,
          interval_days = $6,
          updated_at = NOW()
      `, [user.id, wordId, bookId, review_count + 1, nextDate, nextInterval])
    } else {
      // fuzzy 或 unknown，重置为7天后
      await client.query(`
        INSERT INTO review_schedule
        (user_id, word_id, book_id, review_count, next_review_date, interval_days)
        VALUES ($1, $2, $3, 0, $4, 7)
        ON CONFLICT (user_id, word_id, book_id)
        DO UPDATE SET
          review_count = 0,
          next_review_date = $4,
          interval_days = 7,
          updated_at = NOW()
      `, [user.id, wordId, bookId, addDays(new Date(), 7)])
    }

    // 3. 检查是否在今日任务中
    const todayTask = await client.query(`
      SELECT * FROM daily_task_records
      WHERE user_id = $1 AND book_id = $2 AND task_date = CURRENT_DATE
    `, [user.id, bookId])

    if (todayTask) {
      const newWords = todayTask.new_words.map((w: any) => w.word_id || w)
      const reviewWords = todayTask.review_words.map((w: any) => w.word_id || w)
      const allWords = [...newWords, ...reviewWords]

      if (allWords.includes(wordId)) {
        // 4a. 更新今日任务完成度
        let completed = todayTask.completed_words || []

        if (status === 'known' && !completed.includes(wordId)) {
          completed.push(wordId)
        } else if (status !== 'known') {
          completed = completed.filter((id: string) => id !== wordId)
        }

        const allCompleted = completed.length === allWords.length

        await client.query(`
          UPDATE daily_task_records
          SET completed_words = $1,
              all_completed = $2,
              completed_at = CASE WHEN $2 = true THEN NOW() ELSE completed_at END,
              updated_at = NOW()
          WHERE id = $3
        `, [JSON.stringify(completed), allCompleted, todayTask.id])
      }
    }

    // 4. 记录历史
    await client.query(`
      INSERT INTO learning_records (user_id, word_id, book_id, practice_mode, status)
      VALUES ($1, $2, $3, $4, $5)
    `, [user.id, wordId, bookId, source, status])

    await client.query('COMMIT')

    return NextResponse.json({ success: true })

  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  }
}
```

**响应**:
```json
{
  "success": true,
  "data": {
    "wordMarked": true,
    "taskUpdated": true,
    "allCompleted": false
  }
}
```

### 4.2 前端数据流

#### 流程1: 创建学习计划

```
用户在 /plan-select 页面
  ↓
设置 dailyNewWords=20, dailyMaxWords=50
  ↓
点击"开始学习计划"
  ↓
POST /api/v3/learning-plan
  ↓
创建计划记录到 learning_plans 表
  ↓
跳转到 /learning-plan/daily-task
```

#### 流程2: 每日学习

```
用户打开 /learning-plan/daily-task
  ↓
GET /api/v3/learning-plan/daily-task?bookId=xxx
  ↓
后端查询/生成今日任务（从 daily_task_records 表）
  ↓
前端显示：
  - 总词数：28
  - 已完成：0
  - 进度条：0%
  ↓
用户选择"卡片模式"
  ↓
跳转到 /learning-plan/learning-flow?mode=flashcard
  ↓
前端初始化队列：
  queue = [...reviewWords, ...newWords]
  currentIndex = 0
  completed = []
  ↓
显示第一个词（卡片正面）
  ↓
用户点击卡片 → 翻转
  ↓
用户点击"认识"
  ↓
POST /api/v3/word-mark { status: 'known' }
  ↓
后端更新：
  1. word_progress.status = 'known'
  2. review_schedule.next_review_date = 今天+7天
  3. daily_task_records.completed_words 添加该词
  ↓
前端更新队列：
  completed.push(word)
  queue.remove(currentWord)
  ↓
显示下一个词...
  ↓
队列为空 → 跳转到 /learning-plan/learning-complete
```

#### 流程3: 单词列表标记影响今日任务

```
用户在今日任务中学了5个词（标记"known"）
  ↓
todayTask.completed_words = [word1, word2, word3, word4, word5]
  ↓
用户去单词列表
  ↓
看到 word6，标记"known"
  ↓
POST /api/v3/word-mark { status: 'known', source: 'word_list' }
  ↓
后端逻辑：
  1. 更新 word_progress
  2. 更新 review_schedule
  3. 检查 word6 是否在今日任务 → 是！
  4. 更新今日任务：
     completed_words = [word1, word2, word3, word4, word5, word6]
  ↓
用户返回今日任务页
  ↓
GET /api/v3/learning-plan/daily-task
  ↓
前端显示：
  已完成：6/28 ✅
```

---

## 5. 部署与迁移

### 5.1 部署步骤

#### 阶段1: 数据库迁移（必须最先执行）

```bash
# 1. 本地测试迁移
psql -h localhost -U postgres -d my_edu_platform \
  -f supabase/migrations/20260127_add_learning_plan_system.sql

# 2. 验证新表创建
psql -c "\d learning_plans"
psql -c "\d review_schedule"
psql -c "\d daily_task_records"

# 3. 验证索引创建
psql -c "SELECT indexname FROM pg_indexes WHERE tablename LIKE '%learning%' OR tablename LIKE '%review%' OR tablename LIKE '%daily_task%'"

# 4. 部署到生产环境
# 通过 Supabase Dashboard 或 CLI
supabase migration up
```

#### 阶段2: 代码部署

```bash
# 1. 部署新 API 接口
git add src/app/api/v3/
git commit -m "feat: 添加学习计划 API v3"
git push

# 2. 部署新页面
git add src/app/learning-plan/
git commit -m "feat: 添加学习计划页面"
git push

# 3. 部署类型定义
git add src/types/learning-plan.ts
git add src/types/database.ts
git commit -m "feat: 添加学习计划类型定义"
git push

# 4. 部署工具函数
git add src/lib/learning-plan-server.ts
git add src/lib/review-algorithm.ts
git commit -m "feat: 添加学习计划业务逻辑"
git push
```

#### 阶段3: 验证与测试

```bash
# 1. 测试新 API
curl -X POST http://localhost:3000/api/v3/learning-plan \
  -H "Content-Type: application/json" \
  -d '{"bookId":"xxx","dailyNewWords":20,"dailyMaxWords":50}'

# 2. 测试今日任务生成
curl http://localhost:3000/api/v3/learning-plan/daily-task?bookId=xxx

# 3. 测试统一标记接口
curl -X POST http://localhost:3000/api/v3/word-mark \
  -H "Content-Type: application/json" \
  -d '{"wordId":"xxx","bookId":"xxx","status":"known","source":"test"}'

# 4. 前端功能测试
# - 访问 /learning-plan/plan-select
# - 创建学习计划
# - 完成今日任务
# - 验证数据库记录正确
```

### 5.2 回滚方案

#### 数据库回滚

```sql
-- ⚠️ 谨慎操作：会删除新表和所有数据

-- 删除表（按依赖关系逆序）
DROP TABLE IF EXISTS daily_task_records CASCADE;
DROP TABLE IF EXISTS review_schedule CASCADE;
DROP TABLE IF EXISTS learning_plans CASCADE;

-- 删除 word_progress 新增字段
ALTER TABLE word_progress DROP COLUMN IF EXISTS next_review_date;

-- 删除辅助函数
DROP FUNCTION IF EXISTS get_due_review_count;
DROP FUNCTION IF EXISTS is_word_in_today_task;
```

#### 代码回滚

```bash
# 回滚到上一个版本
git revert HEAD
git push

# 或者强制回滚（危险）
git reset --hard HEAD~1
git push --force
```

---

## 6. 风险评估

### 6.1 技术风险

| 风险项 | 风险等级 | 影响范围 | 缓解措施 |
|-------|---------|---------|---------|
| 数据库迁移失败 | 🟡 中 | 所有用户 | 1. 本地充分测试<br>2. 先在测试环境部署<br>3. 准备回滚脚本 |
| word_progress API 修改影响现有功能 | 🟡 中 | 单词学习 | 1. 新建 `/api/v3/word-mark` 而非修改原接口<br>2. 保留旧接口不变<br>3. A/B 测试验证 |
| 队列管理逻辑复杂导致 Bug | 🟡 中 | 今日任务 | 1. 充分的单元测试<br>2. 边界情况测试（队列为空、全部完成等）<br>3. 添加错误日志 |
| 性能问题（查询今日任务慢） | 🟢 低 | 今日任务 | 1. 添加索引<br>2. 使用 Redis 缓存<br>3. 定时任务预生成 |
| RLS 策略配置错误 | 🔴 高 | 数据安全 | 1. 严格测试权限<br>2. 使用不同用户角色测试<br>3. Code Review |

### 6.2 业务风险

| 风险项 | 风险等级 | 影响范围 | 缓解措施 |
|-------|---------|---------|---------|
| 用户不习惯"当场结清"逻辑 | 🟡 中 | 用户体验 | 1. 清晰的引导文案<br>2. 帮助文档<br>3. 允许用户选择旧模式（可选） |
| 复习词过多导致压力大 | 🟢 低 | 用户留存 | 1. 动态调整新学词数量<br>2. 显示"预计用时"<br>3. 允许暂停计划 |
| 数据丢失（用户误操作） | 🟡 中 | 用户信任 | 1. 软删除（不物理删除数据）<br>2. 定期备份<br>3. 提供"恢复进度"功能 |

### 6.3 兼容性风险

| 风险项 | 风险等级 | 影响范围 | 缓解措施 |
|-------|---------|---------|---------|
| 旧版客户端无法使用新功能 | 🟢 低 | 功能可用性 | 1. 渐进式增强<br>2. 新功能独立路由<br>3. 后端兼容旧版 API |
| 浏览器兼容性问题 | 🟢 低 | 功能可用性 | 1. 使用现代 JavaScript（ES6+）<br>2. 测试主流浏览器<br>3. Polyfill 关键特性 |

### 6.4 监控与告警

```typescript
// 关键指标监控

// 1. API 性能监控
console.time('GET /api/v3/learning-plan/daily-task')
// ... 执行逻辑
console.timeEnd('GET /api/v3/learning-plan/daily-task')

// 2. 错误率监控
const errorRate = (errors / totalRequests) * 100
if (errorRate > 5) {
  alert('错误率过高，请检查')
}

// 3. 数据库查询性能监控
const slowQueryThreshold = 1000 // 1秒
if (queryDuration > slowQueryThreshold) {
  console.warn(`慢查询: ${query.sql} 耗时 ${queryDuration}ms`)
}

// 4. 用户行为监控
analytics.track('daily_task_started', {
  bookId,
  totalWords,
  userPlanDay
})

analytics.track('word_marked', {
  status,
  source,
  timeSpent
})
```

---

## 7. 测试计划

### 7.1 单元测试

```typescript
// src/app/api/v3/__tests__/word-mark.test.ts

describe('POST /api/v3/word-mark', () => {
  it('应该正确标记 known 并更新复习计划', async () => {
    const response = await fetch('/api/v3/word-mark', {
      method: 'POST',
      body: JSON.stringify({
        wordId: 'test-word-id',
        bookId: 'test-book-id',
        status: 'known',
        source: 'daily_task_flashcard'
      })
    })

    expect(response.success).toBe(true)

    // 验证数据库
    const wordProgress = await db.query('SELECT * FROM word_progress WHERE word_id = $1', ['test-word-id'])
    expect(wordProgress.status).toBe('known')

    const reviewSchedule = await db.query('SELECT * FROM review_schedule WHERE word_id = $1', ['test-word-id'])
    expect(reviewSchedule.review_count).toBe(1)
    expect(reviewSchedule.next_review_date).toBe(today + 7 days)
  })

  it('应该正确更新今日任务完成度', async () => {
    // 创建今日任务
    await createTodayTask({
      newWords: ['word1', 'word2'],
      reviewWords: ['word3']
    })

    // 标记 word1 为 known
    await markWord('word1', 'known')

    // 验证今日任务
    const todayTask = await getTodayTask()
    expect(todayTask.completed_words).toContain('word1')
    expect(todayTask.all_completed).toBe(false)
  })

  it('标记 unknown 应该重置复习计划', async () => {
    // 前置条件：已经标记过2次 known
    await setupReviewSchedule({ review_count: 2 })

    // 标记 unknown
    await markWord('word1', 'unknown')

    // 验证重置
    const schedule = await getReviewSchedule('word1')
    expect(schedule.review_count).toBe(0)
    expect(schedule.interval_days).toBe(7)
  })
})
```

### 7.2 集成测试

```typescript
// e2e/tests/daily-task.spec.ts

describe('今日任务完整流程', () => {
  it('应该完成从创建计划到完成任务的完整流程', async () => {
    // 1. 创建学习计划
    await page.goto('/learning-plan/plan-select')
    await page.fill('[name="dailyNewWords"]', '20')
    await page.fill('[name="dailyMaxWords"]', '50')
    await page.click('button:has-text("开始学习计划")')

    // 2. 验证跳转到今日任务页
    await expect(page).toHaveURL(/\/learning-plan\/daily-task/)

    // 3. 验证今日任务显示
    await expect(page.locator('text=/28个单词/')).toBeVisible()

    // 4. 开始学习
    await page.click('button:has-text("开始学习")')

    // 5. 完成所有单词（模拟）
    for (let i = 0; i < 28; i++) {
      await page.click('.flashcard')
      await page.click('button:has-text("认识")')
      await page.waitForTimeout(500)
    }

    // 6. 验证跳转到完成页
    await expect(page).toHaveURL(/\/learning-plan\/learning-complete/)

    // 7. 验证数据库
    const todayTask = await getTodayTaskFromDB()
    expect(todayTask.all_completed).toBe(true)
  })
})
```

### 7.3 性能测试

```bash
# 使用 k6 进行负载测试
k6 run - <<EOF
import http from 'k6/http';
import { check } from 'k6';

export default function() {
  // 测试今日任务查询性能
  const res = http.get('http://localhost:3000/api/v3/learning-plan/daily-task?bookId=xxx');

  check(res, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
}
EOF
```

---

## 8. 附录

### 8.1 关键文件清单

#### 新建文件 (13 个)

```
API 接口:
src/app/api/v3/learning-plan/route.ts
src/app/api/v3/learning-plan/[planId]/route.ts
src/app/api/v3/learning-plan/daily-task/route.ts
src/app/api/v3/learning-plan/review-schedule/route.ts
src/app/api/v3/word-mark/route.ts ⭐ 核心

页面组件:
src/app/learning-plan/plan-select/page.tsx
src/app/learning-plan/daily-task/page.tsx
src/app/learning-plan/learning-flow/page.tsx
src/app/learning-plan/learning-complete/page.tsx

子组件:
src/app/learning-plan/learning-flow/components/FlashcardQueue.tsx
src/app/learning-plan/learning-flow/components/DictationQueue.tsx

工具函数:
src/lib/learning-plan-server.ts
src/lib/review-algorithm.ts

类型定义:
src/types/learning-plan.ts
```

#### 修改文件 (2 个)

```
低风险:
src/types/database.ts (添加新表类型)

中风险:
src/app/api/word-progress/batch-update/route.ts (添加今日任务检查)
```

#### 数据库迁移 (1 个)

```
supabase/migrations/20260127_add_learning_plan_system.sql
```

### 8.2 API 接口清单

| 端点 | 方法 | 描述 | 新建/修改 |
|-----|------|------|----------|
| `/api/v3/learning-plan` | POST | 创建学习计划 | 新建 |
| `/api/v3/learning-plan` | GET | 查询用户计划 | 新建 |
| `/api/v3/learning-plan/[planId]` | GET | 查询计划详情 | 新建 |
| `/api/v3/learning-plan/[planId]` | PATCH | 更新计划设置 | 新建 |
| `/api/v3/learning-plan/[planId]` | DELETE | 删除/暂停计划 | 新建 |
| `/api/v3/learning-plan/daily-task` | GET | 获取今日任务 | 新建 |
| `/api/v3/learning-plan/daily-task` | POST | 生成今日任务 | 新建 |
| `/api/v3/word-mark` | POST | 统一标记入口 | 新建 ⭐ |
| `/api/word-progress/batch-update` | POST | 批量标记（单词列表） | 修改 |

### 8.3 数据库表清单

| 表名 | 类型 | 描述 |
|-----|------|------|
| `learning_plans` | 新建 | 学习计划表 |
| `review_schedule` | 新建 | 复习计划表 |
| `daily_task_records` | 新建 | 每日任务记录表 |
| `word_progress` | 扩展 | 添加 `next_review_date` 字段 |
| `word_progress` | 复用 | 继续使用现有字段 |
| `learning_records` | 复用 | 继续使用，扩展 `source` 值 |

---

**文档结束**

> **下一步行动**:
> 1. 技术评审会议（邀请后端、前端、DBA）
> 2. 确认修改方案（方案 A vs 方案 B）
> 3. 开始 P0 功能开发
> 4. 每日进度同步
