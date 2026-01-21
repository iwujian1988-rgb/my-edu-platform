#!/usr/bin/env python3
"""
生成最终统计报告
"""

import json
from pathlib import Path
from collections import defaultdict
from datetime import datetime

BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
MASTER_POOL_PATH = BASE_DIR / "src/assets/data/master_words_pool.json"
REPORT_PATH = BASE_DIR / "src/assets/data/master_pool_final_report.json"

def generate_comprehensive_report():
    """生成综合报告"""
    print("="*80)
    print(" "*20 + "MASTER WORDS POOL - FINAL REPORT")
    print("="*80)

    # 加载数据
    with open(MASTER_POOL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    words = data.get("words", [])
    meta = data.get("meta", {})

    total = len(words)

    # 1. A-Z 分布
    az_dist = defaultdict(int)
    for word_entry in words:
        word = word_entry.get("word", "")
        if word:
            first_char = word[0].upper()
            if first_char.isalpha():
                az_dist[first_char] += 1
            else:
                az_dist["Other"] += 1

    # 2. 质量分析
    quality_stats = {
        "complete": 0,  # 有完整中英文例句
        "partial": 0,   # 仅有英文例句
        "pending": 0    # 无例句
    }

    for word_entry in words:
        definitions = word_entry.get("definitions", [])
        if not definitions:
            quality_stats["pending"] += 1
            continue

        examples = definitions[0].get("examples", [])
        if not examples:
            quality_stats["pending"] += 1
            continue

        first_example = examples[0]
        has_en = bool(first_example.get("sentence_en", "").strip())
        has_cn = bool(first_example.get("sentence_cn", "").strip())

        if has_en and has_cn:
            quality_stats["complete"] += 1
        elif has_en:
            quality_stats["partial"] += 1
        else:
            quality_stats["pending"] += 1

    # 3. 音标覆盖率
    has_phonetic = 0
    for word_entry in words:
        phonetic = word_entry.get("phonetic", {})
        if phonetic and (phonetic.get("kk") or phonetic.get("mw") or phonetic.get("ipa")):
            has_phonetic += 1

    # 4. 词源和构词信息
    has_word_formation = sum(1 for w in words if w.get("word_formation"))

    # 打印报告
    print(f"\n{'='*80}")
    print("OVERVIEW")
    print(f"{'='*80}")
    print(f"Total Words: {total:,}")
    print(f"Schema Version: {meta.get('schema_version', 'N/A')}")
    print(f"Last Updated: {meta.get('last_updated', 'N/A')}")
    print(f"Total Sources: {meta.get('total_sources', 'N/A')}")

    print(f"\n{'='*80}")
    print("A-Z DISTRIBUTION")
    print(f"{'='*80}")

    for letter in sorted(az_dist.keys()):
        count = az_dist[letter]
        bar = "█" * (count // 10)
        print(f"  {letter:3s}: {count:4d} {bar}")

    print(f"\n{'='*80}")
    print("QUALITY ANALYSIS")
    print(f"{'='*80}")
    print(f"  Complete (EN + CN examples): {quality_stats['complete']:5d} ({quality_stats['complete']/total*100:5.1f}%)")
    print(f"  Partial (EN only):           {quality_stats['partial']:5d} ({quality_stats['partial']/total*100:5.1f}%)")
    print(f"  Pending (No examples):       {quality_stats['pending']:5d} ({quality_stats['pending']/total*100:5.1f}%)")

    print(f"\n{'='*80}")
    print("COVERAGE ANALYSIS")
    print(f"{'='*80}")
    print(f"  Phonetic Coverage: {has_phonetic:5d} ({has_phonetic/total*100:5.1f}%)")
    print(f"  Word Formation Info: {has_word_formation:5d} ({has_word_formation/total*100:5.1f}%)")

    print(f"\n{'='*80}")
    print("VOCABULARY SOURCES (Detected from metadata)")
    print(f"{'='*80}")

    # 尝试从历史记录中提取源信息
    if "batch_import_history" in meta:
        print(f"  Batch imports completed: {len(meta['batch_import_history'])}")
        for import_record in meta.get("batch_import_history", [])[-3:]:  # 最近3次
            date = import_record.get("date", "")[:10]
            added = import_record.get("new_words_added", 0)
            print(f"    - {date}: +{added} words")

    print(f"\n{'='*80}")
    print("NEXT STEPS RECOMMENDED")
    print(f"{'='*80}")
    print(f"  1. Generate 2026-style examples for {quality_stats['pending']:,} pending words")
    print(f"  2. Add Chinese translations for {quality_stats['partial']:,} partial words")
    print(f"  3. Fill missing phonetics for {total - has_phonetic:,} words")
    print(f"  4. Add word formation/etymology info")
    print(f"  5. Quality review and validation")

    # 保存报告
    report = {
        "generated_at": datetime.now().isoformat(),
        "total_words": total,
        "az_distribution": dict(sorted(az_dist.items())),
        "quality_analysis": quality_stats,
        "coverage": {
            "phonetic": {
                "count": has_phonetic,
                "percentage": has_phonetic / total * 100
            },
            "word_formation": {
                "count": has_word_formation,
                "percentage": has_word_formation / total * 100
            }
        },
        "metadata": {
            "schema_version": meta.get("schema_version"),
            "last_updated": meta.get("last_updated"),
            "total_sources": meta.get("total_sources")
        }
    }

    with open(REPORT_PATH, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n{'='*80}")
    print(f"Report saved to: {REPORT_PATH.name}")
    print(f"{'='*80}\n")

if __name__ == "__main__":
    generate_comprehensive_report()
