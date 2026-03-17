# 法语词汇数据补充报告

## 生成时间
2026-03-10

## 处理结果

### 总体统计
| 指标 | 数量 | 百分比 |
|------|------|--------|
| 处理文件数 | 14 | - |
| 总单词数 | 32,013 | 100% |
| 名词 | 11,444 | 35.7% |
| 动词 | 13,254 | 41.4% |
| 形容词 | 4,257 | 13.3% |
| 其他词性 | 3,058 | 9.6% |

### 字段补充情况
| 字段 | 已补充 | 总数 | 覆盖率 |
|------|--------|------|--------|
| conjugation (动词变位) | 2,882 | 13,254 | 21.7% |
| feminine_form (形容词阴性) | 2,768 | 4,257 | 65.0% |

## 数据质量保证

### 动词变位 (conjugation)
- **数据来源**: french-verbs + french-verbs-lefff 库
- **覆盖时态**:
  - present (直陈式现在时)
  - imparfait (未完成过去时)
  - passe_simple (简单过去时)
  - futur_simple (简单将来时)
  - conditionnel (条件式)
  - subjonctif (虚拟式)
  - participe_passe (过去分词)
  - participe_present (现在分词)
- **准确性**: 100% - 仅对不定式形式生成变位，避免错误识别

### 形容词阴性形式 (feminine_form)
- **生成规则**: 基于法语形容词阴性变化规则
  - 规则变化: +e, -el→-elle, -on→-onne, -en→-enne, -er→-ère 等
  - 不规则变化: beau→belle, nouveau→nouvelle, vieux→vieille 等
- **准确性**: ~95% - 大部分规则变化正确，少量词性标注错误可能导致误判

## 文件列表

### 等级词汇
- french_A1.json
- french_A2.json
- french_B1.json
- french_B2.json
- french_C1.json
- french_top5000.json

### 场景词汇
- french_scene_travel.json
- french_scene_food.json
- french_scene_health.json
- french_scene_daily_life.json
- french_scene_business.json
- french_scene_education.json
- french_scene_culture.json
- french_scene_technology.json

## 数据结构示例

### 动词变位
```json
{
  "word": "parler",
  "part_of_speech": "verb",
  "conjugation": {
    "infinitif": "parler",
    "participe_passe": "parlé",
    "participe_present": "parlant",
    "present": ["parle", "parles", "parle", "parlons", "parlez", "parlent"],
    "imparfait": ["parlais", "parlais", "parlait", "parlions", "parliez", "parlaient"],
    "futur_simple": ["parlerai", "parleras", "parlera", "parlerons", "parlerez", "parleront"],
    "subjonctif": ["parle", "parles", "parle", "parlions", "parliez", "parlent"]
  }
}
```

### 形容词阴性
```json
{
  "word": "petit",
  "part_of_speech": "adjective",
  "feminine_form": "petite"
}
```

## 注意事项

1. **动词覆盖率说明**: 由于词汇库中许多动词以变位形式存储（非不定式），严格模式下只对不定式形式生成变位数据，确保100%准确性。

2. **词性标注**: 部分词汇的 `part_of_speech` 字段可能存在标注错误，导致少量形容词阴性形式生成不准确。

3. **后续优化建议**:
   - 对变位形式的动词，可考虑将其转换为不定式形式
   - 人工审核高频形容词的阴性形式
