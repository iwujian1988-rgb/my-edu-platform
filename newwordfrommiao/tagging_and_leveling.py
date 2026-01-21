#!/usr/bin/env python3
"""
标签清洗与分级脚本 - Tagging & Leveling System

功能：
1. 多维度打标（CET4/6、考研、雅思、托福）
2. 建立难度系数（Level 1-5）
3. 添加词频排序字段
4. 修复缺少中文翻译的条目
5. 生成分类统计报告
"""

import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# 配置
BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
MASTER_POOL_PATH = BASE_DIR / "src/assets/data/master_words_pool.json"
BACKUP_DIR = BASE_DIR / "src/assets/data"

# 原始词汇源文件
SOURCE_FILES = {
    "CET4": BASE_DIR / "src/assets/data/cet4_words.json",
    "CET6": BASE_DIR / "src/assets/data/cet6_words.json",
    "IELTS": BASE_DIR / "src/assets/data/ielts_words.json",
    "TOEFL": BASE_DIR / "src/assets/data/toefl_words.json"
}

# 标签映射：原始tag -> 标准标签
TAG_MAPPING = {
    "cet4": "CET4",
    "cet6": "CET6",
    "ielts": "IELTS",
    "toefl": "TOEFL",
    "gre": "GRE",
    "ky": "考研",  # 考研
    "zk": "中考",  # 中考
    "gk": "高考"   # 高考
}

# 难度分级规则
LEVEL_RULES = {
    1: {
        "name": "K12/零基础核心词",
        "tags": ["sight_word", "k12", "dolch", "fry", "grade1", "grade2", "grade3"],
        "sources": ["中考"],
        "description": "美国K-12基础教育核心词汇，适合零基础学习者"
    },
    2: {
        "name": "CET4/考研基础词",
        "tags": ["CET4", "高考"],
        "description": "大学英语四级词汇，考研基础词汇"
    },
    3: {
        "name": "CET6/考研高阶/职场通用词",
        "tags": ["CET6", "考研"],
        "description": "大学英语六级词汇，考研高阶词汇，职场常用词汇"
    },
    4: {
        "name": "雅思/托福学术词汇",
        "tags": ["IELTS", "TOEFL"],
        "description": "雅思托福核心学术词汇"
    },
    5: {
        "name": "专业生僻词/GRE级",
        "tags": ["GRE"],
        "description": "GRE级专业词汇，高阶学术词汇"
    }
}

# 词频映射（用于frequency_rank）
FREQUENCY_MAPPING = {
    "collins": {
        "1": 5,  # 最高频
        "2": 4,
        "3": 3,
        "4": 2,
        "5": 1   # 最低频
    }
}


