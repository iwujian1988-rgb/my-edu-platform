# 字段映射方案完整版

## 📋 表：books

| 源字段 | 数据库字段 | 数据类型 | 处理逻辑 | 示例 |
|--------|-----------|----------|----------|------|
| - | `id` | UUID | 自动生成 | `uuid()` |
| `title` | `title` | string | 直接使用 | `"CET-4 (Enhanced)"` |
| `description` | `description` | string | 直接使用 | `"合并kajweb和maimemo数据源的CET-4词库"` |
| - | `cover_url` | string | null | `null` |
| 从filename推断 | `category` | string | 映射表 | 见下方category映射表 |
| - | `is_official` | boolean | true | `true` |
| - | `created_by` | UUID | null | `null` |
| `total_words` | `total_words` | number | 直接使用 | `2607` |
| - | `total_chapters` | number | 计算得出 | 章节数量 |
| - | `is_published` | boolean | true | `true` |
| - | `difficulty_level` | string | null（不处理） | `null` |
| - | `language` | string | 固定值 | `"en"` |
| - | `created_at` | timestamp | now() | 自动生成 |
| - | `updated_at` | timestamp | now() | 自动生成 |
| - | `cover_color` | string | 固定值 | `"from-blue-400 to-blue-500"` |
| - | `learner_count` | number | 0 | `0` |
| - | `completion_rate` | number | 0 | `0` |

### category 映射表

```javascript
const categoryMapping = {
  'IELTS (Enhanced)': 'exam',
  'TOEFL (Enhanced)': 'exam',
  '考研 (Enhanced)': 'exam',
  'CET-4 (Enhanced)': 'exam',
  'CET-6 (Enhanced)': 'exam',
  'GRE (Enhanced)': 'exam',
  'SAT (Enhanced)': 'exam',
  'GMAT (Enhanced)': 'exam',
  'BEC (Enhanced)': 'business',
  '高中 (Enhanced)': 'exam',
  '初中 (Enhanced)': 'education',
  '2022年专升本英语核心词汇': 'exam',
  '14天攻克KET核心词汇': 'exam',
  '2022 PETS第五级教材': 'exam',
  'FCE核心词 巧记速练': 'exam',
  '2022PETS第三级教材': 'exam',
  '2022PETS第四级教材': 'exam'
}
```

---

## 📋 表：chapters

| 源字段 | 数据库字段 | 数据类型 | 处理逻辑 | 示例 |
|--------|-----------|----------|----------|------|
| - | `id` | UUID | 自动生成 | `uuid()` |
| - | `book_id` | UUID | 从books表获取 | 关联book |
| `chapter` | `title` | string | 见章节处理逻辑 | 见下方 |
| `chapter` | `order_index` | number | 数组索引 | `0, 1, 2...` |
| - | `theme_id` | UUID | null | `null` |
| - | `scene_id` | UUID | null | `null` |
| 计算得出 | `word_count` | number | 该章单词数 | `100` |
| - | `created_at` | timestamp | now() | 自动生成 |
| - | `updated_at` | timestamp | now() | 自动生成 |

### 章节处理逻辑

**情况1：源数据有chapter字段**
```javascript
// 示例：["Day 1", "Day 2", "Day 3"]
{
  title: chapter[0],  // "Day 1"
  order_index: 0
}
```

**情况2：源数据无chapter字段，按每100词分章**
```javascript
{
  title: `Part ${Math.floor(index / 100) + 1}`,  // "Part 1", "Part 2"...
  order_index: Math.floor(index / 100)
}
```

---

## 📋 表：words

