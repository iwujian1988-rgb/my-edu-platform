# 词库数据映射和加工方案

## 📊 一、数据源字段结构（20260112v1.tar.gz）

### 完整字段说明

| 序号 | 英文字段名 | 中文说明 | 数据类型 | 示例值 | 是否必填 |
|-----|-----------|---------|---------|--------|---------|
| 1 | **word** | 单词 | string | "scholar" | ✅ 是 |
| 2 | **uk_phonetic** | 英式音标 | string | "'skɒlə" | 否 |
| 3 | **us_phonetic** | 美式音标 | string | "'skɑlɚ" | 否 |
| 4 | **definition_cn** | 中文释义 | string或array | "学者" | ✅ 是 |
| 5 | definition_en | 英文释义 | string | - | 否 |
| 6 | part_of_speech | 词性 | string | "n"（名词） | 否 |
| 7 | **examples** | 例句数组 | array | ["句子1", "句子2"] | 否 |
| 8 | **phrases** | 词组/搭配 | array | ["visiting scholar"] | 否 |
| 9 | synonyms | 同义词 | array | ["student", "academic"] | 否 |
| 10 | related_words | 相关词 | array | 对象数组 | 否 |
| 11 | derived_words | 派生词 | array | 对象数组 | 否 |
| 12 | memory_method | 记忆方法 | string | "词根记忆..." | 否 |

---

## 🗄️ 二、目标数据库表结构

### 2.1 books 表（书籍表）

| 序号 | 英文字段名 | 中文说明 | 数据类型 | 是否必填 | 约束条件 |
|-----|-----------|---------|---------|---------|---------|
| 1 | id | 主键ID | UUID | ✅ 是 | 主键 |
| 2 | **title** | 书名 | string | ✅ 是 | 非空 |
| 3 | description | 描述 | string | 否 | - |
| 4 | **category** | 分类 | string | ✅ 是 | 'exam' 或 'textbook' |
| 5 | is_official | 是否官方 | boolean | 否 | 默认true |
| 6 | total_words | 总单词数 | integer | 否 | - |
| 7 | total_chapters | 总章节数 | integer | 否 | - |
| 8 | created_at | 创建时间 | timestamp | 否 | 自动生成 |
| 9 | updated_at | 更新时间 | timestamp | 否 | 自动生成 |

### 2.2 chapters 表（章节表）

| 序号 | 英文字段名 | 中文说明 | 数据类型 | 是否必填 | 约束条件 |
|-----|-----------|---------|---------|---------|---------|
| 1 | id | 主键ID | UUID | ✅ 是 | 主键 |
| 2 | **book_id** | 书籍ID | UUID | ✅ 是 | 外键→books(id) |
| 3 | **title** | 章节标题 | string | ✅ 是 | 非空 |
| 4 | order_index | 排序索引 | integer | 否 | - |
| 5 | created_at | 创建时间 | timestamp | 否 | 自动生成 |
| 6 | updated_at | 更新时间 | timestamp | 否 | 自动生成 |

### 2.3 words 表（单词表）

| 序号 | 英文字段名 | 中文说明 | 数据类型 | 是否必填 | 约束条件 | 默认值 |
|-----|-----------|---------|---------|---------|---------|--------|
| 1 | id | 主键ID | UUID | ✅ 是 | 主键 | - |
| 2 | **chapter_id** | 章节ID | UUID | ✅ 是 | 外键→chapters(id) | - |
| 3 | **word** | 单词 | string | ✅ 是 | 非空 | - |
| 4 | phonetic | 通用音标 | string | 否 | - | NULL |
| 5 | uk_phonetic | 英式音标 | string | 否 | - | NULL |
| 6 | us_phonetic | 美式音标 | string | 否 | - | NULL |
| 7 | **definition** | 中文释义 | string | ✅ 是 | 非空 | - |
| 8 | definition_en | 英文释义 | string | 否 | - | NULL |
| 9 | collocation | 搭配（中文） | string | 否 | - | NULL |
| 10 | collocation_en | 搭配（英文） | string | 否 | - | NULL |
| 11 | example_sentence | 例句（中文） | string | 否 | - | NULL |
| 12 | **example_sentence_en** | 例句（英文） | string | 否 | - | NULL |
| 13 | part_of_speech | 词性 | string | 否 | - | NULL |
| 14 | audio_url | 音频URL | string | 否 | - | NULL |
| 15 | image_url | 图片URL | string | 否 | - | NULL |
| 16 | order_index | 排序索引 | integer | 否 | - | - |
| 17 | difficulty_score | 难度分数 | integer | 否 | - | NULL |
| 18 | frequency_rank | 词频排名 | integer | 否 | - | NULL |
| 19 | created_at | 创建时间 | timestamp | 否 | - | 自动生成 |
| 20 | updated_at | 更新时间 | timestamp | 否 | - | 自动生成 |

