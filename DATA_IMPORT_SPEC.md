# 词库数据交付规范

> 本文档面向词库数据处理团队，说明数据清洗标准和交付格式

---

## 📋 概述

本文档定义了单词数据的交付标准。数据团队需将原始词库数据清洗后，按照本规范交付给技术团队进行系统导入。

### 数据质量等级

我们根据数据完整度将单词分为三个等级：

| 等级 | 说明 | 完整度要求 | 数据价值 |
|------|------|-----------|---------|
| ⭐ **基础** | 满足最低可用标准 | 必备字段100% | 及格线 |
| ⭐⭐ **标准** | 满足正常学习需求 | 必备+推荐字段 | 推荐标准 |
| ⭐⭐⭐ **优质** | 提供完整学习体验 | 所有字段 | 高质量词库 |

**目标：我们希望交付的词库达到 ⭐⭐ 标准等级，核心词汇争取 ⭐⭐⭐**

---

## 📦 交付数据结构

### 格式要求

- **文件格式**：JSON文件
- **编码**：UTF-8
- **命名规范**：`{书名英文名}.json`（如 `cet4-core.json`）
- **批次大小**：单个文件不超过5000条单词，大词库拆分为多个文件

### 顶层结构

```json
{
  "book_info": {
    "title": "大学英语四级核心词汇",
    "abbreviation": "CET-4",
    "description": "覆盖大学英语四级考试高频核心词汇",
    "category": "university",
    "total_words": 4216,
    "difficulty_level": "intermediate",
    "cover_color": "from-blue-400 to-blue-500"
  },
  "chapters": [
    {
      "chapter_title": "第一章 A-B",
      "words": [
        // 单词数据数组
      ]
    }
  ]
}
```

---

## 📖 单词数据字段规范

### ⚪ 必备字段（必须100%填写）

缺少任何必备字段将导致数据无法导入。

| 字段名 | 类型 | 说明 | 格式要求 | 示例 |
|--------|------|------|---------|------|
| **word** | string | 单词本身 | • 纯英文字母<br>• 1-50个字符<br>• 小写（专有名词除外）<br>• 不含空格、连字符、特殊字符 | ✅ `abandon`<br>✅ `iPhone`<br>❌ `abandon-1`<br>❌ `abandon` |
| **definition** | string | 中文释义 | • 使用中文分号 `；` 分隔多个释义<br>• 释义简洁准确<br>• 去除HTML标签 | `"放弃；遗弃；抛弃"`<br>`"n. 能力；才能"` |
| **part_of_speech** | string | 词性 | • 标准词性代码<br>• 如有多个词性需拆分为多条数据 | `"n"`, `"v"`, `"adj"`, `"adv"`, `"vt"`, `"vi"`, `"prep"`, `"conj"` |

**为什么这三个字段必备？**
- `word`：数据的核心，没有单词就没有数据
- `definition`：用户学习的基础，必须知道单词意思
- `part_of_speech`：影响单词用法和语法，同一单词不同词性应拆分

---

### 🟡 推荐字段（强烈建议填写，提升数据质量）

缺少推荐字段会导致学习体验下降，但数据仍可使用。

#### 1. 发音字段（**三选一，必填一个**）

| 字段名 | 类型 | 说明 | 格式要求 | 示例 |
|--------|------|------|---------|------|
| **phonetic** | string | 国际音标 | • 必须包含在斜杠 `/.../` 中<br>• 使用IPA国际音标 | `"/ə'bændən/"` |
| **uk_phonetic** | string | 英式发音 | • 格式：`英 /.../`<br>• 优先使用（如区分英美发音） | `"英 /ə'bændən/"` |
| **us_phonetic** | string | 美式发音 | • 格式：`美 /.../`<br>• 优先使用（如区分英美发音） | `"美 /ə'bændən/"` |

**最低要求：三个字段中至少填写一个**

**优先级：**
1. 如有英/美区分 → 填写 `uk_phonetic` + `us_phonetic`
2. 如无区分 → 填写 `phonetic`
3. 无法获取音标 → 使用第三方API生成（后端处理）

#### 2. 例句字段（**成对提供，缺一不可**）

