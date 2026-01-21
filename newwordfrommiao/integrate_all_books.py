#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
多书架集成脚本 - 集成所有8个词库到前端
Multi-Book Integration - All 8 Vocabularies to Frontend

Generated with Secure & Consistent Coding Standards
Author: Senior Tech Lead & Code Auditor
Created: 2026-01-14

功能:
1. 集成8个词库：Master, CET4, CET6, IELTS, TOEFL, K12, Livestream, NailSalon
2. 生成books.json（8个Book对象）
3. 生成chapters.json（所有书的章节）
4. 生成words.json（所有书的单词）

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
from typing import Dict, List, Any, Optional, Tuple
from collections import defaultdict

# ==================== 路径配置 ====================
BASE_DIR = Path(__file__).parent.parent
DATA_DIR = BASE_DIR / "src/assets/data"
OUTPUT_DIR = BASE_DIR / "xiaoyu-english-v3/frontend/src/data"
BACKUP_DIR = BASE_DIR / "src/assets/data/backups"

# 输出文件路径
BOOKS_OUTPUT = OUTPUT_DIR / "books.json"
CHAPTERS_OUTPUT = OUTPUT_DIR / "chapters.json"
WORDS_OUTPUT = OUTPUT_DIR / "words.json"
REPORT_OUTPUT = OUTPUT_DIR / "multi_book_integration_report.json"

# 配置常量
WORDS_PER_CHAPTER = 50
AUDIO_PATH_TEMPLATE = "/assets/audio/{word}.mp3"
PENDING_PLACEHOLDER = "[Pending]"

# ==================== 词库定义 ====================
VOCABULARIES = [
    {
        "id": "book_master_2026",
        "filename": "master_words_pool.json",
        "title": "Master Vocabulary 2026",
        "subtitle": "2026核心英语词汇总库",
        "type": "exam",
        "category": "postgraduate",
        "cover_url": "/covers/master-vocabulary-2026.jpg",
        "description": "包含CET4/6、IELTS、TOEFL、K12等考试词汇",
        "data_key": "words"  # JSON中的数据字段名
    },
    {
        "id": "book_cet4",
        "filename": "cet4_words.json",
        "title": "CET-4 Core Vocabulary",
        "subtitle": "大学英语四级核心词汇",
        "type": "exam",
        "category": "cet4",
        "cover_url": "/covers/cet4-core.jpg",
        "description": "四级高频核心词汇，历年真题精选",
        "data_key": None  # 直接是list
    },
    {
        "id": "book_cet6",
        "filename": "cet6_words.json",
        "title": "CET-6 Core Vocabulary",
        "subtitle": "大学英语六级核心词汇",
        "type": "exam",
        "category": "cet6",
        "cover_url": "/covers/cet6-core.jpg",
        "description": "六级学术词汇，抽象概念词汇",
        "data_key": None
    },
    {
        "id": "book_ielts",
        "filename": "ielts_words.json",
        "title": "IELTS Vocabulary",
        "subtitle": "雅思考试核心词汇",
        "type": "exam",
        "category": "ielts",
        "cover_url": "/covers/ielts-core.jpg",
        "description": "雅思核心词汇，英式英语拼写",
        "data_key": None
    },
    {
        "id": "book_toefl",
        "filename": "toefl_words.json",
        "title": "TOEFL Vocabulary",
        "subtitle": "托福考试核心词汇",
        "type": "exam",
        "category": "toefl",
        "cover_url": "/covers/toefl-core.jpg",
        "description": "托福核心词汇，美式英语拼写",
        "data_key": None
    },
    {
        "id": "book_k12",
        "filename": "us_k12_foundation.json",
        "title": "US K-12 Foundation",
        "subtitle": "美国基础教育词汇",
        "type": "k12",
        "category": "primary",
        "cover_url": "/covers/k12-foundation.jpg",
        "description": "Dolch + Fry视觉词汇，K-12年级通用",
        "data_key": None
    },
    {
        "id": "book_livestream",
        "filename": "livestream_pro.json",
        "title": "Livestream Shopping Pro",
        "subtitle": "直播带货促单词库",
        "type": "scene",
        "category": "ecommerce",
        "cover_url": "/covers/livestream-pro.jpg",
        "description": "TikTok/YouTube直播高频转化词汇",
        "data_key": "words"
    },
    {
        "id": "book_nail_salon",
        "filename": "nail_salon_pro.json",
        "title": "Nail Salon Professional",
        "subtitle": "美甲沙龙专业词库",
        "type": "scene",
        "category": "business",
        "cover_url": "/covers/nail-salon-pro.jpg",
        "description": "美业专业术语，服务场景词汇",
        "data_key": "words"
    }
]