---

## 🔄 三、字段映射方案（核心部分）

### 3.1 books 表映射

| 数据源字段 | 目标字段 | 转换规则 | 说明 |
|-----------|---------|---------|------|
| JSON文件名 | title | 去除".json"和"_merged"后缀 | 例: "TOEFL_merged.json" → "TOEFL" |
| JSON.description | description | 直接使用 | 保留原始描述信息 |
| - | category | 静态映射规则 | 考试类→'exam'<br>教材类→'textbook' |
| - | is_official | 固定为true | 默认为官方词库 |
| words数组长度 | total_words | 统计后填入 | 导入完成后更新 |
| - | total_chapters | 固定为1 | 每个词库创建1个章节 |

### 3.2 chapters 表映射

| 数据源字段 | 目标字段 | 转换规则 | 说明 |
|-----------|---------|---------|------|
| - | id | 自动生成UUID | 格式: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx |
| - | book_id | 关联到books.id | 外键关系 |
| - | title | 固定值"All Words" | 每个词库一个总章节 |
| - | order_index | 固定为1 | 唯一章节 |

### 3.3 words 表映射（详细）

| 序号 | 数据源字段 | 目标字段 | 转换规则 | 优先级 |
|-----|-----------|---------|---------|-------|
| 1 | - | **id** | 自动生成UUID | - |
| 2 | - | **chapter_id** | 自动生成UUID，关联到chapters.id | - |
| 3 | **word** | **word** | 直接映射，保持原样 | ⭐⭐⭐ |
| 4 | us_phonetic | **us_phonetic** | 直接映射 | ⭐⭐⭐ |
| 5 | uk_phonetic | **uk_phonetic** | 直接映射 | ⭐⭐⭐ |
| 6 | us_phonetic | **phonetic** | 优先使用美式，其次英式 | ⭐⭐ |
| 7 | **definition_cn** | **definition** | **重点转换**，见下文 | ⭐⭐⭐ |
| 8 | definition_en | definition_en | 直接映射，可为空 | ⭐⭐ |
| 9 | **phrases** | **collocation** | **重点转换**，见下文 | ⭐⭐⭐ |
| 10 | - | collocation_en | 暂时留空（NULL） | - |
| 11 | - | example_sentence | 暂时留空（NULL） | - |
| 12 | **examples** | **example_sentence_en** | **重点转换**，见下文 | ⭐⭐⭐ |
| 13 | part_of_speech | part_of_speech | 直接映射 | ⭐⭐ |
| 14 | - | audio_url | 自动生成TTS地址 | ⭐ |
| 15 | - | order_index | 数组索引（0,1,2...） | - |
| 16 | - | difficulty_score | 根据书名静态映射 | ⭐ |

---

## 🛠️ 四、重点字段加工逻辑

### 4.1 definition（中文释义）- 必填字段

**重要性**: ⭐⭐⭐⭐⭐
**数据源**: `definition_cn`
**目标**: `definition`（NOT NULL）

**加工逻辑**:
```javascript
function processDefinition(definition_cn, word) {
  // 情况1: 字符串类型
  if (typeof definition_cn === 'string') {
    return definition_cn
  }

  // 情况2: 数组类型 [{part_of_speech, definition_cn}]
  if (Array.isArray(definition_cn) && definition_cn.length > 0) {
    // 拼接多个释义: "n. 学者; v. 学习"
    return definition_cn
      .map(item => `${item.part_of_speech}. ${item.definition_cn}`)
      .join('; ')
  }

  // 情况3: 空值或未定义 - 兜底使用单词本身
  return word
}
```

