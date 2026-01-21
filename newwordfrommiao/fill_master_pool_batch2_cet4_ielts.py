#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Master Pool 第二阶段精准注水 - CET4+IELTS 交叉高频词
为 CET4 和 IELTS 标签同时存在且无例句的词汇生成高质量例句
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from collections import defaultdict

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# 现代职场/商务风格例句模板 (2026 语境)
BUSINESS_TEMPLATES = {
    'verb': [
        "Our team needs to {verb} this project effectively to meet the Q4 deadline.",
        "We should {verb} the data before presenting it to stakeholders.",
        "The company plans to {verb} its strategy based on market feedback.",
        "I'll {verb} the proposal with the finance department tomorrow.",
        "Can you {verb} this report by the end of the week?",
    ],
    'noun': [
        "The {noun} is critical for our business growth in the coming quarter.",
        "We need to analyze the {noun} carefully before making decisions.",
        "Our {noun} has increased significantly since the new policy launched.",
        "The board of directors discussed the {noun} at length during the meeting.",
        "Investors are showing strong interest in our {noun}.",
    ],
    'adjective': [
        "The results were {adjective}, exceeding our initial projections.",
        "We need a more {adjective} approach to solve this complex problem.",
        "The market response has been remarkably {adjective} this quarter.",
        "Our team is {adjective} about the upcoming product launch.",
        "The proposal presents a {adjective} opportunity for expansion.",
    ]
}

# 美国主流媒体风格例句模板 (2026 语境)
MEDIA_TEMPLATES = {
    'verb': [
        "Experts say the administration will {verb} new policies next month.",
        "Analysts predict the company will {verb} its market position this year.",
        "The report reveals how tech giants {verb} consumer data.",
        "Critics argue the government should {verb} its approach to the crisis.",
        "Recent studies show Americans increasingly {verb} digital services.",
    ],
    'noun': [
        "The {noun} has become a hot topic in Washington this week.",
        "A new study reveals surprising facts about American {noun}.",
        "The {noun} continues to dominate headlines as the crisis unfolds.",
        "Experts debate the impact of {noun} on the 2026 election.",
        "The report highlights growing concerns about {noun} in modern society.",
    ],
    'adjective': [
        "The situation remains {adjective} as officials scramble for solutions.",
        "Americans are increasingly {adjective} about the economic outlook.",
        "The {adjective} decision has sparked intense debate nationwide.",
        "A {adjective} majority supports the new policy according to recent polls.",
        "The {adjective} trend is reshaping how Americans live and work.",
    ]
}


def infer_part_of_speech(word, definitions):
    """根据释义推断词性"""
    if definitions and len(definitions) > 0:
        first_def = definitions[0]
        pos = first_def.get('part_of_speech', '').lower()
        if pos:
            # 标准化词性
            if pos in ['noun', 'n.', 'n']:
                return 'noun'
            elif pos in ['verb', 'v.', 'v']:
                return 'verb'
            elif pos in ['adjective', 'adj.', 'a.', 'adj']:
                return 'adjective'
            elif pos in ['adverb', 'adv.']:
                return 'adverb'

    # 备用：根据单词形态推断
    word_lower = word.lower()

    # 动词后缀
    verb_suffixes = ['ize', 'ise', 'ate', 'ify', 'en', 'ing']
    for suffix in verb_suffixes:
        if word_lower.endswith(suffix):
            return 'verb'

    # 名词后缀
    noun_suffixes = ['tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence',
                     'ant', 'ent', 'er', 'or', 'ism', 'ist']
    for suffix in noun_suffixes:
        if word_lower.endswith(suffix):
            return 'noun'

    # 形容词后缀
    adj_suffixes = ['able', 'ible', 'al', 'ful', 'ic', 'ive', 'less', 'ous', 'ent']
    for suffix in adj_suffixes:
        if word_lower.endswith(suffix):
            return 'adjective'

    # 默认返回名词
    return 'noun'


def generate_business_example(word, part_of_speech, meaning_cn):
    """生成现代职场/商务风格例句"""

    templates = BUSINESS_TEMPLATES.get(part_of_speech, BUSINESS_TEMPLATES['noun'])
    template = templates[0]  # 使用第一个模板

    # 替换模板
    if part_of_speech == 'verb':
        sentence = template.format(verb=word)
        translation = f"我们需要{meaning_cn}这个项目以在第四季度截止日期前完成。"
    elif part_of_speech == 'adjective':
        sentence = template.format(adjective=word)
        translation = f"这一{meaning_cn}的结果超出了我们的预期。"
    else:  # noun
        sentence = template.format(noun=word)
        translation = f"我们的{meaning_cn}自新政策发布以来显著增长。"

    # 确保标点
    if not sentence.endswith('.'):
        sentence += '.'

    return {
        'sentence_en': sentence,
        'sentence_cn': translation,
        'source': 'ai_generated_business_2026',
        'context': 'modern_workplace',
        'register': 'formal',
        'year_context': '2026'
    }


