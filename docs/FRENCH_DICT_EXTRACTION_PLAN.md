# 法语词典提取方案

> 创建: 2026-03-17
> 状态: 设计完成，待执行阶段1（数据探查）

---

## 一、背景与问题

### 1.1 当前问题
- 数据库中法语词释义有英语污染
- 例如: `pet` = "宠物" (错，应为"屁")
- 例如: `pain` = "痛苦" (错，应为"面包")
- 之前AI修复失败已回滚（986词）

### 1.2 数据源
| 来源 | 文件 | 词数 | 特点 |
|------|------|------|------|
| MDX词典 | `wordupdate/20260309/新法汉词典修订本.mdx` | ~10万 | 权威、有音标例句、无变位 |
| 中文维基 | `temp/french_from_zhwikt.json` | 14.5万 | 有变位形式、覆盖广、释义简略 |
| 原始数据 | `wordupdate/20260309/french_translated_v2_fixed/*.json` | 4万 | 待修复的目标数据 |

### 1.3 覆盖率分析 (40,833词)
| 类别 | 数量 | 占比 |
|------|------|------|
| 仅MDX有 | 5,131 | 12.6% |
| 仅中文维基有 | 10,237 | 25.1% |
| 两者都有 | 12,206 | 29.9% |
| 两者都无 | 13,259 | 32.5% |

---

## 二、数据源分析

### 2.1 MDX HTML结构
```html
<!-- 词头 -->
<div class="words">pain</div>
<span class="words-yinbiao-symbol">[pɛ̃]</span>

<!-- 词性+性别 -->
<div class="cont-pos">n.m.</div>  <!-- 阳性名词 -->

<!-- 释义 (可能有多个) -->
<dt><span class="cont-number">1</span>&nbsp;面包</dt>
<dt><span class="cont-number">2</span>&nbsp;食粮, 生计</dt>

<!-- 例句 -->
<div class="cont-exam-fr">~ blanc</div>
<span class="cont-exam-trans-inline">白面包</span>
```

**可提取字段**: word, phonetic, pos, gender, definitions[], examples[], collocations

### 2.2 中文维基JSON结构
```json
{
  "word": "chat",
  "pos": "noun",
  "gender": "m",
  "glosses": ["猫"],
  "forms": [{"form": "chats", "tags": ["plural"]}]
}
```

**可提取字段**: word, pos, gender, glosses[], forms[]

### 2.3 两源对比
| 字段 | MDX | 中文维基 | 优先级 |
|------|-----|----------|--------|
| 释义 | ✓ 详细 | ✓ 简略 | MDX > 维基 |
| 音标 | ✓ 有 | ✗ 无 | MDX |
| 词性 | ✓ 需解析 | ✓ 已标准化 | 维基 > MDX |
| 性别 | ✓ 需解析 | ✓ 直接有 | 维基 > MDX |
| 例句 | ✓ 有 | ✗ 无 | MDX |
| 变位形式 | ✗ 无 | ✓ 有 | 维基 |

---

## 三、提取策略

### 3.1 按词类型分类处理

```
类型A: 原形名词/形容词/动词不定式
├── 优先从MDX提取
├── 提取全部释义（不只第一个）
└── 提取例句和搭配

类型B: 变位动词形式 (占缺失50%)
├── 从中文维基提取
├── 尝试还原原形（可选）
└── 标注为变位形式

类型C: 冠词/代词/介词
├── 从中文维基提取
└── 简化处理

类型D: 短语/习语
├── 从中文维基提取
└── 保持完整形式

类型E: 专有名词 (占缺失14.7%)
├── 保留原数据
└── 或标记为不处理

类型F: 两者都无 (32.5%)
├── 保留原数据
└── 标记为需人工处理
```

### 3.2 字段映射规则

```
目标字段          MDX解析方式              中文维基解析方式
─────────────────────────────────────────────────────────────
word              直接取                   直接取
definition        提取所有<dt>释义         glosses[0]
phonetic          匹配 [xxx]               无
part_of_speech    n.m.→noun, v.t.→verb    pos字段直接用
gender            n.m.→m, n.f.→f          gender字段直接用
example_sentence  cont-exam-fr + trans    无
forms             无                       forms字段
```

---

## 四、假朋友词专项处理

**定义**: 法语和英语拼写相同但含义不同的词