| 源字段 | 数据库字段 | 数据类型 | 处理逻辑 | 示例 |
|--------|-----------|----------|----------|------|
| - | `id` | UUID | 自动生成 | `uuid()` |
| - | `chapter_id` | UUID | 从chapters表获取 | 关联chapter |
| `word` | `word` | string | 直接使用 | `"complicated"` |
| - | `phonetic` | string | 优先us_phonetic，其次uk_phonetic | `"/'kɑmplɪketɪd/"` |
| `uk_phonetic` | `uk_phonetic` | string | 直接使用 | `"/'kɒmplɪkeɪtɪd"` |
| `us_phonetic` | `us_phonetic` | string | 直接使用 | `"/'kɑmplɪketɪd"` |
| `definition_cn[0].definition_cn` | `definition` | string | 取数组第一个元素的中文释义 | `"复杂的，难懂的"` |
| `definition_cn[0].definition_en` | `definition_en` | string | 取数组第一个元素的英文释义 | `"difficult to understand..."` |
| `definition_cn[0].part_of_speech` | `part_of_speech` | string | 取数组第一个元素的词性 | `"adj"` 或 `"n"` |
| `examples[0].chinese` | `example_sentence` | string | 取第一条例句的中文 | `"对幼童来说，穿衣服是件复杂的事。"` |
| `examples[0].english` | `example_sentence_en` | string | 取第一条例句的英文 | `"For young children..."` |
| `phrases` | `collocation` | string | 用中文搭配拼接 | `"复式构造;复杂断层;并发"` |
| `phrases` | `collocation_en` | string | 用英文搭配拼接 | `"complicated structure;complicated fault;be complicated by"` |
| - | `audio_url` | string | null | `null` |
| - | `image_url` | string | null | `null` |
| - | `difficulty_score` | number | null | `null` |
| - | `frequency_rank` | number | null | `null` |
| - | `order_index` | number | 在书中的索引 | `0, 1, 2...` |
| - | `created_at` | timestamp | now() | 自动生成 |
| - | `updated_at` | timestamp | now() | 自动生成 |
| - | `book_id` | UUID | 从books表获取 | 关联book |

---

## 🔧 字段处理详细说明

### 1. definition_cn 处理

**源数据结构**：
```json
"definition_cn": [
  {
    "part_of_speech": "adj",
    "definition_cn": " 复杂的， 难懂的",
    "definition_en": "difficult to understand or deal with..."
  }
]
```

**处理代码**：
```javascript
const def = word.definition_cn?.[0]
definition = def?.definition_cn?.trim() || null
definition_en = def?.definition_en?.trim() || null
part_of_speech = def?.part_of_speech?.trim() || null
```

### 2. examples 处理

**源数据结构**：
```json
"examples": [
  {
    "english": "a complicated voting system",
    "chinese": "复杂的选举制度"
  },
  {
    "english": "For young children...",
    "chinese": "对幼童来说..."
  }
]
```

**处理代码**：
```javascript
const example = word.examples?.[0]
example_sentence_en = example?.english?.trim() || null
example_sentence = example?.chinese?.trim() || null
```

### 3. phrases 处理

**源数据结构**：
```json
"phrases": [
  {
    "phrase": "complicated structure",
    "translation": "复式构造"
  },
  {
    "phrase": "complicated fault",
    "translation": "复杂断层"
  }
]
```

**处理代码**：
```javascript
// 英文搭配：用分号拼接
collocation_en = word.phrases?.map(p => p.phrase).join('; ') || null

// 中文搭配：用分号拼接
collocation = word.phrases?.map(p => p.translation).join('; ') || null
```

### 4. 未使用字段（暂不导入）

以下源字段在当前数据库结构中没有对应字段，暂不导入：

| 源字段 | 说明 | 未来可能的用途 |
|--------|------|----------------|
| `synonyms` | 近义词数组 | 可存到JSON字段或新建表 |
| `related_words` | 同根词数组 | 可存到JSON字段或新建表 |
| `memory_method` | 记忆方法 | 可存到words表新增字段 |

---

## 📝 完整映射示例

