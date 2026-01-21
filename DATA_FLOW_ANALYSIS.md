# 数据流对比分析：智能导入 vs 表格编辑

**日期**: 2026-01-15
**问题**: 两种方式的数据流是否一致？

---

## 📊 智能导入的数据流（现有）

### 完整流程

```
用户操作：
1. 输入词库名称、描述
2. 点击"创建" → 空词库创建成功
3. 进入智能录入页面
4. 输入单词列表（每行一个）
   例如：
   apple
   banana
   orange
5. 点击"智能识别并导入"

系统处理：
6. 调用 POST /api/smart-import
7. 验证权限（用户必须是词库创建者）
8. 检查配额（每日500词）
9. 调用第三方有道词典API（并发10个）
   - 获取音标：usphone/ukphone
   - 获取中文释义：ec.trs[0].tr[0].l.i[0]
   - 获取英文释义：ee.trs[0].tr[0].l.i
   - 获取词性：syno.syno.pos
   - 获取例句：blng.sentence-translation
   - 获取搭配：phrs.phr.headword.l.i
10. 检查/创建默认章节
11. 批量插入到 words 表（包含所有字段）
12. 更新 books 表统计
13. 更新配额表
```

### 数据结构（插入到 words 表）

```javascript
{
  book_id: "book-uuid",           // 词库ID
  chapter_id: "chapter-uuid",     // 章节ID（自动创建的默认章节）
  word: "apple",                  // 单词
  phonetic: "ˈæpl",               // 音标（从API获取）
  definition: "苹果",              // 中文释义（从API获取）
  definition_en: "a round fruit...", // 英文释义（从API获取）
  collocation: "",                 // 中文搭配（从API获取）
  collocation_en: "",              // 英文搭配（从API获取）
  example_sentence: "",            // 中文例句（从API获取）
  example_sentence_en: "",         // 英文例句（从API获取）
  part_of_speech: "n.",            // 词性（从API获取）
  order_index: 1                   // 排序（追加到现有单词后）
}
```

### 关键特性

1. **完整数据**：8个字段全部填充（从API获取）
2. **自动创建章节**：如果没有章节，自动创建"默认章节"
3. **批量操作**：一次导入多个单词
4. **第三方集成**：调用有道词典API
5. **配额限制**：每日500词

---

## 📝 表格编辑的数据流（新设计）

### 完整流程

```
用户操作：
1. 在词库详情页点击"📊 编辑模式"
2. 显示表格视图（从 words 表读取数据）
3. 点击单元格，直接修改
   例如：修改"中文释义"
4. 失去焦点，自动保存

系统处理：
5. 调用 PUT /api/words/{wordId}
6. 验证权限（用户必须是词库创建者）
7. 更新 words 表的单个记录
8. 返回成功
```

### 数据结构（更新 words 表）

```javascript
// 只更新用户修改的字段（部分更新）
{
  word: "apple",          // 如果用户修改了
  phonetic: "ˈæpl",       // 如果用户修改了
  definition: "苹果，一种水果",  // 如果用户修改了
  chapter_id: "chapter-2" // 如果用户修改了章节
}
```

### 关键特性

1. **部分更新**：只更新用户修改的字段
2. **单个更新**：一次更新一个单词
3. **手动编辑**：用户手动输入数据
4. **无第三方调用**：不调用API

---

## ⚠️ 数据流差异分析

### 差异 1: 字段完整性

| 字段 | 智能导入 | 表格编辑 |
|------|---------|---------|
| `word` | ✅ 自动填充 | ❓ 用户输入 |
| `phonetic` | ✅ 自动填充 | ❓ 用户输入 |
| `definition` | ✅ 自动填充 | ❓ 用户输入 |
| `definition_en` | ✅ 自动填充 | ❓ 用户输入 |
| `part_of_speech` | ✅ 自动填充 | ❓ 用户选择 |
| `collocation` | ✅ 自动填充 | ❓ 用户输入 |
| `collocation_en` | ✅ 自动填充 | ❓ 用户输入 |
| `example_sentence` | ✅ 自动填充 | ❓ 用户输入 |
| `example_sentence_en` | ✅ 自动填充 | ❓ 用户输入 |

