#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
词汇库集成到前端 - 数据转换脚本
Integrate Vocabulary to Frontend Data

Generated with Secure & Consistent Coding Standards
Author: Senior Tech Lead & Code Auditor
Created: 2026-01-14

功能:
1. 读取 master_words_pool.json (10,827词)
2. 生成 books.json (单个Master Vocabulary 2026)
3. 生成 chapters.json (按每章50词切分)
4. 生成 words.json (前端格式转换)

遵循标准:
1. Context First - 先读取完整文件内容
2. Defensive Programming - 完整错误处理
3. Consistency - 100%风格一致
4. Self-Correction - 逻辑预演和注释
"""

import json
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, List, Any, Optional
from collections import defaultdict

# ==================== 路径配置 ====================
BASE_DIR = Path(__file__).parent.parent
MASTER_POOL_FILE = BASE_DIR / "src/assets/data/master_words_pool.json"
OUTPUT_DIR = BASE_DIR / "xiaoyu-english-v3/frontend/src/data"
BACKUP_DIR = BASE_DIR / "src/assets/data/backups"

# 输出文件路径
BOOKS_OUTPUT = OUTPUT_DIR / "books.json"
CHAPTERS_OUTPUT = OUTPUT_DIR / "chapters.json"
WORDS_OUTPUT = OUTPUT_DIR / "words.json"
REPORT_OUTPUT = OUTPUT_DIR / "integration_report.json"

# ==================== 配置常量 ====================
BOOK_ID = "book_master_2026"
BOOK_TITLE = "Master Vocabulary 2026"
BOOK_TYPE = "exam"  # exam/scene/k12/custom
BOOK_CATEGORY = "postgraduate"  # cet4/cet6/postgraduate/business
WORDS_PER_CHAPTER = 50  # 每章50词
AUDIO_PATH_TEMPLATE = "/assets/audio/{word}.mp3"


def backup_before_conversion() -> Optional[str]:
    """
    转换前备份原始数据

    Returns:
        str: 备份文件路径，失败时返回None

    注释: 为什么要备份 - 防止转换过程中数据损坏
    """
    try:
        # 确保备份目录存在
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)

        # 生成备份文件名（带时间戳）
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUP_DIR / f"master_pool_before_frontend_integration_{timestamp}.json"

        # 读取原始数据
        if not MASTER_POOL_FILE.exists():
            print(f"[ERROR] Master pool file not found: {MASTER_POOL_FILE}")
            return None

        with open(MASTER_POOL_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 写入备份
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        print(f"[OK] Backed up to: {backup_file.name}")
        return str(backup_file)

    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON in master pool: {e}")
        return None
    except Exception as e:
        print(f"[ERROR] Backup failed: {e}")
        return None


def load_master_pool() -> Optional[Dict[str, Any]]:
    """
    读取主词库数据

    Returns:
        Dict: 主词库数据，失败时返回None

    注释: 为什么要验证 - 确保数据结构正确后再处理
    """
    try:
        # Context First: 先检查文件存在
        if not MASTER_POOL_FILE.exists():
            print(f"[ERROR] Master pool file not found: {MASTER_POOL_FILE}")
            return None

        # 读取数据
        with open(MASTER_POOL_FILE, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 验证数据结构
        if "words" not in data:
            print("[ERROR] Invalid master pool structure: missing 'words' field")
            return None

        if not isinstance(data["words"], list):
            print("[ERROR] Invalid master pool structure: 'words' is not a list")
            return None

        word_count = len(data["words"])
        print(f"[OK] Loaded {word_count} words from master pool")

        return data

    except json.JSONDecodeError as e:
        print(f"[ERROR] Invalid JSON format: {e}")
        return None
    except Exception as e:
        print(f"[ERROR] Failed to load master pool: {e}")
        return None


def create_book_metadata(word_count: int, chapter_count: int) -> Dict[str, Any]:
    """
    创建词库元数据（Book）

    Args:
        word_count: 总词汇量
        chapter_count: 总章节数

    Returns:
        Dict: Book对象

    注释: 为什么这样设计 - 前端需要单个Book对象来显示词库卡片
    """
    now = datetime.now().isoformat()

    return {
        "id": BOOK_ID,
        "title": BOOK_TITLE,
        "coverUrl": "/covers/master-vocabulary-2026.jpg",  # 占位路径
        "totalWords": word_count,
        "totalChapters": chapter_count,
        "type": BOOK_TYPE,
        "category": BOOK_CATEGORY,
        "creatorId": "system",  # 系统创建
        "createdAt": now,
        "isLearning": False,
        "progress": 0,
        "lastChapter": "",
        "description": "2026核心英语词汇总库 - 包含CET4/6、IELTS、TOEFL等考试词汇"
    }


def create_chapters_metadata(word_count: int) -> List[Dict[str, Any]]:
    """
    创建章节元数据（Chapters）

    Args:
        word_count: 总词汇量

    Returns:
        List[Dict]: Chapter对象列表

    注释: 为什么按50词切分 - 防止前端一次性加载导致卡顿
    """
    chapters = []
    now = datetime.now().isoformat()

    # 计算章节数（向上取整）
    chapter_count = (word_count + WORDS_PER_CHAPTER - 1) // WORDS_PER_CHAPTER

    for i in range(chapter_count):
        start_word = i * WORDS_PER_CHAPTER + 1
        end_word = min((i + 1) * WORDS_PER_CHAPTER, word_count)

        chapter = {
            "id": f"{BOOK_ID}_chapter_{i+1}",
            "bookId": BOOK_ID,
            "title": f"Chapter {i+1} (Words {start_word}-{end_word})",
            "order": i + 1,
            "wordCount": end_word - start_word + 1,
            "createdAt": now
        }
        chapters.append(chapter)

    print(f"[OK] Created {len(chapters)} chapters")
    return chapters


def safe_get_phonetic(phonetic_obj: Dict[str, str]) -> str:
    """
    安全提取音标字符串

    Args:
        phonetic_obj: 音标对象（包含kk/mw/ipa）

    Returns:
        str: 音标字符串，优先KK音标

    注释: 为什么优先KK - 亚洲学习者更熟悉KK音标
    """
    if not phonetic_obj or not isinstance(phonetic_obj, dict):
        return ""

    # 优先级: KK > MW > IPA
    if phonetic_obj.get("kk"):
        return phonetic_obj["kk"]
    elif phonetic_obj.get("mw"):
        return phonetic_obj["mw"]
    elif phonetic_obj.get("ipa"):
        return phonetic_obj["ipa"]

    return ""


def safe_get_definition(definitions: List[Dict], word: str) -> str:
    """
    安全提取释义字符串（空值降级策略）

    Args:
        definitions: 释义列表
        word: 单词（用于日志）

    Returns:
        str: 释义字符串，永不为空

    注释: 降级策略 - meaning_cn → meaning_en_simple → meaning_en_academic → 占位符
    """
    if not definitions or len(definitions) == 0:
        return f"Definition for '{word}'"

    first_def = definitions[0]

    # 优先使用中文释义
    if first_def.get("meaning_cn"):
        return first_def["meaning_cn"]

    # 降级1: 使用简单英文释义
    if first_def.get("meaning_en_simple"):
        return first_def["meaning_en_simple"]

    # 降级2: 使用学术释义
    if first_def.get("meaning_en_academic"):
        return first_def["meaning_en_academic"]

    # 最终降级: 占位符（防止null/undefined）
    return f"Definition for '{word}'"


def safe_get_part_of_speech(definitions: List[Dict]) -> str:
    """
    安全提取词性

    Args:
        definitions: 释义列表

    Returns:
        str: 词性字符串

    注释: 为什么默认为noun - 大多数单词可作名词使用
    """
    if not definitions or len(definitions) == 0:
        return "unknown"

    pos = definitions[0].get("part_of_speech", "unknown")

    # 标准化词性名称
    pos_mapping = {
        "article": "article",
        "noun": "noun",
        "verb": "verb",
        "adjective": "adj.",
        "adverb": "adv.",
        "pronoun": "pron.",
        "preposition": "prep.",
        "conjunction": "conj.",
        "interjection": "int.",
        "unknown": "unknown"
    }

    return pos_mapping.get(pos, pos)


def safe_get_example(definitions: List[Dict]) -> Optional[str]:
    """
    安全提取英文例句

    Args:
        definitions: 释义列表

    Returns:
        Optional[str]: 英文例句，不存在时返回None

    注释: 为什么返回Optional - 前端的example字段是可选的
    """
    if not definitions or len(definitions) == 0:
        return None

    examples = definitions[0].get("examples", [])
    if not examples or len(examples) == 0:
        return None

    # 返回第一个例句
    return examples[0].get("sentence_en")


def safe_get_translation(definitions: List[Dict]) -> str:
    """
    安全提取例句翻译（空值降级策略）

    Args:
        definitions: 释义列表

    Returns:
        str: 翻译字符串，永不为空

    注释: 降级策略 - sentence_cn → "Translation pending..."
    """
    if not definitions or len(definitions) == 0:
        return "Translation pending..."

    examples = definitions[0].get("examples", [])
    if not examples or len(examples) == 0:
        return "Translation pending..."

    translation = examples[0].get("sentence_cn")
    if translation and translation.strip():
        return translation

    # 降级: 占位符（防止null/undefined）
    return "Translation pending..."


def convert_word_to_frontend(
    word_data: Dict[str, Any],
    chapter_id: str,
    index: int
) -> Dict[str, Any]:
    """
    转换单个单词数据到前端格式

    Args:
        word_data: 原始单词数据
        chapter_id: 所属章节ID
        index: 单词索引（用于生成唯一ID）

    Returns:
        Dict: 前端格式的Word对象

    注释: 为什么要重新生成ID - 前端需要简洁的数字ID
    """
    word = word_data.get("word", "")
    word_id = word_data.get("word_id", "")
    phonetic_obj = word_data.get("phonetic", {})
    definitions = word_data.get("definitions", [])
    metadata = word_data.get("metadata", {})

    # 提取和转换字段
    phonetic_str = safe_get_phonetic(phonetic_obj)
    definition = safe_get_definition(definitions, word)
    part_of_speech = safe_get_part_of_speech(definitions)
    example = safe_get_example(definitions)
    translation = safe_get_translation(definitions)

    # 生成音频路径（占位）
    audio_url = AUDIO_PATH_TEMPLATE.format(word=word.replace(" ", "_"))

    # 获取创建时间
    created_at = metadata.get("created_at", datetime.now().isoformat())

    # 构建前端Word对象
    frontend_word = {
        "id": f"{BOOK_ID}_word_{index+1}",  # 生成唯一ID
        "bookId": BOOK_ID,
        "chapterId": chapter_id,
        "word": word,
        "phonetic": phonetic_str,
        "definition": definition,
        "partOfSpeech": part_of_speech,
        "audioUrl": audio_url,
        "example": example,
        "translation": translation,
        "createdAt": created_at
    }

    return frontend_word


def convert_all_words(
    master_words: List[Dict[str, Any]],
    chapters: List[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    """
    转换所有单词到前端格式

    Args:
        master_words: 主词库单词列表
        chapters: 章节列表

    Returns:
        List[Dict]: 前端格式的Word对象列表

    注释: 为什么要分批处理 - 每个单词关联到对应章节
    """
    frontend_words = []
    total_words = len(master_words)

    print(f"\n[Converting {total_words} words...]")
    print(f"[Progress:每500词显示一次]")

    for index, word_data in enumerate(master_words):
        # 计算当前单词属于哪一章
        chapter_index = index // WORDS_PER_CHAPTER

        # 边界检查
        if chapter_index >= len(chapters):
            print(f"[WARNING] Word index {index} exceeds chapter count")
            continue

        chapter = chapters[chapter_index]
        chapter_id = chapter["id"]

        # 转换单词
        try:
            frontend_word = convert_word_to_frontend(
                word_data,
                chapter_id,
                index
            )
            frontend_words.append(frontend_word)

            # 进度显示（每500词）
            if (index + 1) % 500 == 0:
                print(f"  Processed: {index+1}/{total_words} words")

        except Exception as e:
            word = word_data.get("word", "unknown")
            print(f"  [ERROR] Failed to convert word '{word}': {e}")
            continue

    print(f"[OK] Converted {len(frontend_words)} words")
    return frontend_words


def save_output_files(
    book: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    words: List[Dict[str, Any]]
) -> bool:
    """
    保存输出文件（books.json, chapters.json, words.json）

    Args:
        book: Book对象
        chapters: Chapter对象列表
        words: Word对象列表

    Returns:
        bool: 成功返回True，失败返回False

    注释: 为什么要分三个文件 - 前端路由需要分别加载
    """
    try:
        # 确保输出目录存在
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        # 保存 books.json
        print(f"\n[Saving books.json...]")
        with open(BOOKS_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump([book], f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved: {BOOKS_OUTPUT.name}")

        # 保存 chapters.json
        print(f"[Saving chapters.json...]")
        with open(CHAPTERS_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(chapters, f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved: {CHAPTERS_OUTPUT.name}")

        # 保存 words.json
        print(f"[Saving words.json...]")
        with open(WORDS_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved: {WORDS_OUTPUT.name}")

        return True

    except PermissionError as e:
        print(f"[ERROR] Permission denied: {e}")
        return False
    except Exception as e:
        print(f"[ERROR] Failed to save output files: {e}")
        return False


def generate_report(
    book: Dict[str, Any],
    chapters: List[Dict[str, Any]],
    words: List[Dict[str, Any]],
    backup_file: Optional[str]
) -> Dict[str, Any]:
    """
    生成转换报告

    Args:
        book: Book对象
        chapters: Chapter对象列表
        words: Word对象列表
        backup_file: 备份文件路径

    Returns:
        Dict: 报告数据
    """
    now = datetime.now().isoformat()

    # 统计空值情况
    empty_definitions = sum(1 for w in words if not w.get("definition"))
    empty_examples = sum(1 for w in words if not w.get("example"))
    pending_translations = sum(1 for w in words if w["translation"] == "Translation pending...")

    report = {
        "conversion_info": {
            "timestamp": now,
            "status": "completed",
            "backup_file": backup_file
        },
        "book_summary": {
            "id": book["id"],
            "title": book["title"],
            "total_words": book["totalWords"],
            "total_chapters": book["totalChapters"]
        },
        "data_quality": {
            "total_words_converted": len(words),
            "empty_definitions": empty_definitions,
            "empty_examples": empty_examples,
            "pending_translations": pending_translations,
            "completion_rate": f"{((len(words) - empty_definitions) / len(words) * 100):.2f}%"
        },
        "output_files": {
            "books": str(BOOKS_OUTPUT),
            "chapters": str(CHAPTERS_OUTPUT),
            "words": str(WORDS_OUTPUT),
            "report": str(REPORT_OUTPUT)
        },
        "configuration": {
            "words_per_chapter": WORDS_PER_CHAPTER,
            "audio_path_template": AUDIO_PATH_TEMPLATE,
            "fallback_translation": "Translation pending..."
        }
    }

    return report


def main() -> int:
    """
    主函数 - 执行完整的转换流程

    Returns:
        int: 0表示成功，非0表示失败
    """
    try:
        print("="*70)
        print(" "*15 + "VOCABULARY INTEGRATION TO FRONTEND")
        print("  Converting Master Pool → Frontend Data")
        print("="*70)

        # === 步骤1: 备份原始数据 ===
        print(f"\n[Step 1: Backup original data]")
        backup_file = backup_before_conversion()
        if backup_file is None:
            print("[ERROR] Backup failed, aborting conversion")
            return 1

        # === 步骤2: 读取主词库 ===
        print(f"\n[Step 2: Load master pool]")
        master_data = load_master_pool()
        if master_data is None:
            print("[ERROR] Failed to load master pool")
            return 1

        master_words = master_data["words"]
        word_count = len(master_words)

        # === 步骤3: 创建Book元数据 ===
        print(f"\n[Step 3: Create Book metadata]")
        chapter_count = (word_count + WORDS_PER_CHAPTER - 1) // WORDS_PER_CHAPTER
        book = create_book_metadata(word_count, chapter_count)
        print(f"[OK] Created Book: {book['title']} ({word_count} words, {chapter_count} chapters)")

        # === 步骤4: 创建Chapter元数据 ===
        print(f"\n[Step 4: Create Chapter metadata]")
        chapters = create_chapters_metadata(word_count)

        # === 步骤5: 转换所有单词 ===
        print(f"\n[Step 5: Convert all words to frontend format]")
        frontend_words = convert_all_words(master_words, chapters)

        # === 步骤6: 保存输出文件 ===
        print(f"\n[Step 6: Save output files]")
        if not save_output_files(book, chapters, frontend_words):
            print("[ERROR] Failed to save output files")
            return 1

        # === 步骤7: 生成报告 ===
        print(f"\n[Step 7: Generate conversion report]")
        report = generate_report(book, chapters, frontend_words, backup_file)

        try:
            with open(REPORT_OUTPUT, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"[OK] Saved: {REPORT_OUTPUT.name}")
        except Exception as e:
            print(f"[WARNING] Failed to save report: {e}")

        # === 完成 ===
        print(f"\n{'='*70}")
        print(" "*20 + "CONVERSION COMPLETED!")
        print("="*70)

        print(f"\n[Summary]")
        print(f"  Total words: {word_count}")
        print(f"  Total chapters: {chapter_count}")
        print(f"  Words per chapter: {WORDS_PER_CHAPTER}")
        print(f"  Completion rate: {report['data_quality']['completion_rate']}")

        print(f"\n[Output files]")
        print(f"  1. {BOOKS_OUTPUT}")
        print(f"  2. {CHAPTERS_OUTPUT}")
        print(f"  3. {WORDS_OUTPUT}")
        print(f"  4. {REPORT_OUTPUT}")

        print(f"\n[Data quality notes]")
        print(f"  - Empty definitions: {report['data_quality']['empty_definitions']}")
        print(f"  - Empty examples: {report['data_quality']['empty_examples']}")
        print(f"  - Pending translations: {report['data_quality']['pending_translations']}")

        print(f"\n{'='*70}")
        print(" "*15 + "✓ READY FOR FRONTEND INTEGRATION")
        print("="*70)

        return 0

    except Exception as e:
        print(f"\n[ERROR] Unexpected error in main: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