| 字段名 | 类型 | 说明 | 格式要求 | 示例 |
|--------|------|------|---------|------|
| **example_sentence_en** | string | 英文例句 | • 首字母大写<br>• 末尾加标点<br>• 句子自然地道<br>• 难度适配目标用户 | `"The crew were forced to abandon the ship."` |
| **example_sentence** | string | 中文例句 | • 准确翻译英文例句<br>• 语言通顺自然 | `"船员们被迫放弃了船。"` |

**最低要求：如提供例句，必须同时提供中英文**

**例句质量标准：**
- ✅ 展示单词的实际用法
- ✅ 句子难度适合目标用户（如四级词库用四级难度句子）
- ✅ 避免过于复杂或过于简单的句子
- ❌ 避免机械翻译式的中文表达

#### 3. 搭配字段（**成对提供，缺一不可**）

| 字段名 | 类型 | 说明 | 格式要求 | 示例 |
|--------|------|------|---------|------|
| **collocation_en** | string | 英文搭配 | • 使用分号 `; ` 分隔多个搭配<br>• 展示常见固定搭配 | `"abandon hope; abandon ship"` |
| **collocation** | string | 中文搭配 | • 使用中文分号 `；` 分隔<br>• 准确翻译英文搭配 | `"放弃希望；弃船"` |

**最低要求：如提供搭配，必须同时提供中英文**

**搭配质量标准：**
- ✅ 优先选择高频固定搭配
- ✅ 搭配具有实用价值
- ❌ 避免生僻或过度学术化的搭配

---

### 🔵 可选字段（有则加分，提升用户体验）

这些字段不是必需的，但如果提供将显著提升用户体验。

| 字段名 | 类型 | 说明 | 格式要求 | 示例 |
|--------|------|------|---------|------|
| **definition_en** | string | 英文释义 | • 英文解释单词含义<br>• 使用简洁的英语 | `"to leave someone or something completely"` |
| **difficulty_score** | number | 难度评分 | • 1-5的整数<br>• 1=最简单，5=最难 | `3` |
| **synonyms** | array | 同义词列表 | 见下方JSON格式 | `[...]` |
| **derived_words** | array | 派生词列表 | 见下方JSON格式 | `[...]` |
| **related_words** | array | 相关词列表 | 见下方JSON格式 | `[...]` |
| **memory_method** | string | 记忆方法 | • 助记技巧<br>• 词根词缀分析 | `"a(不) + ban(禁止) + don(给予) → 不给钱 → 放弃"` |

#### JSON字段格式

**synonyms（同义词）**
```json
[
  {"word": "give up", "translation": "放弃"},
  {"word": "desert", "translation": "遗弃"}
]
```

**derived_words（派生词）**
```json
[
  {"pos": "n", "word": "abandonment", "translation": "放弃；遗弃"},
  {"pos": "adj", "word": "abandoned", "translation": "被抛弃的"}
]
```
> `pos` 字段为词性，格式同 `part_of_speech`

**related_words（相关词）**
```json
[
  {"word": "leave", "translation": "离开"},
  {"word": "quit", "translation": "放弃"}
]
```

---

## 🎯 完整示例

### ⭐ 基础等级示例（最低标准）

```json
{
  "word": "abandon",
  "definition": "放弃；遗弃；抛弃",
  "part_of_speech": "v"
}
```

### ⭐⭐ 标准等级示例（推荐目标）

```json
{
  "word": "abandon",
  "phonetic": "/ə'bændən/",
  "definition": "放弃；遗弃；抛弃",
  "part_of_speech": "v",
  "example_sentence_en": "The crew were forced to abandon the ship.",
  "example_sentence": "船员们被迫放弃了船。",
  "collocation_en": "abandon hope; abandon ship",
  "collocation": "放弃希望；弃船"
}
```

### ⭐⭐⭐ 优质等级示例（核心词汇争取）

```json
{
  "word": "abandon",
  "phonetic": "/ə'bændən/",
  "uk_phonetic": "英 /ə'bændən/",
  "us_phonetic": "美 /ə'bændən/",
  "definition": "放弃；遗弃；抛弃",
  "definition_en": "to leave someone or something completely",
  "part_of_speech": "v",
  "difficulty_score": 3,
  "collocation": "放弃希望；弃船；抛弃家人",
  "collocation_en": "abandon hope; abandon ship; abandon one's family",
  "example_sentence": "船员们被迫放弃了船。",
  "example_sentence_en": "The crew were forced to abandon the ship.",
  "synonyms": [
    {"word": "give up", "translation": "放弃"},
    {"word": "desert", "translation": "遗弃"}
  ],
  "derived_words": [
    {"pos": "n", "word": "abandonment", "translation": "放弃；遗弃"}
  ],
  "related_words": [
    {"word": "leave", "translation": "离开"}
  ],
  "memory_method": "a(不) + ban(禁止) + don(给予) → 不给钱 → 放弃"
}
```

