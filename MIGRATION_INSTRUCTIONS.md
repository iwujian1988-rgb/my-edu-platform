# 数据库迁移说明

## 继续学习功能 - 数据库迁移

### 需要执行的SQL

请在 Supabase SQL Editor 中执行以下SQL：

```sql
-- 添加学习状态恢复字段到 user_book_preferences 表
-- 用于支持"继续学习"功能，记录用户最后的学习位置

-- 添加 JSONB 字段用于存储学习状态
ALTER TABLE user_book_preferences
ADD COLUMN IF NOT EXISTS last_resume_state JSONB DEFAULT '{}'::jsonb;

-- 添加注释
COMMENT ON COLUMN user_book_preferences.last_resume_state IS '用户最后的学习状态，用于恢复学习位置。结构：{ mode, bookId, context: {...}, updatedAt }';
```

### 验证迁移成功

执行以下SQL验证：

```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'user_book_preferences'
  AND column_name = 'last_resume_state';
```

应该能看到 `last_resume_state` 字段，类型为 `jsonb`。

### 数据结构说明

`last_resume_state` 字段存储的JSON结构示例：

```json
{
  "mode": "word-list",
  "bookId": "2a3f08f3-9d89-49e9-b999-d575993bbd47",
  "updatedAt": 1704600000000,
  "context": {
    "filters": {
      "theme": "旅游",
      "scenario": "机场",
      "status": "new"
    },
    "page": 3
  }
}
```

或卡片模式：

```json
{
  "mode": "flashcards",
  "bookId": "2a3f08f3-9d89-49e9-b999-d575993bbd47",
  "updatedAt": 1704600000000,
  "context": {
    "index": 15,
    "totalWords": 100
  }
}
```

### 功能说明

- **word-list**: 单词列表浏览（记住筛选条件和页码）
- **flashcards**: 卡片背单词（记住当前卡片索引）
- **dictation**: 听写模式（记住当前单词索引）
- **match-game**: 消消乐（暂未实现）