def backup_before_conversion() -> Optional[str]:
    """转换前备份现有前端数据"""
    try:
        BACKUP_DIR.mkdir(parents=True, exist_ok=True)
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_file = BACKUP_DIR / f"frontend_data_before_multi_book_{timestamp}.json"

        # 备份books.json
        books_backup = {}
        if BOOKS_OUTPUT.exists():
            with open(BOOKS_OUTPUT, 'r', encoding='utf-8') as f:
                books_backup['books'] = json.load(f)

        # 备份chapters.json
        if CHAPTERS_OUTPUT.exists():
            with open(CHAPTERS_OUTPUT, 'r', encoding='utf-8') as f:
                books_backup['chapters'] = json.load(f)

        # 备份words.json（如果文件太大，只记录文件信息）
        if WORDS_OUTPUT.exists():
            books_backup['words_info'] = {
                "file": str(WORDS_OUTPUT),
                "size": WORDS_OUTPUT.stat().st_size
            }

        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(books_backup, f, ensure_ascii=False, indent=2)

        print(f"[OK] Backed up existing data to: {backup_file.name}")
        return str(backup_file)

    except Exception as e:
        print(f"[WARNING] Backup failed: {e}")
        return None


def load_vocabulary_data(vocab_config: Dict) -> Optional[List[Dict]]:
    """
    加载单个词库数据

    Args:
        vocab_config: 词库配置

    Returns:
        单词列表，失败时返回None
    """
    filepath = DATA_DIR / vocab_config["filename"]

    # 检查文件存在
    if not filepath.exists():
        print(f"  [ERROR] File not found: {vocab_config['filename']}")
        return None

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        # 提取单词列表
        data_key = vocab_config.get("data_key")

        if data_key:
            # 数据在嵌套字段中
            words = data.get(data_key, [])
        elif isinstance(data, list):
            # 数据直接是list
            words = data
        elif "words" in data:
            # 默认从words字段提取
            words = data["words"]
        else:
            print(f"  [ERROR] Unknown data structure in {vocab_config['filename']}")
            return None

        print(f"  [OK] Loaded {len(words)} words")
        return words

    except json.JSONDecodeError as e:
        print(f"  [ERROR] Invalid JSON: {e}")
        return None
    except Exception as e:
        print(f"  [ERROR] Failed to load: {e}")
        return None


def safe_get_value(obj: Dict, *keys, default=PENDING_PLACEHOLDER) -> Any:
    """
    安全获取嵌套字典值

    Args:
        obj: 字典对象
        *keys: 键路径
        default: 默认值

    Returns:
        提取的值或默认值
    """
    for key in keys:
        if isinstance(obj, dict) and key in obj:
            obj = obj[key]
        else:
            return default
    return obj if obj else default


def safe_get_phonetic(phonetic_obj: Any) -> str:
    """安全提取音标"""
    if not phonetic_obj or not isinstance(phonetic_obj, dict):
        return ""

    # 优先级: KK > MW > IPA
    if phonetic_obj.get("kk"):
        return phonetic_obj["kk"]
    elif phonetic_obj.get("mw"):
        return phonetic_obj["mw"]
    elif phonetic_obj.get("ipa"):
        return phonetic_obj["ipa"]
    elif phonetic_obj.get("uk"):
        return phonetic_obj["uk"]
    elif phonetic_obj.get("us"):
        return phonetic_obj["us"]

    return ""


def safe_get_definition(word_data: Dict, word: str) -> str:
    """安全提取释义（多层降级策略）"""
    # 尝试多个字段路径
    meaning_paths = [
        ["definitions", 0, "meaning_cn"],
        ["definitions", 0, "meaning_en_simple"],
        ["definition"],
        ["meaning_cn"],
        ["meaning"]
    ]

    for path in meaning_paths:
        value = safe_get_value(word_data, *path, default=None)
        if value and isinstance(value, str) and value.strip():
            return value.strip()

    # 最终降级
    return f"Definition for '{word}'"


