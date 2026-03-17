# 法语分类词库（French Classified Vocabulary）

## 概述

本词库集合从 **kaikki.org**（基于英文Wiktionary）提取有IPA音标的法语词条，共 **101,010词**，按CEFR等级、词频、场景分类拆分为9个词库。

> ⚠️ **注意**：`definition_zh`（中文释义）字段为空，需用户自行补充（建议使用LLM批量翻译`definition_en`字段）。

---

## 词库列表

| 文件名 | 词库名称 | 词汇量 | 说明 |
|--------|---------|--------|------|
| `french_A1.json` | 法语A1词库 | 2,745词 | 最基础词汇，词频最高 |
| `french_A2.json` | 法语A2词库 | 2,907词 | 初级词汇 |
| `french_B1.json` | 法语B1词库 | 4,458词 | 中级词汇 |
| `french_B2.json` | 法语B2词库 | 5,649词 | 中高级词汇 |
| `french_C1.json` | 法语C1词库 | 4,984词 | 高级词汇 |
| `french_C2.json` | 法语C2词库 | 80,267词 | 高级/专业词汇（含大量动词变位形式） |
| `french_top5000.json` | 法语高频词库（Top5000） | 4,403词 | 最常用5000词，按词频排序 |
| `french_scenes.json` | 法语场景词库 | 6,867词 | 按场景分类（商务/旅游/美食/健康/教育/科技/文化/日常） |
| `french_complete.json` | 法语完整词库 | 101,010词 | 所有词条合并 |

---

## 字段说明

```json
{
  "word": "bonjour",              // 法语单词（必填）
  "phonetic": "/bɔ̃.ʒuʁ/",       // IPA音标（100%有）
  "definition_zh": "",            // 中文释义（留空，需补充）
  "definition_en": "hello, good day", // 英文释义（99.9%有）
  "part_of_speech": "interjection",   // 词性
  "gender": "masculine",          // 性别（名词：masculine/feminine）
  "plural": "bonjours",           // 复数形式（名词，29.3%有）
  "example_sentence": "",         // 例句（8.6%有）
  "cefr_level": "A1",             // CEFR等级（估算）
  "frequency_rank": 45,           // 词频排名（有则为数字，无则为99999）
  "scene": "daily_life",          // 场景分类（见下方）
  "source": "kaikki.org (Wiktionary)" // 数据来源
}
```

### 场景分类（scene字段）

| 值 | 中文名称 |
|----|---------|
| `business` | 商务 |
| `travel` | 旅游 |
| `food` | 美食 |
| `health` | 健康 |
| `education` | 教育 |
| `technology` | 科技 |
| `culture` | 文化 |
| `daily_life` | 日常生活 |

---

## 字段完整性

| 字段 | 完整率 | 词条数 |
|------|--------|--------|
| word（单词） | 100% | 101,010 |
| phonetic（IPA音标） | 100% | 101,010 |
| definition_en（英文释义） | 99.9% | 100,932 |
| part_of_speech（词性） | 100% | 101,010 |
| gender（性别） | 9.3% | 9,426 |
| plural（复数） | 29.3% | 29,590 |
| example_sentence（例句） | 8.6% | 8,662 |
| **definition_zh（中文释义）** | **0%** | **需补充** |

---

## CEFR等级说明

> ⚠️ CEFR等级为**估算值**，基于Lexique3词频数据（书面语频率）推算，非官方认证。

| 等级 | 阈值（Lexique3书面频率） | 词汇量 |
|------|----------------------|--------|
| A1 | freq >= 61（Top 10%） | 2,745词 |
| A2 | freq >= 22（Top 20%） | 2,907词 |
| B1 | freq >= 10（Top 30%） | 4,458词 |
| B2 | freq >= 5（Top 40%） | 5,649词 |
| C1 | freq >= 3（Top 50%） | 4,984词 |
| C2 | freq < 3 或无词频数据 | 80,267词 |

C2词库词汇量大的原因：kaikki.org包含大量法语动词变位形式，这些词在Lexique3中没有词频数据，统一归入C2。

---

## 数据来源

| 来源 | 用途 | 许可证 |
|------|------|--------|
| **kaikki.org**（英文Wiktionary） | 单词、IPA音标、词性、英文释义、例句 | CC BY-SA 3.0 |
| **Lexique3**（法国大学） | 词频数据（用于CEFR等级估算） | CC BY-SA 4.0 |
| **wordfrequency.info** | 高频词排名 | 免费使用 |

---

## 如何补充中文释义

推荐使用以下方式批量补充`definition_zh`字段：

```python
import json
from openai import OpenAI

client = OpenAI()

def translate_to_chinese(definition_en, word):
    response = client.chat.completions.create(
        model="gpt-4.1-mini",
        messages=[{
            "role": "user",
            "content": f"将以下法语单词'{word}'的英文释义翻译为简洁的中文释义（5字以内）：{definition_en}"
        }]
    )
    return response.choices[0].message.content.strip()
```
