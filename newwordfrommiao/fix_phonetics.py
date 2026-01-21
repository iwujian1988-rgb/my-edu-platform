#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
修复词库中缺失的音标
从 ECDICT 重新加载音标并更新所有文件
"""

import json
import csv
import sys
from pathlib import Path

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def load_ecdict():
    """加载 ECDICT"""
    print("[加载] ECDICT 数据库...")

    project_root = Path(__file__).parent.parent
    ecdict_path = project_root / 'ecdict.csv'

    if not ecdict_path.exists():
        print("  ✗ ECDICT 未找到")
        return {}

    with open(ecdict_path, 'r', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        ecdict = {}
        for row in reader:
            word = row['word'].lower()
            phonetic = row.get('phonetic', '')
            if phonetic and word not in ecdict:
                ecdict[word] = phonetic

    print(f"  ✓ 加载了 {len(ecdict):,} 个词的音标")
    return ecdict


def convert_ipa_to_kk(ipa_phonetic):
    """IPA 到 K.K. 转换"""
    if not ipa_phonetic:
        return ipa_phonetic

    conversions = {
        'i:': 'i', 'ɪ': 'ɪ', 'ɛ': 'ɛ', 'æ': 'æ', 'ɑ:': 'ɑ',
        'ɔ:': 'ɔ', 'ʊ': 'ʊ', 'u:': 'u', 'ʌ': 'ʌ', 'ə:': 'ɚ',
        'ə': 'ə', 'eɪ': 'e', 'aɪ': 'aɪ', 'ɔɪ': 'ɔɪ', 'oʊ': 'o',
        'aʊ': 'aʊ', 'θ': 'θ', 'ð': 'ð', 'ʃ': 'ʃ', 'ʒ': 'ʒ',
        'tʃ': 'tʃ', 'dʒ': 'dʒ', 'ŋ': 'ŋ', 'r': 'r', 'ɹ': 'r',
        'ˈ': "'", 'ˌ': "'"
    }

    kk = ipa_phonetic
    for ipa, kk_sym in conversions.items():
        kk = kk.replace(ipa, kk_sym)

    return kk


def fix_file_phonetics(file_path, ecdict):
    """修复单个文件的音标"""
    print(f"\n[修复] {file_path.name}")

    with open(file_path, 'r', encoding='utf-8') as f:
        data = json.load(f)

    if 'words' not in data:
        print(f"  ✗ 无效的文件格式")
        return False

    words = data['words']
    fixed_count = 0

    for word_entry in words:
        word = word_entry['word'].lower()
        phonetic = word_entry.get('phonetic', {})

        # 如果音标为空或缺失，从 ECDICT 获取
        if not phonetic.get('kk') and word in ecdict:
            ipa = ecdict[word]
            kk = convert_ipa_to_kk(ipa)
            mw = ipa  # MW 使用 IPA

            phonetic['kk'] = kk
            phonetic['mw'] = mw
            phonetic['ipa'] = ipa

            word_entry['phonetic'] = phonetic
            fixed_count += 1

        # 确保 ipa 字段存在
        if 'ipa' not in phonetic and phonetic.get('kk'):
            phonetic['ipa'] = phonetic['kk']

    # 保存文件
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 修复了 {fixed_count} 个词的音标")
    return True


def main():
    """主函数"""
    print("="*80)
    print("修复词库音标")
    print("="*80)
    print()

    # 加载 ECDICT
    ecdict = load_ecdict()

    if not ecdict:
        print("✗ 无法继续，缺少 ECDICT 数据")
        return 1

    # 修复所有词库文件
    us_k12_dir = Path(__file__).parent.parent / 'src' / 'assets' / 'levels' / 'us_k12'

    files_to_fix = [
        us_k12_dir / 'grade1_sight_words.json',
        us_k12_dir / 'grade3_morphology.json',
        us_k12_dir / 'academic_tier2.json'
    ]

    for file_path in files_to_fix:
        if file_path.exists():
            fix_file_phonetics(file_path, ecdict)
        else:
            print(f"\n⚠ 文件不存在: {file_path.name}")

    print("\n" + "="*80)
    print("完成")
    print("="*80)
    return 0


if __name__ == "__main__":
    sys.exit(main())
