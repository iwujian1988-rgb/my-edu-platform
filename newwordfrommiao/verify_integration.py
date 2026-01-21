#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
快速验证脚本 - 检查前端数据完整性
Quick Verification Script - Check Frontend Data Integrity
"""

import json
from pathlib import Path

FRONTEND_DATA_DIR = Path(__file__).parent.parent / "xiaoyu-english-v3/frontend/src/data"

def verify_file_exists(filepath: Path, name: str) -> bool:
    """检查文件是否存在"""
    if filepath.exists():
        size = filepath.stat().st_size
        print(f"[OK] {name}: {filepath.name} ({size:,} bytes)")
        return True
    else:
        print(f"[ERROR] {name}: 文件不存在 - {filepath}")
        return False

def verify_json_format(filepath: Path, name: str) -> bool:
    """检查JSON格式"""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
        print(f"[OK] {name}: JSON格式正确")
        return True
    except json.JSONDecodeError as e:
        print(f"[ERROR] {name}: JSON格式错误 - {e}")
        return False

def verify_books():
    """验证books.json"""
    filepath = FRONTEND_DATA_DIR / "books.json"
    print("\n[验证 books.json]")

    if not verify_file_exists(filepath, "词库文件"):
        return False

    if not verify_json_format(filepath, "词库文件"):
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        books = json.load(f)

    print(f"  - 词库数量: {len(books)}")
    if len(books) > 0:
        book = books[0]
        print(f"  - 词库ID: {book.get('id')}")
        print(f"  - 词库标题: {book.get('title')}")
        print(f"  - 总词汇: {book.get('totalWords')}")
        print(f"  - 总章节: {book.get('totalChapters')}")

    return True

def verify_chapters():
    """验证chapters.json"""
    filepath = FRONTEND_DATA_DIR / "chapters.json"
    print("\n[验证 chapters.json]")

    if not verify_file_exists(filepath, "章节文件"):
        return False

    if not verify_json_format(filepath, "章节文件"):
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        chapters = json.load(f)

    print(f"  - 章节数量: {len(chapters)}")

    if len(chapters) > 0:
        first = chapters[0]
        last = chapters[-1]
        print(f"  - 第一章: {first.get('title')} (词数: {first.get('wordCount')})")
        print(f"  - 最后一章: {last.get('title')} (词数: {last.get('wordCount')})")

    return True

def verify_words():
    """验证words.json"""
    filepath = FRONTEND_DATA_DIR / "words.json"
    print("\n[验证 words.json]")

    if not verify_file_exists(filepath, "单词文件"):
        return False

    if not verify_json_format(filepath, "单词文件"):
        return False

    with open(filepath, 'r', encoding='utf-8') as f:
        words = json.load(f)

    print(f"  - 单词总数: {len(words):,}")

    if len(words) > 0:
        # 检查必填字段
        sample = words[0]
        required_fields = ['id', 'bookId', 'chapterId', 'word', 'phonetic', 'definition', 'partOfSpeech', 'audioUrl', 'createdAt']
        missing = [f for f in required_fields if f not in sample]

        if missing:
            print(f"  [WARNING] 缺少字段: {', '.join(missing)}")
        else:
            print(f"  [OK] 必填字段完整")

        # 统计空值
        empty_defs = sum(1 for w in words if not w.get('definition'))
        null_examples = sum(1 for w in words if w.get('example') is None)
        pending_trans = sum(1 for w in words if w.get('translation') == 'Translation pending...')

        print(f"  - 空释义: {empty_defs} ({empty_defs/len(words)*100:.1f}%)")
        print(f"  - 空例句: {null_examples} ({null_examples/len(words)*100:.1f}%)")
        print(f"  - 待翻译: {pending_trans} ({pending_trans/len(words)*100:.1f}%)")

    return True

def main():
    """主函数"""
    print("="*60)
    print(" "*15 + "前端数据完整性验证")
    print("="*60)

    all_ok = True

    all_ok &= verify_books()
    all_ok &= verify_chapters()
    all_ok &= verify_words()

    print("\n" + "="*60)
    if all_ok:
        print(" "*20 + "✓ 验证通过")
        print("="*60)
        print("\n[提示] 数据文件完整，可开始前端集成")
        print("请参考: FRONTEND_INTEGRATION_GUIDE.md")
    else:
        print(" "*20 + "✗ 验证失败")
        print("="*60)
        print("\n[错误] 请检查上述错误信息")

    return 0 if all_ok else 1

if __name__ == "__main__":
    import sys
    sys.exit(main())