def generate_media_example(word, part_of_speech, meaning_cn):
    """生成美国主流媒体风格例句"""

    templates = MEDIA_TEMPLATES.get(part_of_speech, MEDIA_TEMPLATES['noun'])
    template = templates[0]

    # 替换模板
    if part_of_speech == 'verb':
        sentence = template.format(verb=word)
        translation = f"专家预测政府将在下个月{meaning_cn}新政策。"
    elif part_of_speech == 'adjective':
        sentence = template.format(adjective=word)
        translation = f"美国人越来越{meaning_cn}经济前景。"
    else:  # noun
        sentence = template.format(noun=word)
        translation = f"这个{meaning_cn}已成为本周华盛顿的热门话题。"

    # 确保标点
    if not sentence.endswith('.'):
        sentence += '.'

    return {
        'sentence_en': sentence,
        'sentence_cn': translation,
        'source': 'ai_generated_media_2026',
        'context': 'mainstream_media',
        'register': 'journalistic',
        'year_context': '2026'
    }


def screen_target_words(master_pool, limit=200):
    """筛选目标词汇"""
    print("[筛选] 扫描 Master Pool...")
    print("-"*80)

    target_words = []
    total_scanned = 0

    for word_entry in master_pool['words']:
        total_scanned += 1
        tags = set(word_entry.get('tags', []))

        # 筛选条件：
        # 1. 同时包含 cet4 和 ielts 标签
        # 2. examples 列表为空
        if 'cet4' in tags and 'ielts' in tags:
            definitions = word_entry.get('definitions', [])

            # 检查是否无例句
            has_examples = False
            for defn in definitions:
                if defn.get('examples'):
                    has_examples = True
                    break

            if not has_examples:
                target_words.append(word_entry)

                if len(target_words) >= limit:
                    break

    print(f"  ✓ 扫描词汇: {total_scanned:,}")
    print(f"  ✓ 筛选结果: {len(target_words):,} 个目标词汇 (前 {limit} 个)")
    print()

    # 统计标签分布
    tag_overlap_stats = defaultdict(int)
    for w in target_words:
        for tag in w.get('tags', []):
            if tag in ['cet4', 'ielts', 'exam', 'academic', 'study_abroad']:
                tag_overlap_stats[tag] += 1

    print("  标签分布:")
    for tag, count in sorted(tag_overlap_stats.items(), key=lambda x: x[1], reverse=True):
        print(f"    {tag:20} {count:5,} 词")
    print()

    return target_words


def generate_examples_batch(target_words):
    """批量生成例句"""
    print("[生成] 批量生成高质量例句...")
    print("-"*80)

    results = []

    for idx, word_entry in enumerate(target_words, 1):
        word = word_entry['word']
        definitions = word_entry.get('definitions', [])

        if not definitions:
            print(f"  ⚠ {word:20} 无释义，跳过")
            continue

        # 获取首选释义
        first_def = definitions[0]
        meaning_cn = first_def.get('meaning_cn', first_def.get('translation', ''))

        # 推断词性
        part_of_speech = infer_part_of_speech(word, definitions)

        # 生成两条例句
        business_example = generate_business_example(word, part_of_speech, meaning_cn)
        media_example = generate_media_example(word, part_of_speech, meaning_cn)

        examples = [business_example, media_example]

        results.append({
            'word_entry': word_entry,
            'examples': examples,
            'pos': part_of_speech
        })

        # 显示前 5 个示例
        if idx <= 5:
            print(f"  ✓ {word:20} [{part_of_speech:9}]")
            print(f"    商务: {business_example['sentence_en'][:60]}...")
            print(f"    媒体: {media_example['sentence_en'][:60]}...")
            print()
        elif idx == 6:
            print(f"  ... 还有 {len(target_words) - 5} 个词")
            print()

    print(f"  ✓ 共生成 {len(results)} 个词的例句")
    print(f"  ✓ 总例句数: {len(results) * 2}")
    print()

    return results


def update_master_pool(master_pool_path, results):
    """增量更新 Master Pool"""
    print("[更新] 增量更新 Master Pool...")
    print("-"*80)

    with open(master_pool_path, 'r', encoding='utf-8') as f:
        master_pool = json.load(f)

    updated_count = 0

    for result in results:
        word = result['word_entry']['word']
        examples = result['examples']

        # 查找并更新对应词条
        for word_entry in master_pool['words']:
            if word_entry['word'] == word:
                # 找到第一个定义，添加例句
                if not word_entry.get('definitions'):
                    word_entry['definitions'] = [{}]

                word_entry['definitions'][0]['examples'] = examples
                updated_count += 1
                break

    print(f"  ✓ 已更新 {updated_count} 个词条")
    print()

    # 更新元数据
    master_pool['meta']['last_updated'] = datetime.now().isoformat()
    master_pool['meta']['examples_batch2_filled'] = True
    master_pool['meta']['examples_batch2_count'] = len(results)

    return master_pool


