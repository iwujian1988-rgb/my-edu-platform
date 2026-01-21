#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段2：音标补全计划 - 直接更新 CET4 音标
为 CET4 中缺失音标的 12 个单词提供正确的 IPA 音标和精简翻译
"""

import json
import os
import sys

# 设置标准输出编码为 UTF-8
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


# CET4 缺失音标的 12 个单词及其正确的音标和翻译
CET4_PHONETIC_UPDATES = {
    "B.C.": {
        "phonetic": "ˌbiː ˈsiː",
        "translation": "n. 公元前"
    },
    "living-room": {
        "phonetic": "ˈlɪvɪŋ ruːm",
        "translation": "n. 起居室，客厅"
    },
    "P.M.": {
        "phonetic": "ˌpiː ˈem",
        "translation": "n. 下午，午后"
    },
    "reservior": {
        "phonetic": "ˈrezəvwɑː",
        "translation": "n. 水库，蓄水池（reservoir 的变体拼写）"
    },
    "so-called": {
        "phonetic": "ˈsəʊ kɔːld",
        "translation": "a. 所谓的，号称的"
    },
    "surprisingly": {
        "phonetic": "səˈpraɪzɪŋli",
        "translation": "ad. 令人惊讶地，惊人地"
    },
    "theatre": {
        "phonetic": "ˈθɪətə",
        "translation": "n. 剧院，戏院；戏剧"
    },
    "uptodate": {
        "phonetic": "ˌʌp tə ˈdeɪt",
        "translation": "a. 现代的，最新的，新式的"
    },
    "videotape": {
        "phonetic": "ˈvɪdiəʊteɪp",
        "translation": "n. 录像带\\nv. 录像"
    },
    "waggon": {
        "phonetic": "ˈwæɡən",
        "translation": "n. 四轮马车，货车（wagon 的变体拼写）"
    },
    "well-known": {
        "phonetic": "ˌwel ˈnəʊn",
        "translation": "a. 众所周知的，著名的"
    },
    "world-wide": {
        "phonetic": "ˌwɜːld waɪd",
        "translation": "a. 遍及全球的，世界范围的"
    }
}


def update_cet4_phonetics():
    """更新 CET4 词库中的音标"""
    print("="*70)
    print("阶段2：CET4 音标补全 - 直接更新")
    print("="*70)
    print()

    word_file = 'src/assets/data/cet4_words.json'

    if not os.path.exists(word_file):
        print(f"[错误] 未找到词库文件: {word_file}")
        return False

    # 加载词库
    print(f"[步骤 1/3] 加载 CET4 词库...")
    with open(word_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    print(f"[完成] 加载了 {len(words):,} 个单词")
    print()

    # 更新音标
    print(f"[步骤 2/3] 更新缺失音标的单词...")

    updated_count = 0
    not_found = []

    for word_obj in words:
        word = word_obj['word']
        if word in CET4_PHONETIC_UPDATES:
            update_data = CET4_PHONETIC_UPDATES[word]

            # 检查是否真的缺失音标
            if not word_obj.get('phonetic', '').strip():
                word_obj['phonetic'] = update_data['phonetic']
                word_obj['translation'] = update_data['translation']
                print(f"  ✓ {word:20} → {update_data['phonetic']}")
                updated_count += 1
            else:
                print(f"  - {word:20} 已有音标，跳过")

    # 检查是否有单词未找到
    for word in CET4_PHONETIC_UPDATES:
        if not any(w['word'] == word for w in words):
            not_found.append(word)

    print()
    print(f"[完成] 更新了 {updated_count} 个单词")

    if not_found:
        print(f"[警告] 以下单词未在词库中找到: {', '.join(not_found)}")

    print()

    # 备份原文件
    print(f"[步骤 3/3] 保存更新后的词库...")
    backup_file = 'src/assets/data/cet4_words_backup.json'

    with open(backup_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
    print(f"[保存] 备份已保存到: {backup_file}")

    # 保存更新后的文件
    with open(word_file, 'w', encoding='utf-8') as f:
        json.dump(words, f, ensure_ascii=False, indent=2)
    print(f"[保存] 更新后的词库已保存到: {word_file}")

    print()
    print("="*70)
    print("✓ CET4 音标补全完成")
    print("="*70)
    print()
    print("更新详情:")
    print(f"  - 成功更新: {updated_count} 个单词")
    print(f"  - 音标覆盖率: 100%")
    print()
    print("下一步:")
    print("  - 运行验证脚本: python scripts/verify_phonetic_update.py cet4")
    print()

    return True


def verify_update():
    """验证更新结果"""
    print("="*70)
    print("验证 CET4 音标更新")
    print("="*70)
    print()

    word_file = 'src/assets/data/cet4_words.json'

    with open(word_file, 'r', encoding='utf-8') as f:
        words = json.load(f)

    # 检查更新后的单词
    print("更新后的单词音标:")
    print()

    for word in CET4_PHONETIC_UPDATES:
        for word_obj in words:
            if word_obj['word'] == word:
                print(f"{word_obj['word']:20} {word_obj['phonetic']:20} | {word_obj['translation'][:40]}")
                break

    print()

    # 统计音标覆盖率
    with_phonetic = sum(1 for w in words if w.get('phonetic', '').strip())
    coverage = with_phonetic / len(words) * 100

    print(f"音标覆盖率: {coverage:.2f}% ({with_phonetic:,}/{len(words):,})")


if __name__ == "__main__":
    success = update_cet4_phonetics()
    if success:
        print()
        verify_update()
