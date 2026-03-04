# 日语词库使用说明

## 📦 词库文件清单

| 文件名 | JLPT等级 | 词汇数 | 说明 |
|--------|----------|--------|------|
| `japanese_N5_vocabulary.json` | N5 | 2,645词 | 初级基础词汇 |
| `japanese_N4_vocabulary.json` | N4 | 6,416词 | 初级进阶词汇 |
| `japanese_N3_vocabulary.json` | N3 | 16,795词 | 中级词汇 |
| `japanese_N2_vocabulary.json` | N2 | 14,144词 | 中高级词汇 |
| `japanese_N1_vocabulary.json` | N1 | 26,528词 | 高级词汇 |

**总计**: 66,528词（已去除Unknown分类）

---

## 📋 数据字段说明

### 已提供字段（基础数据）

| 字段 | 说明 | 完整度 | 示例 |
|------|------|--------|------|
| **word** | 日语单词（汉字或假名） | 100% | "家" |
| **kana** | 假名读音 | 90-97% | "いえ" |
| **part_of_speech** | 词性 | 90-97% | "Noun" |
| **definition_en** | 英文释义 | 90-97% | "house, residence, dwelling" |
| **frequency** | 使用频率（数字越小越常用） | 100% | 1000 |
| **jlpt_level** | JLPT等级 | 100% | "N5" |

### 待补充字段（需调用API）

| 字段 | 说明 | 补充方法 |
|------|------|----------|
| **romaji** | 罗马音 | 使用pykakasi将kana转换 |
| **definition** | 中文释义 | 使用MyMemory翻译API或其他翻译服务 |
| **collocation_en** | 英文搭配 | 需要额外数据源或AI生成 |
| **example_sentence_en** | 英文例句 | 需要额外数据源或AI生成 |

---

## 🔧 API补充指南

### 1. 补充罗马音（pykakasi）

**安装**:
```bash
pip install pykakasi
```

**代码示例**:
```python
import json
import pykakasi

# 初始化pykakasi
kks = pykakasi.kakasi()

# 读取词库
with open('japanese_N5_vocabulary.json', 'r', encoding='utf-8') as f:
    vocab = json.load(f)

# 补充罗马音
for item in vocab:
    if item['kana']:
        result = kks.convert(item['kana'])
        item['romaji'] = ''.join([r['hepburn'] for r in result])

# 保存
with open('japanese_N5_vocabulary_updated.json', 'w', encoding='utf-8') as f:
    json.dump(vocab, f, ensure_ascii=False, indent=2)
```

---

### 2. 补充中文释义（MyMemory API）

**API地址**:
```
https://api.mymemory.translated.net/get?q={text}&langpair=en|zh-CN
```

**代码示例**:
```python
import json
import requests
import time

# 读取词库
with open('japanese_N5_vocabulary.json', 'r', encoding='utf-8') as f:
    vocab = json.load(f)

# 补充中文释义
for item in vocab:
    if item['definition_en']:
        url = f"https://api.mymemory.translated.net/get"
        params = {
            'q': item['definition_en'],
            'langpair': 'en|zh-CN'
        }
        
        try:
            response = requests.get(url, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                item['definition'] = data['responseData']['translatedText']
            
            # 避免触发频率限制
            time.sleep(1)
        except Exception as e:
            print(f"错误: {e}")

# 保存
with open('japanese_N5_vocabulary_updated.json', 'w', encoding='utf-8') as f:
    json.dump(vocab, f, ensure_ascii=False, indent=2)
```

**注意**: MyMemory API限制为1000次/天（匿名），建议分批处理。

---

### 3. 补充搭配和例句（可选）

**方案A**: 使用Jisho.org API查询
```python
import requests

word = "家"
url = f"https://jisho.org/api/v1/search/words?keyword={word}"
response = requests.get(url)
data = response.json()

# Jisho API可能包含部分例句信息
# 但不保证所有词汇都有
```

**方案B**: 使用AI生成（需要API key）
- 使用OpenAI API
- 使用其他LLM API
- 根据词汇生成地道的搭配和例句

---

## 📊 数据质量统计

| 等级 | 词汇数 | word | kana | pos | definition_en |
|------|--------|------|------|-----|---------------|
| N5 | 2,645 | 100% | 90.5% | 90.5% | 90.5% |
| N4 | 6,416 | 100% | 93.8% | 93.8% | 93.8% |
| N3 | 16,795 | 100% | 95.2% | 95.2% | 95.2% |
| N2 | 14,144 | 100% | 97.3% | 97.3% | 97.3% |
| N1 | 26,528 | 100% | 97.4% | 97.4% | 97.4% |

---

## 🎯 使用建议

### 1. 分批处理

由于词汇量大（66,528词），建议：
- 优先处理N5-N3（基础和中级词汇）
- 使用多线程/异步处理提高效率
- 注意API频率限制

### 2. 质量检查

补充数据后，建议：
- 抽查翻译质量
- 验证罗马音准确性
- 检查特殊字符处理

### 3. 数据备份

- 处理前备份原始文件
- 分阶段保存中间结果
- 记录处理日志

---

## 📚 数据来源

- **词汇数据**: [jlpt-kanji-dictionary](https://github.com/AnchorI/jlpt-kanji-dictionary)
- **JLPT分级**: 基于汉字JLPT等级推断
- **License**: MIT

---

## ❓ 常见问题

### Q1: 为什么有些词汇没有kana？
A: 部分词汇在原始数据中缺失假名读音，约占5-10%。

### Q2: JLPT等级是官方的吗？
A: 基于汉字JLPT等级推断，非官方标注，但准确度较高。

### Q3: 如何处理API限制？
A: 
- MyMemory: 注册账号可提升至10000次/天
- 使用代理IP轮换
- 分多天处理

### Q4: 能否直接使用AI生成所有字段？
A: 可以，但建议先用免费API补充基础字段，AI仅用于补充搭配和例句，以节省成本。

---

## 📞 技术支持

如有问题，请参考：
- Jisho API: https://jisho.org/forum/54fefc1f6e73340b1f160000-is-there-any-kind-of-search-api
- MyMemory API: https://mymemory.translated.net/doc/spec.php
- pykakasi: https://github.com/miurahr/pykakasi
