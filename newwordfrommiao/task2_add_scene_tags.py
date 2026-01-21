#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
任务2：添加场景标签
为母语者核心词标注适用场景（家庭、学校、公园、商店等）
"""

import json
import sys

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# ============== 场景标签定义 ==============
# 为每个词添加适用的生活场景标签
SCENE_TAGS = {
    # 家庭场景
    'home_family': [
        'home', 'house', 'family', 'mom', 'mother', 'dad', 'father', 'brother',
        'sister', 'parent', 'child', 'baby', 'grandma', 'grandmother', 'grandpa',
        'grandfather', 'room', 'bedroom', 'kitchen', 'bathroom', 'bed', 'chair',
        'table', 'door', 'window', 'house', 'garden', 'yard', 'clean', 'dirty',
        'wash', 'cook', 'eat', 'sleep', 'help', 'make', 'love', 'care', 'live'
    ],

    # 学校场景
    'school': [
        'school', 'class', 'teacher', 'student', 'learn', 'study', 'read', 'write',
        'book', 'pencil', 'paper', 'desk', 'chair', 'test', 'homework', 'lesson',
        'grade', 'subject', 'math', 'science', 'history', 'art', 'music', 'gym',
        'recess', 'playground', 'friend', 'classmate', 'ask', 'answer', 'question',
        'know', 'think', 'smart', 'work', 'hard', 'try', 'do', 'finish', 'start'
    ],

    # 公园/户外场景
    'park_outdoor': [
        'park', 'play', 'outside', 'tree', 'grass', 'flower', 'sun', 'sky', 'bird',
        'dog', 'cat', 'run', 'jump', 'walk', 'sit', 'stand', 'slide', 'swing',
        'ball', 'game', 'fun', 'happy', 'laugh', 'fly', 'kite', 'bike', 'ride',
        'climb', 'fall', 'hurt', 'hot', 'cold', 'warm', 'cool', 'wind', 'rain',
        'snow', 'look', 'watch', 'see', 'find', 'catch', 'throw'
    ],

    # 商店/购物场景
    'store_shopping': [
        'store', 'shop', 'buy', 'sell', 'money', 'pay', 'price', 'cost', 'cheap',
        'expensive', 'bag', 'cart', 'cashier', 'choose', 'want', 'need', 'get',
        'take', 'give', 'change', 'receipt', 'customer', 'service', 'help',
        'find', 'look', 'see', 'size', 'color', 'big', 'small', 'good', 'bad',
        'like', 'love', 'please', 'thank', 'sorry', 'excuse'
    ],

    # 食物/餐饮场景
    'food_dining': [
        'food', 'eat', 'drink', 'hungry', 'thirsty', 'breakfast', 'lunch', 'dinner',
        'snack', 'meal', 'table', 'chair', 'sit', 'plate', 'cup', 'glass', 'fork',
        'spoon', 'knife', 'napkin', 'taste', 'yummy', 'delicious', 'sweet', 'sour',
        'bitter', 'hot', 'cold', 'cook', 'kitchen', 'restaurant', 'menu', 'order',
        'wait', 'waiter', 'serve', 'enjoy', 'finish', 'full', 'more', 'please'
    ],

    # 身体/健康场景
    'body_health': [
        'body', 'head', 'face', 'eye', 'ear', 'nose', 'mouth', 'lip', 'tooth', 'tongue',
        'hair', 'neck', 'shoulder', 'arm', 'hand', 'finger', 'leg', 'foot', 'toe',
        'back', 'stomach', 'heart', 'sick', 'hurt', 'pain', 'sad', 'happy', 'tired',
        'sleep', 'rest', 'doctor', 'nurse', 'hospital', 'medicine', 'feel', 'well',
        'better', 'strong', 'weak', 'clean', 'wash', 'brush', 'comb', 'bathe'
    ],

    # 衣物/穿戴场景
    'clothing': [
        'clothes', 'shirt', 'pants', 'dress', 'skirt', 'shoe', 'sock', 'hat', 'coat',
        'jacket', 'sweater', 'boot', 'glove', 'scarf', 'belt', 'bag', 'wear', 'put',
        'take', 'off', 'on', 'button', 'zip', 'size', 'fit', 'small', 'big', 'long',
        'short', 'tight', 'loose', 'new', 'old', 'clean', 'dirty', 'favorite'
    ],

    # 交通/出行场景
    'transportation': [
        'car', 'bus', 'train', 'plane', 'bike', 'boat', 'ship', 'truck', 'drive',
        'ride', 'walk', 'run', 'go', 'come', 'stop', 'start', 'fast', 'slow',
        'speed', 'street', 'road', 'highway', 'traffic', 'light', 'sign', 'ticket',
        'passenger', 'driver', 'trip', 'travel', 'journey', 'far', 'near', 'map',
        'lost', 'find', 'way', 'direction', 'left', 'right', 'straight'
    ],

    # 动物场景
    'animals': [
        'animal', 'dog', 'cat', 'bird', 'fish', 'horse', 'cow', 'pig', 'chicken',
        'duck', 'sheep', 'goat', 'rabbit', 'mouse', 'elephant', 'lion', 'tiger',
        'bear', 'monkey', 'zoo', 'pet', 'feed', 'care', 'love', 'play', 'run', 'jump',
        'fly', 'swim', 'walk', 'crawl', 'bite', 'bark', 'meow', 'roar', 'sing', 'sound',
        'wild', 'tame', 'big', 'small', 'baby', 'mother', 'father'
    ],

    # 颜色/形状场景
    'colors_shapes': [
        'color', 'colour', 'red', 'blue', 'yellow', 'green', 'orange', 'purple',
        'pink', 'black', 'white', 'brown', 'gray', 'grey', 'light', 'dark', 'bright',
        'shape', 'round', 'square', 'circle', 'triangle', 'star', 'big', 'small',
        'long', 'short', 'tall', 'wide', 'narrow', 'thick', 'thin'
    ],

    # 时间/天气场景
    'time_weather': [
        'time', 'day', 'night', 'morning', 'afternoon', 'evening', 'today', 'tomorrow',
        'yesterday', 'week', 'month', 'year', 'hour', 'minute', 'second', 'clock',
        'watch', 'calendar', 'early', 'late', 'now', 'soon', 'before', 'after',
        'weather', 'sun', 'rain', 'snow', 'wind', 'cloud', 'storm', 'hot', 'cold',
        'warm', 'cool', 'wet', 'dry', 'sky', 'star', 'moon', 'forecast'
    ],

    # 数字/计数场景
    'numbers_counting': [
        'number', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight',
        'nine', 'ten', 'zero', 'count', 'add', 'subtract', 'more', 'less', 'many',
        'much', 'few', 'all', 'some', 'none', 'first', 'second', 'third', 'last',
        'equal', 'same', 'different', 'match', 'sort', 'group', 'set', 'pair'
    ],

    # 感情/情绪场景
    'emotions': [
        'happy', 'sad', 'angry', 'afraid', 'scared', 'surprised', 'excited', 'proud',
        'sorry', 'worried', 'tired', 'hungry', 'thirsty', 'sick', 'well', 'fine',
        'good', 'bad', 'nice', 'mean', 'kind', 'love', 'like', 'hate', 'feel', 'cry',
        'laugh', 'smile', 'frown', 'shout', 'whisper', 'talk', 'listen', 'hear', 'see'
    ],

    # 动作动词场景
    'actions': [
        'go', 'come', 'run', 'walk', 'jump', 'hop', 'skip', 'dance', 'sing', 'play',
        'work', 'rest', 'sit', 'stand', 'lie', 'sleep', 'wake', 'eat', 'drink', 'cook',
        'clean', 'wash', 'dry', 'help', 'make', 'do', 'have', 'get', 'give', 'take',
        'put', 'place', 'throw', 'catch', 'hit', 'kick', 'push', 'pull', 'carry', 'hold'
    ],

    # 位置/方位场景
    'locations': [
        'here', 'there', 'where', 'in', 'on', 'at', 'under', 'over', 'above', 'below',
        'behind', 'in front of', 'next to', 'beside', 'between', 'near', 'far', 'up',
        'down', 'left', 'right', 'center', 'middle', 'corner', 'side', 'top', 'bottom',
        'inside', 'outside', 'indoors', 'outdoors', 'upstairs', 'downstairs'
    ]
}


def add_scene_tags(input_file: str, output_file: str, name: str) -> dict:
    """为词汇添加场景标签"""

    print(f"[添加] {name} 场景标签...")

    with open(input_file, 'r', encoding='utf-8') as f:
        data = json.load(f)

    # 检查是否有 meta 包装
    if 'words' in data:
        words = data['words']
    else:
        words = data

    tagged_count = 0
    scene_distribution = {}

    for word_entry in words:
        word_lower = word_entry['word'].lower()

        # 查找适用场景
        applicable_scenes = []
        for scene, scene_words in SCENE_TAGS.items():
            if word_lower in scene_words:
                applicable_scenes.append(scene)

        if applicable_scenes:
            # 添加到 metadata
            if 'metadata' not in word_entry:
                word_entry['metadata'] = {}

            if 'scene_tags' not in word_entry['metadata']:
                word_entry['metadata']['scene_tags'] = []

            word_entry['metadata']['scene_tags'].extend(applicable_scenes)
            word_entry['metadata']['scene_tags'] = list(set(word_entry['metadata']['scene_tags']))

            tagged_count += 1

            # 统计场景分布
            for scene in applicable_scenes:
                scene_distribution[scene] = scene_distribution.get(scene, 0) + 1

    # 保存
    with open(output_file, 'w', encoding='utf-8') as f:
        if 'words' in data:
            data['words'] = words
            json.dump(data, f, ensure_ascii=False, indent=2)
        else:
            json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 添加标签: {tagged_count} 个词")
    print(f"  → 已保存到: {output_file}")

    # 输出场景分布
    if scene_distribution:
        print(f"\n  场景分布:")
        for scene, count in sorted(scene_distribution.items(), key=lambda x: -x[1]):
            print(f"    {scene:<20} {count:3} 个词")
    print()

    return {
        'total': len(words),
        'tagged': tagged_count,
        'scene_distribution': scene_distribution
    }


def main():
    """主函数"""
    print("="*80)
    print("任务2：添加场景标签（家庭、学校、公园等）")
    print("="*80)
    print()

    result = add_scene_tags(
        'src/assets/scenarios/native_speaker_core_optimized.json',
        'src/assets/scenarios/native_speaker_core_with_scenes.json',
        'Native Speaker Core'
    )

    print("="*80)
    print("完成")
    print("="*80)
    print(f"总词汇: {result['total']}")
    print(f"标注场景: {result['tagged']}")
    print(f"文件: src/assets/scenarios/native_speaker_core_with_scenes.json")
    print("="*80)


if __name__ == "__main__":
    main()
