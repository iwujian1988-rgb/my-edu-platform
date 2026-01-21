#!/usr/bin/env python3
"""
分析 master_words_pool.json 的词汇质量分布
"""

import json
from pathlib import Path
from collections import defaultdict

BASE_DIR = Path("D:/CodeWorld/Claude/英语网站单词库项目")
MASTER_POOL_PATH = BASE_DIR / "src/assets/data/master_words_pool.json"

def analyze_word_quality(word_entry):
    """分析单个词汇的质量"""
    word = word_entry.get("word", "")
    definitions = word_entry.get("definitions", [])

    if not definitions:
        return "no_definitions"

    # 检查第一个定义的例句
    examples = definitions[0].get("examples", [])

    if not examples:
        return "no_examples"

    first_example = examples[0]
    sentence_en = first_example.get("sentence_en", "")
    sentence_cn = first_example.get("sentence_cn", "")

    # 检查是否为占位符
    if "TODO" in sentence_en or "TODO" in sentence_cn:
        return "placeholder"

    # 检查是否有中英文例句
    has_en = bool(sentence_en and sentence_en.strip())
    has_cn = bool(sentence_cn and sentence_cn.strip())

    if has_en and has_cn:
        return "complete"
    elif has_en:
        return "english_only"
    elif has_cn:
        return "chinese_only"
    else:
        return "empty_examples"

def main():
    print("="*60)
    print("Master Pool Quality Analysis")
    print("="*60)

    # 加载数据
    with open(MASTER_POOL_PATH, 'r', encoding='utf-8') as f:
        data = json.load(f)

    words = data.get("words", [])
    total = len(words)

    # 统计质量分布
    quality_stats = defaultdict(int)
    quality_samples = defaultdict(list)

    for word_entry in words:
        word = word_entry.get("word", "")
        quality = analyze_word_quality(word_entry)
        quality_stats[quality] += 1

        # 收集样本（每个类别最多5个）
        if len(quality_samples[quality]) < 5:
            quality_samples[quality].append(word)

    # 打印报告
    print(f"\nTotal Words: {total}\n")
    print("="*60)
    print("Quality Distribution")
    print("="*60)

    # 定义质量顺序
    quality_order = [
        ("complete", "Complete (EN + CN examples)"),
        ("english_only", "English Only"),
        ("chinese_only", "Chinese Only"),
        ("placeholder", "Placeholder (TODO)"),
        ("no_examples", "No Examples"),
        ("no_definitions", "No Definitions"),
        ("empty_examples", "Empty Examples")
    ]

    for key, label in quality_order:
        count = quality_stats.get(key, 0)
        percentage = (count / total * 100) if total > 0 else 0
        print(f"\n{label}:")
        print(f"  Count: {count}")
        print(f"  Percentage: {percentage:.1f}%")

        if quality_samples[key]:
            print(f"  Samples: {', '.join(quality_samples[key])}")

    # 统计待处理的词汇
    pending_keys = ["placeholder", "no_examples", "no_definitions", "empty_examples"]
    pending_total = sum(quality_stats.get(k, 0) for k in pending_keys)
    complete_total = quality_stats.get("complete", 0)

    print("\n" + "="*60)
    print("Summary")
    print("="*60)
    print(f"High Quality (Complete): {complete_total} ({complete_total/total*100:.1f}%)")
    print(f"Pending Processing: {pending_total} ({pending_total/total*100:.1f}%)")
    print(f"Total: {total}")
    print("="*60)

if __name__ == "__main__":
    main()