### 输入（源数据）
```json
{
  "word": "complicated",
  "uk_phonetic": "'kɒmplɪkeɪtɪd",
  "us_phonetic": "'kɑmplɪketɪd",
  "definition_cn": [
    {
      "part_of_speech": "adj",
      "definition_cn": " 复杂的， 难懂的",
      "definition_en": "difficult to understand or deal with"
    }
  ],
  "examples": [
    {
      "english": "a complicated voting system",
      "chinese": "复杂的选举制度"
    }
  ],
  "phrases": [
    {
      "phrase": "complicated structure",
      "translation": "复式构造"
    }
  ],
  "chapter": ["Unit 1"]
}
```

### 输出（数据库）

**books表**：
```javascript
{
  title: "CET-4 (Enhanced)",
  description: "合并kajweb和maimemo数据源的CET-4词库",
  category: "exam",
  is_official: true,
  total_words: 2607,
  total_chapters: 26,
  is_published: true,
  language: "en",
  cover_color: "from-blue-400 to-blue-500",
  learner_count: 0,
  completion_rate: 0
}
```

**chapters表**：
```javascript
{
  book_id: "xxx-xxx-xxx",
  title: "Unit 1",
  order_index: 0,
  word_count: 100
}
```

**words表**：
```javascript
{
  chapter_id: "xxx-xxx-xxx",
  book_id: "xxx-xxx-xxx",
  word: "complicated",
  phonetic: "/'kɑmplɪketɪd/",
  uk_phonetic: "/'kɒmplɪkeɪtɪd",
  us_phonetic: "/'kɑmplɪketɪd",
  definition: "复杂的，难懂的",
  definition_en: "difficult to understand or deal with",
  part_of_speech: "adj",
  example_sentence: "复杂的选举制度",
  example_sentence_en: "a complicated voting system",
  collocation: "复式构造",
  collocation_en: "complicated structure",
  order_index: 0
}
```

---

## ⚠️ 特殊情况处理

### 1. 缺失字段处理

```javascript
// definition_cn为空或不存在
if (!word.definition_cn || word.definition_cn.length === 0) {
  definition = null
  definition_en = null
  part_of_speech = null
}

// examples为空或不存在
if (!word.examples || word.examples.length === 0) {
  example_sentence = null
  example_sentence_en = null
}

// phrases为空或不存在
if (!word.phrases || word.phrases.length === 0) {
  collocation = null
  collocation_en = null
}
```

### 2. 音标格式统一

```javascript
// 确保音标以/开头和结尾
function normalizePhonetic(phonetic) {
  if (!phonetic) return null
  phonetic = phonetic.trim()
  if (!phonetic.startsWith('/')) {
    phonetic = '/' + phonetic
  }
  if (!phonetic.endsWith('/')) {
    phonetic = phonetic + '/'
  }
  return phonetic
}
```

### 3. 章节归属处理

```javascript
// 如果单词有chapter字段，找到对应章节
if (word.chapter && word.chapter.length > 0) {
  const chapterTitle = word.chapter[0]
  chapter_id = findChapterIdByTitle(bookId, chapterTitle)
} else {
  // 否则按索引分配到对应章节
  const chapterIndex = Math.floor(wordIndex / 100)
  chapter_id = findChapterIdByIndex(bookId, chapterIndex)
}
```

---

## 🎯 数据质量检查

导入前检查：
```javascript
function validateWord(word) {
  const errors = []

  if (!word.word || word.word.trim() === '') {
    errors.push('单词不能为空')
  }

  if (!word.definition_cn || word.definition_cn.length === 0) {
    errors.push('缺少中文释义')
  }

  if (!word.examples || word.examples.length === 0) {
    errors.push('缺少例句')
  }

  if (!word.uk_phonetic && !word.us_phonetic) {
    errors.push('缺少音标')
  }

  return errors
}
```

---

## 📊 预期结果

导入完成后：
- **16本** 单词书
- **61,113个** 单词
- **约600个** 章节（按100词/章计算）
- **字段完整度** > 95%
