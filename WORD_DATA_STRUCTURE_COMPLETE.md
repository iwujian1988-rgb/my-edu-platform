# 单词数据结构完整示例

## 📋 数据库表结构：words

### 完整字段列表

| 字段名 | 类型 | 必填 | 说明 | 示例值 |
|--------|------|------|------|--------|
| `id` | UUID | ✅ | 单词唯一标识 | `"364c04d3-6a29-4295-8b54-22554d88c4fd"` |
| `chapter_id` | UUID | ⚪ | 所属章节ID（可为null） | `null` |
| `book_id` | UUID | ⚪ | 词书ID（可为null） | `null` |
| `word` | VARCHAR(255) | ✅ | 单词拼写 | `"accident"` |
| `phonetic` | VARCHAR(255) | ⚪ | 音标（旧字段） | `"'æksɪdənt"` |
| `uk_phonetic` | VARCHAR(255) | ⚪ | 英式音标 | `null` |
| `us_phonetic` | VARCHAR(255) | ⚪ | 美式音标 | `null` |
| `definition` | TEXT | ✅ | 中文释义 | `"意外事件, 事故"` 或 `"【n】软木【adj】软木制的【v】塞住，抑制"` |
| `definition_en` | TEXT | ⚪ | 英文释义 | `"an event in which a car..."` |
| `collocation` | TEXT | ⚪ | 搭配（中文） | `"交通事故"` |
| `collocation_en` | TEXT | ⚪ | 搭配（英文） | `"traffic accident"` |
| `example_sentence` | TEXT | ⚪ | 例句（中文） | `"每年在道路事故中受重伤的有七万多人。"` |
| `example_sentence_en` | TEXT | ⚪ | 例句（英文） | `"Over 70,000 people are..."` |
| `part_of_speech` | VARCHAR(50) | ⚪ | 词性 | `"n"` 或 `"n, adj, v"` |
| `audio_url` | VARCHAR(500) | ⚪ | 音频URL | `null` |
| `image_url` | VARCHAR(500) | ⚪ | 图片URL | `null` |
| `order_index` | INTEGER | ✅ | 排序索引 | `7206` |
| `difficulty_score` | INTEGER | ⚪ | 难度分数 | `null` |
| `frequency_rank` | INTEGER | ⚪ | 频率排名 | `null` |
| `created_at` | TIMESTAMP | ✅ | 创建时间 | `"2026-01-12T01:31:37.031753+00:00"` |
| `updated_at` | TIMESTAMP | ✅ | 更新时间 | `"2026-01-12T01:31:37.031753+00:00"` |

---

## 📖 示例1: 单词性单词 (accident)

```json
{
  "id": "364c04d3-6a29-4295-8b54-22554d88c4fd",
  "chapter_id": null,
  "book_id": null,
  "word": "accident",
  "phonetic": "'æksɪdənt",
  "uk_phonetic": null,
  "us_phonetic": null,
  "definition": "意外事件, 事故",
  "definition_en": "an event in which a car, train, plane etc is damaged and often someone is hurt",
  "collocation": "交通事故",
  "collocation_en": "traffic accident",
  "example_sentence": "每年在道路事故中受重伤的有七万多人。",
  "example_sentence_en": "Over 70,000 people are seriously injured every year in road accidents.",
  "part_of_speech": "n",
  "audio_url": null,
  "image_url": null,
  "order_index": 7206,
  "difficulty_score": null,
  "frequency_rank": null,
  "created_at": "2026-01-12T01:31:37.031753+00:00",
  "updated_at": "2026-01-12T01:31:37.031753+00:00"
}
```

### 特点：
- ✅ **单词性**：`part_of_speech = "n"`（只有名词）
- ✅ **简单释义**：`definition = "意外事件, 事故"`（无词性标记）
- ✅ **清晰结构**：所有字段都是单一值

---

## 📖 示例2: 多词性单词 (cork)