```javascript
const FALSE_FRIENDS = {
  'pet':     { correct: ['屁'],          wrong: ['宠物', '爱抚'] },
  'pain':    { correct: ['面包'],        wrong: ['痛苦', '疼痛'] },
  'chair':   { correct: ['肉', '肌肉'],  wrong: ['椅子'] },
  'journal': { correct: ['报纸'],        wrong: ['日记'] },  // 报纸是主要含义
  'coin':    { correct: ['角', '角落'],  wrong: ['硬币'] },
  'blessé':  { correct: ['伤'],          wrong: ['祝福'] },
  'librairie': { correct: ['书店'],      wrong: ['图书馆'] },
  'tache':   { correct: ['污渍'],        wrong: ['任务'] },
  'demander': { correct: ['问', '请求'], wrong: ['要求'] },
  'actuel':  { correct: ['当前', '目前'], wrong: ['实际'] }
};
```

**验证规则**: 提取后必须检查这些词，确保释义包含正确关键词，不包含错误关键词。

---

## 五、执行流程

### 阶段1: 数据探查 (必须先做)
```
1.1 MDX结构探查
├── 抽取100个不同类型词的HTML
├── 识别所有HTML模板变体
├── 统计各字段出现频率
└── 识别异常/边界情况

1.2 中文维基结构探查
├── 分析所有字段类型
├── 统计字段填充率
├── 识别数据质量异常
└── 分析forms字段结构

1.3 原始数据需求分析
├── 当前数据库有哪些字段
├── 哪些字段需要填充/修正
└── 目标数据结构定义
```

### 阶段2: 提取代码开发
```
2.1 MDX解析器
├── HTML解析函数
├── 字段提取函数
└── 异常处理

2.2 中文维基解析器
├── JSON解析函数
├── 字段提取函数
└── 异常处理

2.3 合并逻辑
├── 优先级处理
├── 冲突处理
└── 去重逻辑
```

### 阶段3: 验证
```
3.1 自动化验证
├── 字段完整性检查
├── 格式正确性检查
├── 假朋友词专项检查

3.2 抽样验证
├── 随机抽取500词
├── 分层抽样 (按词性/覆盖率)
└── 人工审核

3.3 回归对比
├── 与原始数据对比
├── 检查数据丢失
└── 检查数据退化
```

---

## 六、验证标准

| 指标 | 阈值 | 说明 |
|------|------|------|
| 总覆盖率 | ≥90% | 至少90%的词有新释义 |
| 释义填充率 | ≥95% | 有释义的词占比 |
| 音标填充率 | ≥80% | 有音标的词占比 |
| 词性填充率 | ≥90% | 有词性的词占比 |
| 假朋友词正确率 | **100%** | 所有关键词必须正确 |
| 格式错误率 | ≤1% | 音标/词性格式错误 |
| 抽样人工通过率 | ≥98% | 人工检查通过率 |

**不通过则**: 不发布，继续优化

---

## 七、输出数据结构

```typescript
interface ExtractedWord {
  word: string;
  definition: string;           // 主要释义
  definitions?: string[];       // 多义项 (可选)
  phonetic?: string;            // 音标 [xxx]
  part_of_speech: string;       // noun/verb/adjective等
  gender?: 'm' | 'f' | 'mf';   // 性别 (名词)
  example_sentence?: string;    // 例句
  examples?: Array<{            // 多例句 (可选)
    fr: string;
    zh: string;
  }>;
  forms?: Array<{               // 变位形式 (可选)
    form: string;
    tags: string[];
  }>;
  source: 'mdx' | 'zhwikt' | 'both' | 'original';
  confidence: number;           // 置信度 0-100
}
```

---

## 八、风险与回滚

### 8.1 风险点
- MDX解析可能遗漏变体结构
- 中文维基释义可能不准确
- 合并逻辑可能产生冲突

### 8.2 回滚策略
1. 提取前备份数据库
2. 在测试环境先执行
3. 验证通过才发布
4. 保留原始数据作为 fallback
5. 发现问题可立即回滚

---

## 九、下一步行动

- [ ] **阶段1**: 数据探查（MDX结构变体、中文维基字段分布）
- [ ] **阶段2**: 编写MDX解析器
- [ ] **阶段3**: 编写中文维基解析器
- [ ] **阶段4**: 编写合并逻辑
- [ ] **阶段5**: 执行验证
- [ ] **阶段6**: 人工审核
- [ ] **阶段7**: 发布

---

## 十、相关文件

| 文件 | 用途 |
|------|------|
| `temp/dict_analysis_report.json` | 词典结构分析报告 |
| `temp/coverage_gap_analysis.json` | 覆盖率缺口分析 |
| `temp/mdx_sample_pain.html` | MDX样本HTML |
| `scripts/rollback_ai_fixes.py` | 回滚脚本 (已执行) |
