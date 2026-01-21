#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复标签孤岛问题 - 全量交叉打标
将所有源文件的标签合并到 Master Pool 的每个词条中
"""

import json
import sys
from pathlib import Path
from collections import defaultdict

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# 源文件定义（包含标签）
SOURCE_FILES = {
    'cet4': {
        'path': 'src/assets/data/cet4_words.json',
        'tags': ['cet4', 'exam', 'undergraduate']
    },
    'cet6': {
        'path': 'src/assets/data/cet6_words.json',
        'tags': ['cet6', 'exam', 'undergraduate']
    },
    'ielts': {
        'path': 'src/assets/data/ielts_words.json',
        'tags': ['ielts', 'exam', 'study_abroad', 'academic']
    },
    'toefl': {
        'path': 'src/assets/data/toefl_words.json',
        'tags': ['toefl', 'exam', 'study_abroad', 'academic']
    },
    'us_k12_foundation': {
        'path': 'src/assets/data/us_k12_foundation.json',
        'tags': ['k12', 'us_education', 'foundation']
    },
    'native_speaker_core': {
        'path': 'src/assets/scenarios/native_speaker_core_optimized.json',
        'tags': ['native_speaker', 'core', 'daily']
    },
    'ecommerce': {
        'path': 'src/assets/scenarios/scenario_ecommerce_500.json',
        'tags': ['scenario', 'ecommerce', 'business']
    },
    'parent_child': {
        'path': 'src/assets/scenarios/scenario_parent_child_1000.json',
        'tags': ['scenario', 'parent_child', 'family', 'daily']
    },
    'grade1_sight_words': {
        'path': 'src/assets/levels/us_k12/grade1_sight_words.json',
        'tags': ['k12', 'grade1', 'sight_word', 'us_education']
    },
    'grade3_morphology': {
        'path': 'src/assets/levels/us_k12/grade3_morphology.json',
        'tags': ['k12', 'grade3', 'morphology', 'word_formation']
    },
    'academic_tier2': {
        'path': 'src/assets/levels/us_k12/academic_tier2.json',
        'tags': ['k12', 'academic', 'tier2', 'high_school']
    }
}


def load_source_words(source_name, source_info):
    """加载源文件的所有词汇"""
    path = Path(source_info['path'])
    if not path.exists():
        print(f"  ⚠ 文件不存在: {path}")
        return set()

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 判断数据格式
    if isinstance(data, list):
        words = data
    elif isinstance(data, dict):
        if 'words' in data:
            words = data['words']
        else:
            return set()
    else:
        return set()

    # 提取所有单词（小写）
    word_set = set()
    for entry in words:
        word = entry.get('word', '').strip().lower()
        if word:
            word_set.add(word)

    return word_set


def build_word_to_sources_mapping():
    """建立单词到源文件的映射"""
    print("[步骤 1] 建立单词到源文件的映射...")
    print("-"*80)

    word_to_sources = defaultdict(set)
    source_stats = {}

    for source_name, source_info in SOURCE_FILES.items():
        print(f"  加载 {source_name}...")

        words = load_source_words(source_name, source_info)
        word_to_sources_local = {word: {source_name} for word in words}

        source_stats[source_name] = {
            'word_count': len(words),
            'tags': source_info['tags']
        }

        # 合并到全局映射
        for word, sources in word_to_sources_local.items():
            word_to_sources[word].update(sources)

        print(f"    ✓ {len(words):,} 词")

    print()
    print(f"  总计唯一词汇: {len(word_to_sources):,}")
    print()

    return word_to_sources, source_stats


def cross_label_master_pool(master_pool_path, word_to_sources, source_stats):
    """执行交叉打标"""
    print("[步骤 2] 执行全量交叉打标...")
    print("-"*80)

    with open(master_pool_path, 'r', encoding='utf-8') as f:
        master_pool = json.load(f)

    words = master_pool['words']
    total = len(words)

    # 统计数据
    stats = {
        'words_updated': 0,
        'tags_added': 0,
        'before_tag_stats': defaultdict(int),
        'after_tag_stats': defaultdict(int),
        'cross_tag_combinations': defaultdict(int)
    }

    print(f"  处理 {total:,} 个词条...")
    print()

    for idx, word_entry in enumerate(words):
        word = word_entry['word'].lower()
        current_tags = set(word_entry.get('tags', []))

        # 统计打标前
        for tag in current_tags:
            stats['before_tag_stats'][tag] += 1

        # 查找该词在哪些源文件中出现
        if word in word_to_sources:
            source_names = word_to_sources[word]

            # 收集所有应该有的标签
            all_tags = set(current_tags)
            for source_name in source_names:
                all_tags.update(source_stats[source_name]['tags'])

            # 如果有新增标签
            if len(all_tags) > len(current_tags):
                # 转为排序后的列表
                word_entry['tags'] = sorted(list(all_tags))

                stats['words_updated'] += 1
                stats['tags_added'] += len(all_tags) - len(current_tags)

        # 统计打标后
        new_tags = set(word_entry.get('tags', []))
        for tag in new_tags:
            stats['after_tag_stats'][tag] += 1

        # 统计交叉标签组合
        exam_tags = [t for t in new_tags if t in ['cet4', 'cet6', 'ielts', 'toefl']]
        if len(exam_tags) >= 2:
            combo = '+'.join(sorted(exam_tags))
            stats['cross_tag_combinations'][combo] += 1

        # 进度显示
        if (idx + 1) % 2000 == 0:
            print(f"  进度: {idx + 1:,} / {total:,}")

    print()
    print(f"  ✓ 处理完成")
    print()

    return master_pool, stats


def analyze_cross_tags(stats):
    """分析交叉标签情况"""
    print("[分析] 交叉标签统计")
    print("="*80)
    print()

    print("多考试标签组合:")
    print("-"*80)

    if stats['cross_tag_combinations']:
        for combo, count in sorted(stats['cross_tag_combinations'].items(),
                                   key=lambda x: x[1], reverse=True):
            print(f"  {combo:30} {count:5,} 词")
    else:
        print("  (无)")

    print()
    print("重点关注: CET4+IELTS 交叉词")
    print("-"*80)

    cet4_ielts_count = stats['cross_tag_combinations'].get('cet4+ielts', 0)
    cet4_ielts_i = stats['cross_tag_combinations'].get('cet4+ielts+toefl', 0)
    total = cet4_ielts_count + cet4_ielts_i

    print(f"  CET4 + IELTS:           {cet4_ielts_count:5,} 词")
    print(f"  CET4 + IELTS + TOEFL:   {cet4_ielts_i:5,} 词")
    print(f"  总计（含 CET4+IELTS）:   {total:5,} 词  ⭐ 这是精准目标")
    print()

    return total


def compare_tag_coverage(stats):
    """对比打标前后的标签覆盖"""
    print("[对比] 标签覆盖变化")
    print("-"*80)
    print()

    important_tags = ['cet4', 'cet6', 'ielts', 'toefl', 'k12', 'native_speaker']

    print(f"{'标签':20} {'打标前':>10} {'打标后':>10} {'变化':>10}")
    print("-"*80)

    for tag in important_tags:
        before = stats['before_tag_stats'].get(tag, 0)
        after = stats['after_tag_stats'].get(tag, 0)
        change = after - before
        change_str = f"+{change}" if change > 0 else f"{change}"

        print(f"{tag:20} {before:10,} {after:10,} {change_str:>10}")

    print()
    print(f"{'总计':20} {sum(stats['before_tag_stats'].values()):10,} {sum(stats['after_tag_stats'].values()):10,} +{stats['tags_added']:>9,}")
    print()


def save_updated_master_pool(master_pool, output_path):
    """保存更新后的 Master Pool"""
    print("[保存] 更新 Master Pool...")
    print("-"*80)

    # 创建备份
    import shutil
    backup_path = output_path.parent / f'{output_path.stem}_before_cross_labeling.json'
    shutil.copy2(output_path, backup_path)
    print(f"  ✓ 备份: {backup_path}")

    # 保存
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(master_pool, f, ensure_ascii=False, indent=2)

    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  ✓ 已保存: {output_path} ({file_size_mb:.2f} MB)")
    print()


def save_report(stats, output_path):
    """保存详细报告"""
    report = {
        'generated_at': '2026-01-11',
        'operation': 'cross_labeling_fix',
        'statistics': {
            'words_updated': stats['words_updated'],
            'tags_added': stats['tags_added'],
            'update_rate': f"{stats['words_updated'] / 10827 * 100:.1f}%"
        },
        'cross_tag_combinations': dict(stats['cross_tag_combinations']),
        'tag_coverage_before': dict(stats['before_tag_stats']),
        'tag_coverage_after': dict(stats['after_tag_stats'])
    }

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 报告: {output_path}")
    print()


def main():
    """主函数"""
    print()
    print("="*80)
    print("修复标签孤岛 - 全量交叉打标")
    print("="*80)
    print()
    print("目标: 将所有源文件的标签合并到 Master Pool 的每个词条")
    print("方法: 与原始 11 个源文件进行全量对比")
    print()

    # 路径
    project_root = Path(__file__).parent.parent
    master_pool_path = project_root / 'src/assets/data/master_words_pool.json'

    # Step 1: 建立映射
    word_to_sources, source_stats = build_word_to_sources_mapping()

    # Step 2: 执行交叉打标
    master_pool_updated, stats = cross_label_master_pool(
        master_pool_path,
        word_to_sources,
        source_stats
    )

    # Step 3: 分析交叉标签
    cet4_ielts_total = analyze_cross_tags(stats)

    # Step 4: 对比标签覆盖
    compare_tag_coverage(stats)

    # Step 5: 保存
    save_updated_master_pool(master_pool_updated, master_pool_path)

    report_path = project_root / 'src/assets/data/cross_labeling_report.json'
    save_report(stats, report_path)

    # 最终报告
    print("="*80)
    print("✅ 标签孤岛修复完成！")
    print("="*80)
    print()
    print(f"  更新词条: {stats['words_updated']:,} / 10,827 ({stats['words_updated']/10827*100:.1f}%)")
    print(f"  新增标签: {stats['tags_added']:,}")
    print()
    print(f"  ⭐ CET4+IELTS 交叉词: {cet4_ielts_total:,} 词")
    print()
    print("下一步: 启动第二阶段注水（针对这些交叉词）")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
