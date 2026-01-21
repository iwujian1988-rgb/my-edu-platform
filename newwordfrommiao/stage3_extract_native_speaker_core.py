#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
对比 CET4 和 US K-3 词库
提取：美国三年级小学生已掌握，但 CET4 缺失的生活高频词
作为"母语者口语核心"板块
"""

import json
import sys
from typing import List, Dict, Set

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_cet4_words() -> Set[str]:
    """加载 CET4 词库"""
    print("[1/3] 加载 CET4 词库...")

    try:
        with open('src/assets/data/cet4_words.json', 'r', encoding='utf-8') as f:
            cet4_words = json.load(f)

        cet4_word_set = {w['word'].lower() for w in cet4_words}
        print(f"  ✓ CET4 词库: {len(cet4_words)} 个词汇")
        return cet4_word_set

    except FileNotFoundError:
        print("  ✗ CET4 词库文件未找到")
        return set()


def load_k3_words() -> List[Dict]:
    """加载 US K-3 词库"""
    print("[2/3] 加载 US K-3 基础词库...")

    try:
        with open('src/assets/data/us_k12_foundation.json', 'r', encoding='utf-8') as f:
            k12_words = json.load(f)

        # 只保留 Grade 3 及以下的词（PreK-3）
        k3_words = [w for w in k12_words if w['metadata']['level'] == 'K-3']

        print(f"  ✓ K-3 词库: {len(k3_words)} 个词汇")

        # 按类型统计
        from collections import Counter
        word_types = Counter([w['metadata']['word_type'] for w in k3_words])
        dolch_levels = Counter([w['metadata'].get('dolch_level', 'N/A') for w in k3_words
                               if w['metadata']['word_type'] == 'dolch_sight_word'])

        print(f"    - Dolch Sight Words: {word_types.get('dolch_sight_word', 0)} 个")
        print(f"    - Tier 2 Academic: {word_types.get('tier2_academic', 0)} 个")

        return k3_words

    except FileNotFoundError:
        print("  ✗ K-3 词库文件未找到")
        return []


def find_native_speaker_core_words(cet4_words: Set[str], k3_words: List[Dict]) -> List[Dict]:
    """找出 K-3 中有但 CET4 中没有的词"""
    print("[3/3] 对比分析...")

    native_core_words = []

    for word_entry in k3_words:
        word_lower = word_entry['word'].lower()

        # 如果这个词不在 CET4 中
        if word_lower not in cet4_words:
            # 添加特殊标签
            word_entry['metadata']['scenario'] = 'native_speaker_core'
            word_entry['metadata']['tags'].append('not-in-cet4')
            word_entry['metadata']['tags'].append('life-essential')
            word_entry['metadata']['why_missing'] = '生活高频词，但非考试重点'

            native_core_words.append(word_entry)

    print(f"  ✓ 找到 {len(native_core_words)} 个母语者口语核心词")

    return native_core_words


def categorize_core_words(words: List[Dict]) -> Dict[str, List[Dict]]:
    """将核心词按类别分组"""
    print()
    print("词库分类统计...")

    categories = {
        'pronouns_articles': [],      # 代词、冠词
        'prepositions': [],            # 介词
        'verbs': [],                   # 动词
        'adjectives': [],              # 形容词
        'nouns': [],                   # 名词
        'conjunctions': [],            # 连词
        'numbers': [],                 # 数字
        'colors': [],                  # 颜色
        'time_weather': [],            # 时间天气
        'family_people': [],           # 家庭人物
        'daily_actions': [],           # 日常动作
        'feelings_emotions': [],       # 情感情绪
        'food_drinks': [],             # 食物饮料
        'clothing': [],                # 衣物
        'body_health': [],             # 身体健康
        'places_locations': [],        # 地点位置
        'academic_words': []           # 学术词汇
    }

    for word_entry in words:
        word = word_entry['word'].lower()
        pos = word_entry['definitions'][0]['part_of_speech'].lower()

        # 根据词性和单词分类
        if word in ['i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your',
                   'his', 'her', 'its', 'our', 'their', 'me', 'him', 'them',
                   'this', 'that', 'these', 'those', 'who', 'what', 'where',
                   'when', 'why', 'how', 'which', 'whose', 'whom']:
            categories['pronouns_articles'].append(word_entry)

        elif word in ['a', 'an', 'the']:
            categories['pronouns_articles'].append(word_entry)

        elif word in ['in', 'on', 'at', 'to', 'for', 'with', 'from', 'by',
                   'about', 'after', 'before', 'between', 'under', 'over',
                   'through', 'during', 'without', 'within', 'upon']:
            categories['prepositions'].append(word_entry)

        elif pos in ['conjunction', 'conj'] or word in ['and', 'but', 'or',
                   'so', 'because', 'although', 'though', 'if', 'when', 'while',
                   'since', 'until', 'unless']:
            categories['conjunctions'].append(word_entry)

        elif pos in ['verb', 'v'] or word in ['go', 'come', 'get', 'make', 'do',
                   'have', 'be', 'am', 'is', 'are', 'was', 'were', 'see', 'look',
                   'say', 'tell', 'ask', 'answer', 'give', 'take', 'put', 'let',
                   'help', 'play', 'work', 'call', 'try', 'need', 'seem', 'feel',
                   'become', 'leave', 'keep', 'begin', 'start', 'show', 'hear',
                   'play', 'run', 'walk', 'jump', 'sit', 'stand', 'sleep', 'eat',
                   'drink', 'write', 'read', 'speak', 'talk', 'sing', 'draw']:
            categories['verbs'].append(word_entry)

        elif word in ['one', 'two', 'three', 'four', 'five', 'six', 'seven',
                   'eight', 'nine', 'ten', 'first', 'second', 'third', 'once',
                   'twice', 'all', 'some', 'many', 'much', 'few', 'more', 'most']:
            categories['numbers'].append(word_entry)

        elif word in ['red', 'blue', 'yellow', 'green', 'orange', 'purple',
                   'black', 'white', 'brown', 'pink', 'gray', 'color', 'colour']:
            categories['colors'].append(word_entry)

        elif word in ['morning', 'afternoon', 'evening', 'night', 'day', 'week',
                   'month', 'year', 'today', 'tomorrow', 'yesterday', 'now', 'soon',
                   'early', 'late', 'always', 'never', 'sometimes', 'sun', 'rain',
                   'snow', 'wind', 'cloud', 'hot', 'cold', 'warm', 'cool']:
            categories['time_weather'].append(word_entry)

        elif word in ['mother', 'father', 'mom', 'dad', 'parent', 'family',
                   'brother', 'sister', 'child', 'baby', 'friend', 'teacher',
                   'student', 'boy', 'girl', 'man', 'woman', 'people', 'person']:
            categories['family_people'].append(word_entry)

        elif word in ['eat', 'drink', 'sleep', 'play', 'work', 'study', 'learn',
                   'teach', 'read', 'write', 'draw', 'sing', 'dance', 'run', 'walk',
                   'jump', 'sit', 'stand', 'help', 'give', 'take', 'make', 'get']:
            categories['daily_actions'].append(word_entry)

        elif word in ['happy', 'sad', 'angry', 'afraid', 'scared', 'sorry', 'glad',
                   'glad', 'proud', 'excited', 'tired', 'hungry', 'thirsty']:
            categories['feelings_emotions'].append(word_entry)

        elif word in ['food', 'eat', 'drink', 'water', 'milk', 'bread', 'fruit',
                   'apple', 'banana', 'cake', 'cookie', 'candy', 'ice', 'cream',
                   'breakfast', 'lunch', 'dinner', 'supper', 'meal']:
            categories['food_drinks'].append(word_entry)

        elif word in ['clothes', 'shirt', 'dress', 'shoe', 'sock', 'hat', 'coat',
                   'jacket', 'pants', 'pocket', 'wear']:
            categories['clothing'].append(word_entry)

        elif word in ['body', 'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'hand',
                   'foot', 'arm', 'leg', 'back', 'heart', 'sick', 'hurt', 'pain']:
            categories['body_health'].append(word_entry)

        elif word in ['home', 'house', 'room', 'school', 'park', 'store', 'shop',
                   'library', 'office', 'hospital', 'here', 'there', 'where']:
            categories['places_locations'].append(word_entry)

        elif word_entry['metadata']['word_type'] == 'tier2_academic':
            categories['academic_words'].append(word_entry)

        elif pos in ['adjective', 'adj', 'a']:
            categories['adjectives'].append(word_entry)

        else:
            categories['nouns'].append(word_entry)

    # 输出统计
    for cat_name, cat_words in categories.items():
        if cat_words:
            print(f"  {cat_name}: {len(cat_words)} 个")

    return categories


def main():
    """主函数"""
    print("="*80)
    print("提取：母语者口语核心词（美国3年级掌握，CET4缺失）")
    print("="*80)
    print()

    # 加载词库
    cet4_words = load_cet4_words()
    k3_words = load_k3_words()

    if not cet4_words or not k3_words:
        print("✗ 词库加载失败，退出")
        return

    # 找出核心词
    native_core_words = find_native_speaker_core_words(cet4_words, k3_words)

    # 分类
    categorized = categorize_core_words(native_core_words)

    print()
    print("="*80)
    print("词汇示例展示（每类前5个）")
    print("="*80)
    print()

    # 展示每类示例
    for cat_name, cat_words in categorized.items():
        if not cat_words:
            continue

        print(f"【{cat_name}】({len(cat_words)} 个)")
        for word_entry in cat_words[:5]:
            word = word_entry['word']
            meaning = word_entry['definitions'][0]['meaning_en'][:60]
            example = word_entry['definitions'][0]['examples'][0]['sentence_en'][:60]
            dolch_level = word_entry['metadata'].get('dolch_level', 'N/A')

            print(f"  - {word:<15} [{dolch_level}]")
            print(f"    释义: {meaning}...")
            print(f"    例句: {example}...")
            print()

        if len(cat_words) > 5:
            print(f"  ... 还有 {len(cat_words) - 5} 个\n")

    # 保存完整词库
    all_core_words = []
    for cat_words in categorized.values():
        all_core_words.extend(cat_words)

    import os
    os.makedirs('src/assets/scenarios', exist_ok=True)

    output_file = 'src/assets/scenarios/native_speaker_core.json'

    # 添加元数据
    output_data = {
        'meta': {
            'title': 'Native Speaker Core Vocabulary',
            'description': '美国3年级小学生已掌握，但CET4词库缺失的生活高频词',
            'total_words': len(all_core_words),
            'source': 'Dolch Sight Words + Tier 2 Academic (K-3)',
            'target_audience': '中国英语学习者（补充生活口语词汇）',
            'created_at': '2026-01-11'
        },
        'categories': {
            cat_name: len(cat_words)
            for cat_name, cat_words in categorized.items()
            if cat_words
        },
        'words': all_core_words
    }

    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print("="*80)
    print(f"✅ 已保存到: {output_file}")
    print(f"   总计: {len(all_core_words)} 个母语者口语核心词")
    print("="*80)


if __name__ == "__main__":
    main()
