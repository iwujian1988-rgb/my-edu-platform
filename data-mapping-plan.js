# 数据映射和加工方案

## 📋 数据源字段结构（20260112v1.tar.gz）

### 完整字段列表

| 英文字段名 | 中文说明 | 数据类型 | 示例值 | 必填 |
|-----------|---------|---------|--------|------|
| word | 单词 | string | "scholar" | ✅ |
| uk_phonetic | 英式音标 | string | "'skɒlə" | |
| us_phonetic | 美式音标 | string | "'skɑlɚ" | |
| definition_cn | 中文释义 | string/array | "学者" | ✅ |
| definition_en | 英文释义 | string | - | |
| part_of_speech | 词性 | string | "n" | |
| examples | 例句数组 | array | ["句子1", "句子2"] | |
| phrases | 词组/搭配 | array | ["visiting scholar"] | |
| synonyms | 同义词 | array | ["student", "academic"] | |
| related_words | 相关词 | array | [{word, translation}] | |
| derived_words | 派生词 | array | [{word, pos, translation}] | |
| memory_method | 记忆方法 | string | "词根记忆..." | |

---

## 🗄️ 目标数据库表结构

### books 表（书籍表）

| 英文字段名 | 中文说明 | 数据类型 | 必填 | 约束 |
|-----------|---------|---------|------|------|
| id | 主键ID | UUID | ✅ | PK |
| title | 书名 | string | ✅ | NOT NULL |
| description | 描述 | string | | |
| category | 分类 | string | ✅ | 'exam' OR 'textbook' |
| is_official | 是否官方 | boolean | | default true |
| total_words | 总单词数 | integer | | |
| total_chapters | 总章节数 | integer | | |
| created_at | 创建时间 | timestamp | | |
| updated_at | 更新时间 | timestamp | | |

### chapters 表（章节表）

| 英文字段名 | 中文说明 | 数据类型 | 必填 | 约束 |
|-----------|---------|---------|------|------|
| id | 主键ID | UUID | ✅ | PK |
| book_id | 书籍ID | UUID | ✅ | FK → books(id) |
| title | 章节标题 | string | ✅ | NOT NULL |
| order_index | 排序索引 | integer | | |
| created_at | 创建时间 | timestamp | | |
| updated_at | 更新时间 | timestamp | | |

### words 表（单词表）

| 英文字段名 | 中文说明 | 数据类型 | 必填 | 约束 | 默认值 |
|-----------|---------|---------|------|------|--------|
| id | 主键ID | UUID | ✅ | PK | |
| chapter_id | 章节ID | UUID | ✅ | FK → chapters(id) | |
| word | 单词 | string | ✅ | NOT NULL | |
| phonetic | 通用音标 | string | | | NULL |
| uk_phonetic | 英式音标 | string | | | NULL |
| us_phonetic | 美式音标 | string | | | NULL |
| definition | 中文释义 | string | ✅ | NOT NULL | |
| definition_en | 英文释义 | string | | | NULL |
| collocation | 搭配（中文） | string | | | NULL |
| collocation_en | 搭配（英文） | string | | | NULL |
| example_sentence | 例句（中文） | string | | | NULL |
| example_sentence_en | 例句（英文） | string | | | NULL |
| part_of_speech | 词性 | string | | | NULL |
| audio_url | 音频URL | string | | | NULL |
| image_url | 图片URL | string | | | NULL |
| order_index | 排序索引 | integer | | | |
| difficulty_score | 难度分数 | integer | | | NULL |
| frequency_rank | 词频排名 | integer | | | NULL |
| created_at | 创建时间 | timestamp | | | |
| updated_at | 更新时间 | timestamp | | | |

---

## 🔄 字段映射方案

### books 表映射

| 数据源字段 | 目标字段 | 转换规则 | 说明 |
|-----------|---------|---------|------|
| JSON文件名 | title | 文件名去后缀 | 例: "TOEFL_merged.json" → "TOEFL" |
| - | description | 从原始数据导入 | 保留原始描述 |
| - | category | 静态映射 | 考试类→'exam', 教材类→'textbook' |
| - | is_official | true | 默认为官方词库 |
| words.length | total_words | 统计单词数 | 导入后更新 |
| 1 | total_chapters | 固定为1 | 每个词库1个章节 |

### chapters 表映射

| 数据源字段 | 目标字段 | 转换规则 | 说明 |
|-----------|---------|---------|------|
| - | book_id | 自动生成UUID | 关联到书籍 |
| - | title | "All Words" | 固定标题 |
| - | order_index | 1 | 固定顺序 |

### words 表映射（核心）

