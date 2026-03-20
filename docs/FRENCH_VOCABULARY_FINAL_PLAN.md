# 法语词库重建方案 - 最终版

> 创建日期: 2026-03-18
> 状态: ✅ 已确认，待实施

---

## 一、背景

### 现有词库问题
- 现有 `french_translated_v2_fixed` 词库的CEFR分级**不可信**
- A1级别88%是**变位动词**（如 suis, es, est），而非原形（如 être）
- 根本原因：原始数据从语料库提取的是"语料形式"，而非"词典形式"

### 解决方案
**废弃旧词库**，使用权威数据源重新构建

---

## 二、数据源

| 数据源 | 提供内容 | 覆盖率 | 权威性 |
|--------|----------|--------|--------|
| **FLELex** | 词形 + 词性 + CEFR等级 | 14,236词 | ✅ 学术来源 (UCLouvain) |
| **MDX词典** | 词性分组 + 释义 + 音标 + 例句 | 97%覆盖FLELex | ✅ 新法汉词典修订本 |
| **中文维基** | 阴阳性 + 变位形式 + 补充释义 | 66% | ⚠️ 众包 |

### FLELex 文件
- 路径: `temp/flelex_beacco.tsv`
- 许可: CC BY-NC-SA 4.0 (需引用)
- 引用格式:
  > François, T., Gala, N., Watrin, P. & Fairon, C. (2014). FLELex: a graded lexical resource for French foreign learners. LREC 2014.

### MDX 文件
- 路径: `wordupdate/20260309/新法汉词典修订本.mdx`
- 解析库: `mdict-js`

---

## 三、核心发现

### 3.1 同一词形可有多个词性

FLELex中同一个词形可能对应多个词性，每个词性有独立的CEFR等级：

| 词形 | 词性 | CEFR等级 |
|------|------|----------|
| adulte | ADJ | B2 |
| adulte | NOM | A1 |
| absent | ADJ | B2 |
| absent | NOM | C1 |
| aller | VER | A1 |
| aller | NOM | B2 |

### 3.2 MDX词典按词性分组

MDX词典的HTML结构**已经按词性分组**：

```html
<div class="cont-pos cont-pos-pos">a.</div>     <!-- 形容词部分 -->
<dt>1. 成体的;长成的</dt>
<dt>2. 成年的;成熟的</dt>

<div class="cont-pos cont-pos-pos">— n.</div>  <!-- 名词部分 -->
<dt>成年人</dt>
```

### 3.3 词性匹配

FLELex和MDX的词性可以精确匹配：

| FLELex | MDX |
|--------|-----|
| NOM | n., n.m., n.f. |
| VER | v., v.t., v.i., v.pr. |
| ADJ | a., adj. |
| ADV | adv. |
| PRP | prép. |
| CON | conj. |
| PRO | pron. |
| INT | int. |

---

## 四、最终数据结构

```typescript
interface WordEntry {
  // === 基础信息 ===
  id: string;                    // 唯一标识 (uuid)
  word: string;                  // 词形 (原形)

  // === 音标 ===
  phonetic: string;              // IPA音标，来自MDX

  // === 多词性支持 (核心) ===
  posEntries: Array<POSEntry>;

  // === 冗余字段 (方便查询) ===
  primary_cefr: string;          // 最低的CEFR等级
  primary_pos: string;           // 主要词性

  // === 元数据 ===
  source: {
    cefr: 'flelex';
    definition: 'mdx' | 'zhwikt' | 'ai';
    phonetic: 'mdx';
  };
}

interface POSEntry {
  pos: string;              // 标准词性: noun, verb, adj, adv...
  pos_detail: string;       // 详细词性: n.m., v.t., a. ...
  cefr_level: string;       // CEFR等级: A1, A2, B1, B2, C1, C2

  // 释义 (最多5个)
  definitions: string[];

  // 例句 (最多3个)
  examples: Array<{
    fr: string;
    zh: string;
  }>;

  // 语法信息
  gender?: 'm' | 'f' | 'mf';    // 名词阴阳性
  plural?: string;             // 名词复数形式
}

interface WordDatabase {
  version: string;
  created_at: string;
  total_words: number;
  words: WordEntry[];

  // 按CEFR等级分组的索引
  by_level: {
    A1: string[];  // word IDs
    A2: string[];
    B1: string[];
    B2: string[];
    C1: string[];
    C2: string[];
  };
}
```

---

## 五、示例数据

```json
{
  "id": "adulte-001",
  "word": "adulte",
  "phonetic": "adylt",
  "posEntries": [
    {
      "pos": "noun",
      "pos_detail": "n.",
      "cefr_level": "A1",
      "definitions": ["成年人"],
      "examples": [
        { "fr": "film réservé aux adultes", "zh": "成年人看的电影" }
      ],
      "gender": "m"
    },
    {
      "pos": "adj",
      "pos_detail": "a.",
      "cefr_level": "B2",
      "definitions": [
        "【动物学】【植物学】成体的;长成的",
        "成年的;成熟的"
      ],
      "examples": [
        { "fr": "âge adulte", "zh": "成年" }
      ]
    }
  ],
  "primary_cefr": "A1",
  "primary_pos": "noun"
}
```