**问题**：
- 智能导入：所有字段都有数据（完整）
- 表格编辑：用户可能只修改部分字段（不完整）

**影响**：
- 如果用户只修改 `word`，其他字段保持不变
- 如果用户只修改 `definition`，`word` 保持不变
- **结论**：无问题，部分更新是合理的

---

### 差异 2: 章节处理

**智能导入**：
```javascript
// 自动检查/创建章节
let chapterId = existingChapter?.[0]?.id
if (!chapterId) {
  // 创建默认章节
  const { data: chapterData } = await supabase
    .from('chapters')
    .insert({
      book_id: bookId,
      title: '默认章节',
      order_index: 1,
      word_count: results.length
    })
  chapterId = chapterData.id
}

// 插入单词时关联章节
wordsToInsert = results.map(result => ({
  chapter_id: chapterId,  // ← 关联到章节
  ...
}))
```

**表格编辑**：
```javascript
// 用户从下拉列表选择章节
<select onChange={(e) => updateChapter(wordId, e.target.value)}>
  <option value="">默认章节</option>
  <option value="chapter-1">第1章</option>
  <option value="chapter-2">第2章</option>
</select>

// 更新单词的章节
PUT /api/words/{wordId}
{
  chapter_id: "chapter-2"  // ← 更新章节ID
}
```

**问题**：
- 智能导入：自动创建并关联"默认章节"
- 表格编辑：用户手动选择章节

**影响**：
- 需要处理章节统计：当单词从一个章节移动到另一个章节时，需要更新两个章节的 `word_count`
- **结论**：需要同步更新章节统计

---

### 差异 3: 统计更新

**智能导入**：
```javascript
// 更新词库统计
await supabase
  .from('books')
  .update({
    total_words: newTotalWords,      // ← 更新总词数
    total_chapters: newTotalChapters  // ← 更新总章节数
  })
  .eq('id', bookId)
```

**表格编辑**（我的原设计）：
```javascript
// 原设计：没有更新统计
PUT /api/words/{wordId}
{
  definition: "新的释义"
}
// ❌ 没有更新 books.total_words
// ❌ 没有更新 chapters.word_count
```

**问题**：
- 智能导入：同步更新统计
- 表格编辑：没有更新统计

**影响**：
- `books.total_words` 可能不准确
- `chapters.word_count` 可能不准确
- **结论**：需要同步更新统计

---

## ✅ 数据流一致化方案

### 方案 A: 在表格编辑时同步更新统计（推荐）

**实现逻辑**：

```javascript
// PUT /api/words/{wordId}
export async function PUT(request, { params }) {
  const { wordId } = params
  const user = await getCurrentUser()
  const body = await request.json()

  // 1. 获取原单词数据
  const { data: oldWord } = await supabase
    .from('words')
    .select('*')
    .eq('id', wordId)
    .single()

  // 2. 更新单词
  const { data: newWord } = await supabase
    .from('words')
    .update(body)
    .eq('id', wordId)
    .select()
    .single()

  // 3. 同步更新统计
  const updates = []

  // 3.1 如果章节改变，更新两个章节的 word_count
  if (body.chapter_id && body.chapter_id !== oldWord.chapter_id) {
    // 旧章节计数 -1
    if (oldWord.chapter_id) {
      updates.push(
        supabase.rpc('increment_chapter_word_count', {
          chapter_id: oldWord.chapter_id,
          delta: -1
        })
      )
    }

    // 新章节计数 +1
    if (body.chapter_id) {
      updates.push(
        supabase.rpc('increment_chapter_word_count', {
          chapter_id: body.chapter_id,
          delta: 1
        })
      )
    }
  }

  // 3.2 如果单词内容改变（新增/删除），更新 books.total_words
  // （只在新增/删除时更新，编辑时不需要）

  await Promise.all(updates)

  return NextResponse.json({ success: true, data: newWord })
}
```

**数据库函数**：
```sql
-- 创建或替换函数：更新章节单词计数
CREATE OR REPLACE FUNCTION increment_chapter_word_count(
  p_chapter_id UUID,
  p_delta INTEGER
) RETURNS void AS $$
BEGIN
  UPDATE chapters
  SET word_count = word_count + p_delta
  WHERE id = p_chapter_id;
END;
$$ LANGUAGE plpgsql;
```

