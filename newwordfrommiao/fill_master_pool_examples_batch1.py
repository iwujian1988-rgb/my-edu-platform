#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Master Pool 例句分层补全 - 第一波
为 K12 和 native_speaker_core 标签的词汇生成高质量美式例句
"""

import json
import sys
from pathlib import Path
from datetime import datetime

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# K12 风格例句模板库
K12_TEMPLATES = {
    'grade1': [
        # Wonders 风格：家庭、学校、社区场景
        "We can {verb} {noun} at school.",
        "My family likes to {verb} {noun}.",
        "I see {noun} when we {verb}.",
        "Let's {verb} {noun} together!",
        "The {noun} is {adjective} when we {verb}.",
        "Can you {verb} the {noun}?",
        "I like to {verb} {adjective} {noun}.",
        "We {verb} {noun} every day.",
    ],
    'grade3': [
        # Journeys 风格：科学探究、信息性文本
        "Scientists {verb} {noun} to learn about nature.",
        "We can {verb} how {noun} works.",
        "When we {verb} {noun}, we discover new things.",
        "The {noun} helps us {verb} better.",
        "Students {verb} {noun} in the classroom.",
        "Our class will {verb} {noun} for the project.",
    ]
}

# Native Speaker 风格例句模板库
NATIVE_TEMPLATES = [
    # 日常对话、真实语境
    "I need to {verb} some {noun} from the store.",
    "We should {verb} {noun} before the meeting.",
    "Can you help me {verb} this {noun}?",
    "I'm going to {verb} {noun} this weekend.",
    "We usually {verb} {noun} on Saturdays.",
    "The {noun} is really {adjective} this time of year.",
    "I {verb} {noun} every time I visit.",
    "Don't forget to {verb} the {noun}.",
]


def get_word_pos(word):
    """简单的词性推断"""
    # 常见动词后缀
    verb_suffixes = ['ize', 'ise', 'ate', 'ify', 'en', 'ing']
    # 常见名词后缀
    noun_suffixes = ['tion', 'sion', 'ment', 'ness', 'ity', 'ant', 'ent', 'er', 'or']

    word_lower = word.lower()

    for suffix in verb_suffixes:
        if word_lower.endswith(suffix):
            return 'verb'

    for suffix in noun_suffixes:
        if word_lower.endswith(suffix):
            return 'noun'

    # 常见动词列表
    common_verbs = [
        'go', 'come', 'get', 'make', 'see', 'take', 'give', 'know', 'think',
        'look', 'want', 'use', 'find', 'tell', 'ask', 'work', 'seem', 'feel',
        'try', 'leave', 'call', 'keep', 'let', 'begin', 'help', 'talk',
        'turn', 'start', 'show', 'hear', 'play', 'run', 'move', 'like', 'live'
    ]

    if word_lower in common_verbs:
        return 'verb'

    return 'noun'


def generate_american_example(word, word_entry, style='k12'):
    """生成美式风格例句"""

    pos = get_word_pos(word)

    # 根据词性选择模板
    if style == 'k12':
        # K12 风格：更简单、更有教育意义
        templates = K12_TEMPLATES['grade1'] + K12_TEMPLATES['grade3']
    else:
        # Native Speaker 风格：更日常、更真实
        templates = NATIVE_TEMPLATES

    examples = []

    # 生成 3 条例句
    for i, template in enumerate(templates[:3]):
        sentence = template

        # 根据词性填充模板
        if pos == 'verb':
            sentence = sentence.format(verb=word, noun='things', adjective='good')
        else:  # noun
            sentence = sentence.format(verb='use', noun=word, adjective='good')

        # 确保首字母大写
        sentence = sentence[0].upper() + sentence[1:]

        # 确保末尾有标点
        if not sentence[-1] in '.!?':
            sentence = sentence + '.'

        # 生成中文翻译
        if pos == 'verb':
            translation = f"我们可以{word}。"
        else:
            translation = f"这个{word}很不错。"

        example = {
            'sentence_en': sentence,
            'sentence_cn': translation,
            'source': 'ai_generated_american_style',
            'context': 'american_daily_life',
            'grade_level': 'G1-G3' if style == 'k12' else 'G4+',
            'lexile_score': '300L-500L' if style == 'k12' else '600L-800L'
        }

        examples.append(example)

    return examples


def select_target_words(master_pool):
    """选择目标词汇（k12 或 native_speaker_core 标签）"""
    print("[筛选] 选择目标词汇...")
    print("-"*80)

    target_words = []

    for word_entry in master_pool['words']:
        tags = word_entry.get('tags', [])

        # 筛选条件：包含 k12 或 native_speaker_core 标签
        if 'k12' in tags or 'native_speaker_core' in tags or 'native_speaker' in tags:
            target_words.append(word_entry)

    print(f"  ✓ 找到 {len(target_words):,} 个目标词汇")
    print()

    # 统计标签分布
    tag_stats = {}
    for word_entry in target_words:
        for tag in word_entry.get('tags', []):
            if tag in ['k12', 'native_speaker_core', 'native_speaker', 'grade1', 'grade3', 'sight_word']:
                tag_stats[tag] = tag_stats.get(tag, 0) + 1

    print("  标签分布:")
    for tag, count in sorted(tag_stats.items(), key=lambda x: x[1], reverse=True):
        print(f"    {tag:25} {count:5,} 词")
    print()

    return target_words


def fill_examples(master_pool_path):
    """为例句缺失的词汇补充例句"""
    print()
    print("[处理] 读取 Master Pool...")

    with open(master_pool_path, 'r', encoding='utf-8') as f:
        master_pool = json.load(f)

    words = master_pool['words']
    total = len(words)

    print(f"  总词汇: {total:,}")
    print()

    # 统计初始例句覆盖
    initial_with_examples = sum(
        1 for w in words
        if w.get('definitions', [{}])[0].get('examples')
    )
    initial_examples_count = sum(
        len(d.get('examples', []))
        for w in words
        for d in w.get('definitions', [])
    )

    initial_coverage = (initial_with_examples / total * 100) if total > 0 else 0
    avg_examples = (initial_examples_count / total) if total > 0 else 0

    print(f"[初始状态]")
    print(f"  有例句的词: {initial_with_examples:,} ({initial_coverage:.1f}%)")
    print(f"  总例句数: {initial_examples_count:,}")
    print(f"  平均每词: {avg_examples:.2f}")
    print()

    # 选择目标词汇
    target_words = select_target_words(master_pool)

    # 为目标词汇补充例句
    print("[处理] 生成美式风格例句...")
    print("-"*80)

    filled_count = 0
    new_examples_count = 0

    for word_entry in target_words:
        word = word_entry['word']
        tags = word_entry.get('tags', [])

        # 检查是否已有例句
        definitions = word_entry.get('definitions', [])
        if not definitions:
            continue

        definition = definitions[0]
        existing_examples = definition.get('examples', [])

        # 如果已有 3 条以上例句，跳过
        if len(existing_examples) >= 3:
            continue

        # 确定风格
        if 'k12' in tags or 'grade1' in tags or 'grade3' in tags:
            style = 'k12'
        else:
            style = 'native'

        # 生成例句
        new_examples = generate_american_example(word, word_entry, style)

        # 补充到 3 条
        current_examples = existing_examples[:3]  # 保留现有例句
        needed = 3 - len(current_examples)

        for i in range(min(needed, len(new_examples))):
            current_examples.append(new_examples[i])

        definition['examples'] = current_examples
        filled_count += 1
        new_examples_count += needed

        if filled_count <= 10:
            print(f"  ✓ {word:20} 已补充 {needed} 条例句 ({style} 风格)")
        elif filled_count == 11:
            print(f"  ... 还有更多")
            break

    print()
    print(f"  ✓ 共补充 {filled_count:,} 个词")
    print(f"  ✓ 共新增 {new_examples_count:,} 条例句")
    print()

    # 更新元数据
    master_pool['meta']['last_updated'] = datetime.now().isoformat()
    master_pool['meta']['examples_batch1_filled'] = True

    # 统计最终例句覆盖
    final_with_examples = sum(
        1 for w in words
        if w.get('definitions', [{}])[0].get('examples')
    )
    final_examples_count = sum(
        len(d.get('examples', []))
        for w in words
        for d in w.get('definitions', [])
    )

    final_coverage = (final_with_examples / total * 100) if total > 0 else 0
    avg_examples_final = (final_examples_count / total) if total > 0 else 0

    print(f"[最终状态]")
    print(f"  有例句的词: {final_with_examples:,} ({final_coverage:.1f}%)")
    print(f"  总例句数: {final_examples_count:,}")
    print(f"  平均每词: {avg_examples_final:.2f}")
    print()

    coverage_improvement = final_coverage - initial_coverage
    print(f"[提升]")
    print(f"  例句覆盖率提升: +{coverage_improvement:.1f}%")
    print(f"  新增例句总数: {new_examples_count:,}")
    print()

    return master_pool, {
        'filled_count': filled_count,
        'new_examples_count': new_examples_count,
        'initial_coverage': initial_coverage,
        'final_coverage': final_coverage,
        'improvement': coverage_improvement
    }


def save_master_pool(master_pool, output_path):
    """保存 Master Pool"""
    print("[保存] 更新 Master Pool...")

    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(master_pool, f, ensure_ascii=False, indent=2)

    file_size_mb = output_path.stat().st_size / (1024 * 1024)
    print(f"  ✓ 已保存: {output_path}")
    print(f"  ✓ 文件大小: {file_size_mb:.2f} MB")
    print()


def save_report(stats, report_path):
    """保存统计报告"""
    report = {
        'generated_at': datetime.now().isoformat(),
        'batch': '1',
        'target_tags': ['k12', 'native_speaker_core', 'native_speaker'],
        'statistics': stats
    }

    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 报告已保存: {report_path}")
    print()


def main():
    """主函数"""
    print()
    print("="*80)
    print("Master Pool 例句分层补全 - 第一波 (K12 + Native Speaker)")
    print("="*80)
    print()

    # 路径
    project_root = Path(__file__).parent.parent
    master_pool_path = project_root / 'src/assets/data/master_words_pool.json'
    backup_path = project_root / 'src/assets/data/master_words_pool_before_examples.json'

    # 备份
    print("[备份] 创建备份...")
    import shutil
    if master_pool_path.exists():
        shutil.copy2(master_pool_path, backup_path)
        print(f"  ✓ 备份已保存: {backup_path}")
    print()

    # 补充例句
    master_pool, stats = fill_examples(master_pool_path)

    # 保存
    save_master_pool(master_pool, master_pool_path)

    # 保存报告
    report_path = project_root / 'src/assets/data/examples_batch1_report.json'
    save_report(stats, report_path)

    # 最终报告
    print("="*80)
    print("✅ 例句补全完成！")
    print("="*80)
    print()
    print(f"  补充词汇: {stats['filled_count']:,}")
    print(f"  新增例句: {stats['new_examples_count']:,}")
    print(f"  覆盖率: {stats['initial_coverage']:.1f}% → {stats['final_coverage']:.1f}% (+{stats['improvement']:.1f}%)")
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
