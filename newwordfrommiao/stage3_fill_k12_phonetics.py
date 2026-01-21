#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
为 US K-12 词库补充音标
1. 从现有词库匹配音标
2. 从 ECDICT 获取剩余词汇的音标
3. 保存更新后的词库
"""

import json
import csv
import sys

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_existing_words():
    """加载现有词库用于音标匹配"""
    print("[1/3] 加载现有词库...")

    existing_phonetics = {}

    files = [
        'src/assets/data/cet4_words.json',
        'src/assets/data/cet6_words.json',
        'src/assets/data/ielts_words.json',
        'src/assets/data/toefl_words.json'
    ]

    for file_path in files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                words = json.load(f)
                for w in words:
                    word_lower = w['word'].lower()
                    phonetic = w.get('phonetic', '')

                    if phonetic and word_lower not in existing_phonetics:
                        existing_phonetics[word_lower] = phonetic
        except FileNotFoundError:
            pass

    print(f"  ✓ 从现有词库提取了 {len(existing_phonetics)} 个音标")
    return existing_phonetics


def load_ecdict():
    """加载 ECDICT 用于音标匹配"""
    print("[2/3] 加载 ECDICT...")

    ecdict_phonetics = {}

    try:
        with open('ecdict.csv', 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                word = row['word'].lower()
                phonetic = row.get('phonetic', '')

                if phonetic and word not in ecdict_phonetics:
                    ecdict_phonetics[word] = phonetic

        print(f"  ✓ 从 ECDICT 提取了 {len(ecdict_phonetics)} 个音标")
    except FileNotFoundError:
        print("  ⚠ ECDICT 文件未找到")

    return ecdict_phonetics


def fill_phonetics():
    """为 K-12 词库补充音标"""
    print("[3/3] 补充 K-12 词库音标...")
    print()

    # 加载 K-12 词库
    with open('src/assets/data/us_k12_foundation.json', 'r', encoding='utf-8') as f:
        k12_words = json.load(f)

    # 加载音标源
    existing_phonetics = load_existing_words()
    ecdict_phonetics = load_ecdict()

    # 统计
    filled_from_existing = 0
    filled_from_ecdict = 0
    still_missing = []

    # 补充音标
    for word_entry in k12_words:
        word = word_entry['word']
        word_lower = word.lower()

        # 如果已有音标，跳过
        if word_entry.get('phonetic', {}).get('us'):
            continue

        # 尝试从现有词库获取
        if word_lower in existing_phonetics:
            word_entry['phonetic'] = {
                'us': existing_phonetics[word_lower],
                'uk': existing_phonetics[word_lower]  # 暂时使用相同音标
            }
            filled_from_existing += 1
            continue

        # 尝试从 ECDICT 获取
        if word_lower in ecdict_phonetics:
            word_entry['phonetic'] = {
                'us': ecdict_phonetics[word_lower],
                'uk': ecdict_phonetics[word_lower]  # 暂时使用相同音标
            }
            filled_from_ecdict += 1
            continue

        # 仍然缺失
        still_missing.append(word)

    # 保存更新后的词库
    with open('src/assets/data/us_k12_foundation.json', 'w', encoding='utf-8') as f:
        json.dump(k12_words, f, ensure_ascii=False, indent=2)

    print()
    print("="*80)
    print("音标补充结果")
    print("="*80)
    print()
    print(f"从现有词库补充: {filled_from_existing} 个")
    print(f"从 ECDICT 补充: {filled_from_ecdict} 个")
    print(f"仍然缺失: {len(still_missing)} 个")
    print(f"总覆盖率: {((len(k12_words) - len(still_missing)) / len(k12_words) * 100):.1f}%")
    print()

    if still_missing:
        print("仍然缺失音标的词汇:")
        for word in still_missing[:20]:
            print(f"  - {word}")

        if len(still_missing) > 20:
            print(f"  ... 还有 {len(still_missing) - 20} 个")

    print()
    print("✅ K-12 词库音标补充完成！")
    print("="*80)

    return {
        'total': len(k12_words),
        'filled_from_existing': filled_from_existing,
        'filled_from_ecdict': filled_from_ecdict,
        'still_missing': still_missing
    }


def main():
    """主函数"""
    print("="*80)
    print("为 US K-12 基础词库补充音标")
    print("="*80)
    print()

    result = fill_phonetics()

    # 保存补充报告
    report = {
        'fill_date': '2026-01-11',
        'total_words': result['total'],
        'filled_from_existing': result['filled_from_existing'],
        'filled_from_ecdict': result['filled_from_ecdict'],
        'still_missing': result['still_missing'],
        'coverage_rate': f"{((result['total'] - len(result['still_missing'])) / result['total'] * 100):.1f}%"
    }

    import os
    os.makedirs('src/assets/reports', exist_ok=True)

    report_file = 'src/assets/reports/k12_phonetic_fill_report.json'
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 补充报告已保存到: {report_file}")


if __name__ == "__main__":
    main()
