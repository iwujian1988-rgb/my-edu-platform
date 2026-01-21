#!/usr/bin/env python3
"""
批量导入脚本：将 CET4/6、雅思、托福词汇全量导入 master_words_pool.json
策略：
1. 保留字段：word, phonetic, part_of_speech, meaning
2. 占位字段：example 和 translation 暂时填充为 "TODO: 2026_Processing"
3. 根据来源自动添加 tags
4. 去重合并：已存在的单词不覆盖
"""

import json
import os
from datetime import datetime
from collections import defaultdict
from pathlib import Path

# 配置
BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
MASTER_POOL_PATH = BASE_DIR / "src/assets/data/master_words_pool.json"
BACKUP_DIR = BASE_DIR / "src/assets/data"

# 源文件配置
SOURCE_FILES = {
    "CET4": {
        "path": BASE_DIR / "src/assets/data/cet4_words.json",
        "tags": ["CET4"]
    },
    "CET6": {
        "path": BASE_DIR / "src/assets/data/cet6_words.json",
        "tags": ["CET6"]
    },
    "IELTS": {
        "path": BASE_DIR / "src/assets/data/ielts_words.json",
        "tags": ["IELTS"]
    },
    "TOEFL": {
        "path": BASE_DIR / "src/assets/data/toefl_words.json",
        "tags": ["TOEFL"]
    }
}


