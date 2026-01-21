#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
任务5：生成TTS音韵列表（配音参考）
为词汇库生成适合TTS或真人配音的参考列表
"""

import json
import csv
import sys
import os

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_json_file(filepath):
    """加载 JSON 文件"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 处理两种结构
        if 'words' in data:
            return data['words'], data.get('meta', {})
        else:
            return data, {}
    except FileNotFoundError:
        print(f"  ✗ 文件未找到: {filepath}")
        return [], {}


def create_pronunciation_list(input_files, output_csv, output_json):
    """创建发音列表"""

    print("[生成] TTS发音参考列表...")

    all_words = []
    word_ids = set()

    # 加载所有词汇源
    for source_info in input_files:
        filepath = source_info['file']
        source_name = source_info['name']
        priority = source_info.get('priority', 0)

        print(f"  加载: {source_name}")

        words, meta = load_json_file(filepath)

        for word_entry in words:
            word = word_entry.get('word', '').strip()
            word_id = word_entry.get('word_id', '')

            if not word:
                continue

            # 去重（保留优先级最高的）
            if word_id in word_ids:
                continue
            word_ids.add(word_id)

            # 获取音标
            phonetic_us = word_entry.get('phonetic', {}).get('us', '')
            phonetic_uk = word_entry.get('phonetic', {}).get('uk', '')

            # 如果没有音标，尝试从定义中获取
            if not phonetic_us and not phonetic_uk:
                # 简单的音标推断（基于常见模式）
                phonetic_us = ''

            # 获取定义
            meaning_cn = ''
            meaning_en = ''
            pos = 'unknown'

            if 'definitions' in word_entry and word_entry['definitions']:
                defn = word_entry['definitions'][0]
                meaning_cn = defn.get('meaning_cn', '')
                meaning_en = defn.get('meaning_en', '')
                pos = defn.get('part_of_speech', 'unknown')

            # 获取元数据
            metadata = word_entry.get('metadata', {})
            level = metadata.get('level', metadata.get('grade_level', ''))
            word_type = metadata.get('word_type', '')

            # 构建发音条目
            pronunciation_entry = {
                'word': word,
                'word_id': word_id,
                'phonetic_us': phonetic_us,
                'phonetic_uk': phonetic_uk,
                'part_of_speech': pos,
                'meaning_cn': meaning_cn,
                'meaning_en': meaning_en,
                'level': level,
                'word_type': word_type,
                'source': source_name,
                'priority': priority,
                'frequency': metadata.get('frequency', '')
            }

            all_words.append(pronunciation_entry)

    # 按优先级和字母顺序排序
    all_words.sort(key=lambda x: (-x['priority'], x['word']))

    print(f"  ✓ 总词汇: {len(all_words)}")

    # 保存为 CSV
    print(f"\n[保存] CSV 格式...")
    with open(output_csv, 'w', encoding='utf-8-sig', newline='') as f:
        fieldnames = [
            'word', 'word_id', 'phonetic_us', 'phonetic_uk',
            'part_of_speech', 'meaning_cn', 'meaning_en',
            'level', 'source', 'priority'
        ]
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()

        for entry in all_words:
            writer.writerow({
                'word': entry['word'],
                'word_id': entry['word_id'],
                'phonetic_us': entry['phonetic_us'],
                'phonetic_uk': entry['phonetic_uk'],
                'part_of_speech': entry['part_of_speech'],
                'meaning_cn': entry['meaning_cn'],
                'meaning_en': entry['meaning_en'],
                'level': entry['level'],
                'source': entry['source'],
                'priority': entry['priority']
            })

    print(f"  → {output_csv}")

    # 保存为 JSON
    print(f"\n[保存] JSON 格式...")
    output_data = {
        'meta': {
            'title': 'TTS Pronunciation Reference List',
            'description': '词汇发音参考列表（用于TTS或真人配音）',
            'total_words': len(all_words),
            'created_at': '2026-01-11',
            'format': 'word_list_for_pronunciation'
        },
        'words': all_words
    }

    with open(output_json, 'w', encoding='utf-8') as f:
        json.dump(output_data, f, ensure_ascii=False, indent=2)

    print(f"  → {output_json}")

    return all_words