def backup_master_pool():
    """备份 master pool"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"master_words_pool_backup_before_tagging_{timestamp}.json"

    with open(MASTER_POOL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Backed up to: {backup_path.name}")
    return backup_path


def load_source_word_tags():
    """
    从原始词汇源文件中提取每个词的标签信息
    返回: {word_lower: [tags]}
    """
    print("\n[Loading source tags...]")
    word_tags = defaultdict(set)

    for source_name, source_path in SOURCE_FILES.items():
        if not source_path.exists():
            print(f"  [!] Source not found: {source_name}")
            continue

        print(f"  [*] Loading {source_name}...")

        with open(source_path, 'r', encoding='utf-8') as f:
            source_words = json.load(f)

        for word_entry in source_words:
            word = word_entry.get("word", "").strip().lower()
            if not word:
                continue

            # 解析tag字段
            raw_tags = word_entry.get("tag", "").lower().split()

            # 添加来源标签
            word_tags[word].add(source_name)

            # 解析并添加所有标签
            for raw_tag in raw_tags:
                if raw_tag in TAG_MAPPING:
                    word_tags[word].add(TAG_MAPPING[raw_tag])

    print(f"[OK] Loaded tags for {len(word_tags)} words")
    return word_tags


def calculate_level(tags, sources):
    """
    根据标签和来源计算难度等级
    返回: level (1-5)
    """
    tags_set = set(tags) if isinstance(tags, list) else set()
    sources_set = set(sources) if isinstance(sources, list) else set()

    # 从高到低检查
    for level in [5, 4, 3, 2, 1]:
        rule = LEVEL_RULES[level]
        required_tags = rule["tags"]

        # 检查是否匹配该等级的任一标签
        if any(tag in tags_set or tag in sources_set for tag in required_tags):
            return level

    return 2  # 默认为CET4级别


def calculate_frequency_rank(word_entry):
    """
    根据Collins星级等指标计算词频等级
    返回: frequency_rank (1-10, 10为最高频)
    """
    # 检查 definitions 中的 frequency 字段
    definitions = word_entry.get("definitions", [])
    if not definitions:
        return 5  # 默认中等频率

    freq = definitions[0].get("frequency", {})
    collins = freq.get("collins", "")

    if collins in FREQUENCY_MAPPING["collins"]:
        return FREQUENCY_MAPPING["collins"][collins] * 2  # 转换到1-10范围

    # 如果没有collins数据，检查metadata中的frequency
    metadata = word_entry.get("metadata", {})
    meta_freq = metadata.get("frequency", "").lower()

    if meta_freq == "high":
        return 9
    elif meta_freq == "medium":
        return 6
    elif meta_freq == "low":
        return 3

    return 5  # 默认中等


def fix_chinese_translation(word_entry):
    """
    修复缺少中文翻译的条目
    尝试从定义中提取中文，或使用简单翻译逻辑
    """
    definitions = word_entry.get("definitions", [])
    if not definitions:
        return word_entry

    for defn in definitions:
        examples = defn.get("examples", [])
        if not examples:
            continue

        for example in examples:
            sentence_en = example.get("sentence_en", "")
            sentence_cn = example.get("sentence_cn", "")

            # 如果已有中文翻译，跳过
            if sentence_cn and sentence_cn.strip() and "TODO" not in sentence_cn:
                continue

            # 如果是TODO占位符，尝试提取meaning_cn
            if "TODO" in sentence_en or not sentence_en.strip():
                meaning_cn = defn.get("meaning_cn", "")
                if meaning_cn and meaning_cn.strip():
                    # 使用meaning_cn作为placeholder
                    example["sentence_cn"] = f"[需要根据语境翻译: {meaning_cn[:50]}...]"

    return word_entry


def categorize_word(word_entry):
    """
    对单词进行分类（考研、职场、K12等）
    返回: category_list
    """
    tags = word_entry.get("tags", [])
    categories = []

    if isinstance(tags, list):
        tags_lower = [tag.lower() for tag in tags]
    else:
        tags_lower = []

    # K12基础词
    if any(tag in tags_lower for tag in ["k12", "sight_word", "dolch", "fry", "grade", "us_education"]):
        categories.append("K12基础词")

    # 考研词汇
    if "考研" in tags or any(tag in tags_lower for tag in ["cet4", "cet6"]):
        categories.append("考研词汇")

    # 职场商务词
    if any(tag in tags_lower for tag in ["business", "ecommerce", "workplace", "office"]):
        categories.append("职场商务词")

    # 雅思托福
    if any(tag in tags_lower for tag in ["ielts", "toefl"]):
        categories.append("出国考试词")

    # 高阶学术词
    if any(tag in tags_lower for tag in ["gre", "academic", "tier2"]):
        categories.append("高阶学术词")

    # 日常生活词
    if any(tag in tags_lower for tag in ["daily", "core", "foundation"]):
        categories.append("日常生活词")

    # 如果没有分类，默认为基础词汇
    if not categories:
        categories.append("通用词汇")

    return categories


def main():
    print("="*80)
    print(" "*20 + "TAGGING & LEVELING SYSTEM")
    print("="*80)

    # Step 1: 备份
    print("\n[Step 1/6] Backing up data...")
    backup_file = backup_master_pool()

    # Step 2: 加载数据
    print("\n[Step 2/6] Loading master pool...")
    with open(MASTER_POOL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    words = data.get("words", [])
    print(f"[OK] Loaded {len(words)} words")

    # Step 3: 加载源标签
    print("\n[Step 3/6] Loading source tags...")
    source_tags = load_source_word_tags()

    # Step 4: 处理每个词汇
    print("\n[Step 4/6] Processing words...")
    stats = {
        "total": len(words),
        "updated_tags": 0,
        "updated_level": 0,
        "updated_frequency": 0,
        "fixed_translations": 0,
        "level_distribution": defaultdict(int),
        "category_distribution": defaultdict(int)
    }

    for i, word_entry in enumerate(words):
        if (i + 1) % 1000 == 0:
            print(f"  Progress: {i+1}/{len(words)} ({(i+1)/len(words)*100:.1f}%)")

        word = word_entry.get("word", "").strip().lower()

        # 4.1 更新标签（从源文件中提取）
        if word in source_tags:
            existing_tags = word_entry.get("tags", [])
            if isinstance(existing_tags, list):
                new_tags = list(set(existing_tags + list(source_tags[word])))
            else:
                new_tags = list(source_tags[word])

            word_entry["tags"] = new_tags
            stats["updated_tags"] += 1

        # 4.2 计算难度等级
        tags = word_entry.get("tags", [])
        level = calculate_level(tags, [])
        word_entry["level"] = level
        stats["level_distribution"][level] += 1
        stats["updated_level"] += 1

        # 4.3 计算词频等级
        freq_rank = calculate_frequency_rank(word_entry)
        word_entry["frequency_rank"] = freq_rank
        stats["updated_frequency"] += 1

        # 4.4 修复中文翻译
        word_entry = fix_chinese_translation(word_entry)

        # 4.5 添加分类标签
        categories = categorize_word(word_entry)
        word_entry["categories"] = categories
        for cat in categories:
            stats["category_distribution"][cat] += 1

    print(f"\n[OK] Processing completed")

    # Step 5: 保存数据
    print("\n[Step 5/6] Saving data...")
    data["words"] = words
    data["meta"]["last_updated"] = datetime.now().isoformat()
    data["meta"]["tagging_completed"] = True

    if "processing_history" not in data["meta"]:
        data["meta"]["processing_history"] = []

    data["meta"]["processing_history"].append({
        "date": datetime.now().isoformat(),
        "operation": "tagging_and_leveling",
        "backup_file": str(backup_file),
        "stats": {
            "updated_tags": stats["updated_tags"],
            "updated_level": stats["updated_level"],
            "updated_frequency": stats["updated_frequency"]
        }
    })

    with open(MASTER_POOL_PATH, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Data saved")

    # Step 6: 生成报告
    print("\n[Step 6/6] Generating report...")

    report = {
        "generated_at": datetime.now().isoformat(),
        "total_words": stats["total"],
        "updates": {
            "tags_updated": stats["updated_tags"],
            "level_assigned": stats["updated_level"],
            "frequency_rank_added": stats["updated_frequency"]
        },
        "level_distribution": {
            f"Level {k} - {LEVEL_RULES[k]['name']}": v
            for k, v in sorted(stats["level_distribution"].items())
        },
        "category_distribution": dict(stats["category_distribution"])
    }

    # 保存报告
    report_path = BACKUP_DIR / "tagging_leveling_report.json"
    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    # 打印报告
    print("\n" + "="*80)
    print(" "*25 + "TAGGING COMPLETED - REPORT")
    print("="*80)

    print(f"\n[Overall Statistics]")
    print(f"  Total Words: {stats['total']:,}")
    print(f"  Tags Updated: {stats['updated_tags']:,}")
    print(f"  Levels Assigned: {stats['updated_level']:,}")
    print(f"  Frequency Ranks Added: {stats['updated_frequency']:,}")

    print(f"\n[Level Distribution]")
    for level in sorted(stats["level_distribution"].keys()):
        count = stats["level_distribution"][level]
        percentage = count / stats["total"] * 100
        rule = LEVEL_RULES[level]
        print(f"  Level {level} - {rule['name']}:")
        print(f"    Count: {count:,} ({percentage:.1f}%)")

    print(f"\n[Category Distribution]")
    for cat, count in sorted(stats["category_distribution"].items(),
                            key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count:,}")

    print(f"\n{'='*80}")
    print(f"Report saved to: {report_path.name}")
    print(f"{'='*80}\n")

    # 特别关注的三个类别
    print("\n[Key Metrics - Business Focus]")
    print(f"  考研词汇库: {stats['category_distribution'].get('考研词汇', 0):,} 词")
    print(f"  职场商务核心词: {stats['category_distribution'].get('职场商务词', 0):,} 词")
    print(f"  K12 基础词: {stats['category_distribution'].get('K12基础词', 0):,} 词")
    print()

    return report


if __name__ == "__main__":
    main()