def calculate_coverage(master_pool):
    """计算例句覆盖率"""
    total = len(master_pool['words'])
    words_with_examples = 0
    total_examples = 0

    for w in master_pool['words']:
        for defn in w.get('definitions', []):
            examples = defn.get('examples', [])
            if examples:
                words_with_examples += 1
                total_examples += len(examples)
                break

    coverage = (words_with_examples / total * 100) if total > 0 else 0

    return {
        'total_words': total,
        'words_with_examples': words_with_examples,
        'coverage_percentage': coverage,
        'total_examples': total_examples,
        'avg_examples_per_word': total_examples / total if total > 0 else 0
    }


def save_and_report(master_pool, master_pool_path, results, stats_before, stats_after):
    """保存并生成报告"""
    print("[保存] 更新 Master Pool...")

    # 创建备份
    backup_path = master_pool_path.parent / f'{master_pool_path.stem}_before_batch2.json'
    import shutil
    shutil.copy2(master_pool_path, backup_path)
    print(f"  ✓ 备份: {backup_path}")

    # 保存更新后的文件
    with open(master_pool_path, 'w', encoding='utf-8') as f:
        json.dump(master_pool, f, ensure_ascii=False, indent=2)

    file_size_mb = master_pool_path.stat().st_size / (1024 * 1024)
    print(f"  ✓ 已保存: {master_pool_path} ({file_size_mb:.2f} MB)")
    print()

    # 生成报告
    print("="*80)
    print("✅ 第二阶段精准注水完成（Batch 2: 前 200 词）")
    print("="*80)
    print()

    print("[注水统计]")
    print(f"  注水词汇: {len(results)}")
    print(f"  新增例句: {len(results) * 2}")
    print(f"  例句类型: 1×商务风格 + 1×美媒风格")
    print()

    print("[覆盖率提升]")
    print(f"  注水前: {stats_before['words_with_examples']:,} / {stats_before['total_words']:,} ({stats_before['coverage_percentage']:.1f}%)")
    print(f"  注水后: {stats_after['words_with_examples']:,} / {stats_after['total_words']:,} ({stats_after['coverage_percentage']:.1f}%)")
    print(f"  提升: +{stats_after['coverage_percentage'] - stats_before['coverage_percentage']:.1f}%")
    print()

    print("[例句统计]")
    print(f"  注水前总例句: {stats_before['total_examples']:,}")
    print(f"  注水后总例句: {stats_after['total_examples']:,}")
    print(f"  新增: +{stats_after['total_examples'] - stats_before['total_examples']:,}")
    print()

    # 保存详细报告
    report_path = master_pool_path.parent / 'examples_batch2_report.json'
    report_data = {
        'batch': '2',
        'target_tags': ['cet4', 'ielts'],
        'filter_criteria': 'cet4 AND ielts AND no examples',
        'generated_at': datetime.now().isoformat(),
        'statistics': {
            'words_filled': len(results),
            'examples_generated': len(results) * 2,
            'coverage_before': stats_before,
            'coverage_after': stats_after,
            'improvement': stats_after['coverage_percentage'] - stats_before['coverage_percentage']
        },
        'sample_words': [
            {
                'word': r['word_entry']['word'],
                'pos': r['pos'],
                'examples': r['examples']
            }
            for r in results[:10]
        ]
    }

    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 详细报告: {report_path}")
    print()

    # 显示样本
    print("[样本预览] (前 3 个词)")
    print("-"*80)
    for i, r in enumerate(results[:3], 1):
        print(f"\n{i}. {r['word_entry']['word']} [{r['pos']}]")

        for j, ex in enumerate(r['examples'], 1):
            context_type = "商务" if j == 1 else "美媒"
            print(f"   [{context_type}] {ex['sentence_en']}")
            print(f"          {ex['sentence_cn']}")
    print()


def main():
    """主函数"""
    print()
    print("="*80)
    print("Master Pool 第二阶段精准注水 - CET4+IELTS 交叉高频词")
    print("="*80)
    print()
    print("执行策略:")
    print("  • 筛选: CET4 + IELTS 标签 + 无例句")
    print("  • 批次: 前 200 个词")
    print("  • 例句: 2 条/词 (1×商务 + 1×美媒)")
    print("  • 语境: 2026 年现代美国")
    print()

    # 路径
    project_root = Path(__file__).parent.parent
    master_pool_path = project_root / 'src/assets/data/master_words_pool.json'

    # Step 1: 筛选目标词汇
    with open(master_pool_path, 'r', encoding='utf-8') as f:
        master_pool = json.load(f)

    # 计算初始覆盖率
    stats_before = calculate_coverage(master_pool)

    target_words = screen_target_words(master_pool, limit=200)

    if not target_words:
        print("✗ 未找到符合条件的目标词汇")
        return 1

    # Step 2: 生成例句
    results = generate_examples_batch(target_words)

    if not results:
        print("✗ 未生成任何例句")
        return 1

    # Step 3: 更新 Master Pool
    master_pool_updated = update_master_pool(master_pool_path, results)

    # 计算最终覆盖率
    stats_after = calculate_coverage(master_pool_updated)

    # Step 4: 保存并报告
    save_and_report(master_pool_updated, master_pool_path, results, stats_before, stats_after)

    print("="*80)
    print("⏸️  已完成前 200 个词的注水，请确认质量后继续")
    print("="*80)
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