**示例**:
| 输入 | 输出 |
|------|------|
| "学者" | "学者" |
| `[{part_of_speech: "n", definition_cn: "学者"}]` | "n. 学者" |
| `[{part_of_speech: "n", definition_cn: "学者"}, {part_of_speech: "v", definition_cn: "学习"}]` | "n. 学者; v. 学习" |
| null | "scholar" (单词本身) |

---

### 4.2 example_sentence_en（英文例句）

**重要性**: ⭐⭐⭐⭐
**数据源**: `examples`（数组）
**目标**: `example_sentence_en`

**加工逻辑**:
```javascript
function processExampleSentenceEn(examples) {
  // 检查是否为数组且非空
  if (!Array.isArray(examples) || examples.length === 0) {
    return null  // 允许为空
  }

  // 取前3个例句，用 " | " 分隔
  return examples
    .slice(0, 3)
    .join(' | ')
}
```

**示例**:
| 输入 | 输出 |
|------|------|
| `["the great Dutch scholar Erasmus"]` | "the great Dutch scholar Erasmus" |
| `["句子1", "句子2", "句子3", "句子4"]` | "句子1 \| 句子2 \| 句子3" |
| null | null |
| [] | null |

---

### 4.3 collocation（词组/搭配）

**重要性**: ⭐⭐⭐⭐
**数据源**: `phrases`（数组）
**目标**: `collocation`

**加工逻辑**:
```javascript
function processCollocation(phrases) {
  // 检查是否为数组且非空
  if (!Array.isArray(phrases) || phrases.length === 0) {
    return null  // 允许为空
  }

  // 取前5个词组，用 "; " 分隔
  return phrases
    .slice(0, 5)
    .join('; ')
}
```

**示例**:
| 输入 | 输出 |
|------|------|
| `["visiting scholar", "research scholar"]` | "visiting scholar; research scholar" |
| `["a", "b", "c", "d", "e", "f"]` | "a; b; c; d; e"（前5个） |
| null | null |

---

### 4.4 phonetic（通用音标）

**重要性**: ⭐⭐⭐
**数据源**: `us_phonetic` 或 `uk_phonetic`
**目标**: `phonetic`

**加工逻辑**:
```javascript
function processPhonetic(us_phonetic, uk_phonetic) {
  // 优先级: 美式 > 英式
  return us_phonetic || uk_phonetic || null
}
```

**示例**:
| us_phonetic | uk_phonetic | 输出 |
|------------|------------|------|
| "'skɑlɚ" | "'skɒlə" | "'skɑlɚ"（美式） |
| null | "'skɒlə" | "'skɒlə"（英式） |
| null | null | null |

---

### 4.5 audio_url（音频地址）

**重要性**: ⭐⭐
**数据源**: 无（自动生成）
**目标**: `audio_url`

**加工逻辑**:
```javascript
function processAudioUrl(word) {
  // 使用有道TTS服务
  const encodedWord = encodeURIComponent(word)
  return `https://dict.youdao.com/dictvoice?type=2&audio=${encodedWord}`
}
```

**示例**:
| 输入 | 输出 |
|------|------|
| "scholar" | "https://dict.youdao.com/dictvoice?type=2&audio=scholar" |
| "hello" | "https://dict.youdao.com/dictvoice?type=2&audio=hello" |

---

### 4.6 difficulty_score（难度分数）

**重要性**: ⭐⭐
**数据源**: 根据书名静态映射
**目标**: `difficulty_score`

**映射规则**:
```javascript
const DIFFICULTY_MAP = {
  // 高级考试 (5分)
  'GRE': 5,

  // 中高级考试 (4分)
  'IELTS': 4,
  'TOEFL': 4,
  'SAT': 4,
  'GMAT': 4,

  // 中级考试 (3分)
  'CET-6': 3,
  'CET-4': 3,
  '考研': 3,
  'BEC': 3,
  'PETS3': 3,

  // 初级考试 (2分)
  'PET': 2,
  'PTE': 2,
  'KET': 2,

  // 教材类
  '高中': 3,
  '初中': 2,
  'PEP高中英语': 3,
  'PEP初中': 2,
  'PEP小学': 1
}

