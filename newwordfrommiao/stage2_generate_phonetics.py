#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
阶段2：音标补全计划 - 使用 Claude API 生成音标
为 CET4 词库中缺失音标的单词生成正确的 IPA 音标和精简翻译
"""

import json
import os
import sys
from typing import List, Dict

# 尝试导入 anthropic，如果没有安装则提示安装
try:
    from anthropic import Anthropic
except ImportError:
    print("[错误] 未安装 anthropic 包")
    print("请运行: pip install anthropic")
    sys.exit(1)


def load_missing_words(level: str = "cet4") -> List[Dict]:
    """
    从报告中加载缺失音标的单词

    Args:
        level: 词库级别 (cet4, cet6, ielts, toefl)

    Returns:
        缺失音标的单词列表
    """
    report_file = f'src/assets/reports/stage2_phonetic_missing_report.json'

    if not os.path.exists(report_file):
        print(f"[错误] 未找到报告文件: {report_file}")
        print("请先运行 python phonetic_missing_report.py 生成报告")
        return []

    with open(report_file, 'r', encoding='utf-8') as f:
        report = json.load(f)

    if level not in report:
        print(f"[错误] 报告中未找到级别: {level}")
        return []

    return report[level]['words']


def load_word_list(level: str = "cet4") -> List[Dict]:
    """
   加载完整的词库文件

    Args:
        level: 词库级别

    Returns:
        完整的单词列表
    """
    word_file = f'src/assets/data/{level}_words.json'

    if not os.path.exists(word_file):
        print(f"[错误] 未找到词库文件: {word_file}")
        return []

    with open(word_file, 'r', encoding='utf-8') as f:
        return json.load(f)


def generate_phonetic_with_claude(word: str, context: Dict, api_key: str) -> Dict:
    """
    使用 Claude API 为单词生成音标和精简翻译

    Args:
        word: 单词
        context: 单词的上下文信息（翻译、定义等）
        api_key: Anthropic API Key

    Returns:
        包含音标和精简翻译的字典
    """
    client = Anthropic(api_key=api_key)

    # 构建提示词
    prompt = f"""请为以下英语单词提供标准的 IPA 音标和精简的中文翻译：

单词：{word}
当前翻译：{context.get('translation', '无')}
当前定义：{context.get('definition', '无')}

请按照以下 JSON 格式返回（不要包含其他文字）：
{{
    "phonetic": "IPA音标（使用标准 IPA 符号）",
    "translation": "精简的中文翻译（1-2 个词性，简洁明了）"
}}

要求：
1. 音标必须使用标准国际音标（IPA）
2. 如果是英式和美式发音不同，优先使用英式发音
3. 翻译要精简，只保留最常用的意思
4. 必须返回有效的 JSON 格式
5. 不要在 JSON 外添加任何其他文字