| 数据源字段 | 目标字段 | 转换规则 | 说明 |
|-----------|---------|---------|------|
| - | id | 自动生成UUID | UUID格式 |
| - | chapter_id | 自动生成UUID | 关联到章节 |
| word | word | 直接映射 | 单词本身 |
| uk_phonetic | uk_phonetic | 直接映射 | 英式音标 |
| us_phonetic | us_phonetic | 直接映射 | 美式音标 |
| - | phonetic | us_phonetic 或 uk_phonetic | 优先用美式 |
| **definition_cn** | **definition** | **重点转换** | 见下方加工逻辑 |
| definition_en | definition_en | 直接映射 | 英文释义 |
| **phrases** | **collocation** | **重点转换** | 见下方加工逻辑 |
| - | collocation_en | phrases 转英文 | 见下方加工逻辑 |
| - | example_sentence | examples 转 | 见下方加工逻辑 |
| **examples** | **example_sentence_en** | **重点转换** | 见下方加工逻辑 |
| part_of_speech | part_of_speech | 直接映射 | 词性 |
| - | audio_url | 拼接生成 | TTS音频地址 |
| - | order_index | 数组索引 | 从0开始 |
| - | difficulty_score | 静态赋值 | 根据词库难度 |

---

## 🛠️ 数据加工逻辑

### 1. definition（中文释义）- 必填字段

**数据源字段**: `definition_cn`

**类型**: 可能是 string 或 array

**加工逻辑**:
```javascript
function processDefinition(definition_cn) {
  // 情况1: 字符串
  if (typeof definition_cn === 'string') {
    return definition_cn
  }

  // 情况2: 数组格式 [{part_of_speech, definition_cn}]
  if (Array.isArray(definition_cn) && definition_cn.length > 0) {
    return definition_cn
      .map(item => `${item.part_of_speech}. ${item.definition_cn}`)
      .join('; ')
  }

  // 兜底: 使用单词本身
  return word
}
```

**示例**:
- 输入: "学者"
- 输出: "学者"

- 输入: `[{part_of_speech: "n", definition_cn: "学者"}]`
- 输出: "n. 学者"

- 输入: `[{part_of_speech: "n", definition_cn: "学者"}, {part_of_speech: "v", definition_cn: "学习"}]`
- 输出: "n. 学者; v. 学习"

---

### 2. example_sentence_en（英文例句）

**数据源字段**: `examples`

**类型**: array of string

**加工逻辑**:
```javascript
function processExampleSentenceEn(examples) {
  if (!Array.isArray(examples) || examples.length === 0) {
    return null
  }

  // 取第一个例句
  // 或者拼接多个例句用分隔符
  return examples.slice(0, 3).join(' | ')
}
```

**示例**:
- 输入: `["the great Dutch scholar Erasmus", "a famous scholar"]`
- 输出: "the great Dutch scholar Erasmus | a famous scholar"

---

### 3. collocation（词组/搭配）

**数据源字段**: `phrases`

**类型**: array of string

**加工逻辑**:
```javascript
function processCollocation(phrases) {
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return null
  }

  // 拼接词组，用分号分隔
  return phrases.join('; ')
}
```

**示例**:
- 输入: `["visiting scholar", "research scholar", "teaching scholar"]`
- 输出: "visiting scholar; research scholar; teaching scholar"

---

### 4. example_sentence（中文例句）

**数据源字段**: 目前没有，可以暂存 null 或翻译

**加工逻辑**:
```javascript
function processExampleSentence(examples, word) {
  // 暂时返回 null
  // 未来可以调用翻译API翻译英文例句
  return null
}
```

---

### 5. phonetic（通用音标）

**数据源字段**: `us_phonetic` 或 `uk_phonetic`

**加工逻辑**:
```javascript
function processPhonetic(us_phonetic, uk_phonetic) {
  // 优先使用美式音标
  if (us_phonetic) {
    return us_phonetic
  }

  // 其次使用英式音标
  if (uk_phonetic) {
    return uk_phonetic
  }

  return null
}
```

---

### 6. audio_url（音频地址）

**数据源字段**: 无

**加工逻辑**:
```javascript
function processAudioUrl(word) {
  // 使用有道TTS或其他TTS服务
  return `https://dict.youdao.com/dictvoice?type=2&audio=${encodeURIComponent(word)}`
}
```

---

### 7. 难度分数映射

```javascript
const DIFFICULTY_MAP = {
  'IELTS': 4,
  'TOEFL': 4,
  'GRE': 5,
  'SAT': 4,
  'CET-6': 3,
  'CET-4': 3,
  '考研': 3,
  'GMAT': 4,
  'BEC': 3,
  '高中': 2,
  '初中': 1,
  // ... 其他词库
}