---

## 六、处理流程

```
Step 1: 解析FLELex
├── 读取 TSV 文件
├── 提取: 词形 + 词性 + CEFR等级 + 频率数据
└── 输出: flelex_parsed.json

Step 2: 解析MDX
├── 遍历FLELex所有词形
├── 按词性分组提取释义、音标、例句
├── 输出: mdx_parsed.json

Step 3: 合并数据
├── 按 词形+词性 匹配 FLELex 和 MDX
├── 合并CEFR等级 + 释义
└── 输出: merged_data.json

Step 4: 补充语法信息
├── 从中文维基补充阴阳性、复数形式
└── 输出: final_data.json

Step 5: 质量检查
├── CEFR覆盖率 = 100%
├── 释义覆盖率 ≥ 97%
├── 音标覆盖率 ≥ 80%
├── 名词阴阳性覆盖率 ≥ 95%
└── 输出: quality_report.json

Step 6: 生成最终文件
├── french_words_A1.json
├── french_words_A2.json
├── french_words_B1.json
├── french_words_B2.json
├── french_words_C1.json
├── french_words_C2.json
└── french_words_all.json (完整版)
```

---

## 七、MDX解析规则

### 7.1 提取音标
```javascript
const phoneticMatch = html.match(/\[([^\]]+)\]/);
```

### 7.2 按词性分组
```javascript
// 按 cont-pos-pos 分割
const parts = html.split(/cont-pos-pos/);

// 提取词性标记
const posMatch = part.match(/^[^>]*>([^<]+)</);

// 提取释义
const defMatches = part.matchAll(/<dt[^>]*>([\s\S]*?)<\/dt>/gi);

// 跳过变位表
if (text.includes('Présent') || text.includes('Passé composé')) continue;
```

### 7.3 词性标准化
```javascript
const posMap = {
  'n.m.': 'noun', 'n.f.': 'noun', 'n.': 'noun',
  'v.t.': 'verb', 'v.i.': 'verb', 'v.pr.': 'verb', 'v.': 'verb',
  'a.': 'adj', 'adj.': 'adj',
  'adv.': 'adv',
  'prép.': 'prep',
  'conj.': 'conj',
  'pron.': 'pron',
  'int.': 'int',
};
```

---

## 八、质量指标

| 指标 | 阈值 | 说明 |
|------|------|------|
| CEFR覆盖率 | 100% | 每个词必须有等级 |
| 释义覆盖率 | ≥97% | MDX覆盖FLELex的比例 |
| 音标覆盖率 | ≥80% | 有音标的词占比 |
| 名词阴阳性 | ≥95% | 名词有阴阳性标记 |
| 词性匹配率 | ≥95% | FLELex词性能在MDX中找到对应 |

---

## 九、输出文件位置

```
data/
├── french/
│   ├── french_words_A1.json    (~1,247词)
│   ├── french_words_A2.json    (~679词)
│   ├── french_words_B1.json    (~1,753词)
│   ├── french_words_B2.json    (~5,088词)
│   ├── french_words_C1.json    (~3,155词)
│   ├── french_words_C2.json    (~2,314词)
│   └── french_words_all.json   (完整版, 14,236词)
```

---

## 十、旧词库处理

- `wordupdate/20260309/french_translated_v2_fixed/` → **废弃**
- 原因: CEFR分级不可信（变位动词问题）
- 保留作为参考，但不再使用

---

## 十一、风险与缓解

| 风险 | 缓解措施 |
|------|----------|
| 词性匹配失败 | 使用模糊匹配 + 人工确认列表 |
| 阴阳性缺失 | 词尾规则推断 + 标记需人工确认 |
| 例句不足 | 接受60%覆盖率，后续补充 |

---

## 十二、实施计划

| 阶段 | 任务 | 预计时间 |
|------|------|----------|
| Phase 1 | 解析FLELex + MDX | 2小时 |
| Phase 2 | 合并数据 + 补充语法 | 1小时 |
| Phase 3 | 质量检查 + 生成文件 | 1小时 |
| **总计** | | **4小时** |

---

## 附录: 关键决策记录

1. **为什么不区分不同等级的释义？**
   - 主流App（Duolingo, Busuu）也是按词性分组，不是按CEFR等级区分释义
   - 简化实现，降低风险

2. **为什么保留多个释义？**
   - 学习者需要了解词的多个含义
   - 最多5个，避免信息过载

3. **为什么不修复旧词库？**
   - 旧词库的CEFR分级根本错误（变位动词问题）
   - 重建比修复更可靠