---

### 方案 B: 使用触发器自动更新统计（更优雅）

**实现逻辑**：

```sql
-- 触发器：当 words 表的 chapter_id 改变时，自动更新章节统计
CREATE OR REPLACE FUNCTION update_chapter_word_count()
RETURNS TRIGGER AS $$
BEGIN
  -- 旧章节计数 -1
  IF OLD.chapter_id IS NOT NULL AND OLD.chapter_id != NEW.chapter_id THEN
    UPDATE chapters
    SET word_count = word_count - 1
    WHERE id = OLD.chapter_id;
  END IF;

  -- 新章节计数 +1
  IF NEW.chapter_id IS NOT NULL AND OLD.chapter_id != NEW.chapter_id THEN
    UPDATE chapters
    SET word_count = word_count + 1
    WHERE id = NEW.chapter_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
DROP TRIGGER IF EXISTS trigger_update_chapter_word_count
ON words;

CREATE TRIGGER trigger_update_chapter_word_count
AFTER UPDATE OF chapter_id ON words
FOR EACH ROW
EXECUTE FUNCTION update_chapter_word_count();
```

**好处**：
- 自动同步，无需手动维护
- 数据一致性有保障
- 代码更简洁

---

## 🎯 最终推荐方案

### 混合方案：触发器 + 手动更新

**1. 章节统计**：使用触发器（方案 B）
- 当 `words.chapter_id` 改变时，自动更新 `chapters.word_count`
- 优点：自动同步，不会遗漏

**2. 词库统计**：手动更新
- 新增单词时：`books.total_words + 1`
- 删除单词时：`books.total_words - 1`
- 编辑单词时：不更新（数量不变）

**3. 实现要点**：

```javascript
// ✅ 更新单词（编辑）
PUT /api/words/{wordId}
- 更新 words 表
- 触发器自动更新 chapters.word_count（如果章节改变）

// ✅ 批量删除单词
DELETE /api/words/batch
- 删除 words 表
- 更新 books.total_words（减去删除数量）
- 触发器自动更新 chapters.word_count

// ✅ 批量添加单词（智能导入）
POST /api/smart-import
- 插入 words 表
- 更新 books.total_words（加上新增数量）
- 触发器自动更新 chapters.word_count（如果关联章节）
```

---

## 📋 数据流对比总结

| 操作 | 智能导入 | 表格编辑 | 一致性 |
|------|---------|---------|--------|
| **创建单词** | ✅ 批量插入 | ✅ 单个插入 | ✅ 一致 |
| **数据完整性** | ✅ 8个字段 | ❓ 部分字段 | ✅ 合理 |
| **章节关联** | ✅ 自动关联 | ✅ 手动选择 | ✅ 一致 |
| **统计更新** | ✅ 手动更新 | ⚠️ 缺失 | ❌ **需补充** |
| **第三方调用** | ✅ 调用API | ❌ 不调用 | ✅ 合理 |

---

## 🔧 需要补充的实现

### 1. 数据库触发器（新增）
```sql
-- 见方案 B
```

### 2. 表格编辑 API 更新（补充）
```javascript
// 需要确认：
- 是否支持所有字段更新？
- 是否更新章节统计？（由触发器处理）
- 是否需要其他同步逻辑？
```

### 3. 批量删除 API 更新（补充）
```javascript
// 需要确认：
- 删除后是否更新 books.total_words？
- 删除后是否更新 chapters.word_count？（由触发器处理）
```

---

## ❓ 待确认问题

1. **表格编辑是否需要调用第三方API？**
   - 方案A：需要（用户修改单词时重新获取释义）
   - 方案B：不需要（用户手动修改）
   - **推荐**：不需要，用户手动修改更灵活

2. **表格编辑是否支持所有字段？**
   - 方案A：只显示核心字段（章节、单词、音标、词性、中文释义）
   - 方案B：显示所有字段（8个字段）
   - **推荐**：方案A（核心字段），其他字段通过"编辑"按钮打开对话框

3. **章节统计是否实时更新？**
   - 方案A：是（触发器）
   - 方案B：否（定时任务）
   - **推荐**：方案A（触发器）

---

**总结**：数据流基本一致，但需要补充统计同步逻辑（使用触发器）。
