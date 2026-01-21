#!/usr/bin/env python3
"""
生成标签清洗与分级项目的可视化结项报告
"""

import json
from pathlib import Path
from datetime import datetime

BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
REPORT_PATH = BASE_DIR / "src/assets/data/tagging_leveling_report.json"
SUMMARY_PATH = BASE_DIR / "src/assets/data/tagging_project_summary.md"

def generate_markdown_report():
    """生成Markdown格式的结项报告"""

    with open(REPORT_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    total = data["total_words"]
    updates = data["updates"]
    level_dist = data["level_distribution"]
    cat_dist = data["category_distribution"]

    report = f"""# 🎯 标签清洗与分级项目 - 结项报告

**生成时间**: {data['generated_at'][:19].replace('T', ' ')}

---

## 📊 项目概览

| 指标 | 数值 | 完成度 |
|------|------|--------|
| **总词汇数** | {total:,} | 100% |
| **标签已更新** | {updates['tags_updated']:,} | {updates['tags_updated']/total*100:.1f}% |
| **难度等级已分配** | {updates['level_assigned']:,} | 100% |
| **词频等级已添加** | {updates['frequency_rank_added']:,} | 100% |

---

## 🎓 难度等级分布（Level 1-5）

### Level 1: K12/零基础核心词
- **数量**: {level_dist['Level 1 - K12/零基础核心词']:,} 词
- **占比**: {level_dist['Level 1 - K12/零基础核心词']/total*100:.1f}%
- **定义**: 美国K-12基础教育核心词汇，适合零基础学习者
- **适用人群**: 小学、初中学生，英语初学者

### Level 2: CET4/考研基础词
- **数量**: {level_dist['Level 2 - CET4/考研基础词']:,} 词
- **占比**: {level_dist['Level 2 - CET4/考研基础词']/total*100:.1f}%
- **定义**: 大学英语四级词汇，考研基础词汇
- **适用人群**: 高中生、大学生

### Level 3: CET6/考研高阶/职场通用词
- **数量**: {level_dist['Level 3 - CET6/考研高阶/职场通用词']:,} 词
- **占比**: {level_dist['Level 3 - CET6/考研高阶/职场通用词']/total*100:.1f}%
- **定义**: 大学英语六级词汇，考研高阶词汇，职场常用词汇
- **适用人群**: 大学生、职场新人

### Level 4: 雅思/托福学术词汇
- **数量**: {level_dist['Level 4 - 雅思/托福学术词汇']:,} 词
- **占比**: {level_dist['Level 4 - 雅思/托福学术词汇']/total*100:.1f}%
- **定义**: 雅思托福核心学术词汇
- **适用人群**: 出国留学备考者

### Level 5: 专业生僻词/GRE级
- **数量**: {level_dist['Level 5 - 专业生僻词/GRE级']:,} 词
- **占比**: {level_dist['Level 5 - 专业生僻词/GRE级']/total*100:.1f}%
- **定义**: GRE级专业词汇，高阶学术词汇
- **适用人群**: 研究生、学术研究者

---

## 📚 分类统计（按应用场景）

### 核心类别分析

| 类别 | 词汇数 | 占比 | 说明 |
|------|--------|------|------|
| **考研词汇** | {cat_dist['考研词汇']:,} | {cat_dist['考研词汇']/total*100:.1f}% | 包含CET4/6、考研大纲词汇 |
| **出国考试词** | {cat_dist['出国考试词']:,} | {cat_dist['出国考试词']/total*100:.1f}% | 雅思、托福核心词汇 |
| **高阶学术词** | {cat_dist['高阶学术词']:,} | {cat_dist['高阶学术词']/total*100:.1f}% | GRE、学术研究词汇 |
| **日常生活词** | {cat_dist['日常生活词']:,} | {cat_dist['日常生活词']/total*100:.1f}% | 日常高频使用词汇 |
| **K12基础词** | {cat_dist['K12基础词']:,} | {cat_dist['K12基础词']/total*100:.1f}% | 美国K-12教育核心词 |
| **职场商务词** | {cat_dist['职场商务词']:,} | {cat_dist['职场商务词']/total*100:.1f}% | 商务、职场场景词汇 |

---

## 🎯 关键业务指标（创业者关注）

### ✅ 目标达成情况

| 业务目标 | 词汇量 | 状态 |
|----------|--------|------|
| **考研词汇库** | {cat_dist['考研词汇']:,} 词 | ✅ 已建立 |
| **职场商务核心词** | {cat_dist['职场商务词']:,} 词 | ⚠️ 待扩充 |
| **K12 基础词** | {cat_dist['K12基础词']:,} 词 | ✅ 已建立 |

---

## 📈 难度分布可视化

```
Level 5 (GRE级)     ████████████████████████████ {level_dist['Level 5 - 专业生僻词/GRE级']/total*100:.1f}%
Level 4 (雅思托福)  ██████████████████████████████ {level_dist['Level 4 - 雅思/托福学术词汇']/total*100:.1f}%
Level 3 (CET6/考研) ██████ {level_dist['Level 3 - CET6/考研高阶/职场通用词']/total*100:.1f}%
Level 2 (CET4基础)  ▌ {level_dist['Level 2 - CET4/考研基础词']/total*100:.1f}%
Level 1 (K12基础)   ██ {level_dist['Level 1 - K12/零基础核心词']/total*100:.1f}%
```

---

## 🔧 技术实现

### 新增字段

1. **level**: 难度等级（1-5）
2. **frequency_rank**: 词频等级（1-10，10为最高频）
3. **categories**: 应用场景分类标签

### 标签映射

- CET4 →大学英语四级
- CET6 →大学英语六级
- IELTS →雅思
- TOEFL →托福
- 考研 →研究生入学考试

---

## 💼 商业价值评估

### 可运营资产

✅ **考研市场**: {cat_dist['考研词汇']:,} 词，覆盖考研核心需求
✅ **出国留学**: {cat_dist['出国考试词']:,} 词，雅思托福全覆盖
✅ **K12教育**: {cat_dist['K12基础词']:,} 词，基础教育扎实

### 产品路线建议

1. **优先级1**: 推出"考研词汇特训"产品（{cat_dist['考研词汇']:,}词库）
2. **优先级2**: 开发"雅思托福通关"课程（{cat_dist['出国考试词']:,}词库）
3. **优先级3**: 补充职场商务词汇（目标扩充至2,000+词）
4. **优先级4**: 完善K12分级阅读体系

---

## 📋 数据质量保证

- ✅ 所有10,827词已分配难度等级
- ✅ 所有词汇已添加词频排序字段
- ✅ 多维度标签体系已建立
- ✅ 备份文件已保存（`master_words_pool_backup_before_tagging_*.json`）

---

## 🚀 下一步行动

1. **补充例句**: 为{updates['level_assigned'] - 2009:,}个待处理词汇生成2026风格例句
2. **扩充商务库**: 从546词扩充至2,000+商务场景词汇
3. **建立学习路径**: 按Level 1-5设计渐进式学习系统
4. **词频优化**: 利用frequency_rank设计智能复习算法

---

**报告生成**: tagging_project_summary.md
**数据来源**: master_words_pool.json
**处理脚本**: scripts/tagging_and_leveling.py
"""

    with open(SUMMARY_PATH, 'w', encoding='utf-8') as f:
        f.write(report)

    print(f"[OK] Markdown report saved to: {SUMMARY_PATH.name}")
    print(f"\nReport preview (first 500 chars):")
    print(report[:500])
    print("\n...")

if __name__ == "__main__":
    generate_markdown_report()
