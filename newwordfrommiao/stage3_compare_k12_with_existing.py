#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
对比 US K-12 基础词库与现有词库
找出差异、缺失音标、需要补充的内容
"""

import json
import sys
from typing import Dict, List, Set, Tuple

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_json(file_path: str) -> List[Dict]:
    """加载 JSON 文件"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def compare_vocabularies():
    """对比 US K-12 词库与现有词库"""
    print("="*80)
    print("US K-12 词库与现有词库对比分析")
    print("="*80)
    print()

    # 1. 加载 US K-12 词库
    print("[1/3] 加载 US K-12 基础词库...")
    k12_words = load_json('src/assets/data/us_k12_foundation.json')
    print(f"  ✓ K-3 词库: {len(k12_words)} 个词汇")

    # 提取 K-12 词汇列表
    k12_word_list = {w['word'].lower(): w for w in k12_words}
    print()

    # 2. 加载现有词库
    print("[2/3] 加载现有核心词库...")
    existing_files = [
        ('src/assets/data/cet4_words.json', 'CET4'),
        ('src/assets/data/cet6_words.json', 'CET6'),
        ('src/assets/data/ielts_words.json', 'IELTS'),
        ('src/assets/data/toefl_words.json', 'TOEFL'),
    ]

    all_existing_words = {}
    for file_path, name in existing_files:
        words = load_json(file_path)
        for w in words:
            word_lower = w['word'].lower()
            if word_lower not in all_existing_words:
                all_existing_words[word_lower] = []
            all_existing_words[word_lower].append({
                'source': name,
                'phonetic': w.get('phonetic', ''),
                'translation': w.get('translation', ''),
                'definition': w.get('definition', '')
            })
        print(f"  ✓ {name}: {len(words)} 个词汇")

    print(f"\n  现有词库总计: {len(all_existing_words)} 个不重复词汇")
    print()

    # 3. 对比分析
    print("[3/3] 进行对比分析...")
    print()

    # 找出 K-12 中有但现有词库中没有的词
    only_in_k12 = []
    # 找出两边都有的词
    in_both = []
    # 找出 K-12 中缺失音标的词
    k12_missing_phonetic = []

    for word_lower, k12_entry in k12_word_list.items():
        if word_lower in all_existing_words:
            # 两边都有
            in_both.append({
                'word': k12_entry['word'],
                'existing_sources': list(set([e['source'] for e in all_existing_words[word_lower]])),
                'has_phonetic': any(e['phonetic'] for e in all_existing_words[word_lower])
            })
        else:
            # 只在 K-12 中
            only_in_k12.append(k12_entry)

        # 检查 K-12 词库是否有音标
        if not k12_entry.get('phonetic', {}).get('us'):
            k12_missing_phonetic.append(k12_entry['word'])

    # 输出结果
    print("="*80)
    print("对比结果")
    print("="*80)
    print()

    print(f"K-3 特有词汇（不在现有考试词库中）:")
    print(f"  总数: {len(only_in_k12)} 个")
    print()

    # 按类型分组
    from collections import Counter
    only_k12_by_type = Counter([w['metadata']['word_type'] for w in only_in_k12])

    for word_type, count in only_k12_by_type.items():
        print(f"  - {word_type}: {count} 个")

    print()
    print(f"共有词汇（K-3 与现有词库都包含）:")
    print(f"  总数: {len(in_both)} 个")
    print()

    print(f"K-3 词库缺失音标:")
    print(f"  总数: {len(k12_missing_phonetic)} 个")
    print()

    # 生成详细报告
    print("="*80)
    print("K-3 特有词汇详情（前30个）")
    print("="*80)
    print()

    for i, entry in enumerate(only_in_k12[:30], 1):
        word = entry['word']
        word_type = entry['metadata']['word_type']
        level = entry['metadata'].get('dolch_level', entry['metadata'].get('subject_area', 'N/A'))
        meaning = entry['definitions'][0]['meaning_en']

        print(f"{i:3}. {word:<15} [{word_type}] {level}")
        print(f"     释义: {meaning[:60]}...")
        print()

    if len(only_in_k12) > 30:
        print(f"... 还有 {len(only_in_k12) - 30} 个词汇\n")

    # 保存对比报告
    comparison_report = {
        'summary': {
            'k12_total': len(k12_words),
            'existing_total': len(all_existing_words),
            'only_in_k12': len(only_in_k12),
            'in_both': len(in_both),
            'k12_missing_phonetic': len(k12_missing_phonetic)
        },
        'only_in_k12_by_type': dict(only_k12_by_type),
        'k12_unique_words': [
            {
                'word': w['word'],
                'type': w['metadata']['word_type'],
                'level': w['metadata'].get('dolch_level', w['metadata'].get('subject_area', 'N/A')),
                'meaning': w['definitions'][0]['meaning_en'][:100]
            }
            for w in only_in_k12
        ],
        'shared_words_sample': in_both[:50]
    }

    import os
    os.makedirs('src/assets/reports', exist_ok=True)

    report_file = 'src/assets/reports/k12_comparison_report.json'
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(comparison_report, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 对比报告已保存到: {report_file}")

    # 返回关键数据
    return {
        'k12_words': k12_words,
        'existing_words': all_existing_words,
        'only_in_k12': only_in_k12,
        'k12_missing_phonetic': k12_missing_phonetic
    }


def suggest_phonetic_filling(comparison_result: Dict):
    """建议如何补充音标"""
    print()
    print("="*80)
    print("音标补充建议")
    print("="*80)
    print()

    existing_words = comparison_result['existing_words']
    k12_missing = comparison_result['k12_missing_phonetic']

    # 从现有词库中查找这些词的音标
    can_fill_from_existing = []
    need_external_source = []

    for word in k12_missing:
        word_lower = word.lower()
        if word_lower in existing_words:
            for entry in existing_words[word_lower]:
                if entry['phonetic']:
                    can_fill_from_existing.append({
                        'word': word,
                        'phonetic': entry['phonetic'],
                        'source': entry['source']
                    })
                    break
        else:
            need_external_source.append(word)

    print(f"可以从现有词库补充音标的词: {len(can_fill_from_existing)} 个")
    print(f"需要从外部数据源获取音标的词: {len(need_external_source)} 个")
    print()

    if can_fill_from_existing:
        print("示例（可从现有词库补充）:")
        for item in can_fill_from_existing[:10]:
            print(f"  {item['word']:<15} {item['phonetic']:<30} [来自 {item['source']}]")

        if len(can_fill_from_existing) > 10:
            print(f"  ... 还有 {len(can_fill_from_existing) - 10} 个")

    print()

    return {
        'can_fill': can_fill_from_existing,
        'need_external': need_external_source
    }


def main():
    """主函数"""
    # 执行对比
    result = compare_vocabularies()

    # 生成音标补充建议
    phonetic_suggestions = suggest_phonetic_filling(result)

    # 保存完整报告
    full_report = {
        'comparison': {
            'k12_total': len(result['k12_words']),
            'existing_total': len(result['existing_words']),
            'only_in_k12': len(result['only_in_k12']),
            'k12_missing_phonetic': len(result['k12_missing_phonetic'])
        },
        'phonetic_filling_suggestions': {
            'can_fill_from_existing': len(phonetic_suggestions['can_fill']),
            'need_external_source': len(phonetic_suggestions['need_external']),
            'details': phonetic_suggestions
        }
    }

    import os
    report_file = 'src/assets/reports/k12_full_analysis_report.json'
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(full_report, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 完整分析报告已保存到: {report_file}")
    print()
    print("="*80)


if __name__ == "__main__":
    main()