def backup_master_pool():
    """备份 master_words_pool.json"""
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_path = BACKUP_DIR / f"master_words_pool_backup_before_batch_import_{timestamp}.json"

    with open(MASTER_POOL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    with open(backup_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"[OK] Backed up to: {backup_path.name}")
    return backup_path.name


def parse_tags_from_tag_field(tag_field: str) -> list:
    """从旧格式的 tag 字段解析标签"""
    if not tag_field:
        return []

    tag_mapping = {
        "cet4": "CET4",
        "cet6": "CET6",
        "ielts": "IELTS",
        "toefl": "TOEFL",
        "gre": "GRE",
        "ky": "考研"
    }

    tags = []
    tag_parts = tag_field.lower().split()

    for part in tag_parts:
        if part in tag_mapping:
            tags.append(tag_mapping[part])

    return list(set(tags))  # 去重


def convert_phonetic_to_object(phonetic_str: str) -> dict:
    """将旧格式的音标字符串转换为新格式对象"""
    # 清理音标字符串
    if not phonetic_str:
        return {"kk": "", "mw": "", "ipa": ""}

    # 移除方括号
    phonetic_str = phonetic_str.strip().strip('[]').strip('/')

    return {
        "kk": phonetic_str,
        "mw": phonetic_str,
        "ipa": phonetic_str
    }


def extract_pos_from_definition(definition: str) -> list:
    """从定义中提取词性标签"""
    if not definition:
        return ["unknown"]

    # 简单的词性提取逻辑
    pos_patterns = {
        "n\\.": "noun",
        "v\\.": "verb",
        "adj\\.": "adjective",
        "adv\\.": "adverb",
        "prep\\.": "preposition",
        "conj\\.": "conjunction",
        "pron\\.": "pronoun",
        "int\\.": "interjection",
        "num\\.": "numeral",
        "art\\.": "article"
    }

    pos_list = []
    definition_lower = definition.lower()

    for pattern, pos in pos_patterns.items():
        if pattern in definition_lower:
            pos_list.append(pos)

    return pos_list if pos_list else ["unknown"]


def convert_to_master_format(old_word: dict, source_tags: list) -> dict:
    """将旧格式转换为新格式"""

    # 解析标签（优先使用源文件标签，也解析 tag 字段）
    tags = list(set(source_tags + parse_tags_from_tag_field(old_word.get("tag", ""))))

    # 生成 word_id
    word = old_word.get("word", "").strip().lower()
    word_id = f"{word}_{tags[0] if tags else 'vocab'}" if word else f"unknown_{datetime.now().timestamp()}"

    # 转换音标
    phonetic_obj = convert_phonetic_to_object(old_word.get("phonetic", ""))

    # 提取词性
    pos_list = extract_pos_from_definition(old_word.get("definition", ""))

    # 构建新格式
    new_word = {
        "word": word,
        "word_id": word_id,
        "phonetic": phonetic_obj,
        "definitions": [
            {
                "part_of_speech": pos_list[0] if pos_list else "unknown",
                "meaning_cn": old_word.get("translation", "TODO: 2026_Processing"),
                "meaning_en_simple": old_word.get("definition", "")[:200],  # 截取前200字符作为简单定义
                "meaning_en_academic": "",
                "examples": [
                    {
                        "sentence_en": "TODO: 2026_Processing",
                        "sentence_cn": "TODO: 2026_Processing",
                        "source": "pending_processing",
                        "context": "",
                        "grade_level": "",
                        "lexile_score": ""
                    }
                ],
                "tags": tags,
                "frequency": {
                    "collins": old_word.get("collins", ""),
                    "oxford": old_word.get("oxford", ""),
                    "bnc": old_word.get("bnc", ""),
                    "frq": old_word.get("frq", "")
                }
            }
        ],
        "metadata": {
            "sources": tags,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
            "quality_flag": "pending_batch_import"
        }
    }

    return new_word


def load_existing_words():
    """加载现有词汇库"""
    with open(MASTER_POOL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 创建单词索引
    existing_words = {}
    for word_entry in data.get("words", []):
        word = word_entry.get("word", "").lower().strip()
        if word:
            existing_words[word] = word_entry

    return existing_words, data


def import_vocab_source(source_name: str, source_config: dict, existing_words: dict) -> tuple:
    """导入单个词汇源"""
    source_path = source_config["path"]
    tags = source_config["tags"]

    print(f"\n{'='*60}")
    print(f"Processing: {source_name}")
    print(f"Path: {source_path}")
    print(f"Tags: {tags}")
    print(f"{'='*60}")

    if not source_path.exists():
        print(f"[X] File not found, skipping: {source_path}")
        return 0, 0, []

    with open(source_path, 'r', encoding='utf-8') as f:
        source_words = json.load(f)

    total = len(source_words)
    added = 0
    skipped = 0
    new_words = []

    for i, old_word in enumerate(source_words):
        if (i + 1) % 500 == 0:
            print(f"  Progress: {i+1}/{total} ({(i+1)/total*100:.1f}%)")

        word = old_word.get("word", "").strip().lower()

        if not word:
            continue

        # 检查是否已存在
        if word in existing_words:
            skipped += 1
            continue

        # 转换并添加
        new_word = convert_to_master_format(old_word, tags)
        new_words.append(new_word)
        existing_words[word] = new_word  # 更新索引
        added += 1

    print(f"\n[OK] {source_name} completed:")
    print(f"  - Total: {total}")
    print(f"  - Added: {added}")
    print(f"  - Skipped (existing): {skipped}")

    return total, added, new_words


def generate_statistics(all_words: list) -> dict:
    """生成统计报告"""
    total = len(all_words)

    # A-Z 分布
    distribution = defaultdict(int)
    for word_entry in all_words:
        word = word_entry.get("word", "")
        if word:
            first_char = word[0].upper()
            if first_char.isalpha():
                distribution[first_char] += 1
            else:
                distribution["其他"] += 1

    # 标签统计
    tag_stats = defaultdict(int)
    for word_entry in all_words:
        for definition in word_entry.get("definitions", []):
            for tag in definition.get("tags", []):
                tag_stats[tag] += 1

    return {
        "total_words": total,
        "az_distribution": dict(sorted(distribution.items())),
        "tag_statistics": dict(sorted(tag_stats.items())),
        "generated_at": datetime.now().isoformat()
    }


def main():
    print("="*60)
    print("Batch Import: CET4/6 + IELTS + TOEFL -> Master Pool")
    print("="*60)

    # 1. 备份
    print("\n[Step 1/4] Backing up existing data...")
    backup_name = backup_master_pool()

    # 2. 加载现有数据
    print("\n[Step 2/4] Loading existing vocabulary...")
    existing_words, master_data = load_existing_words()
    initial_count = len(existing_words)
    print(f"[OK] Existing words: {initial_count}")

    # 3. 批量导入
    print("\n[Step 3/4] Importing vocabulary sources...")
    all_new_words = []
    import_summary = {}

    for source_name, config in SOURCE_FILES.items():
        total, added, new_words = import_vocab_source(source_name, config, existing_words)
        import_summary[source_name] = {
            "total": total,
            "added": added,
            "skipped": total - added
        }
        all_new_words.extend(new_words)

    # 4. 保存并生成统计
    print("\n[Step 4/4] Saving data and generating statistics...")

    # 合并新旧词汇
    all_words = list(existing_words.values())

    # 更新 master 数据
    master_data["words"] = all_words
    master_data["meta"]["last_updated"] = datetime.now().isoformat()
    master_data["meta"]["total_sources"] = len(SOURCE_FILES)

    if "batch_import_history" not in master_data["meta"]:
        master_data["meta"]["batch_import_history"] = []

    master_data["meta"]["batch_import_history"].append({
        "date": datetime.now().isoformat(),
        "backup_file": backup_name,
        "initial_count": initial_count,
        "final_count": len(all_words),
        "new_words_added": len(all_words) - initial_count,
        "import_summary": import_summary
    })

    # 保存
    with open(MASTER_POOL_PATH, 'w', encoding='utf-8') as f:
        json.dump(master_data, f, ensure_ascii=False, indent=2)

    # 生成统计
    stats = generate_statistics(all_words)

    # 保存统计报告
    stats_path = BACKUP_DIR / "batch_import_statistics.json"
    with open(stats_path, 'w', encoding='utf-8') as f:
        json.dump(stats, f, ensure_ascii=False, indent=2)

    # 打印报告
    print("\n" + "="*60)
    print("IMPORT COMPLETED - Statistics Report")
    print("="*60)

    print(f"\n[Overall Statistics]")
    print(f"  Before import: {initial_count}")
    print(f"  After import: {stats['total_words']}")
    print(f"  New words added: {stats['total_words'] - initial_count}")

    print(f"\n[Source Details]")
    for source, summary in import_summary.items():
        print(f"  {source}:")
        print(f"    - Total: {summary['total']}")
        print(f"    - Added: {summary['added']}")
        print(f"    - Skipped: {summary['skipped']}")

    print(f"\n[A-Z Distribution]")
    for letter, count in stats['az_distribution'].items():
        print(f"  {letter}: {count}")

    print(f"\n[Tag Statistics]")
    for tag, count in stats['tag_statistics'].items():
        print(f"  {tag}: {count}")

    print(f"\n[OK] Statistics saved: {stats_path.name}")
    print(f"[OK] Master Pool updated: {MASTER_POOL_PATH.name}")
    print("\n" + "="*60)


if __name__ == "__main__":
    main()