function getDifficultyScore(bookTitle) {
  return DIFFICULTY_MAP[bookTitle] || 3 // 默认中等难度
}
```

---

## 📝 完整转换示例

### 输入（原始数据）

```json
{
  "word": "scholar",
  "uk_phonetic": "'skɒlə",
  "us_phonetic": "'skɑlɚ",
  "definition_cn": "学者",
  "part_of_speech": "n",
  "examples": [
    "the great Dutch scholar Erasmus",
    "a renowned scholar"
  ],
  "phrases": [
    "visiting scholar",
    "research scholar"
  ],
  "synonyms": ["student", "academic"],
  "related_words": [
    {
      "word": "scholarly",
      "translation": "博学的",
      "part_of_speech": "adj"
    }
  ],
  "derived_words": [
    {
      "word": "scholarship",
      "pos": "n",
      "translation": "奖学金"
    }
  ],
  "memory_method": "词根记忆法"
}
```

### 输出（数据库记录）

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "chapter_id": "chapter-uuid",
  "word": "scholar",
  "phonetic": "'skɑlɚ",
  "uk_phonetic": "'skɒlə",
  "us_phonetic": "'skɑlɚ",
  "definition": "学者",
  "definition_en": null,
  "collocation": "visiting scholar; research scholar",
  "collocation_en": null,
  "example_sentence": null,
  "example_sentence_en": "the great Dutch scholar Erasmus | a renowned scholar",
  "part_of_speech": "n",
  "audio_url": "https://dict.youdao.com/dictvoice?type=2&audio=scholar",
  "order_index": 0,
  "difficulty_score": 4
}
```

---

## 🚀 导入脚本伪代码

```javascript
async function importWordlist(bookTitle, jsonData) {
  // 1. 创建书籍
  const book = await createBook({
    title: bookTitle,
    description: jsonData.description,
    category: mapCategory(bookTitle),
    is_official: true
  })

  // 2. 创建章节
  const chapter = await createChapter({
    book_id: book.id,
    title: "All Words",
    order_index: 1
  })

  // 3. 批量插入单词（500个一批）
  const batchSize = 500
  for (let i = 0; i < jsonData.words.length; i += batchSize) {
    const batch = jsonData.words.slice(i, i + batchSize)

    const wordsToInsert = batch.map((w, idx) => ({
      id: generateUUID(),
      chapter_id: chapter.id,
      word: w.word,
      phonetic: w.us_phonetic || w.uk_phonetic || null,
      uk_phonetic: w.uk_phonetic || null,
      us_phonetic: w.us_phonetic || null,
      definition: processDefinition(w.definition_cn, w.word),
      definition_en: w.definition_en || null,
      collocation: processCollocation(w.phrases),
      example_sentence_en: processExampleSentenceEn(w.examples),
      part_of_speech: w.part_of_speech || null,
      audio_url: processAudioUrl(w.word),
      order_index: i + idx,
      difficulty_score: getDifficultyScore(bookTitle)
    }))

    await supabase.from('words').insert(wordsToInsert)
  }

  // 4. 更新书籍统计
  await updateBookStats(book.id, {
    total_words: jsonData.words.length,
    total_chapters: 1
  })
}
```

---

## ⚠️ 注意事项

### 未映射的字段（数据源独有）

以下字段在目标数据库中没有对应字段，将**不被导入**：

| 字段名 | 说明 | 丢失影响 |
|--------|------|---------|
| synonyms | 同义词列表 | ⚠️ 中等（可后续添加字段） |
| related_words | 相关词列表 | ⚠️ 中等（可后续添加字段） |
| derived_words | 派生词列表 | ⚠️ 中等（可后续添加字段） |
| memory_method | 记忆方法 | ⚠️ 低（学习辅助功能） |

**建议**: 如果需要保留这些字段，可以在数据库中添加对应字段，或存储在 JSON 字段中。

---

## ✅ 总结

### 映射完整度

- ✅ **核心字段**: 100% 映射（word, definition, phonetics）
- ✅ **重要字段**: 90% 映射（examples, phrases, part_of_speech）
- ⚠️ **辅助字段**: 0% 映射（synonyms, related_words, derived_words, memory_method）

### 数据质量保证

1. **definition**: 必填，有兜底逻辑（用单词本身）
2. **phonetics**: 保留英式和美式音标
3. **examples**: 保留英文例句
4. **phrases**: 转换为 collocation 字段
5. **自动生成**: audio_url 使用TTS服务

### 可以立即执行导入！

数据映射方案已完整，可以开始导入 20260112v1.tar.gz 的数据。