---

## 📐 完整交付文件示例

```json
{
  "book_info": {
    "title": "大学英语四级核心词汇",
    "abbreviation": "CET-4",
    "description": "覆盖大学英语四级考试高频核心词汇",
    "category": "university",
    "total_words": 4216,
    "difficulty_level": "intermediate",
    "cover_color": "from-blue-400 to-blue-500"
  },
  "chapters": [
    {
      "chapter_title": "Chapter 1: A-B",
      "words": [
        {
          "word": "abandon",
          "phonetic": "/ə'bændən/",
          "definition": "放弃；遗弃；抛弃",
          "part_of_speech": "v",
          "example_sentence_en": "The crew were forced to abandon the ship.",
          "example_sentence": "船员们被迫放弃了船。"
        },
        {
          "word": "ability",
          "phonetic": "/ə'biliti/",
          "definition": "能力；才能",
          "part_of_speech": "n",
          "example_sentence_en": "She has the ability to pass the exam.",
          "example_sentence": "她有能力通过考试。"
        }
      ]
    },
    {
      "chapter_title": "Chapter 2: C-D",
      "words": [
        // 更多单词...
      ]
    }
  ]
}
```

---

## ✅ 数据验证清单

### 交付前请逐项检查

#### 必备项（100%完成）

- [ ] **word** 字段：
  - [ ] 纯英文字母
  - [ ] 无空格、连字符、特殊字符
  - [ ] 小写（专有名词除外）
  - [ ] 无重复单词（同一章节内）

- [ ] **definition** 字段：
  - [ ] 非空
  - [ ] 使用中文分号 `；` 分隔多个释义
  - [ ] 无HTML标签
  - [ ] 释义准确简洁

- [ ] **part_of_speech** 字段：
  - [ ] 使用标准词性代码
  - [ ] 同一单词不同词性已拆分为多条数据

#### 推荐项（争取80%+完成率）

- [ ] **发音**：
  - [ ] 三选一已填写（phonetic / uk_phonetic / us_phonetic）
  - [ ] 音标格式正确（包含在 `/.../` 中）
  - [ ] 如有英/美区分，同时填写两个字段

- [ ] **例句**：
  - [ ] 中英文成对提供
  - [ ] 英文例句首字母大写，末尾有标点
  - [ ] 例句难度适合目标用户
  - [ ] 中文翻译准确自然

- [ ] **搭配**：
  - [ ] 中英文成对提供
  - [ ] 使用分号分隔多个搭配
  - [ ] 搭配具有实用价值

#### 可选项（核心词汇争取完成）

- [ ] **synonyms**：格式正确，同义词准确
- [ ] **derived_words**：格式正确，包含词性
- [ ] **related_words**：格式正确，相关性高
- [ ] **memory_method**：助记方法有用且易懂

#### 整体质量

- [ ] **数据完整性**：
  - [ ] 必备字段100%填写
  - [ ] 推荐字段80%+填写
  - [ ] 无空值或null

- [ ] **数据准确性**：
  - [ ] 抽查20条数据，释义准确率100%
  - [ ] 例句无语法错误
  - [ ] 音标格式正确

- [ ] **数据格式**：
  - [ ] JSON格式正确，可正常解析
  - [ ] UTF-8编码
  - [ ] 文件大小不超过5000条/文件

- [ ] **去重检查**：
  - [ ] 同一章节内无重复单词
  - [ ] 同一拼写+词性的组合只出现一次

---

## 🚫 常见错误案例

### 错误1：单词格式不正确

❌ **错误**：
```json
{"word": "abandon-1"}
{"word": "abandon "}
{"word": "abandon't"}
```

✅ **正确**：
```json
{"word": "abandon"}
{"word": "iPhone"}
```

### 错误2：多词性未拆分

