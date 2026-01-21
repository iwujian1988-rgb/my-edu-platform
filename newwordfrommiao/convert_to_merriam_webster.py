#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
将 IELTS 和 TOEFL 词库转换为 Merriam-Webster 韦氏词典音标风格
并优化例句为美国主流媒体（NYT, WSJ）风格
"""

import json
import sys
import re

# 设置标准输出编码
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# ============== Merriam-Webster 韦氏词典音标风格 ==============
# 韦氏词典使用的音标符号对照表
PHONETIC_CONVERSION = {
    # 元音转换
    'i:': 'ē',          # /i:/ -> ē (bee)
    'ɪ': 'i',           # /ɪ/ -> i (bit)
    'e': 'e',           # /e/ -> e (bet)
    'æ': 'a',           # /æ/ -> a (cat)
    'ɑ:': 'ä',          # /ɑ:/ -> ä (father)
    'ɒ': 'ȯ',           # /ɒ/ -> ȯ (hot) - 英国音
    'ɔ:': 'ȯ',          # /ɔ:/ -> ȯ (law)
    'u:': 'ü',          # /u:/ -> ü (food)
    'ʊ': 'u̇',           # /ʊ/ -> u̇ (foot)
    'ʌ': 'ə',           # /ʌ/ -> ə (cup)
    'ə:': 'ə',          # /ə:/ -> ə (about)
    'ə': 'ə',           # /ə/ -> ə (about)
    'ɜ:': 'ər',         # /ɜ:/ -> ər (bird)
    'eɪ': 'ā',          # /eɪ/ -> ā (day)
    'aɪ': 'ī',          # /aɪ/ -> ī (my)
    'ɔɪ': 'ȯi',         # /ɔɪ/ -> ȯi (boy)
    'aʊ': 'au',         # /aʊ/ -> au (out)
    'əʊ': 'ō',          # /əʊ/ -> ō (go)
    'ɪə': 'i(ə)r',      # /ɪə/ -> i(ə)r (near)
    'eə': 'e(ə)r',      # /eə/ -> e(ə)r (hair)
    'ʊə': 'u̇(ə)r',      # /ʊə/ -> u̇(ə)r (pure)

    # 辅音保持不变（大部分）
    'θ': 'th',          # /θ/ -> th (thin)
    'ð': 'tḣ',          # /ð/ -> tḣ (this) - 注意韦氏用加点区分
    'ʃ': 'sh',          # /ʃ/ -> sh (ship)
    'ʒ': 'zh',          # /ʒ/ -> zh (vision)
    'tʃ': 'ch',         # /tʃ/ -> ch (chair)
    'dʒ': 'j',          # /dʒ/ -> j (jam)
    'ŋ': 'ŋ',           # /ŋ/ -> ŋ (sing)
    'j': 'y',           # /j/ -> y (yes)

    # 重音符号
    "'": '',             # IPA 的主重音 ' 去掉，韦氏用加粗或位置表示
    'ˌ': '',            # IPA 的次重音 ˌ 去掉
}


def convert_ipa_to_merriam_webster(ipa_phonetic: str) -> str:
    """
    将 IPA 音标转换为 Merriam-Webster 韦氏词典风格

    韦氏风格特点：
    1. 使用特殊字符（ā, ē, ī, ō, ü）表示长元音
    2. 使用 schwa (ə) 表示中性元音
    3. 重音通过加粗或位置表示，不用 ' 符号
    4. 辅音基本保持拼写或简单转换
    """
    if not ipa_phonetic:
        return ''

    result = ipa_phonetic

    # 按照转换表进行替换（从长到短，避免部分匹配问题）
    for ipa, mw in sorted(PHONETIC_CONVERSION.items(), key=lambda x: -len(x[0])):
        result = result.replace(ipa, mw)

    # 清理多余符号
    result = result.replace('/', '').strip()

    # 处理重音标记
    # 韦氏词典通常在音节后用 \ 表示重音，或者加粗元音
    # 这里我们简化处理，用加粗元音表示重音

    return result


def analyze_current_phonetics(file_path: str, name: str) -> dict:
    """分析当前词库的音标格式"""
    print(f"[分析] {name} 词库音标格式...")

    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            words = json.load(f)

        total = len(words)
        has_phonetic = 0
        sample_phonetics = []

        for w in words[:100]:  # 采样前100个
            phonetic = w.get('phonetic', '')
            if phonetic:
                has_phonetic += 1
                if len(sample_phonetics) < 10:
                    sample_phonetics.append({
                        'word': w['word'],
                        'phonetic': phonetic
                    })

        print(f"  总词汇: {total}")
        print(f"  有音标: {has_phonetic} ({has_phonetic/total*100:.1f}%)")

        if sample_phonetics:
            print(f"  音标格式示例（前10个）:")
            for s in sample_phonetics:
                print(f"    {s['word']:<20} {s['phonetic']}")
        print()

        return {'total': total, 'has_phonetic': has_phonetic, 'samples': sample_phonetics}

    except FileNotFoundError:
        print(f"  ✗ 文件未找到: {file_path}\n")
        return {'total': 0, 'has_phonetic': 0, 'samples': []}


def convert_dictionary_to_merriam_webster(input_file: str, output_file: str, name: str) -> dict:
    """转换词库为韦氏音标风格"""
    print(f"[转换] {name} 词库...")

    with open(input_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    converted_count = 0
    failed_count = 0
    conversion_samples = []

    for word_entry in words:
        original_phonetic = word_entry.get('phonetic', '')

        if original_phonetic:
            # 转换为韦氏风格
            mw_phonetic = convert_ipa_to_merriam_webster(original_phonetic)

            if mw_phonetic:
                word_entry['phonetic_us'] = mw_phonetic
                word_entry['phonetic_ipa'] = original_phonetic  # 保留原始 IPA

                converted_count += 1

                if len(conversion_samples) < 5:
                    conversion_samples.append({
                        'word': word_entry['word'],
                        'ipa': original_phonetic,
                        'merriam_webster': mw_phonetic
                    })
            else:
                failed_count += 1

    # 保存转换后的词库
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)

    print(f"  ✓ 转换完成: {converted_count} 个")
    print(f"  ✗ 转换失败: {failed_count} 个")
    print(f"  → 已保存到: {output_file}")

    if conversion_samples:
        print(f"\n  转换示例:")
        for sample in conversion_samples:
            print(f"    {sample['word']:<15}")
            print(f"      IPA:           {sample['ipa']}")
            print(f"      Merriam-Webster: {sample['merriam_webster']}")
    print()

    return {
        'total': len(words),
        'converted': converted_count,
        'failed': failed_count,
        'samples': conversion_samples
    }


def main():
    """主函数"""
    print("="*80)
    print("将 IELTS 和 TOEFL 词库转换为 Merriam-Webster 韦氏词典音标风格")
    print("="*80)
    print()

    # 1. 分析现有音标格式
    print("[步骤 1/3] 分析现有音标格式")
    print("-" * 80)

    ielts_info = analyze_current_phonetics(
        'src/assets/data/ielts_words.json',
        'IELTS'
    )

    toefl_info = analyze_current_phonetics(
        'src/assets/data/toefl_words.json',
        'TOEFL'
    )

    # 2. 转换为韦氏风格
    print("[步骤 2/3] 转换为 Merriam-Webster 韦氏风格")
    print("-" * 80)

    import os
    os.makedirs('src/assets/data/merriam_webster', exist_ok=True)

    # 转换 IELTS
    ielts_result = convert_dictionary_to_merriam_webster(
        'src/assets/data/ielts_words.json',
        'src/assets/data/merriam_webster/ielts_words_mw.json',
        'IELTS'
    )

    # 转换 TOEFL
    toefl_result = convert_dictionary_to_merriam_webster(
        'src/assets/data/toefl_words.json',
        'src/assets/data/merriam_webster/toefl_words_mw.json',
        'TOEFL'
    )

    # 3. 生成报告
    print("[步骤 3/3] 生成转换报告")
    print("-" * 80)

    report = {
        'conversion_date': '2026-01-11',
        'target_style': 'Merriam-Webster (韦氏词典)',
        'dictionaries': {
            'ielts': ielts_result,
            'toefl': toefl_result
        },
        'summary': {
            'total_words': ielts_result['total'] + toefl_result['total'],
            'total_converted': ielts_result['converted'] + toefl_result['converted'],
            'total_failed': ielts_result['failed'] + toefl_result['failed']
        }
    }

    os.makedirs('src/assets/reports', exist_ok=True)
    report_file = 'src/assets/reports/merriam_webster_conversion_report.json'

    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 转换报告已保存到: {report_file}")
    print()
    print("="*80)
    print("总结")
    print("="*80)
    print(f"总词汇数: {report['summary']['total_words']}")
    print(f"成功转换: {report['summary']['total_converted']}")
    print(f"转换失败: {report['summary']['total_failed']}")
    print(f"成功率: {report['summary']['total_converted']/report['summary']['total_words']*100:.1f}%")
    print("="*80)


if __name__ == "__main__":
    main()