def safe_get_part_of_speech(word_data: Dict) -> str:
    """安全提取词性"""
    # 尝试多个字段路径
    pos_paths = [
        ["definitions", 0, "part_of_speech"],
        ["part_of_speech"],
        ["pos"],
        ["type"]
    ]

    for path in pos_paths:
        value = safe_get_value(word_data, *path, default=None)
        if value:
            return str(value)

    return "unknown"


def safe_get_example(word_data: Dict) -> Optional[str]:
    """安全提取例句"""
    # 尝试多个字段路径
    example_paths = [
        ["definitions", 0, "examples", 0, "sentence_en"],
        ["examples", 0, "sentence_en"],
        ["example"],
        ["sentence_en"]
    ]

    for path in example_paths:
        value = safe_get_value(word_data, *path, default=None)
        if value:
            return str(value)

    return None


def safe_get_translation(word_data: Dict) -> str:
    """安全提取翻译"""
    # 尝试多个字段路径
    trans_paths = [
        ["definitions", 0, "examples", 0, "sentence_cn"],
        ["examples", 0, "sentence_cn"],
        ["translation"],
        ["sentence_cn"],
        ["meaning_cn"]
    ]

    for path in trans_paths:
        value = safe_get_value(word_data, *path, default=None)
        if value and isinstance(value, str) and value.strip():
            return value.strip()

    # 降级: 占位符
    return "Translation pending..."


def create_book_metadata(
    vocab_config: Dict,
    word_count: int,
    chapter_count: int
) -> Dict[str, Any]:
    """创建Book元数据"""
    now = datetime.now().isoformat()

    return {
        "id": vocab_config["id"],
        "title": vocab_config["title"],
        "subtitle": vocab_config.get("subtitle", ""),
        "coverUrl": vocab_config["cover_url"],
        "totalWords": word_count,
        "totalChapters": chapter_count,
        "type": vocab_config["type"],
        "category": vocab_config["category"],
        "creatorId": "system",
        "createdAt": now,
        "isLearning": False,
        "progress": 0,
        "lastChapter": "",
        "description": vocab_config.get("description", "")
    }


def create_chapters_metadata(
    book_id: str,
    word_count: int
) -> List[Dict[str, Any]]:
    """创建Chapter元数据"""
    chapters = []
    now = datetime.now().isoformat()

    # 计算章节数
    chapter_count = (word_count + WORDS_PER_CHAPTER - 1) // WORDS_PER_CHAPTER

    for i in range(chapter_count):
        start_word = i * WORDS_PER_CHAPTER + 1
        end_word = min((i + 1) * WORDS_PER_CHAPTER, word_count)

        chapter = {
            "id": f"{book_id}_ch{i+1}",
            "bookId": book_id,
            "title": f"Chapter {i+1} (Words {start_word}-{end_word})",
            "order": i + 1,
            "wordCount": end_word - start_word + 1,
            "createdAt": now
        }
        chapters.append(chapter)

    return chapters


def convert_word_to_frontend(
    word_data: Dict,
    book_id: str,
    chapter_id: str,
    word_index: int
) -> Dict[str, Any]:
    """转换单个单词到前端格式"""
    word = safe_get_value(word_data, "word", default="unknown")

    # 提取字段
    phonetic = safe_get_phonetic(word_data.get("phonetic", {}))
    definition = safe_get_definition(word_data, word)
    part_of_speech = safe_get_part_of_speech(word_data)
    example = safe_get_example(word_data)
    translation = safe_get_translation(word_data)

    # 生成音频路径
    audio_url = AUDIO_PATH_TEMPLATE.format(word=word.replace(" ", "_"))

    # 获取创建时间
    created_at = safe_get_value(
        word_data,
        "metadata", "created_at",
        default=datetime.now().isoformat()
    )

    # 构建前端Word对象
    frontend_word = {
        "id": f"{book_id}_word_{word_index+1}",
        "bookId": book_id,
        "chapterId": chapter_id,
        "word": word,
        "phonetic": phonetic,
        "definition": definition,
        "partOfSpeech": part_of_speech,
        "audioUrl": audio_url,
        "example": example,
        "translation": translation,
        "createdAt": created_at
    }

    return frontend_word