请直接返回 JSON："""

    try:
        response = client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=500,
            temperature=0.3,
            messages=[{
                "role": "user",
                "content": prompt
            }]
        )

        # 提取响应内容
        content = response.content[0].text.strip()

        # 尝试解析 JSON
        try:
            result = json.loads(content)
            return {
                'phonetic': result.get('phonetic', ''),
                'translation': result.get('translation', context.get('translation', ''))
            }
        except json.JSONDecodeError:
            # 如果直接解析失败，尝试提取 JSON 部分
            import re
            json_match = re.search(r'\{[^}]+\}', content, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group())
                return {
                    'phonetic': result.get('phonetic', ''),
                    'translation': result.get('translation', context.get('translation', ''))
                }
            else:
                print(f"  [警告] 无法解析 API 响应: {content}")
                return {'phonetic': '', 'translation': context.get('translation', '')}

    except Exception as e:
        print(f"  [错误] API 调用失败: {str(e)}")
        return {'phonetic': '', 'translation': context.get('translation', '')}


def update_word_list_with_phonetics(words: List[Dict], missing_words: List[Dict],
                                    api_key: str, level: str = "cet4") -> bool:
    """
    更新词库中的音标信息

    Args:
        words: 完整的单词列表
        missing_words: 缺失音标的单词列表
        api_key: Anthropic API Key
        level: 词库级别

    Returns:
        是否更新成功
    """
    print(f"\n{'='*70}")
    print(f"开始使用 Claude API 生成 {level.upper()} 音标")
    print(f"{'='*70}\n")

    # 创建单词查找映射
    missing_map = {w['word']: w for w in missing_words}

    updated_count = 0
    failed_words = []

    # 遍历所有单词，更新缺失音标的单词
    for i, word in enumerate(words):
        if word['word'] in missing_map:
            print(f"[{i+1}/{len(words)}] 处理单词: {word['word']}")

            # 使用 Claude API 生成音标
            result = generate_phonetic_with_claude(
                word['word'],
                missing_map[word['word']],
                api_key
            )

            if result['phonetic']:
                # 更新音标
                word['phonetic'] = result['phonetic']
                # 可选：更新翻译
                if result['translation']:
                    word['translation'] = result['translation']

                print(f"  ✓ 音标: {result['phonetic']}")
                if result['translation']:
                    print(f"  ✓ 翻译: {result['translation']}")
                updated_count += 1
            else:
                print(f"  ✗ 生成失败")
                failed_words.append(word['word'])

            print()

    # 保存更新后的词库
    if updated_count > 0:
        # 备份原文件
        word_file = f'src/assets/data/{level}_words.json'
        backup_file = f'src/assets/data/{level}_words_backup.json'

        print(f"[保存] 备份原文件到: {backup_file}")
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, indent=2)

        # 保存更新后的文件
        print(f"[保存] 更新后的文件保存到: {word_file}")
        with open(word_file, 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, indent=2)

        print(f"\n{'='*70}")
        print(f"更新完成")
        print(f"{'='*70}")
        print(f"成功更新: {updated_count} 个单词")
        print(f"更新失败: {len(failed_words)} 个单词")

        if failed_words:
            print(f"\n失败的单词: {', '.join(failed_words)}")

        return True
    else:
        print("[警告] 没有单词被更新")
        return False


def main():
    """主函数"""
    print("="*70)
    print("阶段2：全量音标强制补齐计划 - Claude API 音标生成")
    print("="*70)
    print()

    # 检查命令行参数
    level = "cet4"  # 默认处理 CET4
    if len(sys.argv) > 1:
        level = sys.argv[1].lower()

    # 检查 API Key
    api_key = os.environ.get('ANTHROPIC_API_KEY')
    if not api_key:
        print("[错误] 未设置 ANTHROPIC_API_KEY 环境变量")
        print()
        print("请设置您的 Anthropic API Key:")
        print("  Linux/Mac:  export ANTHROPIC_API_KEY='your-api-key'")
        print("  Windows:    set ANTHROPIC_API_KEY=your-api-key")
        print()
        print("或者直接在代码中设置（不推荐）")
        sys.exit(1)

    # 加载缺失音标的单词
    print(f"[步骤 1/3] 加载 {level.upper()} 缺失音标的单词...")
    missing_words = load_missing_words(level)

    if not missing_words:
        print(f"[错误] 未找到 {level.upper()} 缺失音标的单词")
        sys.exit(1)

    print(f"[完成] 找到 {len(missing_words)} 个缺失音标的单词")
    print()

    # 加载完整词库
    print(f"[步骤 2/3] 加载完整 {level.upper()} 词库...")
    word_list = load_word_list(level)

    if not word_list:
        print(f"[错误] 无法加载 {level.upper()} 词库")
        sys.exit(1)

    print(f"[完成] 加载了 {len(word_list)} 个单词")
    print()

    # 更新音标
    print(f"[步骤 3/3] 使用 Claude API 生成音标...")
    success = update_word_list_with_phonetics(word_list, missing_words, api_key, level)

    if success:
        print()
        print("="*70)
        print("✓ 音标补全完成")
        print("="*70)
        print()
        print("下一步:")
        print(f"  1. 检查更新后的文件: src/assets/data/{level}_words.json")
        print(f"  2. 运行验证脚本: python scripts/verify_phonetic_update.py --level {level}")
        print()
    else:
        print()
        print("="*70)
        print("✗ 音标补全失败")
        print("="*70)


if __name__ == "__main__":
    main()