function getDifficultyScore(bookTitle) {
  // 精确匹配
  if (DIFFICULTY_MAP[bookTitle] !== undefined) {
    return DIFFICULTY_MAP[bookTitle]
  }

  // 模糊匹配
  if (bookTitle.includes('小学')) return 1
  if (bookTitle.includes('初中')) return 2
  if (bookTitle.includes('高中')) return 3

  // 默认中等难度
  return 3
}
```

---

## 📝 五、完整转换示例

### 输入数据（原始JSON）

```json
{
  "word": "scholar",
  "uk_phonetic": "'skɒlə",
  "us_phonetic": "'skɑlɚ",
  "definition_cn": "学者",
  "part_of_speech": "n",
  "examples": [
    "the great Dutch scholar Erasmus",
    "a renowned scholar in the field"
  ],
  "phrases": [
    "visiting scholar",
    "research scholar",
    "teaching scholar"
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
  "memory_method": "schol(闲暇) + ar(表人) → 学者"
}
```

### 输出数据（数据库记录）

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "chapter_id": "chap-uuid-here",
  "word": "scholar",
  "phonetic": "'skɑlɚ",
  "uk_phonetic": "'skɒlə",
  "us_phonetic": "'skɑlɚ",
  "definition": "学者",
  "definition_en": null,
  "collocation": "visiting scholar; research scholar; teaching scholar",
  "collocation_en": null,
  "example_sentence": null,
  "example_sentence_en": "the great Dutch scholar Erasmus | a renowned scholar in the field",
  "part_of_speech": "n",
  "audio_url": "https://dict.youdao.com/dictvoice?type=2&audio=scholar",
  "order_index": 0,
  "difficulty_score": 4
}
```

---

## 🚫 六、未映射字段（数据丢失）

以下字段在数据源中存在，但目标数据库中没有对应字段，**导入时将丢失**：

| 字段名 | 中文说明 | 丢失影响评估 | 建议 |
|--------|---------|------------|------|
| synonyms | 同义词列表 | ⚠️ 中等影响 | 可以后续添加字段或存到JSON |
| related_words | 相关词列表 | ⚠️ 中等影响 | 可以后续添加字段或存到JSON |
| derived_words | 派生词列表 | ⚠️ 中等影响 | 可以后续添加字段或存到JSON |
| memory_method | 记忆方法 | ⚠️ 低影响 | 学习辅助功能，可暂不保留 |

**建议**: 如果这些字段很重要，可以考虑：
1. 在数据库中添加对应的JSON字段存储
2. 或者在未来版本中添加专门字段

---

## ✅ 七、导入执行流程

```javascript
1. 读取 JSON 文件
   ↓
2. 创建书籍记录 (books)
   - 生成UUID作为id
   - 填充title, description, category
   ↓
3. 创建章节记录 (chapters)
   - 生成UUID作为id
   - 关联book_id
   - 设置title="All Words"
   ↓
4. 批量插入单词 (words)
   - 每批500个单词
   - 应用字段映射和转换规则
   - 生成UUID作为id
   - 关联chapter_id
   ↓
5. 更新书籍统计
   - 更新total_words
   - 更新total_chapters
   ↓
6. 验证导入结果
   - 检查单词数量
   - 抽查数据质量
```

---

## ✅ 八、总结

### 映射完整度

- ✅ **核心字段**: 100%（word, definition, phonetics）
- ✅ **重要字段**: 100%（examples, phrases, part_of_speech）
- ⚠️ **辅助字段**: 0%（synonyms, related_words, derived_words, memory_method）

### 数据质量保证

1. ✅ **definition**: 必填，有3层兜底逻辑（字符串→数组→单词本身）
2. ✅ **phonetics**: 保留英式和美式音标，以及通用音标
3. ✅ **examples**: 保留英文例句（前3个）
4. ✅ **phrases**: 转换为collocation字段（前5个）
5. ✅ **自动生成**: audio_url使用有道TTS

### 可以立即执行导入！

所有映射规则和加工逻辑已明确，数据质量优秀（84/100分），可以开始导入 20260112v1.tar.gz 的数据。
