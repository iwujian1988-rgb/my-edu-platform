# 听写模块设计文档

> 最后更新: 2026-03-15
> 状态: 重构中

---

## 一、功能定义

| 维度 | 说明 |
|------|------|
| **模块名称** | 听写练习 (Dictation) |
| **入口路径** | `/study/[bookId]/dictation` |
| **核心功能** | 播放发音 → 用户输入 → 判断正误 → 记录进度 |
| **支持筛选** | all / unknown / fuzzy / known / new |
| **支持模式** | 顺序 / 乱序 |

---

## 二、用户流程

### 场景 A: 从首页"继续学习"进入

1. 首页显示: "不认识的，第51题/共200题，3分钟前"
2. 用户点击 → 跳转到 `/study/bookId/dictation?scope=unknown&resume=true#word-50`
3. 页面行为:
   - 不显示范围选择对话框
   - 加载 scope=unknown 的单词
   - 定位到第 50 个单词
4. 用户继续学习

### 场景 B: 从书架手动进入

1. 用户点击词书 → 跳转到 `/study/bookId/dictation`
2. 页面行为:
   - 显示范围选择对话框
   - 用户选择范围（如"不认识的"）
   - 用户选择是否乱序
3. 开始从第一个单词学习

### 场景 C: 懒加载更多单词

1. 用户学完当前批次的单词（如第 45/50 个）
2. 自动触发加载下一批（第 51-100 个）
3. 追加到现有列表，继续学习
4. 重复直到学完所有单词

---

## 三、数据模型

```
┌────────────────────────┐     ┌────────────────────────┐
│  books (单词书)         │     │  chapters (章节)        │
│  ├── id                │     │  ├── id                │
│  ├── title             │     │  ├── book_id ──────────┼──┐
│  ├── total_words       │     │  ├── theme_id          │  │
│  └── ...               │     │  └── scene_id          │  │
└────────────────────────┘     └────────────────────────┘  │
                                        ▲                  │
                                        │                  │
┌────────────────────────┐     ┌────────────────────────┐  │
│  words (单词)           │     │  word_progress (进度)   │  │
│  ├── id                │     │  ├── id                │  │
│  ├── word              │     │  ├── user_id           │  │
│  ├── phonetic          │     │  ├── book_id           │  │
│  ├── definition        │◄────┼──┤ word_id              │  │
│  ├── chapter_id ───────┼─────┼──┤ status (new/unknown/ │  │
│  └── ...               │     │  │   fuzzy/known)       │  │
└────────────────────────┘     │  └── ...               │  │
                               └────────────────────────┘  │
                                                           │
                               ┌───────────────────────────┘
                               │
                               ▼
                        books.id = chapters.book_id
```

---

## 四、断点续做系统

### 4.1 数据存储

```
user_book_preferences 表:
├── user_id: uuid
├── book_id: uuid
└── preferences: jsonb
    ├── dictation_progress_{bookId}_{scope}:
    │     { currentIndex, totalWords, lastStudyTime }
    ├── flashcards_progress_{bookId}_{scope}:
    │     { currentIndex, totalWords, lastStudyTime }
    ├── last_resume_state:
    │     { mode, bookId, updatedAt, context: { scopeType,
    │       currentIndex, totalWords, currentWord } }
    └── last_resume_summary:
          { flashcards: {...}, dictation: {...}, ... }
```

### 4.2 断点续做流程

1. **用户学习时**: 自动保存进度到 `dictation_progress_{bookId}_{scope}`
2. **用户离开时**: `progressManager.flush()` 立即保存
3. **首页加载时**: 读取 `last_resume_state` 生成"继续学习"卡片
4. **用户点击继续**: 跳转到带 `resume=true` 和 `#word-N` 的 URL
5. **页面恢复**: 从 URL hash 提取索引，定位到正确位置

---

## 五、API 设计规范

### 5.1 请求参数

```typescript
interface GetWordsParams {
  bookId: string           // 必填：词书 ID
  status: ScopeType        // 必填：筛选范围 (all|unknown|fuzzy|known|new)
  shuffle: boolean         // 必填：是否乱序
  page: number             // 必填：页码（从 1 开始）
  pageSize: number         // 可选：每页数量（默认 50）
}
```

### 5.2 响应格式

```typescript
interface GetWordsResponse {
  success: boolean
  data: Word[]             // 当前页的单词数组
  page: number             // 当前页码
  pageSize: number         // 每页数量
  count: number            // 匹配条件的总单词数（用于分页计算）
  total: number            // 整本书的总单词数
}
```

### 5.3 核心算法（统一数据流）

```
Step 1: 获取所有匹配的 word_id
─────────────────────────────────────────────────────────────────
if (status === 'all'):
  ids = SELECT id FROM words WHERE chapter_id IN (book_chapters)
elif (status === 'new'):
  ids = SELECT id FROM words WHERE id NOT IN (progress_ids)
else:  // unknown/fuzzy/known
  ids = SELECT word_id FROM word_progress
        WHERE user_id=? AND book_id=? AND status=?

Step 2: 可选乱序
─────────────────────────────────────────────────────────────────
if (shuffle):
  seed = `${bookId}-${status}`
  ids = seededShuffle(ids, seed)

Step 3: 分页切片
─────────────────────────────────────────────────────────────────
startIndex = (page - 1) * pageSize
endIndex = startIndex + pageSize
pageIds = ids.slice(startIndex, endIndex)
count = ids.length  // 总数用于前端分页

Step 4: 获取完整单词数据
─────────────────────────────────────────────────────────────────
words = SELECT * FROM words WHERE id IN (pageIds)
words = JOIN chapters for theme/scene
words = ATTACH status from word_progress

Step 5: 返回响应
─────────────────────────────────────────────────────────────────
return { data: words, page, pageSize, count, total }
```

---

## 六、数据一致性要求

| 要求 | 说明 | 实现方式 |
|------|------|---------|
| **乱序一致性** | 同一用户、同一范围、乱序模式下，每次加载的顺序必须一致 | 使用固定种子 `${bookId}-${status}` |
| **分页正确性** | 第 N 页必须返回第 N 批数据，不能重复 | 先打乱 ID 列表，再切片 |
| **断点定位** | 用户从断点恢复时，必须定位到正确的单词 | ID 列表顺序固定 → 索引定位准确 |
| **无重复** | 不同页之间不能有重复单词 | 基于 ID 列表切片，天然无重复 |

---

## 七、关键文件位置

```
src/
├── app/
│   ├── api/
│   │   ├── words/
│   │   │   └── route.ts              # 单词 API（本次重构重点）
│   │   └── flashcard-progress/
│   │       └── route.ts              # 进度保存 API
│   └── study/[bookId]/dictation/
│       └── pageClient.tsx            # 听写页面
├── hooks/
│   ├── useDictationWords.ts          # 单词加载 Hook
│   ├── useDictationProgress.ts       # 进度保存 Hook
│   └── useResumeState.ts             # 断点状态 Hook
├── services/
│   ├── dictationService.ts           # API 调用封装
│   └── progressManager.ts            # 进度管理（防抖）
├── lib/
│   └── continueURL.ts                # URL 生成工具
└── types/
    └── dictation.ts                  # 类型定义
```

---

## 八、性能目标

| 指标 | 目标值 | 测量方法 |
|------|--------|---------|
| 首页加载（50词） | < 500ms | API 响应时间 |
| 翻页加载（50词） | < 300ms | API 响应时间 |
| 10000 词词书 | < 2s | 首次加载 |
| 内存占用 | < 50MB | 任意词书大小 |
