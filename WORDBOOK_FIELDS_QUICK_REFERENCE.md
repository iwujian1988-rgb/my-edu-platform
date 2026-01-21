# 单词书字段需求速查表

## 🔴 核心必备字段（6个）- 必须有

| 字段名 | 类型 | 示例 | 重要性 | 说明 |
|--------|------|------|--------|------|
| **id** | UUID | "7967-..." | ⭐⭐⭐⭐⭐ | 唯一标识 |
| **title** | String(100) | "CET-4 核心词汇" | ⭐⭐⭐⭐⭐ | 词库名称 |
| **words** | Array | ["apple", "banana"] | ⭐⭐⭐⭐⭐ | 单词列表 |
| **definition** | String | "n. 苹果" | ⭐⭐⭐⭐⭐ | 中文释义 |
| **phonetic** | String | "/ˈæpl/" | ⭐⭐⭐⭐ | 音标 |
| **difficulty_level** | String | "中级" | ⭐⭐⭐⭐ | 难度等级 |

---

## 🟡 重要可选字段（8个）- 强烈建议

| 字段名 | 类型 | 示例 | 重要性 | 说明 |
|--------|------|------|--------|------|
| **description** | Text(500) | "包含四级考试最常用的..." | ⭐⭐⭐⭐ | 词库描述 |
| **cover_color** | String | "from-blue-400 to-blue-500" | ⭐⭐⭐ | 封面颜色 |
| **category/tags** | String/Array | ["考试", "CET-4"] | ⭐⭐⭐⭐ | 分类标签 |
| **total_words** | Integer | 4500 | ⭐⭐⭐⭐ | 词汇量 |
| **total_chapters** | Integer | 45 | ⭐⭐⭐ | 章节数 |
| **definition_en** | String | "A round fruit..." | ⭐⭐⭐⭐ | 英文释义 |
| **part_of_speech** | String | "n." | ⭐⭐⭐ | 词性 |
| **example_sentence** | String | "I eat an apple." | ⭐⭐⭐⭐ | 例句 |

---

## 🟢 补充字段（12个）- 锦上添花

| 字段名 | 类型 | 示例 | 重要性 | 说明 |
|--------|------|------|--------|------|
| **collocation** | String | "apple pie" | ⭐⭐⭐ | 搭配 |
| **collocation_en** | String | "apple pie" | ⭐⭐ | 搭配英文 |
| **synonyms** | Array | ["malus", "pomme"] | ⭐⭐⭐ | 同义词 |
| **antonyms** | Array | [] | ⭐⭐ | 反义词 |
| **etymology** | Text | "来自古法语..." | ⭐⭐ | 词源 |
| **frequency** | Integer | 1000 | ⭐⭐⭐ | 词频 |
| **variations** | Object | {"plural": "apples"} | ⭐⭐ | 变形 |
| **difficulty_score** | Integer | 3 | ⭐⭐⭐ | 难度评分 |
| **study_count** | Integer | 1500 | ⭐⭐ | 学习次数 |
| **mastery_rate** | Float | 0.75 | ⭐⭐⭐ | 掌握率 |
| **related_words** | Array | ["fruit", "banana"] | ⭐⭐ | 关联词 |
| **part_of_speech_detail** | Object | {"n.": "苹果"} | ⭐⭐⭐ | 词性详细 |

---

## 🔵 元数据字段（5个）- 建议包含

| 字段名 | 类型 | 示例 | 重要性 | 说明 |
|--------|------|------|--------|------|
| **source** | String | "有道词典" | ⭐⭐⭐⭐ | 数据来源 |
| **provider** | String | "官方" | ⭐⭐⭐ | 提供方 |
| **version** | String | "2024-edition" | ⭐⭐ | 版本号 |
| **updated_at** | Timestamp | "2026-01-10" | ⭐⭐⭐ | 更新时间 |
| **license** | String | "CC BY-NC-SA 4.0" | ⭐⭐⭐ | 许可证 |

---

## 📊 数据搜集优先级

### ⭐⭐⭐⭐⭐ 最高优先级（考试类）
1. **CET-4** - 4500词，必备字段6个
2. **CET-6** - 6000词，必备+重要字段
3. **雅思** - 8000词，必备+重要+补充字段
4. **托福** - 10000词，必备+重要+补充字段

### ⭐⭐⭐⭐ 高优先级（主题类）
5. **商务英语** - 2000词
6. **科技英语** - 3000词
7. **旅游英语** - 1000词

### ⭐⭐⭐ 中优先级（专项类）
8. **词根词缀** - 5000词
9. **高频3000词** - 3000词
10. **新闻词汇** - 2000词

---

## 🌐 推荐数据源

### 官方词库
- ✅ **有道词典API** - https://dict.youdao.com/jsonapi
- ✅ **牛津词典** - https://www.oxfordlearnersdictionaries.com/
- ✅ **柯林斯词典** - https://www.collinsdictionary.com/

### 开源数据
- ✅ **English WordNet** - 开源英语词典
- ✅ **GitHub词库项目** - 搜索"english vocabulary"

### 考试官方
- ✅ **CET-4/6官方词汇** - 教育部考试中心
- ✅ **雅思官方词汇** - Cambridge Assessment
- ✅ **托福官方词汇** - ETS

---

## ✅ 数据质量标准

### 最低标准（可接受）
```
✅ 6个必备字段100%完整
✅ 无敏感信息
✅ 无明显错误
```

### 推荐标准（良好）
```
✅ 14个核心字段（必备+重要）>90%完整
✅ 有明确来源
✅ 格式统一
```

### 高质量标准（优秀）
```
✅ 31个字段>90%完整
✅ 权威来源
✅ 实时更新
✅ 有版权许可
```

---

## 📝 数据格式示例（精简版）

```json
{
  "title": "CET-4 核心词汇",
  "description": "大学英语四级考试最常用的4500个单词",
  "category": "考试",
  "tags": ["CET-4", "英语"],
  "difficulty_level": "中级",
  "total_words": 4500,
  "source": "教育部考试中心",
  "words": [
    {
      "word": "abandon",
      "phonetic": "/əˈbændən/",
      "definition": "v. 放弃；抛弃",
      "definition_en": "to give up something completely",
      "part_of_speech": "v.",
      "example_sentence": "He decided to abandon the project."
    },
    {
      "word": "ability",
      "phonetic": "/əˈbɪləti/",
      "definition": "n. 能力；才能",
      "definition_en": "the ability to do something",
      "part_of_speech": "n.",
      "example_sentence": "She has the ability to succeed."
    }
  ]
}
```

---

**文档完成时间**: 2026-01-10
**适用场景**: 快速查阅字段需求
