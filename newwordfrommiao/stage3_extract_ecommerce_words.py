#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段3：场景词书清洗 - 跨境电商场景词库提取
从核心词库中筛选与跨境电商/无货源模式相关的核心词汇
"""

import json
import sys
from typing import List, Dict

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# 跨境电商核心关键词列表（用于搜索匹配）
ECOMMERCE_KEYWORDS = [
    # 选品相关
    'product', 'niche', 'source', 'supplier', 'quality', 'price', 'profit',
    'margin', 'demand', 'market', 'competition', 'competitive', 'inventory',
    'stock', 'wholesale', 'retail', 'goods', 'merchandise', 'item',

    # 引流相关
    'traffic', 'customer', 'client', 'advertise', 'advertisement', 'promote',
    'promotion', 'campaign', 'brand', 'marketing', 'audience', 'target',
    'conversion', 'click', 'view', 'visit', 'attract', 'engage', 'channel',
    'platform', 'social', 'media', 'content', 'influence', 'popular',

    # 支付与结算相关
    'payment', 'pay', 'buy', 'purchase', 'order', 'transaction', 'checkout',
    'credit', 'debit', 'card', 'secure', 'verify', 'confirm', 'process',
    'settle', 'settlement', 'commission', 'fee', 'charge', 'cost', 'refund',
    'return', 'exchange', 'discount', 'coupon', 'voucher', 'currency',

    # 物流与售后相关
    'ship', 'shipping', 'deliver', 'delivery', 'logistics', 'transport',
    'warehouse', 'package', 'packaging', 'track', 'tracking', 'express',
    'carrier', 'freight', 'customs', 'import', 'export', 'global',
    'international', 'support', 'service', 'complaint', 'satisfaction',

    # 运营相关
    'manage', 'management', 'operate', 'operation', 'business', 'company',
    'strategy', 'plan', 'goal', 'growth', 'scale', 'expand', 'optimize',
    'improve', 'performance', 'analyze', 'data', 'report', 'sales', 'revenue',
    'budget', 'invest', 'investment', 'risk', 'successful', 'fail', 'failure'
]


def load_all_words() -> List[Dict]:
    """加载所有核心词库"""
    all_words = []

    levels = ['cet4', 'cet6', 'ielts', 'toefl']
    for level in levels:
        with open(f'src/assets/data/{level}_words.json', 'r', encoding='utf-8') as f:
            words = json.load(f)
            all_words.extend(words)

    return all_words


def extract_ecommerce_words() -> List[Dict]:
    """
    从词库中提取与跨境电商相关的单词

    Returns:
        相关单词列表
    """
    print("[进度] 加载核心词库...")
    all_words = load_all_words()
    print(f"[完成] 加载了 {len(all_words):,} 个单词")
    print()

    matched_words = []

    print("[进度] 搜索电商相关单词...")

    for word_obj in all_words:
        word = word_obj['word'].lower()
        translation = word_obj.get('translation', '').lower()
        definition = word_obj.get('definition', '').lower()

        # 检查是否包含电商关键词
        for keyword in ECOMMERCE_KEYWORDS:
            if keyword in word or keyword in translation or keyword in definition:
                matched_words.append(word_obj)
                break

    print(f"[完成] 找到 {len(matched_words)} 个相关单词")
    print()

    return matched_words


def categorize_word(word_obj: Dict) -> str:
    """
    根据单词含义进行分类

    Returns:
        分类标签
    """
    word = word_obj['word'].lower()
    translation = word_obj.get('translation', '').lower()
    definition = word_obj.get('definition', '').lower()

    # 运营类
    if any(kw in word or kw in translation or kw in definition for kw in
           ['manage', 'management', 'operate', 'operation', 'business',
            'company', 'strategy', 'plan', 'goal', 'growth', 'scale',
            'expand', 'optimize', 'improve', 'performance', 'analyze',
            'data', 'report', 'successful', 'invest', 'investment']):
        return '运营管理'

    # 选品类
    if any(kw in word or kw in translation or kw in definition for kw in
           ['product', 'niche', 'source', 'supplier', 'quality', 'price',
            'profit', 'margin', 'demand', 'market', 'competition',
            'inventory', 'stock', 'wholesale', 'retail', 'goods', 'item',
            'merchandise']):
        return '选品采购'

    # 引流营销类
    if any(kw in word or kw in translation or kw in definition for kw in
           ['traffic', 'customer', 'client', 'advertise', 'advertisement',
            'promote', 'promotion', 'campaign', 'brand', 'marketing',
            'audience', 'target', 'conversion', 'click', 'view', 'visit',
            'attract', 'engage', 'channel', 'platform', 'social', 'media',
            'content', 'influence', 'popular']):
        return '引流营销'

    # 支付财务类
    if any(kw in word or kw in translation or kw in definition for kw in
           ['payment', 'pay', 'buy', 'purchase', 'order', 'transaction',
            'checkout', 'credit', 'debit', 'card', 'secure', 'verify',
            'confirm', 'settle', 'settlement', 'commission', 'fee',
            'charge', 'cost', 'discount', 'coupon', 'voucher', 'currency',
            'budget', 'sales', 'revenue', 'risk']):
        return '支付财务'

    # 物流售后类
    if any(kw in word or kw in translation or kw in definition for kw in
           ['ship', 'shipping', 'deliver', 'delivery', 'logistics',
            'transport', 'warehouse', 'package', 'packaging', 'track',
            'tracking', 'express', 'carrier', 'freight', 'customs',
            'import', 'export', 'global', 'international', 'support',
            'service', 'complaint', 'satisfaction', 'refund', 'return',
            'exchange']):
        return '物流售后'

    return '通用'


def select_top_50_words(matched_words: List[Dict]) -> List[Dict]:
    """
    从匹配的单词中选出最核心的 50 个

    策略：
    1. 优先选择高频词（Collins 星级高的）
    2. 每个类别均衡分布
    3. 优先选择核心业务词汇
    """
    # 按分类组织
    categorized = {
        '运营管理': [],
        '选品采购': [],
        '引流营销': [],
        '支付财务': [],
        '物流售后': []
    }

    for word_obj in matched_words:
        category = categorize_word(word_obj)
        if category in categorized:
            categorized[category].append(word_obj)

    # 每个类别选 10 个
    selected_words = []
    words_per_category = 10

    for category, words in categorized.items():
        # 按 Collins 星级排序（星级越高越核心）
        sorted_words = sorted(
            words,
            key=lambda x: (
                int(x.get('collins', 0)) if x.get('collins', '').isdigit() else 0,
                int(x.get('bnc', 0))
            ),
            reverse=True
        )

        # 选择前 N 个
        selected_words.extend(sorted_words[:words_per_category])

    # 如果不足 50 个，从剩余的词中补充
    if len(selected_words) < 50:
        remaining = [w for w in matched_words if w not in selected_words]
        selected_words.extend(remaining[:50 - len(selected_words)])

    return selected_words[:50]


def main():
    """主函数"""
    print("="*70)
    print("阶段3：场景词书清洗 - 跨境电商场景词库提取")
    print("="*70)
    print()

    # 提取电商相关单词
    matched_words = extract_ecommerce_words()

    # 选择最核心的 50 个
    print("[进度] 选择最核心的 50 个单词...")
    selected_words = select_top_50_words(matched_words)
    print(f"[完成] 选出了 {len(selected_words)} 个核心单词")
    print()

    # 按类别分组
    categorized = {
        '运营管理': [],
        '选品采购': [],
        '引流营销': [],
        '支付财务': [],
        '物流售后': []
    }

    for word_obj in selected_words:
        category = categorize_word(word_obj)
        if category in categorized:
            categorized[category].append(word_obj)

    # 输出表格
    print("="*70)
    print("跨境电商场景核心 50 词（按业务逻辑分类）")
    print("="*70)
    print()

    for category, words in categorized.items():
        if not words:
            continue

        print(f"\n{'─'*70}")
        print(f"【{category}】({len(words)} 个)")
        print(f"{'─'*70}")
        print()
        print(f"{'序号':<4} {'单词':<20} {'音标':<25} {'中文翻译':<30}")
        print(f"{'─'*70}")

        for i, word_obj in enumerate(words, 1):
            word = word_obj['word']
            phonetic = word_obj.get('phonetic', '')
            translation = word_obj.get('translation', '').split('\\n')[0][:30]

            print(f"{i:<4} {word:<20} {phonetic:<25} {translation:<30}")

    print()
    print("="*70)

    # 保存到文件
    output_file = 'src/assets/scenarios/scenario_ecommerce_sample.json'
    import os
    os.makedirs('src/assets/scenarios', exist_ok=True)

    # 保存完整信息（包括入选理由）
    output_data = []
    for category, words in categorized.items():
        for word_obj in words:
            word_obj['scenario_category'] = category
            word_obj['reason'] = f'{category}核心词汇'
            output_data.append(word_obj)

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 已保存到: {output_file}")
    print()


if __name__ == "__main__":
    main()
