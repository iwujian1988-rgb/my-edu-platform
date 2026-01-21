# 词库字段映射关系表

## 📊 完整字段对比（中文说明）

| 序号 | 压缩包字段 | 系统数据库字段 | 字段说明 | 映射方式 |
|-----|-----------|---------------|---------|---------|
| 1 | `id` | `id` (UUID) | 唯一标识符 | 直接映射 |
| 2 | `word` | `word` (VARCHAR) | 单词本身 | 直接映射 |
| 3 | `phonetic` | `phonetic` (VARCHAR) | **通用音标**（不区分英式美式） | ✅ 直接映射 |
| 4 | `uk_phonetic` | `uk_phonetic` (TEXT) | 英式音标 | ✅ 直接映射 |
| 5 | `us_phonetic` | `us_phonetic` (TEXT) | 美式音标 | ✅ 直接映射 |
| 6 | `definition` | `definition` (TEXT) | 中文释义 | ✅ 直接映射 |
| 7 | `definition_en` | `definition_en` (TEXT) | 英文释义 | ✅ 直接映射 |
| 8 | `definition_cn` | `definition` (TEXT) | 中文释义（重复） | ⚠️ 与definition重复 |
| 9 | `collocation` | `collocation` (TEXT) | 中文搭配 | ✅ 直接映射 |
| 10 | `collocation_en` | `collocation_en` (TEXT) | 英文搭配 | ✅ 直接映射 |
| 11 | `example_sentence` | `example_sentence` (TEXT) | 例句 | ✅ 直接映射 |
| 12 | `example_sentence_en` | `example_sentence_en` (TEXT) | 英文例句 | ✅ 直接映射 |
| 13 | `part_of_speech` | `part_of_speech` (VARCHAR) | 词性 | ✅ 直接映射 |
| 14 | `audio_url` | `audio_url` (VARCHAR) | 音频URL | ✅ 直接映射 |
| 15 | `order_index` | `order_index` (INTEGER) | 排序索引 | ✅ 直接映射 |
| 16 | `difficulty_score` | `difficulty_score` (INTEGER) | 难度分数 | ✅ 直接映射 |
| 17 | `image_url` | ❌ **不存在** | 图片URL | ❌ 系统没有此字段 |
| 18 | `frequency_rank` | ❌ **不存在** | 词频排名 | ❌ 系统没有此字段 |
| 19 | `chapter` | 需创建 `chapters` 表 | 章节信息数组 | ✅ 需要创建章节 |
| 20 | `chapter_id` | `chapter_id` (UUID外键) | 所属章节ID | ✅ 外键关联 |
| 21 | `book_id` | 需创建 `books` 表 | 所属词库ID | ✅ 外键关联 |
| 22 | `created_at` | `created_at` (TIMESTAMP) | 创建时间 | ✅ 直接映射 |
| 23 | `updated_at` | ❌ **不存在** | 更新时间 | ❌ 系统没有此字段 |

---

## 🔍 重点字段说明

### 1. 音标字段（3个）

| 字段 | 说明 | 数据示例 |
|-----|------|---------|
| `phonetic` | 通用音标（不区分英式美式） | `"əbriːvɪ'eɪʃ(ə)n"` |
| `uk_phonetic` | 英式发音 | `"/əˈbændən/"` |
| `us_phonetic` | 美式发音 | `"/əˈbændən/"` |

**处理方式**：
- ✅ **全部导入，不丢弃**
- `phonetic` 是独立字段，保留原值
- `uk_phonetic` 和 `us_phonetic` 也保留原值
- 三个字段可以同时存在

### 2. 释义字段（3个）

| 字段 | 说明 | 数据格式 | 示例 |
|-----|------|---------|------|
| `definition` | 中文释义（主字段） | 字符串 | `"【n.】缩写，缩写词"` |
| `definition_cn` | 中文释义（重复字段） | **字符串或数组** | `"缩写（非正式用法）"` 或 `[{"part_of_speech": "n", "definition_cn": "缩写", "definition_en": "..."}]` |
| `definition_en` | 英文释义 | 字符串 | `"a short form of a word"` |

**处理方式**：
- ✅ **不丢弃 definition_cn 数组格式中的丰富数据**
- 如果 `definition_cn` 是数组，提取其中的 `definition_en` 和 `part_of_speech`
- 如果 `definition_cn` 是字符串，与 `definition` 比较，选择更完整的

### 3. 章节字段（2个）

| 字段 | 说明 | 数据格式 |
|-----|------|---------|
| `chapter` | 章节名称数组 | `["Part 1 GRE List 1"]` 或 `[]` |
| `chapter_id` | 章节ID（外键） | UUID 或 `null` |

**处理方式**：
- ✅ **不丢弃 chapter 信息**
- 为每个唯一的章节名称创建一个 `chapters` 记录
- 将单词关联到对应的章节

---

## ❌ 无法映射的字段（会被丢弃）

| 字段 | 说明 | 原因 |
|-----|------|------|
| `image_url` | 图片URL | 系统数据库没有此字段 |
| `frequency_rank` | 词频排名 | 系统数据库没有此字段 |
| `updated_at` | 更新时间 | 系统数据库没有此字段 |

---

## ✅ 推荐的字段处理策略

### 1. 音标字段（不丢弃）
```javascript
// 方案：全部导入
{
  phonetic: word.phonetic,           // 保留原值
  uk_phonetic: word.uk_phonetic,     // 保留原值
  us_phonetic: word.us_phonetic      // 保留原值
}
```

### 2. 释义字段（提取最有价值的内容）
```javascript
// 方案：智能合并
let definition = word.definition;
let definition_en = word.definition_en;
let part_of_speech = word.part_of_speech;

// 如果 definition_cn 是数组，提取更丰富的信息
if (Array.isArray(word.definition_cn) && word.definition_cn.length > 0) {
  const first = word.definition_cn[0];
  if (first.definition_cn && !definition) {
    definition = first.definition_cn;
  }
  if (first.definition_en && !definition_en) {
    definition_en = first.definition_en;
  }
  if (first.part_of_speech && !part_of_speech) {
    part_of_speech = first.part_of_speech;
  }
}
// 如果 definition_cn 是字符串且更完整，使用它
else if (typeof word.definition_cn === 'string' && word.definition_cn) {
  if (!definition || word.definition_cn.length > definition.length) {
    definition = word.definition_cn;
  }
}
```

### 3. 章节字段（创建真实章节）
```javascript
// 方案：为每个唯一章节创建记录
if (word.chapter && word.chapter.length > 0) {
  // 为每个章节创建 chapters 记录
  word.chapter.forEach(chapterName => {
    // 创建或获取章节
    // 将单词关联到该章节
  });
} else {
  // 放入"默认章节"
}
```

---

## 📋 总结

### ✅ 可以直接映射的字段：18个
- 全部导入，不丢弃

### ⚠️ 需要智能处理的字段：3个
1. **phonetic** - 作为独立字段保留（不是后备）
2. **definition_cn** - 提取数组格式中的丰富信息
3. **chapter** - 创建真实的章节结构

### ❌ 无法映射的字段：3个
- image_url、frequency_rank、updated_at（系统没有这些字段）

---

## 🎯 核心原则

1. **不丢弃数据** - 有价值的字段全部导入
2. **不做后备** - phonetic 是独立字段，不是 uk/us 的后备
3. **智能合并** - 从多个来源提取最有价值的信息
4. **创建章节** - 根据实际 chapter 数据创建章节结构
