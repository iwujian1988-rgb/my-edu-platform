#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段3：场景词书清洗 - 跨境电商词库扩展（500+词汇版）
从核心词库中提取更全面的电商相关词汇，覆盖完整业务流程
"""

import json
import sys
from typing import List, Dict, Set

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# 扩展的电商关键词列表（覆盖完整业务流程）
ECOMMERCE_KEYWORDS = {
    # ========== 选品采购类 ==========
    'product_sourcing': [
        'product', 'item', 'goods', 'merchandise', 'commodity', 'ware',
        'niche', 'category', 'selection', 'variety', 'assortment',
        'source', 'supplier', 'vendor', 'manufacturer', 'factory', 'wholesale',
        'distributor', 'reseller', 'dealer', 'agent', 'broker',
        'quality', 'standard', 'grade', 'premium', 'authentic', 'genuine',
        'feature', 'specification', 'description', 'detail', 'attribute',
        'material', 'fabric', 'texture', 'design', 'style', 'pattern',
        'color', 'size', 'dimension', 'weight', 'measurement',
        'price', 'cost', 'value', 'worth', 'expensive', 'cheap', 'affordable',
        'profit', 'margin', 'markup', 'discount', 'bargain', 'deal',
        'inventory', 'stock', 'storage', 'warehouse', 'stockpile', 'reserve',
        'demand', 'supply', 'shortage', 'surplus', 'trend', 'popular', 'hot',
        'market', 'customer', 'client', 'consumer', 'buyer', 'shopper',
        'competition', 'competitor', 'rival', 'alternative', 'substitute',
        'research', 'analyze', 'analysis', 'data', 'statistics', 'report',
        'launch', 'release', 'introduce', 'promote', 'advertise', 'market'
    ],

    # ========== 营销推广类 ==========
    'marketing_promotion': [
        'marketing', 'promotion', 'advertising', 'campaign', 'brand',
        'branding', 'logo', 'slogan', 'image', 'reputation', 'identity',
        'traffic', 'visitor', 'view', 'impression', 'click', 'conversion',
        'funnel', 'landing', 'page', 'website', 'store', 'shop',
        'content', 'blog', 'article', 'review', 'testimonial', 'feedback',
        'social', 'media', 'facebook', 'instagram', 'tiktok', 'influencer',
        'email', 'newsletter', 'subscriber', 'follower', 'audience', 'target',
        'seo', 'keyword', 'ranking', 'search', 'engine', 'optimize',
        'google', 'amazon', 'ebay', 'alibaba', 'platform', 'marketplace',
        'engage', 'attract', 'retain', 'loyal', 'satisfaction', 'experience',
        'offer', 'proposal', 'deal', 'special', 'limited', 'exclusive',
        'coupon', 'voucher', 'code', 'gift', 'bonus', 'reward',
        'sale', 'clearance', 'flash', 'event', 'season', 'holiday'
    ],

    # ========== 支付交易类 ==========
    'payment_transaction': [
        'payment', 'pay', 'checkout', 'transaction', 'order', 'purchase',
        'buy', 'sell', 'trade', 'exchange', 'deal',
        'credit', 'debit', 'card', 'visa', 'mastercard', 'paypal',
        'secure', 'safe', 'protect', 'verify', 'confirm', 'validate',
        'process', 'handle', 'complete', 'finish', 'success', 'fail',
        'refund', 'return', 'exchange', 'cancel', 'dispute', 'claim',
        'invoice', 'receipt', 'bill', 'statement', 'account', 'balance',
        'currency', 'dollar', 'euro', 'pound', 'rate', 'exchange',
        'fee', 'charge', 'commission', 'tax', 'vat', 'duty',
        'installment', 'finance', 'budget', 'capital', 'invest', 'spend',
        'authorize', 'capture', 'settle', 'settlement', 'transfer', 'wire'
    ],

    # ========== 物流配送类 ==========
    'logistics_shipping': [
        'ship', 'shipping', 'delivery', 'deliver', 'logistics', 'transport',
        'carrier', 'courier', 'service', 'provider', 'company',
        'package', 'parcel', 'box', 'container', 'wrap', 'pack',
        'track', 'tracking', 'trace', 'number', 'status', 'update',
        'express', 'fast', 'standard', 'economy', 'speed', 'priority',
        'freight', 'cargo', 'shipment', 'consignment', 'bulk',
        'customs', 'clearance', 'declare', 'import', 'export', 'border',
        'international', 'global', 'worldwide', 'overseas', 'cross-border',
        'address', 'contact', 'receiver', 'sender', 'destination', 'origin',
        'warehouse', 'depot', 'hub', 'center', 'facility', 'location',
        'delay', 'problem', 'issue', 'damage', 'loss', 'missing',
        'insurance', 'protect', 'guarantee', 'promise', 'deadline'
    ],

    # ========== 运营管理类 ==========
    'operations_management': [
        'manage', 'management', 'manager', 'admin', 'administrator',
        'operate', 'operation', 'run', 'business', 'company', 'enterprise',
        'strategy', 'plan', 'goal', 'objective', 'target', 'aim',
        'grow', 'growth', 'scale', 'expand', 'increase', 'improve',
        'optimize', 'efficiency', 'productivity', 'performance', 'result',
        'team', 'staff', 'employee', 'hire', 'train', 'develop',
        'system', 'software', 'tool', 'app', 'application', 'platform',
        'automation', 'auto', 'manual', 'process', 'workflow', 'procedure',
        'report', 'analytics', 'dashboard', 'metric', 'kpi', 'measure',
        'customer', 'service', 'support', 'help', 'assist', 'care',
        'complaint', 'issue', 'resolve', 'solution', 'answer', 'reply',
        'policy', 'rule', 'term', 'condition', 'agreement', 'contract',
        'legal', 'comply', 'compliance', 'regulation', 'law', 'require'
    ],

    # ========== 数据分析类 ==========
    'data_analytics': [
        'data', 'information', 'detail', 'fact', 'figure', 'statistic',
        'analyze', 'analysis', 'insight', 'understand', 'learn', 'know',
        'report', 'chart', 'graph', 'table', 'visual', 'dashboard',
        'metric', 'measurement', 'indicator', 'kpi', 'benchmark',
        'trend', 'pattern', 'change', 'increase', 'decrease', 'fluctuate',
        'predict', 'forecast', 'project', 'estimate', 'expect', 'plan',
        'compare', 'comparison', 'difference', 'similarity', 'ratio',
        'segment', 'group', 'category', 'classify', 'filter', 'sort'
    ]
}


def load_all_words() -> List[Dict]:
    """加载所有核心词库"""
    all_words = []
    levels = ['cet4', 'cet6', 'ielts', 'toefl']
    for level in levels:
        try:
            with open(f'src/assets/data/{level}_words.json', 'r', encoding='utf-8') as f:
                words = json.load(f)
                all_words.extend(words)
        except FileNotFoundError:
            print(f"Warning: {level}_words.json not found")
    return all_words


def extract_ecommerce_words() -> Dict[str, List[Dict]]:
    """
    从词库中提取电商相关词汇，按分类组织

    Returns:
        按分类组织的词汇字典
    """
    print("[进度] 加载核心词库...")
    all_words = load_all_words()
    print(f"[完成] 加载了 {len(all_words):,} 个单词\n")

    # 用于去重
    seen_words: Set[str] = set()
    categorized_words = {}

    # 展平所有关键词到一个列表用于快速匹配
    all_keywords = []
    for category, keywords in ECOMMERCE_KEYWORDS.items():
        all_keywords.extend(keywords)

    print("[进度] 提取电商相关词汇...")

    for word_obj in all_words:
        word = word_obj['word'].lower()

        # 跳过已经处理过的词
        if word in seen_words:
            continue

        translation = word_obj.get('translation', '').lower()
        definition = word_obj.get('definition', '').lower()

        # 检查是否匹配任何电商关键词
        matched_category = None
        for category, keywords in ECOMMERCE_KEYWORDS.items():
            for keyword in keywords:
                if keyword in word or keyword in translation or keyword in definition:
                    matched_category = category
                    break
            if matched_category:
                break

        if matched_category:
            if matched_category not in categorized_words:
                categorized_words[matched_category] = []

            # 添加场景标签
            word_obj['scenario'] = 'ecommerce'
            word_obj['scenario_category'] = matched_category

            categorized_words[matched_category].append(word_obj)
            seen_words.add(word)

    # 输出统计
    print(f"[完成] 找到 {sum(len(words) for words in categorized_words.values()):,} 个相关词汇\n")

    for category, words in categorized_words.items():
        print(f"  {category}: {len(words)} 个")

    return categorized_words


def select_top_words_by_category(categorized_words: Dict[str, List[Dict]],
                                 words_per_category: int = 100) -> List[Dict]:
    """
    从每个分类中选择最重要的词汇

    Args:
        categorized_words: 按分类组织的词汇
        words_per_category: 每个分类选择的词汇数量

    Returns:
        选出的词汇列表
    """
    selected_words = []

    for category, words in categorized_words.items():
        # 按 Collins 星级和词频排序
        sorted_words = sorted(
            words,
            key=lambda x: (
                int(x.get('collins', 0)) if str(x.get('collins', '')).isdigit() else 0,
                int(x.get('bnc', 0)) if str(x.get('bnc', '')).replace(',', '').isdigit() else 0
            ),
            reverse=True
        )

        # 选择前 N 个
        selected = sorted_words[:words_per_category]
        selected_words.extend(selected)

        print(f"[选择] {category}: 选出 {len(selected)} 个核心词汇")

    return selected_words


def main():
    """主函数"""
    print("="*80)
    print("阶段3：场景词书清洗 - 跨境电商词库扩展（500+词汇版）")
    print("="*80)
    print()

    # 提取电商相关词汇
    categorized_words = extract_ecommerce_words()

    # 从每个分类中选择核心词汇（目标500+）
    print("\n[进度] 选择核心词汇...")

    # 根据分类数量动态调整每个分类的词汇数
    num_categories = len(categorized_words)
    target_total = 520  # 稍微多一点确保超过500
    words_per_category = max(90, target_total // num_categories + 5)  # 至少90个/分类

    selected_words = select_top_words_by_category(categorized_words, words_per_category)

    print(f"\n[完成] 总计选出 {len(selected_words)} 个核心词汇")

    # 保存到文件
    import os
    os.makedirs('src/assets/scenarios', exist_ok=True)

    output_file = 'src/assets/scenarios/scenario_ecommerce_500.json'
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(selected_words, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 已保存到: {output_file}")

    # 生成统计报告
    print("\n" + "="*80)
    print("词汇分类统计")
    print("="*80)

    category_count = {}
    for word in selected_words:
        cat = word['scenario_category']
        category_count[cat] = category_count.get(cat, 0) + 1

    for cat, count in sorted(category_count.items(), key=lambda x: x[1], reverse=True):
        print(f"  {cat}: {count} 个")

    print("="*80)


if __name__ == "__main__":
    main()
