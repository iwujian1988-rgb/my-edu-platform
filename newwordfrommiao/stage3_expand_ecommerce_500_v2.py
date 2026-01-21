#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段3：场景词书清洗 - 跨境电商词库扩展（500+词汇版 v2）
使用更精确的匹配逻辑，确保词汇与电商场景高度相关
"""

import json
import sys
from typing import List, Dict, Set

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# 精确的电商核心词汇列表（直接指定要包含的词根/词缀）
ECOMMERCE_WORD_PATTERNS = {
    'product_sourcing': [
        'product', 'item', 'goods', 'merchand', 'commod', 'ware',
        'nich', 'categor', 'select', 'variet', 'assort',
        'source', 'supplier', 'vendor', 'manufact', 'factor', 'wholesal',
        'distribut', 'resell', 'dealer', 'agent', 'broker',
        'qualit', 'standard', 'grade', 'premium', 'authent', 'genuin',
        'featur', 'specif', 'descri', 'attribut',
        'materi', 'fabric', 'textur', 'design', 'styl', 'pattern',
        'pric', 'cost', 'valu', 'expens', 'cheap', 'afford',
        'profit', 'margin', 'markup', 'discount', 'bargain',
        'inventor', 'stock', 'storag', 'warehous', 'reserv',
        'demand', 'supply', 'shortag', 'surplu', 'trend', 'popular',
        'market', 'custom', 'client', 'consum', 'buyer', 'shop',
        'compet', 'rival', 'alternat', 'substitut',
        'research', 'analyz', 'analy', 'data', 'statist', 'report',
        'launch', 'releas', 'introduc', 'promot', 'advert', 'brand'
    ],

    'marketing_promotion': [
        'market', 'promot', 'advert', 'campaign', 'brand',
        'log', 'slogan', 'imag', 'reput', 'ident',
        'traffic', 'visit', 'view', 'impression', 'click', 'convers',
        'funnel', 'land', 'websit', 'store', 'shop',
        'content', 'blog', 'articl', 'review', 'testimon', 'feedback',
        'social', 'media', 'facebook', 'instagram', 'influenc',
        'email', 'newslett', 'subscrib', 'follow', 'audien', 'target',
        'seo', 'keyword', 'rank', 'search', 'engin', 'optim',
        'google', 'amazon', 'ebay', 'alibaba', 'platf', 'marketplac',
        'engag', 'attract', 'retain', 'loyal', 'satisfact', 'experi',
        'offer', 'propos', 'speci', 'limit', 'exclus',
        'coupon', 'voucher', 'gift', 'bonus', 'reward',
        'sale', 'clear', 'flash', 'event', 'season', 'holida'
    ],

    'payment_transaction': [
        'pa(y|ying)', 'checkout', 'transact', 'ord', 'purchas',
        'bu', 'sell', 'trade', 'exchang', 'deal',
        'credit', 'debit', 'card', 'visa', 'master', 'paypal',
        'sec', 'safe', 'protect', 'verif', 'confirm', 'valid',
        'process', 'handl', 'complet', 'finish', 'success',
        'refund', 'return', 'exchang', 'canc', 'disput', 'claim',
        'invoic', 'receipt', 'bill', 'statem', 'accou', 'balanc',
        'currenc', 'dollar', 'euro', 'pound', 'rate',
        'fe', 'charg', 'commiss', 'tax', 'va', 'dut',
        'install', 'financ', 'budget', 'capit', 'invest', 'spen',
        'author', 'capt', 'settl', 'transfer', 'wir'
    ],

    'logistics_shipping': [
        'ship', 'shipp', 'deliver', 'logist', 'transp',
        'carri', 'couri', 'servic', 'prov',
        'packag', 'parc', 'box', 'contain', 'wrap', 'pack',
        'track', 'trac', 'numb', 'statu', 'updat',
        'express', 'fast', 'standard', 'econom', 'speed', 'prior',
        'freight', 'cargo', 'shipm', 'consign', 'bulk',
        'custom', 'clear', 'declar', 'import', 'export', 'bord',
        'intern', 'glob', 'worldw', 'overse', 'cross',
        'address', 'contact', 'receiv', 'send', 'destin', 'orig',
        'warehous', 'depo', 'hub', 'cent', 'facil', 'locat',
        'dela', 'proble', 'issu', 'damag', 'loss', 'miss',
        'insur', 'guarant', 'promis', 'deadl'
    ],

    'operations_management': [
        'manag', 'administrat', 'oper', 'busin', 'compan', 'enterpr',
        'strateg', 'plan', 'goal', 'objec', 'aim',
        'grow', 'growth', 'scal', 'exp', 'increas', 'improv',
        'optim', 'effici', 'product', 'perform', 'resul',
        'team', 'staff', 'employ', 'hir', 'train', 'develop',
        'syst', 'softwar', 'tool', 'app', 'applic', 'platf',
        'autom', 'manu', 'proces', 'workf', 'proced',
        'report', 'analyt', 'dashb', 'metr', 'kpi', 'measur',
        'custom', 'servic', 'support', 'help', 'assist', 'car',
        'complaint', 'issu', 'resolv', 'solut', 'answer', 'repl',
        'polic', 'rule', 'term', 'condit', 'agre', 'contrac',
        'legal', 'compl', 'regul', 'law', 'requir'
    ],

    'data_analytics': [
        'data', 'inform', 'deta', 'fact', 'figur', 'statist',
        'analyz', 'analy', 'insigh', 'understand', 'learn', 'know',
        'report', 'chart', 'graph', 'tabl', 'visu', 'dashb',
        'metr', 'measur', 'indic', 'kpi', 'benchm',
        'trend', 'pattern', 'chang', 'increas', 'decreas', 'fluctu',
        'predict', 'forec', 'proj', 'estim', 'expect', 'plan',
        'compar', 'differ', 'simil', 'rat',
        'segme', 'group', 'categor', 'classif', 'filt', 'sor'
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


def word_matches_pattern(word: str, patterns: List[str]) -> bool:
    """
    检查单词是否匹配给定的模式列表

    Args:
        word: 要检查的单词
        patterns: 模式列表（支持部分匹配）

    Returns:
        是否匹配
    """
    word_lower = word.lower()

    for pattern in patterns:
        # 移除正则表达式特殊字符（简化处理）
        simple_pattern = pattern.replace('(', '').replace(')', '').replace('|', '')

        # 检查单词是否以该模式开头或包含该模式
        if word_lower.startswith(simple_pattern) or simple_pattern in word_lower:
            return True

    return False


def extract_ecommerce_words() -> Dict[str, List[Dict]]:
    """
    从词库中提取电商相关词汇，按分类组织（使用精确模式匹配）

    Returns:
        按分类组织的词汇字典
    """
    print("[进度] 加载核心词库...")
    all_words = load_all_words()
    print(f"[完成] 加载了 {len(all_words):,} 个单词\n")

    # 用于去重
    seen_words: Set[str] = set()
    categorized_words = {}

    print("[进度] 提取电商相关词汇（使用精确模式匹配）...")

    for word_obj in all_words:
        word = word_obj['word'].lower()

        # 跳过已经处理过的词
        if word in seen_words:
            continue

        # 检查是否匹配任何分类
        matched_category = None
        for category, patterns in ECOMMERCE_WORD_PATTERNS.items():
            if word_matches_pattern(word, patterns):
                matched_category = category
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
    print("阶段3：场景词书清洗 - 跨境电商词库扩展（500+词汇版 v2 - 精确匹配）")
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
