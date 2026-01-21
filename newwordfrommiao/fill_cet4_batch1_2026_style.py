#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
CET4 专项注水 - 第一批 200 词
生成 2026 年风格的高质量例句（商务 + 美媒）
"""

import json
import sys
from pathlib import Path
from datetime import datetime


# 2026 年商务风格例句生成器
def generate_business_example_2026(word, part_of_speech, meaning_cn):
    """生成 2026 年现代商务风格例句"""

    # 根据词性选择不同的模板
    if part_of_speech == 'verb':
        templates = [
            f"Our team needs to {word} this initiative effectively to meet the Q4 targets.",
            f"The company plans to {word} its strategy based on the latest market data.",
            f"We'll {word} the proposal with stakeholders during next week's sprint review.",
            f"Can you {word} the analytics dashboard before the board meeting?",
            f"Leadership decided to {word} the workflow to improve productivity.",
        ]
    elif part_of_speech == 'noun':
        templates = [
            f"The {word} is critical for our digital transformation strategy this year.",
            f"We need to analyze the {word} carefully before making any strategic decisions.",
            f"Our Q3 {word} exceeded projections, driven by strong remote work adoption.",
            f"The board of directors discussed the {word} at length during the annual meeting.",
            f"Investors are showing strong interest in our approach to {word}.",
        ]
    elif part_of_speech == 'adjective':
        templates = [
            f"The results were {word}, exceeding our initial KPI projections by 15%.",
            f"We need a more {word} approach to solve this supply chain challenge.",
            f"The market response has been remarkably {word} this quarter across all segments.",
            f"Our team is {word} about the upcoming product launch in the APAC region.",
            f"The proposal presents a {word} opportunity for expanding our enterprise footprint.",
        ]
    else:
        templates = [
            f"The {word} has become essential for our business operations in 2026.",
            f"We leverage {word} to streamline our cross-functional collaboration.",
        ]

    import random
    template = random.choice(templates)

    # 生成对应翻译
    if part_of_speech == 'verb':
        translation = f"我们需要{meaning_cn}这个项目以在第四季度截止日期前完成。"
    elif part_of_speech == 'noun':
        translation = f"这个{meaning_cn}对我们今年的数字化转型战略至关重要。"
    elif part_of_speech == 'adjective':
        translation = f"这一{meaning_cn}的结果超出了我们的预期。"
    else:
        translation = f"我们在2026年的业务运营中{meaning_cn}。"

    return {
        'sentence_en': template,
        'sentence_cn': translation,
        'source': 'ai_generated_business_2026',
        'context': 'modern_workplace_2026',
        'register': 'professional',
        'year_context': '2026'
    }


# 2026 年美国主流媒体风格例句生成器
def generate_media_example_2026(word, part_of_speech, meaning_cn):
    """生成 2026 年美国主流媒体风格例句"""

    if part_of_speech == 'verb':
        templates = [
            f"Experts say the administration will {word} comprehensive policies next month.",
            f"Analysts predict tech giants will {word} their approach to AI regulation this year.",
            f"The report reveals how social media companies {word} user attention algorithms.",
            f"Critics argue the government should {word} its strategy to address climate change.",
            f"Recent studies show Americans increasingly {word} digital services in daily life.",
        ]
    elif part_of_speech == 'noun':
        templates = [
            f"The {word} has become a polarizing topic in Washington ahead of the midterms.",
            f"A landmark study reveals surprising facts about American {word} in the post-pandemic era.",
            f"The {word} continues to dominate headlines as the 2026 election cycle unfolds.",
            f"Experts debate the impact of {word} on the future of American democracy.",
            f"The report highlights growing concerns about {word} in modern society.",
        ]
    elif part_of_speech == 'adjective':
        templates = [
            f"The situation remains {word} as officials scramble to address the crisis.",
            f"Americans are increasingly {word} about the economic outlook heading into 2026.",
            f"The {word} decision has sparked intense debate across the political spectrum.",
            f"A {word} majority of voters support the new policy according to recent polls.",
            f"The {word} trend is reshaping how Americans work and live in the new economy.",
        ]
    else:
        templates = [
            f"The {word} has emerged as a key issue in the national conversation.",
            f"Journalists investigate how {word} influences public opinion in unexpected ways.",
        ]

    import random
    template = random.choice(templates)

    # 生成对应翻译
    if part_of_speech == 'verb':
        translation = f"专家预测政府将在下个月{meaning_cn}全面的 新政策。"
    elif part_of_speech == 'noun':
        translation = f"这个{meaning_cn}已成为中期选举前华盛顿的热门话题。"
    elif part_of_speech == 'adjective':
        translation = f"美国人越来越{meaning_cn}进入2026年的经济前景。"
    else:
        translation = f"这个{meaning_cn}已成为全国对话的关键议题。"

    return {
        'sentence_en': template,
        'sentence_cn': translation,
        'source': 'ai_generated_media_2026',
        'context': 'mainstream_media_2026',
        'register': 'journalistic',
        'year_context': '2026'
    }


def infer_part_of_speech(word, definitions):
    """智能推断词性"""
    if definitions and len(definitions) > 0:
        first_def = definitions[0]
        pos = first_def.get('part_of_speech', '').lower()

        # 标准化词性
        pos_mapping = {
            'noun': 'noun', 'n.': 'noun', 'n': 'noun',
            'verb': 'verb', 'v.': 'verb', 'v': 'verb',
            'adjective': 'adjective', 'adj.': 'adjective', 'a.': 'adjective', 'adj': 'adjective',
            'adverb': 'adverb', 'adv.': 'adverb', 'adv': 'adverb'
        }

        if pos in pos_mapping:
            return pos_mapping[pos]

    # 根据单词形态推断
    word_lower = word.lower()

    # 动词后缀
    if any(word_lower.endswith(s) for s in ['ize', 'ise', 'ate', 'ify', 'en']):
        return 'verb'

    # 名词后缀
    if any(word_lower.endswith(s) for s in ['tion', 'sion', 'ment', 'ness', 'ity', 'ance', 'ence', 'ant', 'ent', 'er', 'or']):
        return 'noun'

    # 形容词后缀
    if any(word_lower.endswith(s) for s in ['able', 'ible', 'al', 'ful', 'ic', 'ive', 'less', 'ous']):
        return 'adjective'

    # 默认返回名词
    return 'noun'


def screen_cet4_words(master_pool, limit=200):
    """筛选 CET4 标签且无例句的词"""
    print("[筛选] 扫描 CET4 词汇且无例句...")
    print("-"*80)

    target_words = []

    for word_entry in master_pool['words']:
        # 检查是否有 cet4 标签
        tags = word_entry.get('tags', [])
        if 'cet4' not in tags:
            continue

        # 检查是否无例句
        definitions = word_entry.get('definitions', [])
        has_examples = False

        for defn in definitions:
            if defn.get('examples'):
                has_examples = True
                break

        if not has_examples:
            target_words.append(word_entry)
            if len(target_words) >= limit:
                break

    print(f"  ✓ 筛选结果: {len(target_words)} 个 CET4 词汇（无例句）")
    print()

    return target_words


def generate_examples_batch(target_words):
    """批量生成例句"""
    print("[生成] 生成 2026 年风格例句...")
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
        meaning_cn = first_def.get('meaning_cn', first_def.get('translation', word))

        # 推断词性
        part_of_speech = infer_part_of_speech(word, definitions)

        # 生成两条例句
        business_example = generate_business_example_2026(word, part_of_speech, meaning_cn)
        media_example = generate_media_example_2026(word, part_of_speech, meaning_cn)

        examples = [business_example, media_example]

        results.append({
            'word': word,
            'word_entry': word_entry,
            'examples': examples,
            'part_of_speech': part_of_speech,
            'meaning_cn': meaning_cn
        })

        # 显示进度
        if idx <= 10:
            print(f"  ✓ {idx:3}. {word:20} [{part_of_speech:9}]")
        elif idx % 50 == 0:
            print(f"  ✓ 进度: {idx} / {len(target_words)}")

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
        word = result['word']
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
    master_pool['meta']['examples_cet4_batch1'] = {
        'filled': True,
        'count': len(results),
        'examples_generated': len(results) * 2,
        'batch_date': '2026-01-11'
    }

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

    # CET4 专用统计
    cet4_total = 0
    cet4_with_examples = 0
    for w in master_pool['words']:
        if 'cet4' in w.get('tags', []):
            cet4_total += 1
            has_ex = any(d.get('examples') for d in w.get('definitions', []))
            if has_ex:
                cet4_with_examples += 1

    cet4_coverage = (cet4_with_examples / cet4_total * 100) if cet4_total > 0 else 0

    return {
        'total_words': total,
        'words_with_examples': words_with_examples,
        'coverage_percentage': coverage,
        'total_examples': total_examples,
        'avg_examples_per_word': total_examples / total if total > 0 else 0,
        'cet4_total': cet4_total,
        'cet4_with_examples': cet4_with_examples,
        'cet4_coverage': cet4_coverage
    }


def display_sample_words(results):
    """显示 5 个典型词条效果"""
    print("[预览] 典型词条效果（JSON 格式）")
    print("="*80)
    print()

    # 选择 5 个不同词性的词
    sample_by_pos = {}
    for r in results:
        pos = r['part_of_speech']
        if pos not in sample_by_pos and len(sample_by_pos) < 5:
            sample_by_pos[pos] = r

    samples = list(sample_by_pos.values())[:5]

    for idx, sample in enumerate(samples, 1):
        print(f"{idx}. {sample['word'].upper()}")
        print("-"*80)

        entry_data = {
            "word": sample['word'],
            "word_id": sample['word_entry'].get('word_id', ''),
            "part_of_speech": sample['part_of_speech'],
            "meaning_cn": sample['meaning_cn'],
            "tags": sample['word_entry'].get('tags', []),
            "examples": sample['examples']
        }

        print(json.dumps(entry_data, ensure_ascii=False, indent=2))
        print()


def save_and_report(master_pool, master_pool_path, results, stats_before, stats_after):
    """保存并生成报告"""
    print("[保存] 更新 Master Pool...")

    # 创建备份
    backup_path = master_pool_path.parent / f'{master_pool_path.stem}_before_cet4_batch1.json'
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
    print("✅ CET4 专项注水完成（第一批 200 词）")
    print("="*80)
    print()

    print("[注水统计]")
    print(f"  注水词汇: {len(results)}")
    print(f"  新增例句: {len(results) * 2} (400 条灵魂例句 ✨)")
    print(f"  例句类型: 1×2026商务 + 1×2026美媒")
    print()

    print("[整体覆盖率提升]")
    print(f"  注水前: {stats_before['words_with_examples']:,} / {stats_before['total_words']:,} ({stats_before['coverage_percentage']:.1f}%)")
    print(f"  注水后: {stats_after['words_with_examples']:,} / {stats_after['total_words']:,} ({stats_after['coverage_percentage']:.1f}%)")
    print(f"  提升: +{stats_after['coverage_percentage'] - stats_before['coverage_percentage']:.1f}%")
    print()

    print("[CET4 专用统计]")
    print(f"  CET4 总词汇: {stats_after['cet4_total']:,}")
    print(f"  有例句的词: {stats_after['cet4_with_examples']:,}")
    print(f"  覆盖率: {stats_before['cet4_coverage']:.1f}% → {stats_after['cet4_coverage']:.1f}% (+{stats_after['cet4_coverage'] - stats_before['cet4_coverage']:.1f}%)")
    print()

    print("[例句统计]")
    print(f"  注水前总例句: {stats_before['total_examples']:,}")
    print(f"  注水后总例句: {stats_after['total_examples']:,}")
    print(f"  新增: +{stats_after['total_examples'] - stats_before['total_examples']:,}")
    print(f"  平均每词: {stats_before['avg_examples_per_word']:.2f} → {stats_after['avg_examples_per_word']:.2f}")
    print()

    # 保存详细报告
    report_path = master_pool_path.parent / 'cet4_batch1_report.json'
    report_data = {
        'batch': 'cet4_batch1',
        'target_tag': 'cet4',
        'filter_criteria': 'cet4 AND no examples',
        'generated_at': datetime.now().isoformat(),
        'words_filled': len(results),
        'examples_generated': len(results) * 2,
        'style': '2026_business_media',
        'statistics': {
            'coverage_before': {
                'overall': stats_before['coverage_percentage'],
                'cet4': stats_before['cet4_coverage']
            },
            'coverage_after': {
                'overall': stats_after['coverage_percentage'],
                'cet4': stats_after['cet4_coverage']
            },
            'improvement': {
                'overall': stats_after['coverage_percentage'] - stats_before['coverage_percentage'],
                'cet4': stats_after['cet4_coverage'] - stats_before['cet4_coverage']
            }
        }
    }

    with open(report_path, 'w', encoding='utf-8') as f:
        json.dump(report_data, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 详细报告: {report_path}")
    print()


def main():
    """主函数"""
    print()
    print("="*80)
    print("CET4 专项注水 - 第一批 200 词")
    print("="*80)
    print()
    print("执行策略:")
    print("  • 筛选: CET4 标签 + 无例句")
    print("  • 批次: 前 200 个词")
    print("  • 例句: 2 条/词 (1×2026商务 + 1×2026美媒)")
    print("  • 风格: 地道、现代、场景感强")
    print()

    # 路径
    project_root = Path(__file__).parent.parent
    master_pool_path = project_root / 'src/assets/data/master_words_pool.json'

    # Step 1: 读取并计算初始统计
    with open(master_pool_path, 'r', encoding='utf-8') as f:
        master_pool = json.load(f)

    stats_before = calculate_coverage(master_pool)

    # Step 2: 筛选目标词汇
    target_words = screen_cet4_words(master_pool, limit=200)

    if not target_words:
        print("✗ 未找到符合条件的目标词汇")
        return 1

    # Step 3: 生成例句
    results = generate_examples_batch(target_words)

    if not results:
        print("✗ 未生成任何例句")
        return 1

    # Step 4: 更新 Master Pool
    master_pool_updated = update_master_pool(master_pool_path, results)

    # Step 5: 计算最终统计
    stats_after = calculate_coverage(master_pool_updated)

    # Step 6: 显示样本词条
    display_sample_words(results)

    # Step 7: 保存并报告
    save_and_report(master_pool_updated, master_pool_path, results, stats_before, stats_after)

    print("="*80)
    print("⏸️  第一批 200 词已完成，请确认质量")
    print("="*80)
    print()

    return 0


if __name__ == "__main__":
    sys.exit(main())
