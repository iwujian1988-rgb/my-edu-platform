# 字段映射说明（超清晰版）

## 📋 映射总览

```
原始数据 → 数据加工 → 数据库字段
```

---

## 🔄 详细映射表

### 1️⃣ word（单词）

| 步骤 | 内容 |
|------|------|
| **原始字段** | word（单词） |
| **中文说明** | 单词本身 |
| **加工方法** | 不加工，直接使用 |
| **数据库字段** | word |
| **示例** | "scholar" → "scholar" |

---

### 2️⃣ uk_phonetic（英式音标）

| 步骤 | 内容 |
|------|------|
| **原始字段** | uk_phonetic（英式音标） |
| **中文说明** | 英式发音音标 |
| **加工方法** | 不加工，直接使用 |
| **数据库字段** | uk_phonetic（英式音标） |
| **示例** | "'skɒlə" → "'skɒlə" |

---

### 3️⃣ us_phonetic（美式音标）

| 步骤 | 内容 |
|------|------|
| **原始字段** | us_phonetic（美式音标） |
| **中文说明** | 美式发音音标 |
| **加工方法** | 不加工，直接使用 |
| **数据库字段** | us_phonetic（美式音标） |
| **示例** | "'skɑlɚ" → "'skɑlɚ" |

---

### 4️⃣ phonetic（通用音标）

| 步骤 | 内容 |
|------|------|
| **原始字段1** | us_phonetic（美式音标） |
| **原始字段2** | uk_phonetic（英式音标） |
| **中文说明** | 通用音标（优先用美式） |
| **加工方法** | 优先用us_phonetic，如果没有就用uk_phonetic |
| **数据库字段** | phonetic（通用音标） |
| **示例** | us: "'skɑlɚ", uk: "'skɒlə" → phonetic: "'skɑlɚ" |

---

### 5️⃣ definition（中文释义）- 重要！

| 步骤 | 内容 |
|------|------|
| **原始字段** | definition_cn（中文释义） |
| **中文说明** | 中文释义 |
| **加工方法** | 见下方详细说明 |
| **数据库字段** | definition（中文释义） |

#### 加工方法详细说明：

**情况1：definition_cn 是字符串**
```
输入: "学者"
加工: 直接使用
输出: "学者"
```

**情况2：definition_cn 是数组**
```
输入: [{part_of_speech: "n", definition_cn: "学者"}, {part_of_speech: "v", definition_cn: "学习"}]
加工: 拼接成 "n. 学者; v. 学习"
输出: "n. 学者; v. 学习"
```

**情况3：definition_cn 为空**
```
输入: null 或 undefined
加工: 使用单词本身
输出: "scholar"
```

---

### 6️⃣ definition_en（英文释义）

| 步骤 | 内容 |
|------|------|
| **原始字段** | definition_en（英文释义） |
| **中文说明** | 英文释义 |
| **加工方法** | 不加工，直接使用，如果没有就是null |
| **数据库字段** | definition_en（英文释义） |
| **示例** | "a learned person" → "a learned person" |

---

### 7️⃣ collocation（词组/搭配）

| 步骤 | 内容 |
|------|------|
| **原始字段** | phrases（词组） |
| **中文说明** | 词组列表 |
| **加工方法** | 数组转字符串，用"; "分隔，取前5个 |
| **数据库字段** | collocation（词组/搭配） |

#### 加工示例：
```
输入: ["visiting scholar", "research scholar", "teaching scholar", "study scholar", "academic scholar"]
加工: 用"; "拼接，取前5个
输出: "visiting scholar; research scholar; teaching scholar; study scholar; academic scholar"
```

---

### 8️⃣ collocation_en（英文搭配）

| 步骤 | 内容 |
|------|------|
| **原始字段** | 无 |
| **中文说明** | 英文搭配 |
| **加工方法** | 暂时填null |
| **数据库字段** | collocation_en（英文搭配） |
| **输出** | null |

---

### 9️⃣ example_sentence_en（英文例句）

| 步骤 | 内容 |
|------|------|
| **原始字段** | examples（例句数组） |
| **中文说明** | 英文例句列表 |
| **加工方法** | 数组转字符串，用" | "分隔，取前3个 |
| **数据库字段** | example_sentence_en（英文例句） |

#### 加工示例：
```
输入: ["This is a scholar.", "He is a scholar.", "A famous scholar."]
加工: 用" | "拼接，取前3个
输出: "This is a scholar. | He is a scholar. | A famous scholar."
```

---

### 🔟 example_sentence（中文例句）

| 步骤 | 内容 |
|------|------|
| **原始字段** | 无 |
| **中文说明** | 中文例句 |
| **加工方法** | 暂时填null（未来可以翻译英文例句） |
| **数据库字段** | example_sentence（中文例句） |
| **输出** | null |

---

### 1️⃣1️⃣ part_of_speech（词性）

| 步骤 | 内容 |
|------|------|
| **原始字段** | part_of_speech（词性） |
| **中文说明** | 词性 |
| **加工方法** | 不加工，直接使用 |
| **数据库字段** | part_of_speech（词性） |
| **示例** | "n" → "n"（名词） |

---

### 1️⃣2️⃣ audio_url（音频地址）

| 步骤 | 内容 |
|------|------|
| **原始字段** | 无 |
| **中文说明** | 单词发音音频地址 |
| **加工方法** | 自动生成，使用有道TTS服务 |
| **数据库字段** | audio_url（音频地址） |

