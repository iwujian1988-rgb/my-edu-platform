#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段2：音标补全计划 - 验证更新结果
验证音标补全是否成功，统计更新情况
"""

import json
import os
import sys

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def verify_phonetic_update(level: str = "cet4"):
    """
    验证音标更新结果

    Args:
        level: 词库级别
    """
    print("="*70)
    print(f"验证 {level.upper()} 音标更新结果")
    print("="*70)
    print()

    word_file = f'src/assets/data/{level}_words.json'

    if not os.path.exists(word_file):
        print(f"[错误] 未找到词库文件: {word_file}")
        return

    # 加载词库
    with open(word_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    # 统计音标情况
    total = len(words)
    with_phonetic = 0
    without_phonetic = []
    suspicious = []

    for word in words:
        phonetic = word.get('phonetic', '').strip()

        if phonetic:
            with_phonetic += 1

            # 检查可疑的音标（太短或包含非 IPA 字符）
            if len(phonetic) < 3 or any(c in phonetic for c in ['?', '...']):
                suspicious.append({
                    'word': word['word'],
                    'phonetic': phonetic,
                    'reason': '音标格式可疑'
                })
        else:
            without_phonetic.append(word['word'])

    # 输出统计结果
    print(f"总单词数：{total:,}")
    print(f"有音标：{with_phonetic:,} ({with_phonetic/total*100:.2f}%)")
    print(f"无音标：{len(without_phonetic)} ({len(without_phonetic)/total*100:.2f}%)")
    print()

    # 输出缺失音标的单词
    if without_phonetic:
        print("="*70)
        print(f"仍然缺失音标的单词 ({len(without_phonetic)} 个)：")
        print("="*70)
        print()

        for word in without_phonetic:
            print(f"  - {word}")
        print()

    # 输出可疑的音标
    if suspicious:
        print("="*70)
        print(f"需要人工检查的音标 ({len(suspicious)} 个)：")
        print("="*70)
        print()

        for item in suspicious:
            print(f"  - {item['word']}: {item['phonetic']} ({item['reason']})")
        print()

    # 总结
    print("="*70)
    print("验证总结")
    print("="*70)
    print()

    coverage = with_phonetic / total * 100

    if coverage == 100:
        print("✓ 音标覆盖率：100% - 完美！")
    elif coverage >= 99:
        print(f"✓ 音标覆盖率：{coverage:.2f}% - 优秀！")
    elif coverage >= 95:
        print(f"✓ 音标覆盖率：{coverage:.2f}% - 良好")
    else:
        print(f"⚠ 音标覆盖率：{coverage:.2f}% - 需要改进")

    print()

    if without_phonetic:
        print(f"⚠ 仍有 {len(without_phonetic)} 个单词缺失音标")
        print("建议：重新运行音标生成脚本")

    if suspicious:
        print(f"⚠ 有 {len(suspicious)} 个音标需要人工检查")


def main():
    """主函数"""
    level = "cet4"  # 默认验证 CET4
    if len(sys.argv) > 1:
        level = sys.argv[1].lower()

    verify_phonetic_update(level)


if __name__ == "__main__":
    main()
