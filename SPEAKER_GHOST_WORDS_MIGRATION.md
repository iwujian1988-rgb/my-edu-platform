# Speaker 错题本迁移修复指南

## 问题说明

### Bug 描述
Speaker 迭代中，历史听写记录有错题但没进入 speaker 的错题本（魔鬼生词本）。

### Root Cause
1. **表创建时机问题**：`speaker_ghost_words` 表在 2026-02-06 创建
2. **缺少数据迁移**：在此之前的听写记录中的错题没有被迁移到新表
3. **API 查询错误**：submit API 查询文章时使用了不存在的 `sentences` 字段（已修复）

### Bug 表现
- 用户查看历史听写记录时，能看到之前的错题
- 但这些错题不在 `speaker_ghost_words` 表中
- 因此不会出现在魔鬼生词本页面

---

## 修复方案

### 1. 数据迁移 API

**端点**：`POST /api/speaker/migrate-ghost-words`

**参数**：
- `userId` (可选)：指定用户 ID，只迁移该用户的数据
- `dryRun=true` (可选)：预演模式，不实际插入数据

**使用方式**：

#### 方式 A：迁移所有用户的数据（管理员权限）
```bash
curl -X POST "https://your-domain.com/api/speaker/migrate-ghost-words" \
  -H "Content-Type: application/json"
```

#### 方式 B：迁移指定用户的数据
```bash
curl -X POST "https://your-domain.com/api/speaker/migrate-ghost-words?userId=USER_UUID" \
  -H "Content-Type: application/json"
```

#### 方式 C：预演模式（查看会迁移多少数据）
```bash
curl -X POST "https://your-domain.com/api/speaker/migrate-ghost-words?dryRun=true" \
  -H "Content-Type: application/json"
```

**响应示例**：
```json
{
  "success": true,
  "message": "成功迁移 45 个错题到生词本",
  "stats": {
    "totalSubmissions": 12,
    "wordsAdded": 45,
    "duplicatesSkipped": 3,
    "errorsCount": 0
  }
}
```

### 2. 提交 API 修复

**修复内容**：`src/app/api/speaker/dictation/submit/route.ts:154-160`

**问题**：查询文章时使用了不存在的 `sentences` 字段
**修复**：改为从 `json_data` 字段获取句子数据

**影响**：修复后，新提交的听写记录会正确生成错题到生词本

---

## 验证步骤

### 1. 检查是否有历史听写记录
```sql
SELECT
  id,
  user_id,
  article_id,
  wrong_count,
  skipped_count,
  created_at
FROM speaker_dictation_submissions
WHERE wrong_count > 0 OR skipped_count > 0
ORDER BY created_at ASC;
```

### 2. 检查这些记录的错题是否在生词本中
```sql
-- 检查特定用户的听写记录错题数量
SELECT
  COUNT(*) AS total_submissions_with_errors,
  SUM(wrong_count + skipped_count) AS total_errors
FROM speaker_dictation_submissions
WHERE user_id = 'USER_UUID'
  AND (wrong_count > 0 OR skipped_count > 0);

-- 检查该用户的生词本数量
SELECT
  COUNT(*) AS ghost_words_count
FROM speaker_ghost_words
WHERE user_id = 'USER_UUID'
  AND is_mastered = false;
```

### 3. 执行迁移
使用上述 API 执行迁移

### 4. 验证迁移结果
```sql
-- 迁移后，生词本数量应该 >= 听写记录错题数量
--（因为可能有重复的错题，upsert 会去重）

SELECT
  COUNT(*) AS ghost_words_count
FROM speaker_ghost_words
WHERE user_id = 'USER_UUID'
  AND is_mastered = false;
```

### 5. 前端验证
1. 访问魔鬼生词本页面：`/speaker/ghost-words`
2. 检查是否显示历史错题
3. 点击"原声回放"验证功能正常
4. 点击"我已掌握"验证功能正常

---

## 注意事项

1. **Service Role Key**：迁移 API 需要使用 Service Role Key 来跳过 RLS 限制
   - 确保环境变量 `SUPABASE_SERVICE_ROLE_KEY` 已配置
   - 不要在前端调用此 API

2. **性能考虑**：
   - 如果历史记录很多，迁移可能需要较长时间
   - 建议分批迁移（按 userId）
   - 可以使用 `dryRun` 模式先评估数据量

3. **数据一致性**：
   - 迁移使用 `upsert` + `onConflict` 避免重复
   - 错题的 `created_at` 保持原始时间戳
   - 已掌握的生词不会被覆盖

4. **错误处理**：
   - API 返回时会包含错误列表
   - 即使部分记录失败，其他记录仍会成功迁移
   - 检查响应中的 `errors` 字段

---

## 相关文件

### 新增文件
- `src/app/api/speaker/migrate-ghost-words/route.ts` - 迁移 API
- `supabase/migrations/20260206_migrate_ghost_words_from_history.sql` - SQL 迁移脚本（备选方案）

### 修改文件
- `src/app/api/speaker/dictation/submit/route.ts` - 修复文章查询逻辑

---

## 预期结果

修复完成后：
1. ✅ 历史听写记录中的错题会出现在魔鬼生词本中
2. ✅ 新提交的听写记录会正确生成错题
3. ✅ 生词本的"原声回放"和"我已掌握"功能正常
4. ✅ 用户可以完整地复习所有历史错题