```json
{
  "id": "e9ffc565-dc10-4305-b9f1-087c07a19fb2",
  "chapter_id": null,
  "book_id": null,
  "word": "cork",
  "phonetic": "kɔːk",
  "uk_phonetic": null,
  "us_phonetic": null,
  "definition": "【n】软木【adj】软木制的【v】塞住，抑制",
  "definition_en": "【n】the bark (= outer part) of a tree from southern Europe and North Africa, used to make things【v】to close a bottle by blocking the hole at the top tightly with a long round piece of cork or plastic",
  "collocation": "adv. 轻松地",
  "collocation_en": "like a cork",
  "example_sentence": "软木公告板",
  "example_sentence_en": "a cork bulletin board",
  "part_of_speech": "n, adj, v",
  "audio_url": null,
  "image_url": null,
  "order_index": 3318,
  "difficulty_score": null,
  "frequency_rank": null,
  "created_at": "2026-01-12T01:30:48.163251+00:00",
  "updated_at": "2026-01-12T01:30:48.163251+00:00"
}
```

### 特点：
- ✅ **多词性**：`part_of_speech = "n, adj, v"`（名词+形容词+动词）
- ✅ **组合释义**：
  - 中文：`"【n】软木【adj】软木制的【v】塞住，抑制"`
  - 英文：`"【n】the bark...【v】to close a bottle..."`
- ✅ **词性标记**：使用 `【词性】` 格式分隔多个释义

---

## 🔑 核心区别对比

| 字段 | 单词性 (accident) | 多词性 (cork) |
|------|-------------------|---------------|
| `part_of_speech` | `"n"` | `"n, adj, v"` |
| `definition` | `"意外事件, 事故"` | `"【n】软木【adj】软木制的【v】塞住，抑制"` |
| `definition_en` | `"an event in which..."` | `"【n】the bark...【v】to close..."` |

---

## 📝 多词性格式规范

### 1. 词性标记格式
- **中文释义**：`【词性】释义`（使用全角方括号）
- **英文释义**：`【part of speech】definition`
- **分隔符**：多个词性直接拼接，无额外分隔符

### 2. 常见词性缩写
| 缩写 | 全称 | 中文 |
|------|------|------|
| `n` | noun | 名词 |
| `v` | verb | 动词 |
| `adj` | adjective | 形容词 |
| `adv` | adverb | 副词 |
| `prep` | preposition | 介词 |
| `conj` | conjunction | 连词 |
| `pron` | pronoun | 代词 |
| `vt` | transitive verb | 及物动词 |
| `vi` | intransitive verb | 不及物动词 |

### 3. 示例说明

#### 单词性（无标记）：
```json
{
  "word": "book",
  "part_of_speech": "n",
  "definition": "书本",
  "definition_en": "a set of printed pages"
}
```

#### 多词性（有标记）：
```json
{
  "word": "book",
  "part_of_speech": "n, v",
  "definition": "【n】书本【v】预订",
  "definition_en": "【n】a written work【v】to reserve"
}
```

#### 三词性：
```json
{
  "word": "address",
  "part_of_speech": "n, v, v",
  "definition": "【n】地址【v】致辞【v】处理",
  "definition_en": "【n】address【v】to speak to【v】to deal with"
}
```

---

## 🎯 使用建议

### 导入数据时：
1. **单词性单词**：直接写入释义，不添加标记
2. **多词性单词**：
   - `part_of_speech`：逗号分隔（`"n, v, adj"`）
   - `definition`：使用 `【词性】` 标记
   - `definition_en`：使用 `【part of speech】` 标记

### 前台显示时：
1. **解析多词性**：根据 `【` 和 `】` 分割释义
2. **按词性分组**：可以分Tab或分栏显示
3. **搜索匹配**：支持按词性筛选释义

---

## 📌 注意事项

⚠️ **重要字段**：
- `id`, `word`, `definition`, `order_index`, `created_at`, `updated_at` 是必填字段
- `chapter_id`, `book_id` 可以为null（用于未分配章节的单词）

⚠️ **字符限制**：
- `word`: VARCHAR(255)
- `phonetic`: VARCHAR(255)
- `part_of_speech`: VARCHAR(50) ⚠️ 多词性时可能超长，需注意

⚠️ **空值处理**：
- 所有TEXT字段都可以为空字符串
- 音频、图片URL为null表示未设置