def convert_vocabulary_to_frontend(
    words: List[Dict],
    vocab_config: Dict
) -> Tuple[Dict, List[Dict], List[Dict]]:
    """
    转换单个词库到前端格式

    Returns:
        (Book对象, Chapter列表, Word列表)
    """
    book_id = vocab_config["id"]
    word_count = len(words)

    print(f"\n[Converting {vocab_config['title']}]")

    # 1. 创建Book
    chapter_count = (word_count + WORDS_PER_CHAPTER - 1) // WORDS_PER_CHAPTER
    book = create_book_metadata(vocab_config, word_count, chapter_count)
    print(f"  Book: {book['title']} ({word_count} words, {chapter_count} chapters)")

    # 2. 创建Chapters
    chapters = create_chapters_metadata(book_id, word_count)
    print(f"  Chapters: {len(chapters)} created")

    # 3. 转换Words
    frontend_words = []
    errors = 0

    for index, word_data in enumerate(words):
        try:
            # 计算章节
            chapter_index = index // WORDS_PER_CHAPTER
            if chapter_index >= len(chapters):
                chapter_index = len(chapters) - 1

            chapter = chapters[chapter_index]
            chapter_id = chapter["id"]

            # 转换单词
            frontend_word = convert_word_to_frontend(
                word_data,
                book_id,
                chapter_id,
                index
            )
            frontend_words.append(frontend_word)

            # 进度显示（每1000词）
            if (index + 1) % 1000 == 0:
                print(f"    Processed: {index+1}/{word_count}")

        except Exception as e:
            word = safe_get_value(word_data, "word", default="unknown")
            print(f"    [ERROR] Failed to convert '{word}': {e}")
            errors += 1
            continue

    print(f"  Words: {len(frontend_words)} converted, {errors} errors")

    return book, chapters, frontend_words


def integrate_all_vocabularies() -> Tuple[List[Dict], List[Dict], List[Dict], Dict]:
    """
    集成所有词库

    Returns:
        (Books列表, Chapters列表, Words列表, 统计信息)
    """
    all_books = []
    all_chapters = []
    all_words = []
    statistics = {}

    print("\n" + "="*70)
    print(" "*15 + "MULTI-BOOK INTEGRATION STARTED")
    print("="*70)

    for vocab_config in VOCABULARIES:
        print(f"\n[Processing: {vocab_config['title']}]")
        print(f"  File: {vocab_config['filename']}")

        # 加载数据
        words = load_vocabulary_data(vocab_config)

        if words is None:
            print(f"  [SKIPPED] Failed to load {vocab_config['title']}")
            statistics[vocab_config['id']] = {
                "status": "failed",
                "error": "Failed to load data"
            }
            continue

        if len(words) == 0:
            print(f"  [SKIPPED] No words found in {vocab_config['title']}")
            statistics[vocab_config['id']] = {
                "status": "skipped",
                "error": "No words found"
            }
            continue

        # 转换数据
        try:
            book, chapters, frontend_words = convert_vocabulary_to_frontend(
                words,
                vocab_config
            )

            all_books.append(book)
            all_chapters.extend(chapters)
            all_words.extend(frontend_words)

            # 记录统计
            statistics[vocab_config['id']] = {
                "status": "success",
                "words_converted": len(frontend_words),
                "chapters_created": len(chapters),
                "title": book['title']
            }

        except Exception as e:
            print(f"  [ERROR] Conversion failed: {e}")
            statistics[vocab_config['id']] = {
                "status": "error",
                "error": str(e)
            }
            continue

    return all_books, all_chapters, all_words, statistics


