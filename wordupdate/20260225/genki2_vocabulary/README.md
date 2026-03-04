# Genki 2 词库使用说明

## 📦 词库文件清单

### 完整词库
- **genki2_vocabulary_complete.json** - 完整词库（625词）

### 分课程词库（11个文件）
- **genki2_lesson13_vocabulary.json** - Lesson 13 (69词)
- **genki2_lesson14_vocabulary.json** - Lesson 14 (52词)
- **genki2_lesson15_vocabulary.json** - Lesson 15 (67词)
- **genki2_lesson16_vocabulary.json** - Lesson 16 (42词)
- **genki2_lesson17_vocabulary.json** - Lesson 17 (68词)
- **genki2_lesson18_vocabulary.json** - Lesson 18 (49词)
- **genki2_lesson19_vocabulary.json** - Lesson 19 (51词)
- **genki2_lesson20_vocabulary.json** - Lesson 20 (54词)
- **genki2_lesson21_vocabulary.json** - Lesson 21 (75词)
- **genki2_lesson22_vocabulary.json** - Lesson 22 (55词)
- **genki2_lesson23_vocabulary.json** - Lesson 23 (43词)

**总计**: 625词，11课

---

## 📋 数据字段说明

### 已提供字段

| 字段 | 说明 | 完整度 | 示例 |
|------|------|--------|------|
| **word** | 日语单词（汉字或假名） | 100% ✅ | "ウイエイター" |
| **kana** | 假名读音 | 100% ✅ | "ウイエイター" |
| **romaji** | 罗马音 | 100% ✅ | "uieitaa" |
| **definition_en** | 英文释义 | 100% ✅ | "waiter" |
| **lesson** | 课程编号 | 100% ✅ | 13 |
| **textbook** | 教材名称 | 100% ✅ | "Genki 2 (2nd Edition)" |

### 待补充字段

| 字段 | 说明 | 当前状态 |
|------|------|----------|
| **definition** | 中文释义 | null（待补充） |
| **part_of_speech** | 词性 | null（待补充） |
| **collocation_en** | 英文搭配 | null（待补充） |
| **example_sentence_en** | 英文例句 | null（待补充） |

---

## 📝 样本数据

```json
{
  "word": "ウイエイター",
  "kana": "ウイエイター",
  "romaji": "uieitaa",
  "definition_en": "waiter",
  "definition": null,
  "part_of_speech": null,
  "lesson": 13,
  "textbook": "Genki 2 (2nd Edition)",
  "collocation_en": null,
  "example_sentence_en": null
}
```

---

## 📊 课程分布

| 课程 | 词汇数 | 课程 | 词汇数 |
|------|--------|------|--------|
| Lesson 13 | 69词 | Lesson 19 | 51词 |
| Lesson 14 | 52词 | Lesson 20 | 54词 |
| Lesson 15 | 67词 | Lesson 21 | 75词 |
| Lesson 16 | 42词 | Lesson 22 | 55词 |
| Lesson 17 | 68词 | Lesson 23 | 43词 |
| Lesson 18 | 49词 | | |

---

## 🎯 使用建议

### 1. 跟随教材学习
- 按课程顺序学习（Lesson 13 → Lesson 23）
- 每课约40-75词，适合系统学习
- 配合Genki 2教材使用效果最佳

### 2. 与Genki 1配套使用
- Genki 1: Lesson 0-12 (1,172词)
- Genki 2: Lesson 13-23 (625词)
- 总计: 1,797词，覆盖日语初级全部内容

### 3. 补充中文释义
使用翻译API（如MyMemory）将英文释义翻译为中文：
```python
import requests

definition_en = "waiter"
url = f"https://api.mymemory.translated.net/get?q={definition_en}&langpair=en|zh-CN"
response = requests.get(url)
definition_zh = response.json()['responseData']['translatedText']
```

### 4. 补充词性
可以通过Jisho API查询词性信息。

---

## 📚 数据来源

- **原始数据**: Paul Denisowski's Japanese Page
- **教材**: Genki 2 (2nd Edition)
- **罗马音转换**: pykakasi
- **License**: 用于内部学习

---

## ⭐ 数据特点

### 优势
- ✅ **官方教材词汇**，权威性最高
- ✅ **按课程系统分级**，适合跟随教材学习
- ✅ **罗马音100%完整**，初学者友好
- ✅ **适合N4-N3学习者**

### 局限
- ⚠️ 词汇量较少（625词）
- ⚠️ 无中文释义（需自行补充）
- ⚠️ 无词性、例句、搭配

---

## 💡 与Genki 1对比

| 特征 | Genki 1 | Genki 2 |
|------|---------|---------|
| 词汇量 | 1,172词 | 625词 |
| 课程 | Lesson 0-12 | Lesson 13-23 |
| 等级 | N5-N4 | N4-N3 |
| 罗马音 | ✅ 100% | ✅ 100% |
| 中文释义 | ❌ 无 | ❌ 无 |

**建议**：
- 初学者：先学Genki 1
- 进阶学习：完成Genki 1后学习Genki 2
- 系统学习：Genki 1 + Genki 2 = 完整初级课程

---

## 📞 技术支持

如有问题，请参考：
- Genki官网: https://genki3.japantimes.co.jp/
- 原始数据源: http://www.denisowski.org/Japanese/GENKI_2/
