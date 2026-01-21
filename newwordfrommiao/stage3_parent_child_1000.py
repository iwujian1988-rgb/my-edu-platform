#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段3：场景词书清洗 - 亲子英语词库（妈妈带娃场景，1000+词汇）
场景：妈妈在日常生活中潜移默化教孩子英语，达到小学水平
目标：3-12岁儿童，覆盖日常生活高频词汇
"""

import json
import sys
from typing import List, Dict, Set

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# 亲子英语场景关键词（按生活场景分类）
PARENT_CHILD_KEYWORDS = {
    # ========== 家庭与家居 ==========
    'family_home': [
        # 家庭成员
        'family', 'mother', 'mom', 'mama', 'father', 'dad', 'papa', 'parent',
        'child', 'kid', 'baby', 'son', 'daughter', 'brother', 'sister',
        'grandma', 'grandmother', 'grandpa', 'grandfather', 'uncle', 'aunt', 'cousin',

        # 房屋与房间
        'home', 'house', 'room', 'bedroom', 'living', 'kitchen', 'bathroom', 'toilet',
        'door', 'window', 'wall', 'floor', 'ceiling', 'roof', 'garden', 'yard',

        # 家具与用品
        'bed', 'chair', 'table', 'desk', 'shelf', 'lamp', 'clock', 'mirror',
        'sofa', 'carpet', 'rug', 'curtain', 'blanket', 'pillow', 'sheet'
    ],

    # ========== 身体与健康 ==========
    'body_health': [
        # 身体部位
        'body', 'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'lip',
        'tooth', 'tongue', 'hair', 'neck', 'shoulder', 'arm', 'hand', 'finger',
        'leg', 'foot', 'toe', 'back', 'stomach', 'heart',

        # 感觉与状态
        'hungry', 'thirsty', 'tired', 'sleepy', 'sick', 'hurt', 'pain',
        'happy', 'sad', 'angry', 'scared', 'afraid', 'worried', 'excited',

        # 健康与医生
        'health', 'doctor', 'nurse', 'hospital', 'medicine', 'pill', 'bandage',
        'temperature', 'fever', 'cold', 'cough', 'rest'
    ],

    # ========== 食物与饮食 ==========
    'food_drinking': [
        # 餐食时间
        'breakfast', 'lunch', 'dinner', 'supper', 'meal', 'snack',

        # 食物
        'food', 'rice', 'noodle', 'bread', 'egg', 'milk', 'water', 'juice',
        'meat', 'chicken', 'fish', 'beef', 'pork', 'fruit', 'apple', 'banana',
        'orange', 'vegetable', 'tomato', 'potato', 'carrot', 'cake', 'cookie',
        'candy', 'chocolate', 'ice', 'cream', 'sugar', 'salt', 'pepper',

        # 饮食动作
        'eat', 'drink', 'cook', 'taste', 'bite', 'chew', 'swallow', 'feed',
        'hungry', 'thirsty', 'full', 'delicious', 'yummy', 'sweet', 'sour'
    ],

    # ========== 日常活动 ==========
    'daily_activities': [
        # 基本动作
        'get', 'up', 'wake', 'sleep', 'go', 'come', 'walk', 'run', 'jump',
        'sit', 'stand', 'lie', 'dance', 'play', 'stop', 'start', 'begin',

        # 学习活动
        'read', 'write', 'draw', 'paint', 'color', 'learn', 'study', 'teach',
        'book', 'pencil', 'pen', 'paper', 'eraser', 'ruler', 'school', 'class',

        # 娱乐活动
        'game', 'toy', 'ball', 'doll', 'car', 'puzzle', 'block', 'watch', 'look',
        'listen', 'hear', 'speak', 'talk', 'say', 'tell', 'shout', 'whisper',

        # 日常事务
        'wash', 'clean', 'help', 'make', 'do', 'finish', 'start', 'work', 'rest'
    ],

    # ========== 衣服与穿着 ==========
    'clothes_wearing': [
        # 衣服
        'clothes', 'cloth', 'shirt', 't-shirt', 'dress', 'skirt', 'pants',
        'trousers', 'jeans', 'coat', 'jacket', 'sweater', 'shoe', 'sock',
        'hat', 'cap', 'glove', 'scarf', 'belt', 'bag', 'pocket',

        # 穿戴动作
        'wear', 'put', 'take', 'off', 'dress', 'undress', 'change', 'fit'
    ],

    # ========== 时间与天气 ==========
    'time_weather': [
        # 时间
        'time', 'day', 'night', 'morning', 'afternoon', 'evening', 'today',
        'tomorrow', 'yesterday', 'week', 'month', 'year', 'hour', 'minute',
        'early', 'late', 'now', 'soon', 'before', 'after',

        # 星期与月份
        'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
        'january', 'february', 'march', 'april', 'may', 'june',
        'july', 'august', 'september', 'october', 'november', 'december',

        # 天气
        'weather', 'sunny', 'rain', 'rainy', 'snow', 'snowy', 'wind', 'windy',
        'cloud', 'cloudy', 'storm', 'hot', 'cold', 'warm', 'cool', 'wet', 'dry'
    ],

    # ========== 颜色与形状 ==========
    'colors_shapes': [
        # 颜色
        'color', 'red', 'blue', 'yellow', 'green', 'orange', 'purple', 'pink',
        'black', 'white', 'gray', 'brown', 'gold', 'silver',

        # 形状
        'shape', 'round', 'circle', 'square', 'triangle', 'star', 'heart',
        'big', 'small', 'large', 'little', 'long', 'short', 'tall', 'high', 'low',
        'thick', 'thin', 'wide', 'narrow'
    ],

    # ========== 动物与自然 ==========
    'animals_nature': [
        # 动物
        'animal', 'dog', 'cat', 'bird', 'fish', 'rabbit', 'duck', 'chicken',
        'pig', 'cow', 'horse', 'sheep', 'goat', 'mouse', 'elephant', 'lion',
        'tiger', 'monkey', 'panda', 'bear', 'zoo', 'pet',

        # 自然
        'nature', 'tree', 'flower', 'grass', 'leaf', 'plant', 'sun', 'moon',
        'star', 'sky', 'cloud', 'mountain', 'hill', 'river', 'lake', 'sea',
        'ocean', 'beach', 'sand', 'stone', 'rock', 'water'
    ],

    # ========== 交通与方向 ==========
    'transport_direction': [
        # 交通工具
        'car', 'bus', 'train', 'plane', 'bike', 'bicycle', 'boat', 'ship',
        'taxi', 'subway', 'metro', 'truck', 'drive', 'ride', 'fly', 'walk',

        # 方向与位置
        'go', 'come', 'leave', 'arrive', 'enter', 'exit', 'in', 'out', 'up', 'down',
        'left', 'right', 'front', 'back', 'top', 'bottom', 'center', 'side',
        'here', 'there', 'where', 'near', 'far'
    ],

    # ========== 数字与计数 ==========
    'numbers_counting': [
        # 数字
        'number', 'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven',
        'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen',
        'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
        'thirty', 'forty', 'fifty', 'hundred', 'thousand',

        # 计数与量词
        'count', 'add', 'plus', 'minus', 'multiply', 'divide', 'half', 'quarter',
        'all', 'some', 'many', 'much', 'few', 'little', 'more', 'less', 'most',
        'first', 'second', 'third', 'last', 'next'
    ],

    # ========== 社交与情感 ==========
    'social_emotions': [
        # 社交
        'friend', 'love', 'like', 'help', 'share', 'give', 'take', 'thank',
        'please', 'sorry', 'excuse', 'hello', 'hi', 'goodbye', 'bye', 'welcome',
        'meet', 'know', 'name', 'call', 'answer', 'ask', 'tell', 'say',

        # 情感与性格
        'happy', 'sad', 'angry', 'afraid', 'brave', 'kind', 'nice', 'good',
        'bad', 'wrong', 'right', 'true', 'false', 'sure', 'maybe', 'yes', 'no'
    ]
}


def load_all_words() -> List[Dict]:
    """加载所有核心词库"""
    all_words = []
    levels = ['cet4', 'cet6', 'ielts', 'toefl', 'junior', 'senior']

    for level in levels:
        try:
            with open(f'src/assets/data/{level}_words.json', 'r', encoding='utf-8') as f:
                words = json.load(f)
                all_words.extend(words)
        except FileNotFoundError:
            continue

    return all_words


def word_matches_parent_child_scenario(word_obj: Dict) -> tuple:
    """
    检查单词是否匹配亲子英语场景

    Returns:
        (是否匹配, 匹配的分类)
    """
    word = word_obj['word'].lower()
    translation = word_obj.get('translation', '').lower()
    definition = word_obj.get('definition', '').lower()

    # 检查每个分类
    for category, keywords in PARENT_CHILD_KEYWORDS.items():
        for keyword in keywords:
            if keyword in word or keyword in translation or keyword in definition:
                return (True, category)

    return (False, None)


def extract_parent_child_words() -> Dict[str, List[Dict]]:
    """从词库中提取亲子英语相关词汇"""
    print("[进度] 加载核心词库...")
    all_words = load_all_words()
    print(f"[完成] 加载了 {len(all_words):,} 个单词\n")

    seen_words: Set[str] = set()
    categorized_words = {}

    print("[进度] 提取亲子英语相关词汇...")

    for word_obj in all_words:
        word = word_obj['word'].lower()

        # 跳过已处理
        if word in seen_words:
            continue

        # 检查是否匹配场景
        is_match, category = word_matches_parent_child_scenario(word_obj)

        if is_match and category:
            if category not in categorized_words:
                categorized_words[category] = []

            # 添加场景标签
            word_obj['scenario'] = 'parent_child'
            word_obj['scenario_category'] = category

            categorized_words[category].append(word_obj)
            seen_words.add(word)

    # 输出统计
    print(f"[完成] 找到 {sum(len(words) for words in categorized_words.values()):,} 个相关词汇\n")

    for category, words in categorized_words.items():
        print(f"  {category}: {len(words)} 个")

    return categorized_words


def select_top_words_by_category(categorized_words: Dict[str, List[Dict]],
                                 target_total: int = 1200) -> List[Dict]:
    """从每个分类中选择最重要的词汇"""
    num_categories = len(categorized_words)
    words_per_category = max(100, target_total // num_categories + 10)

    selected_words = []

    for category, words in categorized_words.items():
        # 按词频排序（优先选择高频词，更适合儿童学习）
        sorted_words = sorted(
            words,
            key=lambda x: (
                int(x.get('collins', 0)) if str(x.get('collins', '')).isdigit() else 0,
                int(str(x.get('bnc', '0')).replace(',', ''))
            ),
            reverse=True
        )

        selected = sorted_words[:words_per_category]
        selected_words.extend(selected)

        print(f"[选择] {category}: 选出 {len(selected)} 个核心词汇")

    return selected_words


def main():
    """主函数"""
    print("="*80)
    print("阶段3：场景词书清洗 - 亲子英语词库（妈妈带娃场景，1000+词汇）")
    print("="*80)
    print()

    # 提取词汇
    categorized_words = extract_parent_child_words()

    # 选择核心词汇（目标1000+）
    print("\n[进度] 选择核心词汇...")

    selected_words = select_top_words_by_category(categorized_words, target_total=1200)

    print(f"\n[完成] 总计选出 {len(selected_words)} 个核心词汇")

    # 保存到文件
    import os
    os.makedirs('src/assets/scenarios', exist_ok=True)

    output_file = 'src/assets/scenarios/scenario_parent_child_1000.json'
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

    print(f"\n总计: {len(selected_words)} 个词汇")
    print("="*80)


if __name__ == "__main__":
    main()
