#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
验证所有词库的完整性和质量
"""

import json
import os
import sys
from typing import Dict, List

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def validate_file(file_path: str) -> Dict:
    """验证单个词库文件"""
    if not os.path.exists(file_path):
        return {'error': 'File not found'}

    with open(file_path, 'r', encoding='utf-8') as f:
        words = json.load(f)

    total = len(words)
    missing_phonetic = 0
    missing_translation = 0
    missing_definition = 0

    categories = {}

    for w in words:
        # 检查音标
        if not w.get('phonetic') or w.get('phonetic') == '':
            missing_phonetic += 1

        # 检查翻译
        if not w.get('translation') or w.get('translation') == '' or w.get('translation') == '需人工补充':
            missing_translation += 1

        # 检查定义
        if not w.get('definition') or w.get('definition') == '':
            missing_definition += 1

        # 统计分类（如果有场景标签）
        if 'scenario_category' in w:
            cat = w['scenario_category']
            categories[cat] = categories.get(cat, 0) + 1

    return {
        'total': total,
        'missing_phonetic': missing_phonetic,
        'missing_translation': missing_translation,
        'missing_definition': missing_definition,
        'phonetic_coverage': f"{((total - missing_phonetic) / total * 100):.1f}%" if total > 0 else "N/A",
        'categories': categories
    }


def main():
    """主函数"""
    print("="*80)
    print("词库完整性和质量验证报告")
    print("="*80)
    print()

    # 要验证的文件列表
    files_to_validate = [
        # 核心考试词库
        ('src/assets/data/cet4_words.json', 'CET4 核心词库'),
        ('src/assets/data/cet6_words.json', 'CET6 核心词库'),
        ('src/assets/data/ielts_words.json', 'IELTS 核心词库'),
        ('src/assets/data/toefl_words.json', 'TOEFL 核心词库'),

        # 场景词库
        ('src/assets/scenarios/scenario_ecommerce_top50.json', '电商场景 Top50'),
        ('src/assets/scenarios/scenario_ecommerce_500.json', '电商场景扩展版 (500+)'),
        ('src/assets/scenarios/scenario_parent_child_1000.json', '亲子英语词库 (1000+)'),
    ]

    all_results = []

    for file_path, description in files_to_validate:
        print(f"[验证] {description}")
        print(f"  文件: {file_path}")

        result = validate_file(file_path)

        if 'error' in result:
            print(f"  ❌ 错误: {result['error']}")
        else:
            print(f"  总词汇: {result['total']:,} 个")
            print(f"  音标覆盖率: {result['phonetic_coverage']} (缺失 {result['missing_phonetic']} 个)")
            print(f"  缺失翻译: {result['missing_translation']} 个")
            print(f"  缺失定义: {result['missing_definition']} 个")

            if result['categories']:
                print(f"  分类统计:")
                for cat, count in sorted(result['categories'].items(), key=lambda x: x[1], reverse=True):
                    print(f"    - {cat}: {count} 个")

        print()

        result['description'] = description
        result['file_path'] = file_path
        all_results.append(result)

    # 生成总结报告
    print("="*80)
    print("总结报告")
    print("="*80)
    print()

    total_words = sum(r.get('total', 0) for r in all_results if 'error' not in r)
    total_missing_phonetic = sum(r.get('missing_phonetic', 0) for r in all_results if 'error' not in r)

    print(f"✅ 词库总数: {len(all_results)} 个")
    print(f"📚 总词汇量: {total_words:,} 个")
    print(f"🎵 缺失音标: {total_missing_phonetic} 个")
    print()

    # 保存验证报告
    report_file = 'src/assets/reports/dictionary_validation_report.json'
    os.makedirs('src/assets/reports', exist_ok=True)

    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump({
            'validation_date': '2026-01-11',
            'summary': {
                'total_dictionaries': len(all_results),
                'total_words': total_words,
                'missing_phonetics': total_missing_phonetic
            },
            'details': all_results
        }, f, ensure_ascii=False, indent=2)

    print(f"✅ 验证报告已保存到: {report_file}")
    print()
    print("="*80)


if __name__ == "__main__":
    main()