#### 加工示例：
```
输入单词: "scholar"
加工: 拼接到有道TTS地址
输出: "https://dict.youdao.com/dictvoice?type=2&audio=scholar"
```

---

### 1️⃣3️⃣ difficulty_score（难度分数）

| 步骤 | 内容 |
|------|------|
| **原始字段** | 书名（TOEFL/GRE等） |
| **中文说明** | 单词难度等级（1-5分） |
| **加工方法** | 根据书名静态映射，见下表 |
| **数据库字段** | difficulty_score（难度分数） |

#### 书名到难度映射表：
```
TOEFL → 4分
GRE → 5分
IELTS → 4分
CET-4 → 3分
CET-6 → 3分
考研 → 3分
高中 → 3分
初中 → 2分
小学 → 1分
```

---

### 1️⃣4️⃣ synonyms（同义词）- 新增！

| 步骤 | 内容 |
|------|------|
| **原始字段** | synonyms（同义词列表） |
| **中文说明** | 同义词列表 |
| **加工方法** | 数组直接存储为JSONB格式 |
| **数据库字段** | synonyms（同义词） |
| **数据类型** | JSONB（JSON二进制） |

#### 加工示例：
```
输入: ["student", "academic", "learner"]
加工: 直接存为JSONB数组
输出: ["student", "academic", "learner"]（JSONB格式）
```

---

### 1️⃣5️⃣ related_words（相关词）- 新增！

| 步骤 | 内容 |
|------|------|
| **原始字段** | related_words（相关词列表） |
| **中文说明** | 相关词列表（包含词性、翻译） |
| **加工方法** | 对象数组直接存储为JSONB格式 |
| **数据库字段** | related_words（相关词） |
| **数据类型** | JSONB（JSON二进制） |

#### 加工示例：
```
输入: [
  {word: "scholarly", translation: "博学的", part_of_speech: "adj"},
  {word: "scholarship", translation: "奖学金", part_of_speech: "n"}
]
加工: 直接存为JSONB数组
输出: 原样存储为JSONB格式
```

---

### 1️⃣6️⃣ derived_words（派生词）- 新增！

| 步骤 | 内容 |
|------|------|
| **原始字段** | derived_words（派生词列表） |
| **中文说明** | 派生词列表（包含词性、翻译） |
| **加工方法** | 对象数组直接存储为JSONB格式 |
| **数据库字段** | derived_words（派生词） |
| **数据类型** | JSONB（JSON二进制） |

#### 加工示例：
```
输入: [
  {word: "scholarly", pos: "adj", translation: "博学的"},
  {word: "scholarship", pos: "n", translation: "奖学金"}
]
加工: 直接存为JSONB数组
输出: 原样存储为JSONB格式
```

---

### 1️⃣7️⃣ memory_method（记忆方法）- 新增！

| 步骤 | 内容 |
|------|------|
| **原始字段** | memory_method（记忆方法） |
| **中文说明** | 记忆方法/记忆技巧 |
| **加工方法** | 字符串直接使用，如果没有就是null |
| **数据库字段** | memory_method（记忆方法） |
| **数据类型** | TEXT（文本） |

#### 加工示例：
```
输入: "schol(闲暇) + ar(表人) → 学者"
加工: 直接存储
输出: "schol(闲暇) + ar(表人) → 学者"

输入: null
加工: 存储null
输出: null
```

---

## 📊 完整示例

### 输入数据（原始JSON）：
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
    {"word": "scholarly", "translation": "博学的", "part_of_speech": "adj"}
  ],
  "derived_words": [
    {"word": "scholarship", "pos": "n", "translation": "奖学金"}
  ],
  "memory_method": "schol(闲暇) + ar(表人) → 学者"
}
```

### 输出数据（数据库记录）：
```json
{
  "word": "scholar",
  "uk_phonetic": "'skɒlə",
  "us_phonetic": "'skɑlɚ",
  "phonetic": "'skɑlɚ",
  "definition": "学者",
  "definition_en": null,
  "collocation": "visiting scholar; research scholar",
  "collocation_en": null,
  "example_sentence": null,
  "example_sentence_en": "the great Dutch scholar Erasmus | a renowned scholar",
  "part_of_speech": "n",
  "audio_url": "https://dict.youdao.com/dictvoice?type=2&audio=scholar",
  "synonyms": ["student", "academic"],
  "related_words": [{"word": "scholarly", "translation": "博学的", "part_of_speech": "adj"}],
  "derived_words": [{"word": "scholarship", "pos": "n", "translation": "奖学金"}],
  "memory_method": "schol(闲暇) + ar(表人) → 学者",
  "difficulty_score": 4
}
```

---

## ✅ 总结

### 映射规则：
1. **直接使用**：word, uk_phonetic, us_phonetic, part_of_speech
2. **简单加工**：phonetic（优先美式）, audio_url（拼接）, difficulty_score（映射）
3. **格式转换**：definition（字符串/数组→字符串）, collocation（数组→字符串）, example_sentence_en（数组→字符串）
4. **直接存储JSONB**：synonyms, related_words, derived_words
5. **直接存储TEXT**：memory_method

### 数据完整性：
- ✅ 保留所有核心字段
- ✅ 保留所有辅助字段（synonyms等）
- ✅ 数据质量优秀