❌ **错误**：
```json
{
  "word": "abandon",
  "definition": "v. 放弃；n. 放任",
  "part_of_speech": "n/v"
}
```

✅ **正确**（拆分为两条）：
```json
[
  {
    "word": "abandon",
    "definition": "放弃；遗弃；抛弃",
    "part_of_speech": "v"
  },
  {
    "word": "abandon",
    "definition": "放任；放纵",
    "part_of_speech": "n"
  }
]
```

### 错误3：音标格式错误

❌ **错误**：
```json
{"phonetic": "ə'bændən"}
```

✅ **正确**：
```json
{"phonetic": "/ə'bændən/"}
```

### 错误4：例句未成对提供

❌ **错误**：
```json
{
  "example_sentence_en": "The crew were forced to abandon the ship.",
  "example_sentence": ""
}
```

✅ **正确**：
```json
{
  "example_sentence_en": "The crew were forced to abandon the ship.",
  "example_sentence": "船员们被迫放弃了船。"
}
```

或都不提供（不填这两个字段）

### 错误5：释义使用错误分隔符

❌ **错误**：
```json
{"definition": "放弃,遗弃,抛弃"}
{"definition": "放弃. 遗弃. 抛弃"}
```

✅ **正确**：
```json
{"definition": "放弃；遗弃；抛弃"}
```

### 错误6：例句缺少标点

❌ **错误**：
```json
{"example_sentence_en": "the crew were forced to abandon the ship"}
```

✅ **正确**：
```json
{"example_sentence_en": "The crew were forced to abandon the ship."}
```

---

## 📊 数据质量评分标准

技术团队将按以下标准对交付数据进行评分：

| 评分项 | 权重 | 评分标准 |
|--------|------|---------|
| **必备字段完整度** | 40% | 100%填写 = 40分<br>每缺失1%扣2分 |
| **发音字段完整度** | 15% | ≥90% = 15分<br>≥70% = 10分<br>≥50% = 5分<br><50% = 0分 |
| **例句字段完整度** | 20% | ≥80% = 20分<br>≥60% = 15分<br>≥40% = 10分<br><40% = 5分 |
| **搭配字段完整度** | 10% | ≥60% = 10分<br>≥40% = 7分<br>≥20% = 4分<br><20% = 0分 |
| **数据准确性** | 15% | 抽查准确率100% = 15分<br>准确率95%+ = 12分<br>准确率90%+ = 8分<br><90% = 0分 |

**合格标准：总分 ≥ 80分**

---

## 📞 交付流程

1. **数据自检**：使用上述清单逐项检查
2. **小样测试**：抽取100条数据提交测试
3. **反馈修正**：根据技术团队反馈修正问题
4. **全量交付**：确认无误后交付完整数据
5. **验收确认**：技术团队验收通过后完成交付

---

## 📌 附录

### 词性代码对照表

| 代码 | 中文名称 | 英文全称 | 示例 |
|------|---------|---------|------|
| n | 名词 | noun | book, happiness |
| v | 动词 | verb | run, think |
| vt | 及物动词 | transitive verb | eat, hit |
| vi | 不及物动词 | intransitive verb | sleep, go |
| adj | 形容词 | adjective | good, happy |
| adv | 副词 | adverb | quickly, very |
| prep | 介词 | preposition | in, on, at |
| conj | 连词 | conjunction | and, but |
| pron | 代词 | pronoun | he, she, it |
| art | 冠词 | article | a, an, the |
| num | 数词 | numeral | one, two, first |
| int | 感叹词 | interjection | oh, wow |

### 词书分类对照表

| 分类代码 | 中文名称 | 适用范围 |
|---------|---------|---------|
| university | 大学英语 | 四级、六级、考研英语 |
| k12 | 中小学英语 | 初中、高中词汇 |
| global | 海外考试 | 雅思、托福、GRE |
| custom | 自定义词库 | 用户自建、专项词汇 |

### 难度等级对照表

| 等级代码 | 中文名称 | 适用范围 |
|---------|---------|---------|
| beginner | 初级 | 小学、初中入门 |
| intermediate | 中级 | 高中、四级 |
| advanced | 高级 | 六级、考研、雅思托福 |

---

**文档版本**：v3.0（面向数据交付团队）
**最后更新**：2026-02-02
**维护方**：技术部