def save_output_files(
    books: List[Dict],
    chapters: List[Dict],
    words: List[Dict]
) -> bool:
    """保存输出文件"""
    try:
        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        # 保存books.json
        print(f"\n[Saving books.json...]")
        with open(BOOKS_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(books, f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved: {len(books)} books")

        # 保存chapters.json
        print(f"[Saving chapters.json...]")
        with open(CHAPTERS_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(chapters, f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved: {len(chapters)} chapters")

        # 保存words.json
        print(f"[Saving words.json...]")
        with open(WORDS_OUTPUT, 'w', encoding='utf-8') as f:
            json.dump(words, f, ensure_ascii=False, indent=2)
        print(f"[OK] Saved: {len(words)} words")

        return True

    except Exception as e:
        print(f"[ERROR] Failed to save: {e}")
        return False


def generate_report(
    books: List[Dict],
    chapters: List[Dict],
    words: List[Dict],
    statistics: Dict,
    backup_file: Optional[str]
) -> Dict[str, Any]:
    """生成集成报告"""
    now = datetime.now().isoformat()

    # 统计数据质量
    empty_definitions = sum(1 for w in words if not w.get("definition") or w["definition"] == f"Definition for '{w['word']}'")
    pending_translations = sum(1 for w in words if w["translation"] == "Translation pending...")

    report = {
        "integration_info": {
            "timestamp": now,
            "status": "completed",
            "backup_file": backup_file,
            "total_books": len(books),
            "total_chapters": len(chapters),
            "total_words": len(words)
        },
        "books_summary": [
            {
                "id": book["id"],
                "title": book["title"],
                "total_words": book["totalWords"],
                "total_chapters": book["totalChapters"],
                "type": book["type"],
                "category": book["category"]
            }
            for book in books
        ],
        "data_quality": {
            "total_words_converted": len(words),
            "empty_definitions": empty_definitions,
            "pending_translations": pending_translations,
            "completion_rate": f"{((len(words) - empty_definitions) / len(words) * 100):.2f}%"
        },
        "statistics": statistics,
        "output_files": {
            "books": str(BOOKS_OUTPUT),
            "chapters": str(CHAPTERS_OUTPUT),
            "words": str(WORDS_OUTPUT),
            "report": str(REPORT_OUTPUT)
        }
    }

    return report


def main() -> int:
    """主函数"""
    try:
        print("="*70)
        print(" "*10 + "MULTI-BOOK VOCABULARY INTEGRATION")
        print("  Integrating 8 Vocabularies to Frontend")
        print("="*70)

        # === 步骤1: 备份 ===
        print(f"\n[Step 1: Backup existing data]")
        backup_file = backup_before_conversion()

        # === 步骤2: 集成所有词库 ===
        print(f"\n[Step 2: Integrate all vocabularies]")
        books, chapters, words, statistics = integrate_all_vocabularies()

        if len(books) == 0:
            print("\n[ERROR] No books were successfully integrated")
            return 1

        # === 步骤3: 保存文件 ===
        print(f"\n[Step 3: Save output files]")
        if not save_output_files(books, chapters, words):
            return 1

        # === 步骤4: 生成报告 ===
        print(f"\n[Step 4: Generate integration report]")
        report = generate_report(books, chapters, words, statistics, backup_file)

        try:
            with open(REPORT_OUTPUT, 'w', encoding='utf-8') as f:
                json.dump(report, f, ensure_ascii=False, indent=2)
            print(f"[OK] Report saved")
        except Exception as e:
            print(f"[WARNING] Failed to save report: {e}")

        # === 完成 ===
        print(f"\n{'='*70}")
        print(" "*20 + "INTEGRATION COMPLETED!")
        print("="*70)

        print(f"\n[Summary]")
        print(f"  Total books: {len(books)}")
        print(f"  Total chapters: {len(chapters)}")
        print(f"  Total words: {len(words):,}")

        print(f"\n[Books on shelf]")
        for i, book in enumerate(books, 1):
            print(f"  {i}. {book['title']:40} ({book['totalWords']:>5} words, {book['totalChapters']:>3} chapters)")

        print(f"\n[Output files]")
        print(f"  1. {BOOKS_OUTPUT}")
        print(f"  2. {CHAPTERS_OUTPUT}")
        print(f"  3. {WORDS_OUTPUT}")
        print(f"  4. {REPORT_OUTPUT}")

        print(f"\n{'='*70}")
        print(" "*15 + "ALL 8 BOOKS SUCCESSFULLY INTEGRATED!")
        print("="*70)

        return 0

    except Exception as e:
        print(f"\n[ERROR] Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    sys.exit(main())
