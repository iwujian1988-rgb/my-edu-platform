#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据大迁移：创建中央单词池 (Master Pool)
将所有孤立的 JSON 词库文件合并为单一真理源
"""

import json
import sys
from pathlib import Path
from collections import defaultdict
from datetime import datetime

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# 定义所有要迁移的词库源
SOURCES = {
    'cet4': {
        'path': 'src/assets/data/cet4_words.json',
        'tags': ['cet4', 'exam', 'undergraduate'],
        'priority': 1
    },
    'cet6': {
        'path': 'src/assets/data/cet6_words.json',
        'tags': ['cet6', 'exam', 'undergraduate'],
        'priority': 2
    },
    'ielts': {
        'path': 'src/assets/data/ielts_words.json',
        'tags': ['ielts', 'exam', 'study_abroad', 'academic'],
        'priority': 3
    },
    'toefl': {
        'path': 'src/assets/data/toefl_words.json',
        'tags': ['toefl', 'exam', 'study_abroad', 'academic'],
        'priority': 3
    },
    'us_k12_foundation': {
        'path': 'src/assets/data/us_k12_foundation.json',
        'tags': ['k12', 'us_education', 'foundation'],
        'priority': 4
    },
    'native_speaker_core': {
        'path': 'src/assets/scenarios/native_speaker_core_optimized.json',
        'tags': ['native_speaker', 'core', 'daily'],
        'priority': 5
    },
    'ecommerce': {
        'path': 'src/assets/scenarios/scenario_ecommerce_500.json',
        'tags': ['scenario', 'ecommerce', 'business'],
        'priority': 6
    },
    'parent_child': {
        'path': 'src/assets/scenarios/scenario_parent_child_1000.json',
        'tags': ['scenario', 'parent_child', 'family', 'daily'],
        'priority': 6
    },
    'grade1_sight_words': {
        'path': 'src/assets/levels/us_k12/grade1_sight_words.json',
        'tags': ['k12', 'grade1', 'sight_word', 'us_education'],
        'priority': 7
    },
    'grade3_morphology': {
        'path': 'src/assets/levels/us_k12/grade3_morphology.json',
        'tags': ['k12', 'grade3', 'morphology', 'word_formation'],
        'priority': 7
    },
    'academic_tier2': {
        'path': 'src/assets/levels/us_k12/academic_tier2.json',
        'tags': ['k12', 'academic', 'tier2', 'high_school'],
        'priority': 7
    }
}


def load_source_data(source_name, source_info):
    """加载单个源数据"""
    path = Path(source_info['path'])
    if not path.exists():
        print(f"  ⚠ 文件不存在: {path}")
        return []

    with open(path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 判断数据格式
    if isinstance(data, list):
        words = data
    elif isinstance(data, dict):
        if 'words' in data:
            words = data['words']
        else:
            print(f"  ✗ 无法识别的格式: {path}")
            return []
    else:
        return []

    print(f"  ✓ {source_name}: {len(words)} 词")
    return words


def normalize_phonetic(phonetic_data):
    """统一音标格式为 Schema v2.0"""
    if isinstance(phonetic_data, str):
        return {
            'kk': phonetic_data,
            'mw': '',
            'ipa': ''
        }
    elif isinstance(phonetic_data, dict):
        return {
            'kk': phonetic_data.get('kk', ''),
            'mw': phonetic_data.get('mw', phonetic_data.get('ipa', '')),
            'ipa': phonetic_data.get('ipa', '')
        }
    else:
        return {'kk': '', 'mw': '', 'ipa': ''}


def normalize_definitions(definitions, source_name):
    """统一释义格式为 Schema v2.0"""
    if not definitions:
        return [{
            'part_of_speech': 'unknown',
            'meaning_cn': '',
            'meaning_en_simple': '',
            'examples': []
        }]

    normalized = []

    for defn in definitions:
        # 处理不同的释义格式
        if isinstance(defn, str):
            # 简单字符串释义
            normalized.append({
                'part_of_speech': 'unknown',
                'meaning_cn': defn,
                'meaning_en_simple': '',
                'examples': []
            })
        elif isinstance(defn, dict):
            normalized.append({
                'part_of_speech': defn.get('partOfSpeech', defn.get('part_of_speech', 'unknown')),
                'meaning_cn': defn.get('translation', defn.get('meaning_cn', '')),
                'meaning_en_simple': defn.get('meaning_en_simple', ''),
                'meaning_en_academic': defn.get('meaning_en_academic', ''),
                'examples': normalize_examples(defn.get('examples', []), source_name)
            })

    return normalized if normalized else [{
        'part_of_speech': 'unknown',
        'meaning_cn': '',
        'meaning_en_simple': '',
        'examples': []
    }]


def normalize_examples(examples, source_name):
    """统一例句格式"""
    if not examples:
        return []

    normalized = []
    for ex in examples:
        if isinstance(ex, str):
            normalized.append({
                'sentence_en': ex,
                'sentence_cn': '',
                'source': source_name,
                'context': 'default',
                'grade_level': '',
                'lexile_score': ''
            })
        elif isinstance(ex, dict):
            normalized.append({
                'sentence_en': ex.get('sentence_en', ex.get('en', ex.get('example', ''))),
                'sentence_cn': ex.get('sentence_cn', ex.get('cn', ex.get('translation', ''))),
                'source': ex.get('source', source_name),
                'context': ex.get('context', 'default'),
                'grade_level': ex.get('grade_level', ''),
                'lexile_score': ex.get('lexile_score', '')
            })

    return normalized


def merge_word_to_pool(word_str, pool_entry, new_entry, source_tags):
    """将新词条合并到池中"""
    # 合并标签
    existing_tags = set(pool_entry.get('tags', []))
    existing_tags.update(source_tags)
    pool_entry['tags'] = sorted(list(existing_tags))

    # 合并音标（优先使用非空的）
    if not pool_entry.get('phonetic', {}).get('kk') and new_entry.get('phonetic', {}).get('kk'):
        pool_entry['phonetic'] = new_entry['phonetic']

    # 合并释义
    existing_definitions = pool_entry.get('definitions', [])
    new_definitions = new_entry.get('definitions', [])

    # 简单策略：保留释义数量更多的版本
    if len(new_definitions) > len(existing_definitions):
        pool_entry['definitions'] = new_definitions
    else:
        # 补充例句
        for i, (exist_def, new_def) in enumerate(zip(existing_definitions, new_definitions)):
            if len(new_def.get('examples', [])) > len(exist_def.get('examples', [])):
                exist_def['examples'] = new_def['examples']

    return pool_entry


def create_master_pool():
    """创建中央单词池"""
    print("="*80)
    print("创建中央单词池 (Master Pool)")
    print("="*80)
    print()

    # Master Pool 结构
    master_pool = {
        'meta': {
            'version': '3.0',
            'title': 'Master Words Pool - 中央单词总库',
            'description': '所有词库的统一真理源（Single Source of Truth）',
            'created_at': datetime.now().isoformat(),
            'schema_version': '2.0',
            'total_sources': len(SOURCES)
        },
        'words': {},
        'statistics': {
            'total_unique_words': 0,
            'total_sources_processed': 0,
            'overlap_analysis': {}
        },
        'sources_registry': {}
    }

    # 词池（word -> entry）
    word_pool = {}
    overlap_tracker = defaultdict(set)

    # 第一遍：读取所有源数据
    print("[第 1 步] 加载所有源数据...")
    print("-"*80)

    source_data = {}
    for source_name, source_info in SOURCES.items():
        print(f"加载 {source_name}...")
        words = load_source_data(source_name, source_info)
        source_data[source_name] = words
        master_pool['sources_registry'][source_name] = {
            'path': source_info['path'],
            'tags': source_info['tags'],
            'original_count': len(words),
            'priority': source_info['priority']
        }

    print()
    print(f"✓ 共加载 {len(source_data)} 个源")
    print()

    # 第二遍：合并到词池
    print("[第 2 步] 合并数据到词池...")
    print("-"*80)

    for source_name, words in source_data.items():
        source_tags = SOURCES[source_name]['tags']
        master_pool['statistics']['total_sources_processed'] += 1

        for word_entry in words:
            word = word_entry.get('word', '').strip().lower()
            if not word:
                continue

            # 规范化词条
            normalized_entry = {
                'word': word,
                'word_id': word_entry.get('word_id', f"mp_{word}"),
                'phonetic': normalize_phonetic(word_entry.get('phonetic', '')),
                'definitions': normalize_definitions(word_entry.get('definitions'), source_name),
                'word_formation': word_entry.get('word_formation', {}),
                'academic_features': word_entry.get('academic_features', {}),
                'sight_word_features': word_entry.get('sight_word_features', {}),
                'metadata': word_entry.get('metadata', {}),
                'tags': list(source_tags)  # 初始化标签
            }

            # 合并或新增
            if word in word_pool:
                # 重复词：合并
                overlap_tracker[word].add(source_name)
                word_pool[word] = merge_word_to_pool(
                    word,
                    word_pool[word],
                    normalized_entry,
                    source_tags
                )
            else:
                # 新词：直接添加
                word_pool[word] = normalized_entry

        print(f"  ✓ {source_name}: 已合并")

    print()

    # 第三遍：转换为列表并排序
    print("[第 3 步] 整理数据...")
    print("-"*80)

    words_list = list(word_pool.values())
    words_list.sort(key=lambda x: x['word'])

    master_pool['words'] = words_list
    master_pool['statistics']['total_unique_words'] = len(words_list)

    # 分析重叠
    overlap_distribution = defaultdict(int)
    for word, sources in overlap_tracker.items():
        overlap_distribution[len(sources)] += 1

    master_pool['statistics']['overlap_analysis'] = {
        'total_overlapping_words': len(overlap_tracker),
        'overlap_percentage': len(overlap_tracker) / len(words_list) * 100,
        'distribution': dict(overlap_distribution),
        'top_overlapping_words': []
    }

    # 找出重叠最多的词
    sorted_overlaps = sorted(overlap_tracker.items(), key=lambda x: len(x[1]), reverse=True)
    for word, sources in sorted_overlaps[:20]:
        master_pool['statistics']['overlap_analysis']['top_overlapping_words'].append({
            'word': word,
            'sources': list(sources),
            'count': len(sources)
        })

    print(f"  ✓ 总词汇: {len(words_list):,}")
    print(f"  ✓ 重复词: {len(overlap_tracker):,} ({len(overlap_tracker)/len(words_list)*100:.1f}%)")
    print()

    return master_pool


def save_master_pool(master_pool):
    """保存 Master Pool"""
    print("[第 4 步] 保存 Master Pool...")
    print("-"*80)

    output_path = Path('src/assets/data/master_words_pool.json')

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(master_pool, f, ensure_ascii=False, indent=2)

    file_size_mb = output_path.stat().st_size / (1024 * 1024)

    print(f"  ✓ 已保存: {output_path}")
    print(f"  ✓ 文件大小: {file_size_mb:.2f} MB")
    print()


def generate_report(master_pool):
    """生成迁移报告"""
    print("="*80)
    print("迁移报告")
    print("="*80)
    print()

    stats = master_pool['statistics']

    print(f"📊 总览")
    print("-"*80)
    print(f"  唯一词汇总数: {stats['total_unique_words']:,}")
    print(f"  处理源数量: {stats['total_sources_processed']}")
    print()

    print(f"🔁 重复分析")
    print("-"*80)
    overlap = stats['overlap_analysis']
    print(f"  重复词汇: {overlap['total_overlapping_words']:,}")
    print(f"  重复率: {overlap['overlap_percentage']:.2f}%")
    print()

    print(f"  重叠分布:")
    for count, num_words in sorted(overlap['distribution'].items(), reverse=True):
        print(f"    出现在 {count} 个源: {num_words:,} 词")

    print()
    print(f"  🔝 重叠最多的 Top 20:")
    for i, item in enumerate(overlap['top_overlapping_words'], 1):
        sources_str = ', '.join(item['sources'])
        print(f"    {i:2}. {item['word']:15} ({item['count']} 个源) -> {sources_str}")

    print()
    print(f"📋 源文件统计")
    print("-"*80)
    for source_name, source_info in master_pool['sources_registry'].items():
        print(f"  {source_name:25} {source_info['original_count']:5} 词")

    print()
    print(f"🏷️  标签统计")
    print("-"*80)

    # 统计标签使用频率
    tag_usage = defaultdict(int)
    for word_entry in master_pool['words']:
        for tag in word_entry.get('tags', []):
            tag_usage[tag] += 1

    sorted_tags = sorted(tag_usage.items(), key=lambda x: x[1], reverse=True)
    for tag, count in sorted_tags[:15]:
        percentage = count / stats['total_unique_words'] * 100
        print(f"  {tag:25} {count:5} 词 ({percentage:5.1f}%)")

    print()

    # 保存报告
    report_path = Path('src/assets/data/master_pool_migration_report.json')
    report_data = {
        'generated_at': datetime.now().isoformat(),
        'statistics': stats,
        'tag_usage': dict(sorted_tags),
        'sources': master_pool['sources_registry']
    }

    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)

    print(f"✓ 详细报告已保存: {report_path}")
    print()


def main():
    """主函数"""
    print()
    print("█"*80)
    print("█" + " "*78 + "█")
    print("█" + "  中央单词池 (Master Pool) - 数据大迁移".center(76) + "  █")
    print("█" + " "*78 + "█")
    print("█"*80)
    print()

    try:
        # Step 1: 创建 Master Pool
        master_pool = create_master_pool()

        # Step 2: 保存
        save_master_pool(master_pool)

        # Step 3: 生成报告
        generate_report(master_pool)

        print("="*80)
        print("✅ 迁移完成！")
        print("="*80)
        print()
        print("📁 输出文件:")
        print("  • src/assets/data/master_words_pool.json")
        print("  • src/assets/data/master_pool_migration_report.json")
        print()
        print("🎯 下一步:")
        print("  1. 验证数据完整性")
        print("  2. 补充缺失的例句（AI 批量生成）")
        print("  3. 更新前端加载逻辑")
        print()

        return 0

    except Exception as e:
        print()
        print("="*80)
        print(f"✗ 迁移失败: {e}")
        print("="*80)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