def create_batch_text_files(words, output_dir):
    """按批次创建文本文件（用于批量TTS处理）"""

    print(f"\n[创建] 批次文本文件...")

    os.makedirs(output_dir, exist_ok=True)

    # 按级别分组
    by_level = {}
    for word_entry in words:
        level = word_entry['level'] or 'other'
        if level not in by_level:
            by_level[level] = []
        by_level[level].append(word_entry)

    # 每个级别创建文本文件
    for level, level_words in sorted(by_level.items()):
        filename = os.path.join(output_dir, f'{level.replace(" ", "_").lower()}_words.txt')

        with open(filename, 'w', encoding='utf-8') as f:
            # 简单格式：每行一个单词
            for entry in level_words:
                f.write(entry['word'] + '\n')

        print(f"  → {filename} ({len(level_words)} words)")

    # 创建完整单词列表（一行一个）
    all_words_file = os.path.join(output_dir, 'all_words.txt')
    with open(all_words_file, 'w', encoding='utf-8') as f:
        for entry in words:
            f.write(entry['word'] + '\n')

    print(f"  → {all_words_file} ({len(words)} words)")

    # 创建带音标的列表（格式：word [phonetic]）
    phonetic_file = os.path.join(output_dir, 'words_with_phonetics.txt')
    with open(phonetic_file, 'w', encoding='utf-8') as f:
        for entry in words:
            if entry['phonetic_us']:
                f.write(f"{entry['word']} [{entry['phonetic_us']}]\n")
            else:
                f.write(f"{entry['word']}\n")

    print(f"  → {phonetic_file}")

    # 创建 CSV 格式的批次文件（每批100个词）
    batch_size = 100
    for i in range(0, len(words), batch_size):
        batch = words[i:i+batch_size]
        batch_num = i // batch_size + 1
        batch_file = os.path.join(output_dir, f'batch_{batch_num:03d}.csv')

        with open(batch_file, 'w', encoding='utf-8-sig', newline='') as f:
            writer = csv.writer(f)
            writer.writerow(['word', 'phonetic_us', 'meaning_cn', 'level'])

            for entry in batch:
                writer.writerow([
                    entry['word'],
                    entry['phonetic_us'],
                    entry['meaning_cn'],
                    entry['level']
                ])

        print(f"  → {batch_file} ({len(batch)} words)")


def main():
    """主函数"""
    print("="*80)
    print("任务5：生成TTS音韵列表（配音参考）")
    print("="*80)
    print()

    # 定义词汇源（按优先级排序）
    input_files = [
        {
            'file': 'src/assets/data/us_k12_foundation.json',
            'name': 'K-3 Foundation',
            'priority': 3  # 最高优先级
        },
        {
            'file': 'src/assets/scenarios/native_speaker_core_with_scenes.json',
            'name': 'Native Speaker Core',
            'priority': 2
        },
        {
            'file': 'src/assets/scenarios/grade_4_6_vocabulary.json',
            'name': 'Grade 4-6 Vocabulary',
            'priority': 1
        }
    ]

    # 创建输出目录
    output_dir = 'src/assets/pronunciation'
    os.makedirs(output_dir, exist_ok=True)

    # 生成发音列表
    words = create_pronunciation_list(
        input_files,
        f'{output_dir}/pronunciation_list.csv',
        f'{output_dir}/pronunciation_list.json'
    )

    # 创建批次文本文件
    create_batch_text_files(words, f'{output_dir}/batches')

    # 完成
    print("\n" + "="*80)
    print("完成")
    print("="*80)
    print(f"总词汇: {len(words)}")
    print(f"输出目录: {output_dir}")
    print()
    print("📤 使用说明：")
    print("  1. CSV/JSON 文件：包含完整的发音参考信息")
    print("  2. batches/ 目录：")
    print("     - *_words.txt: 按级别分组的纯文本单词列表")
    print("     - all_words.txt: 所有单词的纯文本列表")
    print("     - words_with_phonetics.txt: 带音标的单词列表")
    print("     - batch_*.csv: 分批CSV文件（每批100词，便于批量TTS）")
    print()
    print("  🎙️ TTS/配音建议：")
    print("     - 使用美式英语发音（US English）")
    print("     - 语速：正常 (1.0x)")
    print("     - 音调：自然、友好")
    print("     - 适用场景：儿童教育、语言学习")
    print("="*80)


if __name__ == "__main__":
    main()
