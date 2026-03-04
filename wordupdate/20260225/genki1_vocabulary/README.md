# Genki 1 词库使用说明

## 📦 词库文件清单

### 完整词库
- **genki1_vocabulary_complete.json** - 完整词库（1,172词）

### 分课程词库（24个文件）
- **genki1_lesson0_vocabulary.json** - Lesson 0 (34词)
- **genki1_lesson1_vocabulary.json** - Lesson 1 (56词)
- **genki1_lesson2_vocabulary.json** - Lesson 2 (48词)
- ... (Lesson 3-22)
- **genki1_lesson23_vocabulary.json** - Lesson 23 (43词)

**总计**: 1,172词，24课

---

## 📋 数据字段说明

### 已提供字段

| 字段 | 说明 | 完整度 | 示例 |
|------|------|--------|------|
| **word** | 日语单词（汉字或假名） | 100% ✅ | "お早う" |
| **kana** | 假名读音 | 100% ✅ | "おはよう" |
| **romaji** | 罗马音 | 100% ✅ | "ohayou" |
| **definition_en** | 英文释义 | 100% ✅ | "Good morning" |
| **lesson** | 课程编号 | 100% ✅ | 0 |
| **textbook** | 教材名称 | 100% ✅ | "Genki 1 (3rd Edition)" |

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
  "word": "お早う",
  "kana": "おはよう",
  "romaji": "ohayou",
  "definition_en": "Good morning",
  "definition": null,
  "part_of_speech": null,
  "lesson": 0,
  "textbook": "Genki 1 (3rd Edition)",
  "collocation_en": null,
  "example_sentence_en": null
}
```

---

## 📊 课程分布

| 课程 | 词汇数 | 课程 | 词汇数 |
|------|--------|------|--------|
| Lesson 0 | 34词 | Lesson 12 | 47词 |
| Lesson 1 | 56词 | Lesson 13 | 55词 |
| Lesson 2 | 48词 | Lesson 14 | 48词 |
| Lesson 3 | 55词 | Lesson 15 | 41词 |
| Lesson 4 | 63词 | Lesson 16 | 42词 |
| Lesson 5 | 54词 | Lesson 17 | 47词 |
| Lesson 6 | 49词 | Lesson 18 | 48词 |
| Lesson 7 | 50词 | Lesson 19 | 51词 |
| Lesson 8 | 46词 | Lesson 20 | 50词 |
| Lesson 9 | 48词 | Lesson 21 | 56词 |
| Lesson 10 | 43词 | Lesson 22 | 55词 |
| Lesson 11 | 43词 | Lesson 23 | 43词 |

---

## 🎯 使用建议

### 1. 跟随教材学习
- 按课程顺序学习（Lesson 0 → Lesson 23）
- 每课约40-60词，适合系统学习
- 配合Genki 1教材使用效果最佳

### 2. 补充中文释义
使用翻译API（如MyMemory）将英文释义翻译为中文：
```python
import requests

definition_en = "Good morning"
url = f"https://api.mymemory.translated.net/get?q={definition_en}&langpair=en|zh-CN"
response = requests.get(url)
definition_zh = response.json()['responseData']['translatedText']
```

### 3. 补充词性
可以通过Jisho API查询词性信息。

---

## 📚 数据来源

- **原始数据**: [jackiewkr/genki1-vocab](https://github.com/jackiewkr/genki1-vocab)
- **教材**: Genki 1 (3rd Edition)
- **罗马音转换**: pykakasi
- **License**: 用于内部学习

---

## ⭐ 数据特点

### 优势
- ✅ **官方教材词汇**，权威性最高
- ✅ **按课程系统分级**，适合跟随教材学习
- ✅ **罗马音100%完整**，初学者友好
- ✅ **适合N5-N4初学者**

### 局限
- ⚠️ 词汇量较少（1,172词）
- ⚠️ 只覆盖初级内容
- ⚠️ 无中文释义（需自行补充）
- ⚠️ 无词性、例句、搭配

---

## 💡 与JLPT词库对比

| 特征 | Genki 1词库 | JLPT词库 |
|------|------------|----------|
| 词汇量 | 1,172词 | 66,528词 |
| 分级标准 | 按课程 (Lesson 0-23) | 按JLPT等级 (N5-N1) |
| 权威性 | ⭐⭐⭐⭐⭐ 官方教材 | ⭐⭐⭐ 推断分级 |
| 适用场景 | 跟随教材系统学习 | 备考JLPT |
| 罗马音 | ✅ 100% | ❌ 无 |
| 中文释义 | ❌ 无 | ❌ 无 |

**建议**：
- 初学者：使用Genki 1词库
- 备考JLPT：使用JLPT词库
- 系统学习：两者结合使用

---

## 📞 技术支持

如有问题，请参考：
- Genki官网: https://genki3.japantimes.co.jp/
- 原始数据源: https://github.com/jackiewkr/genki1-vocab
